# encoding: utf-8
require 'logstash/filters/base'
require 'logstash/namespace'
require 'logstash/plugin_mixins/http_client'
require 'logstash/json'

# Logstash HTTP Filter
# This filter calls a defined URL and saves the answer into a specified field.
#
class LogStash::Filters::Http < LogStash::Filters::Base
  include LogStash::PluginMixins::HttpClient

  config_name 'http'

  VALID_VERBS = ['GET', 'HEAD', 'PATCH', 'DELETE', 'POST']

  config :url, :validate => :string, :required => true
  config :verb, :validate => VALID_VERBS, :required => false, :default => 'GET'
  config :headers, :validate => :hash, :required => false, :default => {}
  config :query, :validate => :hash, :required => false, :default => {}
  config :body, :required => false
  config :body_format, :validate => ['text', 'json'], :default => "text"

  config :target_body, :validate => :string, :default => "body"
  config :target_headers, :validate => :string, :default => "headers"

  # Append values to the `tags` field when there has been no
  # successful match or json parsing error
  config :tag_on_request_failure, :validate => :array, :default => ['_httprequestfailure']
  config :tag_on_json_failure, :validate => :array, :default => ['_jsonparsefailure']

  def register
    # nothing to see here
    @verb = verb.downcase
  end

  def filter(event)
    url_for_event = event.sprintf(@url)
    headers_sprintfed = sprintf_object(event, @headers)
    if body_format == "json"
      headers_sprintfed["content-type"] = "application/json"
    else
      headers_sprintfed["content-type"] = "text/plain"
    end
    query_sprintfed = sprintf_object(event, @query)
    body_sprintfed = sprintf_object(event, @body)
    # we don't need to serialize strings and numbers
    if @body_format == "json" && body_sprintfed.kind_of?(Enumerable)
      body_sprintfed = LogStash::Json.dump(body_sprintfed)
    end

    options = { :headers => headers_sprintfed, :query => query_sprintfed, :body => body_sprintfed }

    @logger.debug? && @logger.debug('processing request', :url => url_for_event, :headers => headers_sprintfed, :query => query_sprintfed)
    client_error = nil

    begin
      code, response_headers, response_body = request_http(@verb, url_for_event, options)
    rescue => e
      client_error = e
    end

    if client_error
      @logger.error('error during HTTP request',
                    :url => url_for_event, :body => body_sprintfed,
                    :client_error => client_error.message)
      @tag_on_request_failure.each { |tag| event.tag(tag) }
    elsif !code.between?(200, 299)
      @logger.error('error during HTTP request',
                    :url => url_for_event, :code => code,
                    :response => response_body)
      @tag_on_request_failure.each { |tag| event.tag(tag) }
    else
      @logger.debug? && @logger.debug('success received',
                                      :code => code, :body => response_body)
      process_response(response_body, response_headers, event)
      filter_matched(event)
    end
  end # def filter

  private
  def request_http(verb, url, options = {})
    response = client.http(verb, url, options)
    [response.code, response.headers, response.body]
  end

  def sprintf_object(event, obj)
    case obj
    when Array
      obj.map {|el| sprintf_object(event, el) }
    when Hash
      obj.inject({}) {|acc, (k,v)| acc[sprintf_object(event, k)] = sprintf_object(event, v); acc }
    when String
      event.sprintf(obj)
    else
      obj
    end
  end

  def process_response(body, headers, event)
    content_type, _ = headers.fetch("content-type", "").split(";")
    event.set(@target_headers, headers)
    if content_type == "application/json"
      begin
        parsed = LogStash::Json.load(body)
        event.set(@target_body, parsed)
      rescue => e
        if @logger.debug?
          @logger.warn('JSON parsing error', :message => e.message, :body => body)
        else
          @logger.warn('JSON parsing error', :message => e.message)
        end
        @tag_on_json_failure.each { |tag| event.tag(tag) }
      end
    else
      event.set(@target_body, body.strip)
    end
  end

end # class LogStash::Filters::Rest
