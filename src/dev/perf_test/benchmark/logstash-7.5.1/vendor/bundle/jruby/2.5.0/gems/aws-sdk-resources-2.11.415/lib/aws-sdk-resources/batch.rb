module Aws
  module Resources

    # A batch provides array like access to a list of resources. Batches
    # also provide the ability to invoke certain operations against
    # the entire batch.
    #
    # ## Getting a Batch
    #
    # You should normally not need to construct a batch. Anywhere a list
    # of resources is returned, they are returned as a batch:
    #
    #     # security_groups is a batch
    #     security_groups = ec2.instance('i-12345678').security_groups
    #
    # When the possible number of resources is unknown or large, the
    # resources will be returned in a collection. Collections can enumerate
    # individual resources or batches. They manage paging over the
    # AWS request/responses to produce batches.
    #
    #     # objects is a collection
    #     objects = s3.bucket('aws-sdk').objects
    #
    # You can invoke batch operations against collections and they will
    # invoke them on each batch.
    #
    #     # delete all objects in this bucket in batches of 1k
    #     objects = s3.bucket('aws-sdk').objects
    #     objects.delete
    #
    # ## Batch Operations
    #
    # Batches provide operations that operate on the entire batch. These
    # operations are only defined for resources where the AWS API accepts
    # multiple inputs. This means a batch operation for n resources will
    # only make one request.
    #
    # Resource classes document each of their own batch operations.
    # See {S3::Object} for an example.
    #
    class Batch

      include Enumerable

      # @param [Array<Resource>] resources
      # @option options [Seahorse::Client::Response] :response
      def initialize(resource_class, resources, options = {})
        @resource_class = resource_class
        @resources = resources
        @response = options[:response]
        @size = resources.size
        @options = options
      end

      # @return [Class<Resource>]
      attr_reader :resource_class

      # @return [Seahorse::Client::Response, nil]
      attr_reader :response

      # @return [Integer]
      attr_reader :size

      alias count size

      # @param [Integer] index
      # @return [Resource]
      def [](index)
        @resources[index]
      end

      # Yields each resource of the batch, one at a time.
      def each(&block)
        enum = @resources.to_enum
        enum.each(&block) if block_given?
        enum
      end

      # @param [Integer] count
      # @return [Resource, Batch]
      def first(count = nil)
        if count
          self.class.new(@resource_class, @resources.first(count), @options)
        else
          @resources.first
        end
      end

      # @return [Boolean]
      def empty?
        @resources.empty?
      end

      # @api private
      def inspect
        "#<#{self.class.name} resources=#{@resources.inspect}>"
      end

      # @api private
      def respond_to?(method_name, *args)
        if @resource_class.batch_operation_names.include?(method_name.to_sym)
          true
        else
          super
        end
      end

      # @api private
      def method_missing(method_name, *args, &block)
        if respond_to?(method_name)
          invoke_batch_operation(method_name, args, block) unless empty?
        else
          super
        end
      end

      private

      def invoke_batch_operation(method_name, args, block)
        self.class.validate_batch_args!(args)
        operation = @resource_class.batch_operation(method_name)
        operation.call(resource:self, args:args, block:block)
      end

      class << self

        # @api private
        def validate_batch_args!(args)
          case args.count
          when 0
          when 1
            unless Hash === args.first
              raise ArgumentError, "expected options to be a hash"
            end
          else
            raise ArgumentError, "wrong number of arguments, expected 0 or 1"
          end
        end

      end
    end
  end
end
