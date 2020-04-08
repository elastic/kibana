require File.expand_path('../integration', __FILE__)

module Adapters
  class EMSynchronyTest < Faraday::TestCase

    def adapter() :em_synchrony end

    unless jruby?
      Integration.apply(self, :Parallel) do
        # https://github.com/eventmachine/eventmachine/pull/289
        undef :test_timeout

        def test_binds_local_socket
          host = '1.2.3.4'
          conn = create_connection :request => { :bind => { :host => host } }
          #put conn.get('/who-am-i').body
          assert_equal host, conn.options[:bind][:host]
        end
      end
    end

    def test_custom_adapter_config
      url = URI('https://example.com:1234')

      adapter = Faraday::Adapter::EMSynchrony.new nil, inactivity_timeout: 20

      req = adapter.create_request(url: url, request: {})

      assert_equal 20, req.connopts.inactivity_timeout
    end
  end
end
