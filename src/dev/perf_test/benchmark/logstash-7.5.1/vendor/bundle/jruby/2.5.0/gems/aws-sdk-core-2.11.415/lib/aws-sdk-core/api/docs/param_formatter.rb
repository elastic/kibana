module Aws
  module Api
    module Docs
      class ParamFormatter

        include Utils
        include Seahorse::Model::Shapes

        def initialize(shape_ref)
          @shape_ref = shape_ref
          @recursive_shapes = compute_recursive_shapes(@shape_ref)
        end

        def format
          if @shape_ref && @shape_ref.shape.member_names.count > 0
            ref_value(@shape_ref, '', [])
          else
            ''
          end
        end

        private

        def ref_value(ref, i, visited)
          if visited.include?(ref.shape)
            return "{\n#{i}  # recursive #{ref.shape.name}\n#{i}}"
          else
            visited  = visited + [ref.shape]
          end
          case ref.shape
          when StructureShape
            if ref.shape.name == 'AttributeValue'
              '"value"'
            else
              struct(ref, i, visited)
            end
          when BlobShape
            if ref[:response_target]
              '"/path/to/file"'
            elsif ref[:streaming]
              'source_file'
            else
              '"data"'
            end
          when ListShape then list(ref, i, visited)
          when MapShape then map(ref, i, visited)
          when BooleanShape then "false"
          when IntegerShape then '1'
          when FloatShape then '1.0'
          when StringShape then string(ref)
          when TimestampShape then 'Time.now'
          else raise "unsupported shape #{ref.shape.class.name}"
          end
        end

        def struct(ref, i, visited)
          lines = ['{']
          ref.shape.members.each do |member_name, member_ref|
            lines << struct_member(member_name, member_ref, i, visited)
          end
          lines << "#{i}}"
          lines.join("\n")
        end

        def struct_member(member_name, member_ref, i, visited)
          entry = "#{i}  #{member_name}: #{ref_value(member_ref, i + '  ', visited)},"
          apply_comments(member_ref, entry)
        end

        def list(ref, i, visited)
          if complex?(ref.shape.member)
            complex_list(ref.shape.member, i, visited)
          else
            scalar_list(ref.shape.member, i, visited)
          end
        end

        def scalar_list(ref, i, visited)
          "[#{ref_value(ref, i, visited)}]"
        end

        def complex_list(ref, i, visited)
          "[\n#{i}  #{ref_value(ref, i + '  ', visited)},\n#{i}]"
        end

        def map(ref, i, visited)
          key = string(ref.shape.key)
          value = ref_value(ref.shape.value, i + '  ', visited)
          "{\n#{i}  #{key} => #{value},#{comments(ref.shape.value)}\n#{i}}"
        end

        def string(ref)
          if ref.shape.enum
            ref.shape.enum.first.inspect
          elsif ref.shape.name
            ref.shape.name.inspect
          else
            '"string"'
          end
        end

        def apply_comments(ref, text)
          lines = text.lines.to_a
          if lines[0].match(/\n$/)
            lines[0] = lines[0].sub(/\n$/, comments(ref) + "\n")
          else
            lines[0] += comments(ref)
          end
          lines.join
        end

        def comments(ref)
          comments = []
          if ref[:response_target]
            comments << 'where to write response data, file path, or IO object'
          end
          if ref[:streaming]
            comments << 'file/IO object, or string data'
          end
          if ref.required
            comments << 'required'
          end
          if enum = enum_values(ref)
            comments << "accepts #{enum.to_a.join(', ')}"
          end
          if ddb_av?(ref)
            comments << 'value <Hash,Array,String,Numeric,Boolean,IO,Set,nil>'
          end
          comments == [] ? '' : " # #{comments.join(', ')}"
        end

        def recursive?(ref)
          @recursive_shapes.include?(ref.shape)
        end

        def enum_values(ref)
          case ref.shape
          when ListShape then enum_values(ref.shape.member)
          when StringShape then ref.shape.enum
          else nil
          end
        end

        def complex?(ref)
          if StructureShape === ref.shape
            !ddb_av?(ref)
          else
            ListShape === ref.shape || MapShape === ref.shape
          end
        end

        def ddb_av?(ref)
          case ref.shape
          when ListShape then ddb_av?(ref.shape.member)
          when StructureShape then ref.shape.name == 'AttributeValue'
          else false
          end
        end

      end
    end
  end
end
