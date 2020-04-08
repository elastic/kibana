# encoding: utf-8
require "elasticsearch"
require "elasticsearch/transport/transport/http/manticore"
require 'logstash/util/manticore_ssl_config_helper'

module LogStash class ElasticsearchClient
  include LogStash::Util::Loggable

  class Response
    # duplicated here from Elasticsearch::Transport::Transport::Response
    # to create a normalised response across different client IMPL
    attr_reader :status, :body, :headers
    def initialize(status, body, headers={})
      @status, @body, @headers = status, body, headers
      @body = body.force_encoding('UTF-8') if body.respond_to?(:force_encoding)
    end
  end

  def self.build(settings)
    new(RubyClient.new(settings, logger))
  end

  class RubyClient
    include LogStash::Util::ManticoreSSLConfigHelper

    def initialize(settings, logger)
      @settings = settings
      @logger = logger
      @client_args = client_args

      ssl_options = manticore_ssl_options_from_config('elasticsearch', settings)

      @client_args[:ssl] = ssl_options

      username = @settings["var.elasticsearch.username"]
      if username
        password = @settings["var.elasticsearch.password"]
        if password.is_a?(LogStash::Util::Password)
          password = password.value
        end
        @client_args[:transport_options] = { :headers => { "Authorization" => 'Basic ' + Base64.encode64( "#{username}:#{password}" ).chomp } }
      end

      @client = Elasticsearch::Client.new(@client_args)
    end

    def can_connect?
      begin
        head(SecureRandom.hex(32).prepend('_'))
      rescue Elasticsearch::Transport::Transport::Errors::BadRequest
        true
      rescue Manticore::SocketException
        false
      end
    end

    def host_settings
      @client_args[:hosts]
    end

    def delete(path)
      begin
        normalize_response(@client.perform_request('DELETE', path, {}, nil))
      rescue Exception => e
        if e.class.to_s =~ /NotFound/ || e.message =~ /Not\s*Found|404/i
          Response.new(404, "", {})
        else
          raise e
        end
      end
    end

    def put(path, content)
      normalize_response(@client.perform_request('PUT', path, {}, content))
    end

    def head(path)
      begin
        normalize_response(@client.perform_request('HEAD', path, {}, nil))
      rescue Exception => e
        if is_404_error?(e)
          Response.new(404, "", {})
        else
          raise e
        end
      end
    end

    private

    def is_404_error?(error)
      error.class.to_s =~ /NotFound/ || error.message =~ /Not\s*Found|404/i
    end

    def normalize_response(response)
      Response.new(response.status, response.body, response.headers)
    end

    def client_args
      {
        :transport_class => Elasticsearch::Transport::Transport::HTTP::Manticore,
        :hosts => [*unpack_hosts],
        # :logger => @logger, # silence the client logging
      }
    end

    def unpack_hosts
      setting = @settings.fetch("var.elasticsearch.hosts", "localhost:9200")
      if setting.is_a?(String)
        return setting.split(',').map(&:strip)
      end
      setting
    end
  end

  def initialize(client)
    @client = client
  end

  def delete(path)
    @client.delete(path)
  end

  def put(path, content)
    @client.put(path, content)
  end

  def head(path)
    @client.head(path)
  end

  def can_connect?
    @client.can_connect?
  end

  def host_settings
    @client.host_settings
  end
end end
