module Aws
  module Resources
    module BuilderSources

      module Source

        def initialize(options)
          @source = options[:source]
          @target = options[:target].to_sym
        end

        # @return [String, nil]
        attr_reader :source

        # @return [Symbol]
        attr_reader :target

        # @return [Boolean]
        def plural?
          !!(@source && @source.include?('['))
        end

      end

      class Argument

        include Source

        # @option [required, String] :argument
        def extract(options)
          (options[:args] || [])[@source]
        end

        def plural?
          false
        end

      end

      # Extracts an identifier from a parent resource identifier.  Used
      # when building a {Resource} from the context of another resource.
      class Identifier

        include Source

        # @option [required, Resource] :resource
        def extract(options)
          options[:resource].send(@source)
        end

      end

      # Extracts an identifier from the data of a parent resource.  Used
      # when building a {Resource} from the context of another resource.
      class DataMember

        include Source

        # @option [required, Resource] :resource
        def extract(options)
          JMESPath.search(@source, options[:resource].data)
        end

      end

      # Extracts an identifier from the request parameters used to generate
      # a response.  Used when building a {Resource} object from the response
      # of an operation.
      class RequestParameter

        include Source

        # @option [required, Seahorse::Client::Response] :response
        def extract(options)
          JMESPath.search(@source, options[:response].context.params)
        end

      end

      # Extracts an identifier from the data of a response.  Used when
      # building a {Resource} object from the response of an operation.
      class ResponsePath

        include Source

        # @option [required, Seahorse::Client::Response] :response
        def extract(options)
          JMESPath.search(@source, options[:response].data)
        end

      end

      # Supplies a string literal.
      class StringLiteral

        include Source

        def extract(options)
          @source
        end

      end
    end
  end
end
