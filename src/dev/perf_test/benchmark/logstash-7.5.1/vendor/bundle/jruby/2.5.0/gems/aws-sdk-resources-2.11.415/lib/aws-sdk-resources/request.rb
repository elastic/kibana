module Aws
  module Resources
    class Request

      # @option options [required, String] :method_name
      # @option options [Array<RequestParams::Param>] :params ([]) A list of
      #   request params to apply to the request when called.
      def initialize(options = {})
        @method_name = options[:method_name]
        @params = options[:params] || []
      end

      # @return [String] Name of the method called on the client when this
      #   operation is called.
      attr_reader :method_name

      # @return [Array<RequestParams::Param>]
      attr_reader :params

      # @option options [required, Resource] :resource
      # @option options [Array<Mixed>] :args
      # @return [Seahorse::Client::Response]
      def call(options)
        client(options).send(@method_name, req_params(options), &options[:block])
      end

      private

      def client(options)
        Array(options[:resource]).first.client
      end

      def req_params(options)
        RequestParams::ParamHash.new(@params).build(options)
      end

    end
  end
end
