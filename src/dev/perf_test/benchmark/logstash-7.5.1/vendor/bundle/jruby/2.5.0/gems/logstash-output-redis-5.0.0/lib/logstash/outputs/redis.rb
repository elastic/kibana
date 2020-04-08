# encoding: utf-8
require "logstash/outputs/base"
require "logstash/namespace"
require "stud/buffer"

# This output will send events to a Redis queue using RPUSH.
# The RPUSH command is supported in Redis v0.0.7+. Using
# PUBLISH to a channel requires at least v1.3.8+.
# While you may be able to make these Redis versions work,
# the best performance and stability will be found in more
# recent stable versions.  Versions 2.6.0+ are recommended.
#
# For more information, see http://redis.io/[the Redis homepage]
#
class LogStash::Outputs::Redis < LogStash::Outputs::Base

  include Stud::Buffer

  config_name "redis"

  default :codec, "json"

  # The hostname(s) of your Redis server(s). Ports may be specified on any
  # hostname, which will override the global port config.
  # If the hosts list is an array, Logstash will pick one random host to connect to,
  # if that host is disconnected it will then pick another.
  #
  # For example:
  # [source,ruby]
  #     "127.0.0.1"
  #     ["127.0.0.1", "127.0.0.2"]
  #     ["127.0.0.1:6380", "127.0.0.1"]
  config :host, :validate => :array, :default => ["127.0.0.1"]

  # Shuffle the host list during Logstash startup.
  config :shuffle_hosts, :validate => :boolean, :default => true

  # The default port to connect on. Can be overridden on any hostname.
  config :port, :validate => :number, :default => 6379

  # The Redis database number.
  config :db, :validate => :number, :default => 0

  # Redis initial connection timeout in seconds.
  config :timeout, :validate => :number, :default => 5

  # Password to authenticate with.  There is no authentication by default.
  config :password, :validate => :password

  # The name of a Redis list or channel. Dynamic names are
  # valid here, for example `logstash-%{type}`.
  config :key, :validate => :string, :required => true

  # Either list or channel.  If `redis_type` is list, then we will set
  # RPUSH to key. If `redis_type` is channel, then we will PUBLISH to `key`.
  config :data_type, :validate => [ "list", "channel" ], :required => true

  # Set to true if you want Redis to batch up values and send 1 RPUSH command
  # instead of one command per value to push on the list.  Note that this only
  # works with `data_type="list"` mode right now.
  #
  # If true, we send an RPUSH every "batch_events" events or
  # "batch_timeout" seconds (whichever comes first).
  # Only supported for `data_type` is "list".
  config :batch, :validate => :boolean, :default => false

  # If batch is set to true, the number of events we queue up for an RPUSH.
  config :batch_events, :validate => :number, :default => 50

  # If batch is set to true, the maximum amount of time between RPUSH commands
  # when there are pending events to flush.
  config :batch_timeout, :validate => :number, :default => 5

  # Interval for reconnecting to failed Redis connections
  config :reconnect_interval, :validate => :number, :default => 1

  # In case Redis `data_type` is `list` and has more than `@congestion_threshold` items,
  # block until someone consumes them and reduces congestion, otherwise if there are
  # no consumers Redis will run out of memory, unless it was configured with OOM protection.
  # But even with OOM protection, a single Redis list can block all other users of Redis,
  # until Redis CPU consumption reaches the max allowed RAM size.
  # A default value of 0 means that this limit is disabled.
  # Only supported for `list` Redis `data_type`.
  config :congestion_threshold, :validate => :number, :default => 0

  # How often to check for congestion. Default is one second.
  # Zero means to check on every event.
  config :congestion_interval, :validate => :number, :default => 1

  def register
    require 'redis'

    if @batch
      if @data_type != "list"
        raise RuntimeError.new(
          "batch is not supported with data_type #{@data_type}"
        )
      end
      buffer_initialize(
        :max_items => @batch_events,
        :max_interval => @batch_timeout,
        :logger => @logger
      )
    end

    @redis = nil
    if @shuffle_hosts
        @host.shuffle!
    end
    @host_idx = 0

    @congestion_check_times = Hash.new { |h,k| h[k] = Time.now.to_i - @congestion_interval }

    @codec.on_event(&method(:send_to_redis))
  end # def register

  def receive(event)
    # TODO(sissel): We really should not drop an event, but historically
    # we have dropped events that fail to be converted to json.
    # TODO(sissel): Find a way to continue passing events through even
    # if they fail to convert properly.
    begin
      @codec.encode(event)
    rescue LocalJumpError
      # This LocalJumpError rescue clause is required to test for regressions
      # for https://github.com/logstash-plugins/logstash-output-redis/issues/26
      # see specs. Without it the LocalJumpError is rescued by the StandardError
      raise
    rescue StandardError => e
      @logger.warn("Error encoding event", :exception => e,
                   :event => event)
    end
  end # def receive

  def congestion_check(key)
    return if @congestion_threshold == 0
    if (Time.now.to_i - @congestion_check_times[key]) >= @congestion_interval # Check congestion only if enough time has passed since last check.
      while @redis.llen(key) > @congestion_threshold # Don't push event to Redis key which has reached @congestion_threshold.
        @logger.warn? and @logger.warn("Redis key size has hit a congestion threshold #{@congestion_threshold} suspending output for #{@congestion_interval} seconds")
        sleep @congestion_interval
      end
      @congestion_check_times[key] = Time.now.to_i
    end
  end

  # called from Stud::Buffer#buffer_flush when there are events to flush
  def flush(events, key, close=false)
    @redis ||= connect
    # we should not block due to congestion on close
    # to support this Stud::Buffer#buffer_flush should pass here the :final boolean value.
    congestion_check(key) unless close
    @redis.rpush(key, events)
  end
  # called from Stud::Buffer#buffer_flush when an error occurs
  def on_flush_error(e)
    @logger.warn("Failed to send backlog of events to Redis",
      :identity => identity,
      :exception => e,
      :backtrace => e.backtrace
    )
    @redis = connect
  end

  def close
    if @batch
      buffer_flush(:final => true)
    end
    if @data_type == 'channel' and @redis
      @redis.quit
      @redis = nil
    end
  end

  private
  def connect
    @current_host, @current_port = @host[@host_idx].split(':')
    @host_idx = @host_idx + 1 >= @host.length ? 0 : @host_idx + 1

    if not @current_port
      @current_port = @port
    end

    params = {
      :host => @current_host,
      :port => @current_port,
      :timeout => @timeout,
      :db => @db
    }
    @logger.debug("connection params", params)

    if @password
      params[:password] = @password.value
    end

    Redis.new(params)
  end # def connect

  # A string used to identify a Redis instance in log messages
  def identity
    "redis://#{@password}@#{@current_host}:#{@current_port}/#{@db} #{@data_type}:#{@key}"
  end

  def send_to_redis(event, payload)
    # How can I do this sort of thing with codecs?
    key = event.sprintf(@key)

    if @batch && @data_type == 'list' # Don't use batched method for pubsub.
      # Stud::Buffer
      buffer_receive(payload, key)
      return
    end

    begin
      @redis ||= connect
      if @data_type == 'list'
        congestion_check(key)
        @redis.rpush(key, payload)
      else
        @redis.publish(key, payload)
      end
    rescue => e
      @logger.warn("Failed to send event to Redis", :event => event,
                   :identity => identity, :exception => e,
                   :backtrace => e.backtrace)
      sleep @reconnect_interval
      @redis = nil
      retry
    end
  end
end
