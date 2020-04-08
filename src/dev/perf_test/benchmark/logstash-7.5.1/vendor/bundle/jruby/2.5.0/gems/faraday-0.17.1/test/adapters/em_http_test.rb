require File.expand_path('../integration', __FILE__)

module Adapters
  class EMHttpTest < Faraday::TestCase

    def adapter() :em_http end

    Integration.apply(self, :Parallel) do
      # https://github.com/eventmachine/eventmachine/pull/289
      undef :test_timeout

      def test_binds_local_socket
        host = '1.2.3.4'
        conn = create_connection :request => { :bind => { :host => host } }
        assert_equal host, conn.options[:bind][:host]
      end
    end unless jruby? and ssl_mode?
    # https://github.com/eventmachine/eventmachine/issues/180

    def test_custom_adapter_config
      url = URI('https://example.com:1234')

      adapter = Faraday::Adapter::EMHttp.new nil, inactivity_timeout: 20

      req = adapter.create_request(url: url, request: {})

      assert_equal 20, req.connopts.inactivity_timeout
    end
  end
end
