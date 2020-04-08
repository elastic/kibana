module Aws
  module Api
    module Docs
      class OperationDocumenter

        include Seahorse::Model
        include Utils

        def initialize(service_name, namespace, uid)
          @service_name = service_name
          @namespace = namespace
          @optname = 'options'
          @uid = uid
        end

        # @param [Symbol] method_name
        # @param [Seahorse::Model::Opeation] operation
        def document(method_name, operation)
          m = YARD::CodeObjects::MethodObject.new(@namespace, method_name)
          m.group = 'API Operations'
          m.scope = :instance
          m.parameters << [@optname, '{}']
          m.docstring = operation.documentation
          tags(method_name, operation).each do |tag|
            m.add_tag(tag)
          end
        end

        private

        def tags(method_name, operation)
          tags = []
          tags += param_tags(method_name, operation)
          tags += option_tags(method_name, operation)
          tags += return_tags(method_name, operation)
          tags += example_tags(method_name, operation)
          tags += see_also_tags(method_name, operation)
        end

        def param_tags(method_name, operation)
          []
        end

        def option_tags(method_name, operation)
          operation_input_ref(operation).shape.members.map do |name, ref|
            req = ref.required ? 'required,' : ''
            type = input_type(ref)
            docstring = "@option #{@optname} [#{req}#{type}] :#{name}\n"
            docstring << "\n\n This parameter will be auto-filled on your behalf"\
              " with a random UUIDv4 when no value is provided.\n" if ref['idempotencyToken']
            docstring << "\n\n SDK automatically handles json encoding and base64 encoding"\
              " for you when the required value (Hash, Array, etc.) is provided according to the description.\n" if ref['jsonvalue']
            docstring += ref.documentation.to_s.lines.map { |line| "  #{line}" }.join
            tag(docstring)
          end
        end

        def return_tags(method_name, operation)
          resp = '{Seahorse::Client::Response response}'
          if operation.output && operation.output.shape.members.count > 0
            rtype = output_type(operation.output)
            returns = "[#{rtype}] Returns a #{resp} object which responds to "
            returns << "the following methods:\n\n"
            operation.output.shape.members.each do |mname, mref|
              mtype = output_type(mref, true).gsub(/</, '&lt;').gsub(/>/, '&gt;')
              returns << "  * {#{rtype}##{mname} ##{mname}} => #{mtype}\n"
            end
          else
            returns = "[Struct] Returns an empty #{resp}."
          end
          [tag("@return #{returns}")]
        end

        def example_tags(method_name, operation)
          shared_examples(method_name, operation) +
          examples_from_disk(method_name, operation) +
          [
            request_syntax_example(method_name, operation),
            response_structure_example(method_name, operation),
          ].compact
        end

        def shared_examples(method_name, operation)
          if operation['examples']
            operation['examples'].map do |example|
              shared_example(example, method_name, operation)
            end.compact
          else
            []
          end
        end

        def shared_example(json_ex, method_name, operation)
          begin # disable broken examples
            input_comments = json_ex['comments']['input']
            input = SharedExample.new(json_ex['input'], method_name, operation, input_comments).to_str_input
            parts = []
            parts << "@example Example: #{json_ex['title']}\n\n"
            parts << "  # #{json_ex['description']}\n\n"
            parts += input.lines.map { |line| "  " + line }
            if json_ex['output']
              output_comments = json_ex['comments']['output']
              output = SharedExample.new(json_ex['output'], method_name, operation, output_comments).to_str_output
              parts << "\n\n  # resp.to_h outputs the following:\n"
              parts += output.lines.map { |line| "  " + line }
            end
            tag(parts.join)
          rescue
            nil
          end
        end

        def examples_from_disk(method_name, operation)
          dir = "doc-src/examples/#{@service_name.downcase}/client/#{method_name}/*.rb"
          Dir.glob(dir).map do |path|
            title = File.basename(path).split(/\./).first
            title = title.sub(/^\d+_/, '').gsub(/_/, ' ')
            title = title[0].upcase + title[1..-1]
            tag("@example #{title}\n\n    " + File.read(path).lines.join('    '))
          end
        end

        def request_syntax_example(method_name, operation)
          example = RequestSyntaxExample.new(method_name, operation).to_str
          parts = []
          parts << "@example Request syntax with placeholder values\n\n"
          parts += example.lines.map { |line| "  " + line }
          tag(parts.join)
        end

        def response_structure_example(method_name, operation)
          if example = ResponseStructureExample.new(method_name, operation).to_str
            parts = []
            parts << "@example Response structure\n\n"
            parts += example.lines.map { |line| "  " + line }
            tag(parts.join)
          end
        end

        def see_also_tags(method_name, operation)
          if Crosslink.taggable?(@uid)
            [tag(Crosslink.tag_string(@uid, operation.name))]
          else
            []
          end
        end

      end
    end
  end
end
