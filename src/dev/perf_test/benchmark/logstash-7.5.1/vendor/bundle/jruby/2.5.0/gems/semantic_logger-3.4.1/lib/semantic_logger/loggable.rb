# Logger class variable mix-in
#
#   Lazy initialize a logger class variable with instance accessor
#
#   By including this mix-in into any class it will define a class level logger
#   and also make it accessible via instance methods
#
# Example
#
#  require 'semantic_logger'
#  SemanticLogger.default_level = :debug
#  SemanticLogger.add_appender(io: STDOUT, formatter: :color)
#
#  class ExternalSupplier
#    # Create class and instance logger methods
#    include SemanticLogger::Loggable
#
#    def call_supplier(amount, name)
#      logger.debug "Calculating with amount", { amount: amount, name: name }
#
#      # Measure and log on completion how long the call took to the external supplier
#      logger.measure_info "Calling external interface" do
#        # Code to call the external supplier ...
#      end
#    end
#  end
module SemanticLogger
  module Loggable

    def self.included(base)
      base.class_eval do
        # Returns [SemanticLogger::Logger] class level logger
        def self.logger
          @semantic_logger ||= SemanticLogger[self]
        end

        # Replace instance class level logger
        def self.logger=(logger)
          @semantic_logger = logger
        end

        # Returns [SemanticLogger::Logger] instance level logger
        def logger
          @semantic_logger ||= self.class.logger
        end

        # Replace instance level logger
        def logger=(logger)
          @semantic_logger = logger
        end
      end
    end

  end
end
