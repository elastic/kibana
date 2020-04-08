module Seahorse
  module Client
    module Plugins

      # Enables logging for all requests.  This plugin allows you to configure
      # your logging device, the log format and the level to log messages at.
      #
      # @see Logging::Formatter
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
      class Logging < Plugin

        option(:logger, nil)

        option(:log_level, :info)

        option(:log_formatter, Client::Logging::Formatter.default)

        def add_handlers(handlers, config)
          if config.logger
            handlers.add(Client::Logging::Handler, step: :validate)
          end
        end

      end
    end
  end
end
