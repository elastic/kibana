require File.expand_path("../integration", __FILE__)
require File.expand_path('../../live_server', __FILE__)

module Adapters
  class RackTest < Faraday::TestCase

    def adapter() :rack end

    def adapter_options
      [Faraday::LiveServer]
    end

    # no Integration.apply because this doesn't require a server as a separate process
    include Integration::Common
    include Integration::NonParallel

    # Rack::MockResponse doesn't provide any way to access the reason phrase,
    # so override the shared test from Common.
    def test_GET_reason_phrase
      response = get('echo')
      assert_nil response.reason_phrase
    end

    # not using shared test because error is swallowed by Sinatra
    def test_timeout
      conn = create_connection(:request => {:timeout => 1, :open_timeout => 1})
      begin
        conn.get '/slow'
      rescue Faraday::TimeoutError
      end
    end

    # test not applicable
    undef test_connection_error
    undef test_proxy
    undef test_proxy_auth_fail
  end
end
