require 'set'

module Aws
  module Resources
    class Documenter
      class BaseOperationDocumenter

        include Api::Docs::Utils
        include Seahorse::Model::Shapes

        def initialize(yard_class, resource_class, operation_name, operation)
          @yard_class = yard_class
          @resource_class = resource_class
          @resource_class_name = @resource_class.name.split('::').last
          @operation_name = operation_name.to_s
          @operation = operation
          @source = @operation.source
          if @operation.respond_to?(:request)
            @api_request_name = @operation.request.method_name
            @api_request = @resource_class.client_class.api.operation(@api_request_name)
            @api_request_params = @operation.request.params
            @request_operation_name = @operation.request.method_name.to_s
            @called_operation = "Client##{@api_request_name}"
            @yard_client_operation = YARD::Registry["#{@resource_class.client_class.name}##{api_request_name}"]

          end
          if @operation.respond_to?(:builder)
            @builder = @operation.builder
            @target_resource_class = @builder.resource_class
            @target_resource_class_name = @target_resource_class.name.split('::').last
          end
        end

        # @return [YARD::CodeObject::ClassObject]
        attr_reader :yard_class

        # @return [Class<Resource>] Returns the resource class this
        #   operation belongs to.
        attr_reader :resource_class

        # @return [String] The name of this resource operation.
        attr_reader :operation_name

        # @return [String] Returns the name of the resource class being
        #   documented without the namespace prefix. Example:
        #
        #   * Aws::S3::Resource => 'Resource'
        #   * Aws::S3::Bucket => 'Bucket'
        #
        attr_reader :resource_class_name

        # @return [Class<Resource>,nil] Returns the class of the resource
        #   returned by invoking this operation. Returns `nil` if this operation
        #   does not return any resource objects.
        attr_reader :target_resource_class

        # @return [String,nil] Returns the name of the resource class
        #   returned by this operation. This is the base name of
        #   the class without a namespace prefix. Returns `nil` if this
        #   operation does not return any resource objects.
        attr_reader :target_resource_class_name

        # @return [String,nil] Returns the name of the API operation called
        #   on the client. Returns `nil` if this operation does not make
        #   any API requests.
        attr_reader :api_request_name

        # @return [Seahorse::Model::Operation,nil] Returns the model of the
        #   API operation called. Returns `nil` if this operation does not make
        #   any API requests.
        attr_reader :api_request

        # @return [Array<Resources::RequestParams::Base>, nil] Returns the
        #   parameters this operation binds to the made request. Returns `nil`
        #   if this operation does not make a request.
        attr_reader :api_request_params

        # @return [String,nil] Returns the `Client#operation_name` reference.
        #   This is useful for generating `@see` tags and `{links}`.
        attr_reader :called_operation

        # @return [Builder,nil] Returns the resource builder for
        #   this operation. Returns `nil` if this operation does not build
        #   and return resource objects.
        attr_reader :builder

        # @return [Source]
        attr_reader :source

        # Constructs and returns a new YARD method object for this operation.
        # @return [YARD::CodeObject::MethodObject]
        def method_object
          if m = YARD::Registry[@resource_class.name + "##{operation_name}"]
          else
            m = YARD::CodeObjects::MethodObject.new(yard_class, operation_name)
            m.docstring = docstring
            m.parameters = parameters
          end
          m.scope = :instance
          if source
            m.source_type = :json
            m.source = source.format
            filename = source.file
            filename = filename.match('(aws-sdk-core/apis/.+)')[1]
            m.add_file(filename, nil, true)
          end
          tags.each do |tag|
            m.add_tag(tag)
          end
          m
        end

        private

        def parameters
          if option_tags.empty?
            []
          else
            [['options', '{}']]
          end
        end

        def docstring
          ''
        end

        def tags
          (option_tags + example_tags + [return_tag] + see_also_tags).compact
        end

        # This method should be overridden in sub-classes to add YARD tags
        # to the method code object.
        # @return [Array<YARD::Tag>]
        def example_tags
          if api_request && api_request.input
            [request_syntax_example_tag]
          else
            []
          end
        end

        def request_syntax_example_tag
          input = operation_input_ref(api_request, without: fixed_param_names)
          params = Api::Docs::ParamFormatter.new(input).format
          example = "#{variable_name}.#{operation_name}(#{params})"
          example = "@example Request syntax example with placeholder values" +
            "\n\n    " + example.lines.join('    ')
          tag(example)
        end

        def option_tags
          if api_request && api_request.input
            skip = fixed_param_names
            tags = []
            @yard_client_operation.tags.each do |tag|
              if YARD::Tags::OptionTag === tag
                next if skip.include?(tag.pair.name[1..-1]) # remove `:` prefix
                tags << tag
              end
            end
            tags
          else
            []
          end
        end

        # Returns a set of root input params that are provided by default
        # by this operation. These params should not be documented in syntax
        # examples or in option tags.
        def fixed_param_names
          if api_request_params
            Set.new(api_request_params.map { |p| p.target.split(/\b/).first })
          else
            Set.new
          end
        end

        # If this operation makes an API request, then a `@see` tag is
        # returned that references the client API operation.
        # @return [Array<YARD::Tag>]
        def see_also_tags
          tags = []
          tags += related_resource_operation_tags if target_resource_class
          tags += called_operation_tag if called_operation
          tags
        end

        def called_operation_tag
          tag = "@see #{called_operation}"
          YARD::DocstringParser.new.parse(tag).to_docstring.tags
        end

        def related_resource_operation_tags
          tags = []
          resource_class.operations.each do |name,op|
            if
              name.to_s != self.operation_name &&
              op.respond_to?(:builder) &&
              op.builder.resource_class == target_resource_class
            then
              tags << "@see ##{name}"
            end
          end
          YARD::DocstringParser.new.parse(tags.sort.join("\n")).to_docstring.tags
        end

        # Returns a suitable variable name for the resource class being
        # documented:
        #
        #    Aws::S3::Resource => 's3'
        #    Aws::S3::Bucket => 'bucket'
        #
        def variable_name
          parts = resource_class.name.split('::')
          (parts.last == 'Resource' ? parts[-2] : parts[-1]).downcase
        end

        def path_type
          case path_shape
          when StructureShape then 'Structure'
          when ListShape then 'Array'
          when MapShape then 'Hash'
          when StringShape then 'String'
          when IntegerShape then 'Integer'
          when FloatShape then 'Float'
          when BooleanShape then 'Boolean'
          when TimestampShape then 'Time'
          when BlobShape then 'IO'
          else
            raise "unhandled shape class `#{path_shape.class.name}'"
          end
        end

        def path_shape
          resolve_shape(response_shape, @operation.path)
        end

        # Returns the output shape for the called operation.
        def response_shape
          api = resource_class.client_class.api
          output = api.operation(@operation.request.method_name).output
          output ? output.shape : nil
        end

        def resolve_shape(shape, path)
          if path != '@'
            shape = path.scan(/\w+|\[.*?\]/).inject(shape) do |shape, part|
              if part[0] == '['
                shape.member.shape
              else
                shape.member(part).shape
              end
            end
          end
        end

        def param_type(ref)
          case ref.shape
          when BlobShape then 'IO'
          when BooleanShape then 'Boolean'
          when FloatShape then 'Float'
          when IntegerShape then 'Integer'
          when ListShape then 'Array'
          when MapShape then 'Hash'
          when StringShape then 'String'
          when StructureShape then 'Hash'
          when TimestampShape then 'Time'
          else raise 'unhandled type'
          end
        end

        def docs(ref)
          ref.documentation || ref.shape.documentation
        end

      end
    end
  end
end
