# encoding: utf-8
require "logstash/inputs/base"
require "logstash/namespace"
require "logstash/timestamp"
require "logstash/util"
require "logstash/json"
require "stud/interval"
require "twitter"
require "logstash/inputs/twitter/patches"

# Ingest events from the Twitter Streaming API.
class LogStash::Inputs::Twitter < LogStash::Inputs::Base

  attr_reader :filter_options, :event_generation_error_count

  config_name "twitter"

  # Your Twitter App's consumer key
  #
  # Don't know what this is? You need to create an "application"
  # on Twitter, see this url: <https://dev.twitter.com/apps/new>
  config :consumer_key, :validate => :string, :required => true

  # Your Twitter App's consumer secret
  #
  # If you don't have one of these, you can create one by
  # registering a new application with Twitter:
  # <https://dev.twitter.com/apps/new>
  config :consumer_secret, :validate => :password, :required => true

  # Your oauth token.
  #
  # To get this, login to Twitter with whatever account you want,
  # then visit <https://dev.twitter.com/apps>
  #
  # Click on your app (used with the consumer_key and consumer_secret settings)
  # Then at the bottom of the page, click 'Create my access token' which
  # will create an oauth token and secret bound to your account and that
  # application.
  config :oauth_token, :validate => :string, :required => true

  # Your oauth token secret.
  #
  # To get this, login to Twitter with whatever account you want,
  # then visit <https://dev.twitter.com/apps>
  #
  # Click on your app (used with the consumer_key and consumer_secret settings)
  # Then at the bottom of the page, click 'Create my access token' which
  # will create an oauth token and secret bound to your account and that
  # application.
  config :oauth_token_secret, :validate => :password, :required => true

  # Any keywords to track in the Twitter stream. For multiple keywords, use
  # the syntax ["foo", "bar"]. There's a logical OR between each keyword 
  # string listed and a logical AND between words separated by spaces per
  # keyword string.
  # See https://dev.twitter.com/streaming/overview/request-parameters#track 
  # for more details.
  #
  # The wildcard "*" option is not supported. To ingest a sample stream of 
  # all tweets, the use_samples option is recommended. 
  config :keywords, :validate => :array

  # Record full tweet object as given to us by the Twitter Streaming API.
  config :full_tweet, :validate => :boolean, :default => false

  # A comma separated list of user IDs, indicating the users to
  # return statuses for in the Twitter stream.
  # See https://dev.twitter.com/streaming/overview/request-parameters#follow
  # for more details.
  config :follows, :validate => :array

  # A comma-separated list of longitude, latitude pairs specifying a set
  # of bounding boxes to filter tweets by.
  # See https://dev.twitter.com/streaming/overview/request-parameters#locations
  # for more details.
  config :locations, :validate => :string

  # A list of BCP 47 language identifiers corresponding to any of the languages listed
  # on Twitter’s advanced search page will only return tweets that have been detected 
  # as being written in the specified languages.
  config :languages, :validate => :array

  # Returns a small random sample of all public statuses. The tweets returned
  # by the default access level are the same, so if two different clients connect
  # to this endpoint, they will see the same tweets. If set to true, the keywords, 
  # follows, locations, and languages options will be ignored. Default => false
  config :use_samples, :validate => :boolean, :default => false

  # Lets you ingore the retweets coming out of the Twitter API. Default => false
  config :ignore_retweets, :validate => :boolean, :default => false

  # When to use a proxy to handle the connections
  config :use_proxy, :validate => :boolean, :default => false

  # Location of the proxy, by default the same machine as the one running this LS instance
  config :proxy_address, :validate => :string, :default => "127.0.0.1"

  # Port where the proxy is listening, by default 3128 (squid)
  config :proxy_port, :validate => :number, :default => 3128

  # Duration in seconds to wait before retrying a connection when twitter responds with a 429 TooManyRequests
  # In some cases the 'x-rate-limit-reset' header is not set in the response and <error>.rate_limit.reset_in
  # is nil. If this occurs then we use the integer specified here. The default is 5 minutes.
  config :rate_limit_reset_in, :validate => :number, :default => 300

  def register
    if !@use_samples && ( @keywords.nil? && @follows.nil? && @locations.nil? )
      raise LogStash::ConfigurationError.new("At least one parameter (follows, locations or keywords) must be specified.")
    end

    # monkey patch twitter gem to ignore json parsing error.
    # at the same time, use our own json parser
    # this has been tested with a specific gem version, raise if not the same

    LogStash::Inputs::TwitterPatches.patch

    @rest_client     = Twitter::REST::Client.new       { |c|  configure(c) }
    @stream_client   = Twitter::Streaming::Client.new  { |c|  configure(c) }
    @twitter_options = build_options
  end

  def run(queue)
    @logger.info("Starting twitter tracking", twitter_options.clone) # need to pass a clone as it modify this var otherwise

    # keep track of the amount of non-specific errors rescued and logged - use in testing to verify no errors.
    # this is because, as yet, we can't have rspec expectations on the logger instance.
    @event_generation_error_count = 0

    begin
      if @use_samples
        @stream_client.sample do |tweet|
          return if stop?
          tweet_processor(queue, tweet)
        end
      else
        @stream_client.filter(twitter_options) do |tweet|
          return if stop?
          tweet_processor(queue, tweet)
        end
      end
    rescue Twitter::Error::TooManyRequests => e
      sleep_for = e.rate_limit.reset_in || @rate_limit_reset_in # 5 minutes default value from config
      @logger.warn("Twitter too many requests error, sleeping for #{sleep_for}s")
      Stud.stoppable_sleep(sleep_for) { stop? }
      retry
    rescue => e
      # if a lot of these errors begin to occur, the repeated retry will result in TooManyRequests errors trapped above.
      @logger.warn("Twitter client error", :message => e.message, :exception => e.class.name, :backtrace => e.backtrace, :options => @filter_options)
      retry
    end
  end # def run

  def stop
    @stream_client = nil
  end

  def twitter_options
    @twitter_options
  end

  def set_stream_client(client)
    @stream_client = client
  end

  private

  def tweet_processor(queue, tweet)
    if tweet.is_a?(Twitter::Tweet) && !ignore?(tweet)
      begin
        event = from_tweet(tweet)
        decorate(event)
        queue << event
      rescue => e
        @event_generation_error_count = @event_generation_error_count.next
        @logger.error("Event generation error", :message => e.message, :exception => e.class.name, :backtrace => e.backtrace.take(10))
      end
    end
  end

  def ignore?(tweet)
    @ignore_retweets && tweet.retweet?
  end

  def from_tweet(tweet)
    @logger.debug? && @logger.debug("Got tweet", :user => tweet.user.screen_name, :text => tweet.text)
    if @full_tweet
      event = LogStash::Event.new(LogStash::Util.stringify_symbols(tweet.to_hash))
      event.timestamp = LogStash::Timestamp.new(tweet.created_at)
    else

      attributes = {
        LogStash::Event::TIMESTAMP => LogStash::Timestamp.new(tweet.created_at),
        "message" => tweet.full_text,
        "user" => tweet.user.screen_name,
        "client" => tweet.source,
        "retweeted" => tweet.retweeted?,
        "source" => "http://twitter.com/#{tweet.user.screen_name}/status/#{tweet.id}"
      }

      attributes["hashtags"] = tweet.hashtags.map{|ht| ht.attrs}
      attributes["symbols"]  = tweet.symbols.map{|sym| sym.attrs}
      attributes["user_mentions"]  = tweet.user_mentions.map{|um| um.attrs}
      event = LogStash::Event.new(attributes)
      if tweet.reply? && !tweet.in_reply_to_status_id.nil?
        event.set("in-reply-to", tweet.in_reply_to_status_id)
      end
      unless tweet.urls.empty?
        event.set("urls", tweet.urls.map(&:expanded_url).map(&:to_s))
      end
    end

    # Work around bugs in JrJackson. The standard serializer won't work till we upgrade
    # event.set("in-reply-to", nil) if event.get("in-reply-to").is_a?(Twitter::NullObject)

    event
  end

  def configure(c)
    c.consumer_key = @consumer_key
    c.consumer_secret = @consumer_secret.value
    c.access_token = @oauth_token
    c.access_token_secret = @oauth_token_secret.value
    if @use_proxy
      c.proxy =  {
        proxy_address: @proxy_address,
        proxy_port: @proxy_port,
      }
    end
  end

  def build_options
    build_options = {}
    build_options[:track]     = @keywords.join(",")  if @keywords  && !@keywords.empty?
    build_options[:locations] = @locations           if @locations && !@locations.empty?
    build_options[:language]  = @languages.join(",") if @languages && !@languages.empty?

    if @follows && @follows.length > 0
      build_options[:follow]    = @follows.map do |username|
        (  !is_number?(username) ? find_user(username) : username )
      end.join(",")
    end
    build_options
  end

  def find_user(username)
    @rest_client.user(:user => username)
  end

  def is_number?(string)
    /^(\d+)$/.match(string) ? true : false
  end
end # class LogStash::Inputs::Twitter
