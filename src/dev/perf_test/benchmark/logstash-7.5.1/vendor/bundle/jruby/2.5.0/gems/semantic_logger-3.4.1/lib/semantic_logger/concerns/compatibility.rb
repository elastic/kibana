# :nodoc:
module SemanticLogger
  # :nodoc:
  module Concerns
    # :nodoc:
    module Compatibility
      #
      # For compatibility with Ruby Logger only.
      #
      def self.included(base)
        base.class_eval do
          # Map :unknown to :error
          alias_method :unknown, :error # :nodoc:
          alias_method :unknown?, :error? # :nodoc:

          alias_method :<<, :info # :nodoc:
          # Active Record's Session Store calls silence_logger
          alias_method :silence_logger, :silence # :nodoc:

          alias_method :progname, :name # :nodoc:
          alias_method :progname=, :name= # :nodoc:

          alias_method :sev_threshold, :level # :nodoc:
          alias_method :sev_threshold=, :level= # :nodoc:

          attr_accessor :formatter # :nodoc:
          attr_accessor :datetime_format # :nodoc:
        end
      end

      # :nodoc:
      def close
      end

      # :nodoc:
      def reopen(logdev = nil)
      end

      # :nodoc:
      def add(severity, message = nil, progname = nil, &block)
        index = SemanticLogger.send(:level_to_index, severity)
        if level_index <= index
          level = SemanticLogger.send(:index_to_level, index)
          log_internal(level, index, message, progname, &block)
          true
        else
          false
        end
      end

    end
  end
end
