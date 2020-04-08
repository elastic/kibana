require File.expand_path('../integration', __FILE__)

module Adapters
  class ExconTest < Faraday::TestCase

    def adapter() :excon end

    Integration.apply(self, :NonParallel) do
      # https://github.com/geemus/excon/issues/126 ?
      undef :test_timeout if ssl_mode?

      # Excon lets OpenSSL::SSL::SSLError be raised without any way to
      # distinguish whether it happened because of a 407 proxy response
      undef :test_proxy_auth_fail if ssl_mode?

      # https://github.com/geemus/excon/issues/358
      undef :test_connection_error if RUBY_VERSION >= '2.1.0'
    end

    def test_custom_adapter_config
      url = URI('https://example.com:1234')

      adapter = Faraday::Adapter::Excon.new nil, debug_request: true

      conn = adapter.create_connection({url: url}, {})

      assert_equal true, conn.data[:debug_request]
    end
  end
end
