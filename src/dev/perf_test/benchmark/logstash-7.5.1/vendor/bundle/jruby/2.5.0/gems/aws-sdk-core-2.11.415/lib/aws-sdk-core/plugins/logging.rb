module Aws
  module Plugins

    # Enables logging for all requests.  This plugin allows you to configure
    # your logging device, the log format and the level to log messages at.
    #
    # @see Log::Formatter
    #
    # @seahorse.client.option [Logger] :logger (nil) The Logger instance
    #   to send log messages to.  If this option is not set, logging
    #   will be disabled.
    #
    # @seahorse.client.option [Symbol] :log_level (:info) The log level
    #   to send messages to the logger at.
    #
    # @seahorse.client.option [Logging::LogFormatter] :log_formatter The log
    #   formatter.  Defaults to {Seahorse::Client::Logging::Formatter.default}.
    #
    class Logging < Seahorse::Client::Plugin

      option(:logger)

      option(:log_level, :info)

      option(:log_formatter) do |config|
        Log::Formatter.default if config.logger
      end

      def add_handlers(handlers, config)
        handlers.add(Handler, step: :validate) if config.logger
      end

      class Handler < Seahorse::Client::Handler

        # @param [RequestContext] context
        # @return [Response]
        def call(context)
          context[:logging_started_at] = Time.now
          @handler.call(context).tap do |response|
            context[:logging_completed_at] = Time.now
            log(context.config, response)
          end
        end

        private

        # @param [Configuration] config
        # @param [Response] response
        # @return [void]
        def log(config, response)
          config.logger.send(config.log_level, format(config, response))
        end

        # @param [Configuration] config
        # @param [Response] response
        # @return [String]
        def format(config, response)
          config.log_formatter.format(response)
        end

      end
    end
  end
end
