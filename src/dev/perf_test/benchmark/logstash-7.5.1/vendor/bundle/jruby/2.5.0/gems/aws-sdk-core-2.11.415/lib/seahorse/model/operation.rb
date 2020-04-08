module Seahorse
  module Model
    class Operation

      def initialize
        @http_method = 'POST'
        @http_request_uri = '/'
        @deprecated = false
        @errors = []
        @metadata = {}
      end

      # @return [String, nil]
      attr_accessor :name

      # @return [String]
      attr_accessor :http_method

      # @return [String]
      attr_accessor :http_request_uri

      # @return [Boolean]
      attr_accessor :deprecated

      # @return [Boolean]
      attr_accessor :endpoint_operation

      # @return [Hash]
      attr_accessor :endpoint_discovery

      # @return [String, nil]
      attr_accessor :documentation

      # @return [Hash, nil]
      attr_accessor :endpoint_pattern

      # @return [ShapeRef, nil]
      attr_accessor :input

      # @return [ShapeRef, nil]
      attr_accessor :output

      # @return [Array<ShapeRef>]
      attr_accessor :errors

      def [](key)
        @metadata[key.to_s]
      end

      def []=(key, value)
        @metadata[key.to_s] = value
      end

    end
  end
end
