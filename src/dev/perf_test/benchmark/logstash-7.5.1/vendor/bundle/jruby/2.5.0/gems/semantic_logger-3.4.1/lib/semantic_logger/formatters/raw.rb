require 'json'
module SemanticLogger
  module Formatters
    class Raw < Base
      # Returns log messages in Hash format
      def call(log, logger)
        log.to_h(log_host ? logger.host : nil, log_application ? logger.application : nil)
      end

    end
  end
end

