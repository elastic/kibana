module Aws
  module Resources
    module OperationMethods

      # @param [Symbol] name
      # @return [Operation] Returns the named operation.
      # @raise [Errors::UnknownOperationError]
      def operation(name)
        @operations[name.to_sym] or
          raise Errors::UnknownOperationError.new(name)
      end

      # @param [Symbol] method_name
      # @param [Operation] operation
      # @return [void]
      def add_operation(method_name, operation = nil, &definition)
        operation = definition if block_given?
        safe_define_method(method_name) do |*args, &block|
          operation.call(resource:self, args:args, block:block)
        end
        @operations[method_name.to_sym] = operation
      end

      # @return [Hash]
      def operations(&block)
        @operations.dup
      end

      # @return [Array<Symbol>]
      def operation_names
        @operations.keys.sort
      end

      # @param [Symbol] name
      # @return [Operation] Returns the named batch operation.
      # @raise [Errors::UnknownOperationError]
      def batch_operation(name)
        @batch_operations[name.to_sym] or
          raise Errors::UnknownOperationError.new(name)
      end

      # @param [Symbol] method_name
      # @param [Operation] operation
      # @return [void]
      def add_batch_operation(method_name, operation = nil, &definition)
        operation = definition if block_given?
        @batch_operations[method_name.to_sym] = operation
      end

      # @return [Hash]
      def batch_operations(&block)
        @batch_operations.dup
      end

      # @return [Array<Symbol>]
      def batch_operation_names
        @batch_operations.keys.sort
      end

      # @api private
      def inherited(subclass)
        subclass.send(:instance_variable_set, "@operations", {})
        subclass.send(:instance_variable_set, "@batch_operations", {})
      end

      private

      def safe_define_method(method_name, &block)
        if
          instance_methods.include?(method_name.to_sym) &&
          ENV['AWS_SDK_SAFE_DEFINE']
        then
          msg = "unable to define method #{name}##{method_name}, "
          msg << "method already exists"
          raise Errors::DefinitionError, msg
        else
          define_method(method_name, &block)
        end
      end

    end
  end
end
