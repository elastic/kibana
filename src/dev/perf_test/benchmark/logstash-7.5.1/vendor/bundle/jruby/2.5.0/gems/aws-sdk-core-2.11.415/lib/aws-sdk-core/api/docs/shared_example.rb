module Aws
  module Api
    module Docs
      class SharedExample

        include Utils
        include Seahorse::Model::Shapes

        def initialize(params, method_name, operation, comments)
          @params = params
          @method_name = method_name
          @operation = operation
          @comments = comments
          @params ||= {}
        end

        def to_str_input
          lines = structure(@params, @operation.input, "", [])
          params = lines.join("\n")
          "resp = client.#{@method_name}(#{params})"
        end

        def to_str_output
          lines = structure(@params, @operation.output, "", [])
          params = lines.join("\n")
          "#{params}"
        end

        private

        def entry(json, ref, indent, path)
          case ref.shape
          when StructureShape then structure(json, ref, indent, path)
          when MapShape then map(json, ref, indent, path)
          when ListShape then list(json, ref, indent, path)
          when TimestampShape then "Time.parse(#{json.inspect})"
          when StringShape, BlobShape then json.inspect
          else json
          end
        end

        def structure(json, ref, indent, path)
          lines = ["{"]
          json.each do |key, val|
            path << ".#{key}"
            sc_key = Seahorse::Util.underscore(key)
            shape_val = entry(val, ref.shape.member(sc_key), "#{indent}  ", path)
            if shape_val.is_a?(Array)
              shape_val = shape_val.join("\n")
            end
            lines << "#{indent}  #{sc_key}: #{shape_val}, #{apply_comments(path)}"
            path.pop
          end
          lines << "#{indent}}"
          lines
        end

        def map(json, ref, indent, path)
          lines = ["{"]
          json.each do |key, val|
            path << ".#{key}"
            shape_val = entry(val, ref.shape.value, "#{indent}  ", path)
            if shape_val.is_a?(Array)
              shape_val = shape_val.join("\n")
            end
            lines << "#{indent}  \"#{key}\" => #{shape_val}, #{apply_comments(path)}"
            path.pop
          end
          lines << "#{indent}}"
          lines
        end

        def list(json, ref, indent, path)
          lines = ["["]
          json.each_with_index do |member, index|
            path << "[#{index}]"
            shape_val = entry(member, ref.shape.member, "#{indent}  ", path)
            if shape_val.is_a?(Array)
              shape_val = shape_val.join("\n")
            end
            lines << "#{indent}  #{shape_val}, #{apply_comments(path)}"
            path.pop
          end
          lines << "#{indent}]"
          lines
        end

        def apply_comments(path)
          key = path.join().sub(/^\./, '')
          if @comments && @comments[key]
            "# #{@comments[key]}"
          else
            ""
          end
        end

      end
    end
  end
end
