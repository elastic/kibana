module Aws
  module Resources
    module Operations

      # Base class for operations. An operation is any object that responds
      # to `#call` receiving a hash of options including:
      #
      # * `:resource` - The resource object the operation is invoked against.
      # * `:args` - An array of arguments given by the caller
      # * `:block` - An optional block argument
      #
      class Base

        include Options

        def initialize(options = {})
          @source = options[:source]
        end

        # @return [Source, nil]
        attr_reader :source

      end

      # Makes an API request using the resource client, returning the client
      # response.  Most operation classes extend this basic operation.
      class Operation < Base

        # @option options [required, Request] :request
        def initialize(options = {})
          @request = option(:request, options)
          super
        end

        # @return [Request]
        attr_reader :request

        # @option (see Base#call)
        # @return [Seahorse::Client::Response]
        def call(options)
          @request.call(options)
        end

      end

      class LoadOperation < Operation

        # @option options [required, Request] :request
        # @option options [required, String<JMESPath>] :path
        def initialize(options = {})
          @path = option(:path, options)
          super
        end

        # @return [String<JMESPath>]
        attr_reader :path

        # @option (see Base#call)
        # @return [Object] Returns the value resolved to by {#path}.
        def call(options)
          extract(super)
        end

        private

        def extract(resp)
          JMESPath.search(@path, resp.data)
        end

      end

      class ResourceOperation < Operation

        # @option options [required, Request] :request
        # @option options [required, Builder] :builder
        def initialize(options = {})
          @builder = option(:builder, options)
          super
        end

        # @return [Builder]
        attr_reader :builder

        # @option (see Base#call)
        # @return [Resource, Array<Resource>]
        def call(options)
          @builder.build(options.merge(response:super))
        end

      end

      class HasManyOperation < ResourceOperation

        # @option options [required, Request] :request
        # @option options [required, Builder] :builder
        # @option options [Symbol] :limit_key
        def initialize(options)
          @limit_key = options[:limit_key]
          super
        end

        # @return [Builder]
        attr_reader :builder

        # @return [Symbol, nil]
        attr_reader :limit_key

        # @option (see Base#call)
        # @return [Collection]
        def call(options)
          validate_args!(options)
          Collection.new(self, options)
        end

        # @api private
        # @return [Enumerator<Batch>]
        def batches(options, &block)
          if options[:limit]
            enum_for(:limited_batches, options[:limit], options, &block)
          else
            enum_for(:all_batches, options, &block)
          end
        end

        private

        def validate_args!(options)
          args = options[:args]
          unless args.count == 0 || args.count == 1
            msg = "wrong number of arguments (given #{args.count}, expected 0..1)"
            raise ArgumentError, msg
          end
          unless args[0].nil? || Hash === args[0]
            raise ArgumentError, "expected Hash, got #{args[0].class}"
          end
        end

        def all_batches(options, &block)
          resp = @request.call(options)
          if resp.respond_to?(:each)
            resp.each do |response|
              yield(@builder.build(options.merge(response:response)))
            end
          else
            yield(@builder.build(options.merge(response:resp)))
          end
        end

        def limited_batches(limit, options, &block)
          remaining = limit
          all_batches(options) do |batch|
            if batch.size < remaining
              yield(batch)
              remaining -= batch.size
            else
              yield(batch.first(remaining))
              return
            end
          end
        end

      end

      class HasOperation < Base

        # @option options [required, Builder] :builder
        def initialize(options = {})
          @builder = option(:builder, options)
          super
        end

        # @return [Builder]
        attr_reader :builder

        # @option (see Base#call)
        # @return [Resource]
        def call(options)
          if argc(options) == arity
            @builder.build(options)
          else
            msg = "wrong number of arguments (#{argc(options)} for #{arity})"
            raise ArgumentError, msg
          end
        end

        def arity
          @builder.sources.count { |s| BuilderSources::Argument === s }
        end

        private

        def argc(options)
          (options[:args] || []).count
        end

      end

      class WaiterOperation < Base

        include Options

        def initialize(options = {})
          @waiter_name = option(:waiter_name, options)
          @waiter_params = option(:waiter_params, options)
          @path = options[:path]
          super
        end

        # @return [Symbol]
        attr_reader :waiter_name

        # @return [Array<RequestParams::Base>]
        attr_reader :waiter_params

        # @return [String<JMESPathExpression>, nil]
        attr_reader :path

        # @option options [required,Resource] :resource
        # @option options [required,Array<Mixed>] :args
        def call(options)

          resource = options[:resource]

          params_hash = options[:args].first || {}
          @waiter_params.each do |param|
            param.apply(params_hash, options)
          end

          resp = resource.client.wait_until(@waiter_name, params_hash, &options[:block])

          resource_opts = resource.identifiers.dup
          if @path && resp.respond_to?(:data)
            resource_opts[:data] = JMESPath.search(@path, resp.data)
          end
          resource_opts[:client] = resource.client
          resource.class.new(resource_opts)
        end

      end

      # @api private
      class DeprecatedOperation

        def initialize(options = {})
          @name = options[:name]
          @deprecated_name = options[:deprecated_name]
          @resource_class = options[:resource_class]
          @operation = @resource_class.batch_operation(@name)
          @warned = false
        end

        def call(*args)
          unless @warned
            @warned = true
            warn(deprecation_warning)
          end
          @operation.call(*args)
        end

        private

        def deprecation_warning
          "DEPRECATION WARNING: called deprecated batch method " +
          "`##{@deprecated_name}` on a batch of `#{@resource_class.name}` " +
          "objects; use `##{@name}` instead"
        end

        class << self

          def define(options = {})
            klass = options[:resource_class]
            deprecated_name = options[:deprecated_name]
            klass.add_batch_operation(deprecated_name, new(options))
          end

        end
      end
    end
  end
end
