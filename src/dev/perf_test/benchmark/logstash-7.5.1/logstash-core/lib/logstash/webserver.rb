# encoding: utf-8
require "logstash/api/rack_app"
require "puma"
require "puma/server"
require "logstash/patches/puma"
require "concurrent"
require "thread"

module LogStash
  class WebServer
    extend Forwardable

    attr_reader :logger, :status, :config, :options, :runner, :binder, :events, :http_host, :http_ports, :http_environment, :agent

    def_delegator :@runner, :stats

    DEFAULT_HOST = "127.0.0.1".freeze
    DEFAULT_PORTS = (9600..9700).freeze
    DEFAULT_ENVIRONMENT = 'production'.freeze

    def initialize(logger, agent, options={})
      @logger = logger
      @agent = agent
      @http_host = options[:http_host] || DEFAULT_HOST
      @http_ports = options[:http_ports] || DEFAULT_PORTS
      @http_environment = options[:http_environment] || DEFAULT_ENVIRONMENT
      @options = {}
      @status = nil
      @running = Concurrent::AtomicBoolean.new(false)
    end

    def run
      logger.debug("Starting puma")

      stop # Just in case

      running!

      http_ports.each_with_index do |port, idx|
        begin
          if running?
            @port = port
            logger.debug("Trying to start WebServer", :port => @port)
            start_webserver(@port)
          else
            break # we are closing down the server so just get out of the loop
          end
        rescue Errno::EADDRINUSE
          if http_ports.count == 1
            raise Errno::EADDRINUSE.new(I18n.t("logstash.web_api.cant_bind_to_port", :port => http_ports.first))
          elsif idx == http_ports.count-1
            raise Errno::EADDRINUSE.new(I18n.t("logstash.web_api.cant_bind_to_port_in_range", :http_ports => http_ports))
          end
        end
      end
    end

    def running!
      @running.make_true
    end

    def running?
      @running.value
    end

    def address
      "#{http_host}:#{@port}"
    end

    def stop(options={})
      @running.make_false
      @server.stop(true) if @server
    end

    def start_webserver(port)
      # wrap any output that puma could generate into a wrapped logger
      # use the puma namespace to override STDERR, STDOUT in that scope.
      Puma::STDERR.logger = logger
      Puma::STDOUT.logger = logger

      io_wrapped_logger = LogStash::IOWrappedLogger.new(logger)

      app = LogStash::Api::RackApp.app(logger, agent, http_environment)

      events = ::Puma::Events.new(io_wrapped_logger, io_wrapped_logger)

      @server = ::Puma::Server.new(app, events)
      @server.add_tcp_listener(http_host, port)

      logger.info("Successfully started Logstash API endpoint", :port => port)

      set_http_address_metric("#{http_host}:#{port}")

      @server.run.join
    end

    private
    def set_http_address_metric(value)
      return unless @agent.metric
      @agent.metric.gauge([], :http_address, value)
    end
  end
end
