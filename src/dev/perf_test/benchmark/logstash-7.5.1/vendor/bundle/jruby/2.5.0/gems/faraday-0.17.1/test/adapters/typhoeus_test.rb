require File.expand_path('../integration', __FILE__)

module Adapters
  class TyphoeusTest < Faraday::TestCase

    def adapter() :typhoeus end

    Integration.apply(self, :Parallel) do
      # inconsistent outcomes ranging from successful response to connection error
      undef :test_proxy_auth_fail if ssl_mode?

      # Typhoeus adapter not supporting Faraday::SSLError
      undef :test_GET_ssl_fails_with_bad_cert if ssl_mode?

      def test_binds_local_socket
        host = '1.2.3.4'
        conn = create_connection :request => { :bind => { :host => host } }
        assert_equal host, conn.options[:bind][:host]
      end

      # Typhoeus::Response doesn't provide an easy way to access the reason phrase,
      # so override the shared test from Common.
      def test_GET_reason_phrase
        response = get('echo')
        assert_nil response.reason_phrase
      end
    end

    def test_custom_adapter_config
      adapter = Faraday::Adapter::Typhoeus.new(nil, { :forbid_reuse => true, :maxredirs => 1 })

      request = adapter.method(:typhoeus_request).call({})

      assert_equal true, request.options[:forbid_reuse]
      assert_equal 1, request.options[:maxredirs]
    end
  end
end
