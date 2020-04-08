# encoding: utf-8
require "logstash/json"
require "manticore"
require 'logstash/util/manticore_ssl_config_helper'

module LogStash module Modules class KibanaClient
  include LogStash::Util::Loggable

  include LogStash::Util::ManticoreSSLConfigHelper

  class Response
    # to create a custom response with body as an Object (Hash or Array)
    attr_reader :status, :body, :headers
    def initialize(status, body, headers={})
      @status, @body, @headers = status, body, headers
      @body = body.is_a?(String) ? LogStash::Json.load(body) : body
    end

    def succeeded?
      @status >= 200 && @status < 300
    end

    def failed?
      !succeeded?
    end
  end

  SCHEME_REGEX = /^https?$/

  attr_reader :version, :endpoint

  def initialize(settings, client = nil) # allow for test mock injection
    @settings = settings

    client_options = {
      request_timeout: 5,
      connect_timeout: 5,
      socket_timeout: 5,
      pool_max: 10,
      pool_max_per_route: 2
    }

    ssl_options = manticore_ssl_options_from_config('kibana', settings)
    ssl_enabled = ssl_options.any?

    client_options[:ssl] = ssl_options

    @host = @settings.fetch("var.kibana.host", "localhost:5601")
    implicit_scheme, colon_slash_slash, host = @host.partition("://")
    explicit_scheme = @settings["var.kibana.scheme"]
    @scheme = "http"
    if !colon_slash_slash.empty?
      if !explicit_scheme.nil? && implicit_scheme != explicit_scheme
        # both are set and not the same - error
        msg = sprintf("Detected differing Kibana host schemes as sourced from var.kibana.host: '%s' and var.kibana.scheme: '%s'", implicit_scheme, explicit_scheme)
        raise ArgumentError.new(msg)
      end
      @scheme = implicit_scheme
      @host = host
    elsif !explicit_scheme.nil?
      @scheme = explicit_scheme
    end

    if SCHEME_REGEX.match(@scheme).nil?
      msg = sprintf("Kibana host scheme given is invalid, given value: '%s' - acceptable values: 'http', 'https'", @scheme)
      raise ArgumentError.new(msg)
    end

    if ssl_enabled && @scheme != "https"
      @scheme = "https"
    end

    @endpoint = "#{@scheme}://#{@host}"

    @client = client || Manticore::Client.new(client_options)
    @http_options = {:headers => {'Content-Type' => 'application/json'}}
    username = @settings["var.kibana.username"]
    if username
      password = @settings["var.kibana.password"]
      if password.is_a?(LogStash::Util::Password)
        password = password.value
      end
      @http_options[:headers]['Authorization'] = 'Basic ' + Base64.encode64( "#{username}:#{password}" ).chomp
    end

    # e.g. {"name":"Elastics-MacBook-Pro.local","version":{"number":"6.0.0-beta1","build_hash":"41e69","build_number":15613,"build_snapshot":true}..}
    @version = "0.0.0"
    response = get("api/status")
    if response.succeeded?
      status = response.body
      if status["version"].is_a?(Hash)
        @version = status["version"]["number"]
        if status["version"]["build_snapshot"]
          @version.concat("-SNAPSHOT")
        end
      end
    end
    @http_options[:headers]['kbn-version'] = @version
  end

  def version_parts
    @version.split(/[.-]/)
  end

  def host_settings
    "[\"#{@host}\"]"
  end

  def get(relative_path)
    # e.g. api/kibana/settings
    safely(:get, relative_path, @http_options)
  end

  # content will be converted to a json string
  def post(relative_path, content, headers = nil)

    body = content.is_a?(String) ? content : LogStash::Json.dump(content)
    options = {:body => body}.merge(headers || @http_options)
    safely(:post, relative_path, options)
  end

  def head(relative_path)
    safely(:head, relative_path, @http_options)
  end

  def can_connect?
    head("api/status").succeeded?
  end

  private

  def safely(method_sym, relative_path, options = {})
    begin
      resp = @client.http(method_sym, full_url(relative_path), options).call
      Response.new(resp.code, resp.body, resp.headers)
    rescue Manticore::ManticoreException => e
      logger.error("Error when executing Kibana client request", :error => e)
      body = {"statusCode" => 0, "error" => e.message}
      Response.new(0, body, {})
    end
  end

  def full_url(relative)
    "#{@endpoint}/#{relative}"
  end
end end end
