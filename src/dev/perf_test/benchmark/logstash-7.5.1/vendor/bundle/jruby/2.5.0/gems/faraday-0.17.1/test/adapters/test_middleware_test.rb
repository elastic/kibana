require File.expand_path('../../helper', __FILE__)

module Adapters
  class TestMiddleware < Faraday::TestCase
    Stubs = Faraday::Adapter.lookup_middleware(:test)::Stubs
    def setup
      @stubs = Stubs.new do |stub|
        stub.get('/hello') do
          [200, {'Content-Type' => 'text/html'}, 'hello']
        end
        stub.get('/method-echo') do |env|
          [200, {'Content-Type' => 'text/html'}, env[:method].to_s]
        end
        stub.get(/\A\/resources\/\d+(?:\?|\z)/) do
          [200, {'Content-Type' => 'text/html'}, 'show']
        end
        stub.get(/\A\/resources\/(specified)\z/) do |env, meta|
          [200, {'Content-Type' => 'text/html'}, "show #{meta[:match_data][1]}"]
        end
        stub.get('http://domain.test/hello') do
          [200, {'Content-Type' => 'text/html'}, 'domain: hello']
        end
        stub.get('http://wrong.test/hello') do
          [200, {'Content-Type' => 'text/html'}, 'wrong: hello']
        end
        stub.get('http://wrong.test/bait') do
          [404, {'Content-Type' => 'text/html'}]
        end
      end
      @conn  = Faraday.new do |builder|
        builder.adapter :test, @stubs
      end
      @resp = @conn.get('/hello')
    end

    def test_middleware_with_simple_path_sets_status
      assert_equal 200, @resp.status
    end

    def test_middleware_with_simple_path_sets_headers
      assert_equal 'text/html', @resp.headers['Content-Type']
    end

    def test_middleware_with_simple_path_sets_body
      assert_equal 'hello', @resp.body
    end

    def test_middleware_with_host_points_to_the_right_stub
      assert_equal 'domain: hello', @conn.get('http://domain.test/hello').body
    end

    def test_middleware_can_be_called_several_times
      assert_equal 'hello', @conn.get('/hello').body
    end

    def test_middleware_can_handle_regular_expression_path
      assert_equal 'show', @conn.get('/resources/1').body
    end

    def test_middleware_can_handle_single_parameter_block
      assert_equal 'get', @conn.get('/method-echo').body
    end

    def test_middleware_can_handle_regular_expression_path_with_captured_result
      assert_equal 'show specified', @conn.get('/resources/specified').body
    end

    def test_middleware_with_get_params
      @stubs.get('/param?a=1') { [200, {}, 'a'] }
      assert_equal 'a', @conn.get('/param?a=1').body
    end

    def test_middleware_ignores_unspecified_get_params
      @stubs.get('/optional?a=1') { [200, {}, 'a'] }
      assert_equal 'a', @conn.get('/optional?a=1&b=1').body
      assert_equal 'a', @conn.get('/optional?a=1').body
      assert_raises Faraday::Adapter::Test::Stubs::NotFound do
        @conn.get('/optional')
      end
    end

    def test_middleware_with_http_headers
      @stubs.get('/yo', { 'X-HELLO' => 'hello' }) { [200, {}, 'a'] }
      @stubs.get('/yo') { [200, {}, 'b'] }
      assert_equal 'a', @conn.get('/yo') { |env| env.headers['X-HELLO'] = 'hello' }.body
      assert_equal 'b', @conn.get('/yo').body
    end

    def test_middleware_allow_different_outcomes_for_the_same_request
      @stubs.get('/hello') { [200, {'Content-Type' => 'text/html'}, 'hello'] }
      @stubs.get('/hello') { [200, {'Content-Type' => 'text/html'}, 'world'] }
      assert_equal 'hello', @conn.get("/hello").body
      assert_equal 'world', @conn.get("/hello").body
    end

    def test_yields_env_to_stubs
      @stubs.get '/hello' do |env|
        assert_equal '/hello',     env[:url].path
        assert_equal 'foo.com',    env[:url].host
        assert_equal '1',          env[:params]['a']
        assert_equal 'text/plain', env[:request_headers]['Accept']
        [200, {}, 'a']
      end

      @conn.headers['Accept'] = 'text/plain'
      assert_equal 'a', @conn.get('http://foo.com/hello?a=1').body
    end

    def test_parses_params_with_default_encoder
      @stubs.get '/hello' do |env|
        assert_equal '1', env[:params]['a']['b']
        [200, {}, 'a']
      end

      assert_equal 'a', @conn.get('http://foo.com/hello?a[b]=1').body
    end

    def test_parses_params_with_nested_encoder
      @stubs.get '/hello' do |env|
        assert_equal '1', env[:params]['a']['b']
        [200, {}, 'a']
      end

      @conn.options.params_encoder = Faraday::NestedParamsEncoder
      assert_equal 'a', @conn.get('http://foo.com/hello?a[b]=1').body
    end

    def test_parses_params_with_flat_encoder
      @stubs.get '/hello' do |env|
        assert_equal '1', env[:params]['a[b]']
        [200, {}, 'a']
      end

      @conn.options.params_encoder = Faraday::FlatParamsEncoder
      assert_equal 'a', @conn.get('http://foo.com/hello?a[b]=1').body
    end

    def test_raises_an_error_if_no_stub_is_found_for_request
      assert_raises Stubs::NotFound do
        @conn.get('/invalid'){ [200, {}, []] }
      end
    end

    def test_raises_an_error_if_no_stub_is_found_for_specified_host
      assert_raises Stubs::NotFound do
        @conn.get('http://domain.test/bait')
      end
    end

    def test_raises_an_error_if_no_stub_is_found_for_request_without_this_header
      @stubs.get('/yo', { 'X-HELLO' => 'hello' }) { [200, {}, 'a'] }
      assert_raises Faraday::Adapter::Test::Stubs::NotFound do
        @conn.get('/yo')
      end
    end
  end
end
