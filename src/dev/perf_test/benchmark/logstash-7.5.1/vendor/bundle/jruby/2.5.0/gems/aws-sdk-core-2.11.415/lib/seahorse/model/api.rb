module Seahorse
  module Model
    class Api

      def initialize
        @metadata = {}
        @operations = {}
        @endpoint_operation = nil
      end

      # @return [String, nil]
      attr_accessor :version

      # @return [Hash]
      attr_accessor :metadata

      # @return [Symbol|nil]
      attr_accessor :endpoint_operation

      def operations(&block)
        if block_given?
          @operations.each(&block)
        else
          @operations.enum_for(:each)
        end
      end

      def operation(name)
        if @operations.key?(name.to_sym)
          @operations[name.to_sym]
        else
          raise ArgumentError, "unknown operation #{name.inspect}"
        end
      end

      def operation_names
        @operations.keys
      end

      def add_operation(name, operation)
        @operations[name.to_sym] = operation
      end

    end
  end
end
