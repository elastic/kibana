module Aws
  module Api
    module Docs
      class ClientTypeDocumenter

        include Utils
        include Seahorse::Model
        include Seahorse::Model::Shapes

        # @param [Yard::CodeObjects::Base] namespace
        def initialize(namespace)
          @namespace = namespace
        end

        # @param [Seahorse::Model::Api] api
        # @param [Seahorse::Model::Shapes::StructureShape] shape
        def document(api, shape)
          yard_class = YARD::CodeObjects::ClassObject.new(@namespace, shape.name)
          yard_class.superclass = 'Struct'
          yard_class.docstring = docstring(api, shape)
          tags(api, shape).each do |tag|
            yard_class.add_tag(tag)
          end
          shape.members.each do |member_name, ref|
            document_struct_member(yard_class, member_name, ref)
          end
        end

        private

        def docstring(api, shape)
          docs = shape.documentation || ''
          methods = returned_by(api, shape)
          unless methods.empty?
            docs += "<p>Returned by:</p>"
            docs += "<ul>"
            docs += methods.map{|m| "<li>{#{m}}</li>" }.join
            docs += "</ul>"
          end
          docs
        end

        def tags(api, shape)
          tags = []
          tags << input_example_tag(api, shape) if input_shape?(api, shape)
          tags << see_also_tag(api, shape) if redirectable?(api, shape)
          tags
        end

        # Returns `true` if the given shape is ever used as input in the api.
        def input_shape?(haystack, needle, stack = [])
          if stack.include?(haystack)
            return false
          else
            stack += [haystack]
          end
          case haystack
          when needle
            return true
          when Seahorse::Model::Api
            haystack.operations.each do |_, operation|
              if operation.input && input_shape?(operation.input.shape, needle, stack)
                return true
              end
            end
          when StructureShape
            haystack.members.each do |_, member_ref|
              if input_shape?(member_ref.shape, needle, stack)
                return true
              end
            end
          when ListShape
            return input_shape?(haystack.member.shape, needle, stack)
          when MapShape
            return input_shape?(haystack.value.shape, needle, stack)
          end
          false
        end

        def input_example_tag(api, shape)
          params = ParamFormatter.new(ShapeRef.new(shape: shape))
          note = "@note When passing #{shape.name} as input to an #{Client} "
          note << "method, you can use a\n  vanilla Hash:\n\n      "
          note << params.format.lines.join("      ")
          tag(note)
        end

        def see_also_tag(api, shape)
          tag(Crosslink.tag_string(api.metadata["uid"], shape.name))
        end

        def redirectable?(api, shape)
          Crosslink.taggable?(api.metadata["uid"]) && shape.name
        end

        def returned_by(api, shape)
          methods = []

          api.metadata['shapes'].each_structure do |struct|
            struct.members.each do |member_name, member_ref|
              if member_ref.shape == shape
                methods << "Types::#{struct.name}##{member_name}"
              end
            end
          end

          api.operations.each do |operation_name, operation|
            if operation.output && operation.output.shape == shape
              methods << "Client##{operation_name}"
            end
          end
          methods
        end

      end
    end
  end
end
