require File.expand_path('../integration', __FILE__)

module Adapters
  class HttpclientTest < Faraday::TestCase

    def adapter() :httpclient end

    Integration.apply(self, :NonParallel, :Compression) do
      def setup
        require 'httpclient' unless defined?(HTTPClient)
        HTTPClient::NO_PROXY_HOSTS.delete('localhost')
      end

      def test_binds_local_socket
        host = '1.2.3.4'
        conn = create_connection :request => { :bind => { :host => host } }
        assert_equal host, conn.options[:bind][:host]
      end

      def test_custom_adapter_config
        adapter = Faraday::Adapter::HTTPClient.new do |client|
          client.keep_alive_timeout = 20
          client.ssl_config.timeout = 25
        end

        client = adapter.client
        adapter.configure_client

        assert_equal 20, client.keep_alive_timeout
        assert_equal 25, client.ssl_config.timeout
      end
    end
  end
end
