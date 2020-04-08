module Aws
  module Api
    module Docs
      class ResponseStructureExample

        include Utils
        include Seahorse::Model::Shapes

        def initialize(method_name, operation)
          @method_name = method_name
          @operation = operation
          @recursive_shapes = compute_recursive_shapes(@operation.output)
        end

        def to_str
          if @operation.output
            lines = entry(@operation.output, "resp", [])
            lines.empty? ? nil : lines.join("\n")
          else
            nil
          end
        end

        private

        def structure(ref, context, visited)
          lines = []
          ref.shape.members.each do |member_name, member_ref|
            lines += entry(member_ref, "#{context}.#{member_name}", visited)
          end
          lines
        end

        def list(ref, context, visited)
          lines = []
          lines << "#{context} #=> Array"
          lines += entry(ref.shape.member, "#{context}[0]", visited)
          lines
        end

        def map(ref, context, visited)
          lines = []
          lines << "#{context} #=> Hash"
          lines += entry(ref.shape.value, "#{context}[#{map_key(ref)}]", visited)
          lines
        end

        def map_key(ref)
          (ref.shape.key.shape.name || 'string').inspect
        end

        def entry(ref, context, visited)
          if ref.shape.name == 'AttributeValue'
            return ["#{context} #=> <Hash,Array,String,Numeric,Boolean,IO,Set,nil>"]
          elsif visited.include?(ref.shape)
            return ["#{context} #=> Types::#{ref.shape.name}"]
          else
            visited  = visited + [ref.shape]
          end
          case ref.shape
          when StructureShape then structure(ref, context, visited)
          when ListShape then list(ref, context, visited)
          when MapShape then map(ref, context, visited)
          else ["#{context} #=> #{value(ref)}"]
          end
        end

        def value(ref)
          case ref.shape
          when StringShape then string(ref)
          when IntegerShape then 'Integer'
          when FloatShape then 'Float'
          when BooleanShape then 'true/false'
          when BlobShape then 'IO'
          when TimestampShape then 'Time'
          else raise "unhandled shape type #{ref.shape.class.name}"
          end
        end

        def string(ref)
          if ref.shape.enum
            "String, one of #{ref.shape.enum.map(&:inspect).join(', ')}"
          else
            'String'
          end
        end

      end
    end
  end
end
