module Aws
  module Resources

    # A {Builder} construct resource objects.  It extracts resource identifiers
    # for the objects it builds from another resource object and/or an
    # AWS response.
    class Builder

      include Options

      # @option options [required, Class<Resource>] resource_class
      # @option options [Array<BuilderSources::Source>] :sources ([])
      def initialize(options = {})
        @resource_class = options[:resource_class]
        @sources = options[:sources] || []
      end

      # @return [Class<Resource>]
      attr_reader :resource_class

      # @return [Array<BuilderSources::Source>] A list of resource
      #   identifier sources.
      attr_reader :sources

      # @return [Boolean] Returns `true` if this builder returns an array
      #   of resource objects from {#build}.
      def plural?
        @sources.any?(&:plural?)
      end

      # @option [Resource] :resource
      # @option [Seahorse::Client::Response] :response
      # @return [Resource, Array<Resource>] Returns a resource object or an
      #   array of resource objects if {#plural?}.
      def build(options = {})
        identifier_map = @sources.each.with_object({}) do |source, hash|
          hash[source.target] = source.extract(options)
        end
        if plural?
          build_batch(identifier_map, options)
        else
          build_one(identifier_map, options)
        end
      end

      private

      def build_batch(identifier_map, options, &block)
        resources = (0...resource_count(identifier_map)).collect do |n|
          identifiers = @sources.inject({}) do |hash, source|
            value = identifier_map[source.target]
            value = value[n] if source.plural?
            hash[source.target] = value
            hash
          end
          resource = build_one(identifiers, options)
          yield(resource) if block_given?
          resource
        end
        Batch.new(resource_class, resources, options)
      end

      def build_one(identifiers, options)
        if identifiers.count > 0 && identifiers.values.any?(&:nil?)
          nil
        else
          @resource_class.new(identifiers.merge(
            client: client(options)
          ))
        end
      end

      def resource_count(identifier_map)
        identifier_map.values.inject(0) do |max, values|
          [max, values.is_a?(Array) ? values.size : 0].max
        end
      end

      def client(options)
        Array(options[:resource]).first.client
      end

    end
  end
end
