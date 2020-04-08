module Aws
  module Resources
    module RequestParams

      # @api private
      class ParamHash

        # @param [Array<RequestParams::Param>] params
        def initialize(params)
          @params = params
        end

        # @option options [required,Resource] :resource
        # @option options [required,Array<Mixed>] :args
        # @return [Hash]
        def build(options = {})
          deep_merge(user_params(options), computed_params(options))
        end

        private

        def user_params(options)
          args = options[:args] || []
          args.last.is_a?(Hash) ? args.last : {}
        end

        def computed_params(options)
          params_hash = {}
          Array(options[:resource]).each.with_index do |resource, n|
            @params.each do |param|
              param.apply(params_hash, options.merge(resource: resource, n: n))
            end
          end
          params_hash
        end

        def deep_merge(obj1, obj2)
          case obj1
          when Hash then obj1.merge(obj2) { |key, v1, v2| deep_merge(v1, v2) }
          when Array then obj2 + obj1
          else obj2
          end
        end

      end

      module Param

        def initialize(options)
          @target = options[:target].to_s
          @steps = []
          @target.scan(/\w+|\[\]|\[\*\]|\[[0-9]+\]/) do |step|
            case step
            when /\[\d+\]/ then @steps += [:array, step[1..-2].to_i]
            when /\[\*\]/ then @steps += [:array, :n]
            when '[]' then @steps += [:array, -1]
            else @steps += [:hash, step.to_sym]
            end
          end
          @steps.shift
          @final = @steps.pop
        end

        # @return [String] target
        attr_reader :target

        def apply(params, options = {})
          if @final == -1
            build_context(params, options[:n]) << value(options)
          else
            build_context(params, options[:n])[@final] = value(options)
          end
          params
        end

        private

        def build_context(params, n)
          @steps.each_slice(2).inject(params) do |context, (key, type)|
            entry = type == :array ? [] : {}
            if key == -1
              context << entry
              entry
            elsif key == :n
              context[n] ||= entry
            else
              context[key] ||= entry
            end
          end
        end

      end

      class Identifier

        include Param

        def initialize(options)
          @identifier_name = options[:name]
          super
        end

        def value(options)
          options[:resource].send(@identifier_name)
        end

      end

      class DataMember

        include Param

        def initialize(options)
          @path = options[:path]
          super
        end

        def value(options)
          JMESPath.search(@path, options[:resource].data)
        end

      end

      class Literal

        include Param

        def initialize(options)
          @value = options[:value]
          super
        end

        def value(*args)
          @value
        end

      end
    end
  end
end
