module Aws
  module Api
    class ShapeMap

      include Seahorse::Model::Shapes

      SHAPE_CLASSES = {
        'blob' => BlobShape,
        'byte' => StringShape,
        'boolean' => BooleanShape,
        'character' => StringShape,
        'double' => FloatShape,
        'float' => FloatShape,
        'integer' => IntegerShape,
        'list' => ListShape,
        'long' => IntegerShape,
        'map' => MapShape,
        'string' => StringShape,
        'structure' => StructureShape,
        'timestamp' => TimestampShape,
      }

      # @param [Hash] shape_definitions
      # @option options [DocstringProvider] :docs (NullDocstringProvider)
      def initialize(shape_definitions, options = {})
        @shapes = {}
        @docs = options[:docs] || Docs::NullDocstringProvider.new
        build_shapes(shape_definitions)
      end

      def [](shape_name)
        if shape = @shapes[shape_name]
          shape
        else
          raise ArgumentError, "unknown shape #{shape_name.inspect}"
        end
      end

      def each_structure
        @shapes.each do |_, shape|
          if StructureShape === shape && !shape[:error] && !shape[:exception]
            yield(shape)
          end
        end
      end

      def shape_ref(definition, options = {})
        if definition

          meta = definition.dup

          shape = self[meta.delete('shape')]
          location = meta.delete('location')
          location_name = meta.delete('locationName')
          location_name ||= options[:member_name] unless location == 'headers'
          documentation = @docs.shape_ref_docs(shape.name, options[:target])
          if meta['hostLabel']
            # used for endpoint pattern
            meta['hostLabelName'] = options[:member_name]
          end

          ShapeRef.new(
            shape: shape,
            location: location,
            location_name: location_name,
            required: !!options[:required],
            deprecated: !!(meta.delete('deprecated') || shape[:deprecated]),
            documentation: documentation,
            metadata: meta)
        else
          empty_ref
        end
      end

      private

      def build_shapes(definitions)
        definitions.each do |name, definition|
          shape = SHAPE_CLASSES[definition['type']].new
          shape.name = name
          @shapes[name] = shape
        end
        definitions.each do |name, definition|
          traits = definition.dup
          shape = @shapes[name]
          apply_shape_refs(shape, traits)
          apply_shape_traits(shape, traits)
        end
      end

      def apply_shape_refs(shape, traits)
        case shape
        when StructureShape
          required = Set.new(traits.delete('required') || [])
          (traits.delete('members') || {}).each do |member_name, ref|
            name = underscore(member_name)
            shape.add_member(name, shape_ref(ref,
              member_name: member_name,
              required: required.include?(member_name),
              target: "#{shape.name}$#{member_name}",
            ))
          end
        when ListShape
          shape.member = shape_ref(
            traits.delete('member'),
            target: "#{shape.name}$member")
        when MapShape
          shape.key = shape_ref(
            traits.delete('key'),
            target: "#{shape.name}$key")
          shape.value = shape_ref(
            traits.delete('value'),
            target: "#{shape.name}$value")
        end
      end

      def apply_shape_traits(shape, traits)
        shape.enum = Set.new(traits.delete('enum')) if traits.key?('enum')
        shape.min = traits.delete('min') if traits.key?('min')
        shape.max = traits.delete('max') if traits.key?('max')
        shape.documentation = @docs.shape_docs(shape.name)
        if payload = traits.delete('payload')
          shape[:payload] = underscore(payload)
          shape[:payload_member] = shape.member(shape[:payload])
        end
        traits.each do |key, value|
          shape[key] = value
        end
      end

      def empty_ref
        @empty_ref ||= begin
          shape = StructureShape.new
          shape.name = 'EmptyStructure'
          @shapes['EmptyStructure'] = shape
          ShapeRef.new(shape: shape)
        end
      end

      def underscore(str)
        Seahorse::Util.underscore(str).to_sym
      end

    end
  end
end
