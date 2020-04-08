module Aws
  module Resources
    class Collection

      include Enumerable

      # @param [HasManyOperation] operation
      # @option (see HasManyOperation#call)
      # @api private
      def initialize(operation, options)
        @operation = operation
        @options = options
      end

      # @return [Enumerator<Resource>]
      def each(&block)
        if block_given?
          batches.each { |batch| batch.each(&block) }
        else
          self
        end
      end

      # @api private
      # @return [Enumerator<Batch>]
      def batches(&block)
        @operation.batches(@options)
      end

      # Specifies the maximum number of items to enumerate.
      #
      #     collection.limit(10).each do |resource|
      #       # yields at most 10 times
      #     end
      #
      # @param [Integer] limit The maximum number of items to yield
      #   via {#each} or {#batches}.
      # @return [Collection]
      def limit(limit)
        self.class.new(@operation, @options.merge(limit: limit))
      end

      # Returns the first resource from the collection.
      #
      #     resource = collection.first
      #
      # If you pass a count, then the first `count` resources are returned in
      # a single batch. See the resource specific batch documentation for
      # a list of supported batch methods.
      #
      #     resources = collection.first(10)
      #     resources.delete
      #
      # @return [Resource, Batch]
      def first(count = 1)
        if count == 1
          limit(1).to_a.first
        else
          Batch.new(resource_class, limit(count).to_a)
        end
      end

      # @api private
      def respond_to?(method_name, *args)
        if resource_class.batch_operation_names.include?(method_name.to_sym)
          true
        else
          super
        end
      end

      # @api private
      def method_missing(method_name, *args, &block)
        if respond_to?(method_name)
          Batch.validate_batch_args!(args)
          batches.each do |batch|
            batch.send(method_name, *args, &block)
          end
        else
          super
        end
      end

      # @api private
      def inspect
        parts = {}
        parts[:type] = resource_class.name
        parts[:limit] = @options[:limit]
        parts[:params] = @options[:params] || {}
        parts = parts.inject("") {|s,(k,v)| s << " #{k}=#{v.inspect}" }
        ['#<', self.class.name, parts, '>'].join
      end

      private

      # @api private
      def limit_key
        @operation.limit_key
      end

      def resource_class
        @operation.builder.resource_class
      end

    end
  end
end
