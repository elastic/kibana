require File.expand_path('../helper', __FILE__)

class EnvTest < Faraday::TestCase
  def setup
    @conn = Faraday.new :url => 'http://sushi.com/api',
      :headers => {'Mime-Version' => '1.0'},
      :request => {:oauth => {:consumer_key => 'anonymous'}}

    @conn.options.timeout      = 3
    @conn.options.open_timeout = 5
    @conn.ssl.verify           = false
    @conn.proxy = 'http://proxy.com'
  end

  def test_request_create_stores_method
    env = make_env(:get)
    assert_equal :get, env.method
  end

  def test_request_create_stores_uri
    env = make_env do |req|
      req.url 'foo.json', 'a' => 1
    end
    assert_equal 'http://sushi.com/api/foo.json?a=1', env.url.to_s
  end

  def test_request_create_stores_uri_with_anchor
    env = make_env do |req|
      req.url 'foo.json?b=2&a=1#qqq'
    end
    assert_equal 'http://sushi.com/api/foo.json?a=1&b=2', env.url.to_s
  end

  def test_request_create_stores_headers
    env = make_env do |req|
      req['Server'] = 'Faraday'
    end
    headers = env.request_headers
    assert_equal '1.0', headers['mime-version']
    assert_equal 'Faraday', headers['server']
  end

  def test_request_create_stores_body
    env = make_env do |req|
      req.body = 'hi'
    end
    assert_equal 'hi', env.body
  end

  def test_global_request_options
    env = make_env
    assert_equal 3, env.request.timeout
    assert_equal 5, env.request.open_timeout
  end

  def test_per_request_options
    env = make_env do |req|
      req.options.timeout = 10
      req.options.boundary = 'boo'
      req.options.oauth[:consumer_secret] = 'xyz'
      req.options.context = {
          foo: 'foo',
          bar: 'bar'
      }
    end

    assert_equal 10, env.request.timeout
    assert_equal 5, env.request.open_timeout
    assert_equal 'boo', env.request.boundary
    assert_equal env.request.context, { foo: 'foo', bar: 'bar' }

    oauth_expected = {:consumer_secret => 'xyz', :consumer_key => 'anonymous'}
    assert_equal oauth_expected, env.request.oauth
  end

  def test_request_create_stores_ssl_options
    env = make_env
    assert_equal false, env.ssl.verify
  end

  def test_custom_members_are_retained
    env = make_env
    env[:foo] = "custom 1"
    env[:bar] = :custom_2
    env2 = Faraday::Env.from(env)
    assert_equal "custom 1", env2[:foo]
    assert_equal :custom_2,  env2[:bar]
    env2[:baz] = "custom 3"
    assert_nil env[:baz]
  end

  private

  def make_env(method = :get, connection = @conn, &block)
    request = connection.build_request(method, &block)
    request.to_env(connection)
  end
end

class HeadersTest < Faraday::TestCase
  def setup
    @headers = Faraday::Utils::Headers.new
  end

  def test_normalizes_different_capitalizations
    @headers['Content-Type'] = 'application/json'
    assert_equal ['Content-Type'], @headers.keys
    assert_equal 'application/json', @headers['Content-Type']
    assert_equal 'application/json', @headers['CONTENT-TYPE']
    assert_equal 'application/json', @headers['content-type']
    assert @headers.include?('content-type')

    @headers['content-type'] = 'application/xml'
    assert_equal ['Content-Type'], @headers.keys
    assert_equal 'application/xml', @headers['Content-Type']
    assert_equal 'application/xml', @headers['CONTENT-TYPE']
    assert_equal 'application/xml', @headers['content-type']
  end

  def test_fetch_key
    @headers['Content-Type'] = 'application/json'
    block_called = false
    assert_equal 'application/json', @headers.fetch('content-type') { block_called = true }
    assert_equal 'application/json', @headers.fetch('Content-Type')
    assert_equal 'application/json', @headers.fetch('CONTENT-TYPE')
    assert_equal 'application/json', @headers.fetch(:content_type)
    assert_equal false, block_called

    assert_equal 'default', @headers.fetch('invalid', 'default')
    assert_equal false, @headers.fetch('invalid', false)
    assert_nil   @headers.fetch('invalid', nil)

    assert_equal 'Invalid key', @headers.fetch('Invalid') { |key| "#{key} key" }

    expected_error = defined?(KeyError) ? KeyError : IndexError
    assert_raises(expected_error) { @headers.fetch('invalid') }
  end

  def test_delete_key
    @headers['Content-Type'] = 'application/json'
    assert_equal 1, @headers.size
    assert @headers.include?('content-type')
    assert_equal 'application/json', @headers.delete('content-type')
    assert_equal 0, @headers.size
    assert !@headers.include?('content-type')
    assert_nil @headers.delete('content-type')
  end

  def test_parse_response_headers_leaves_http_status_line_out
    @headers.parse("HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n")
    assert_equal %w(Content-Type), @headers.keys
  end

  def test_parse_response_headers_parses_lower_cased_header_name_and_value
    @headers.parse("HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n")
    assert_equal 'text/html', @headers['content-type']
  end

  def test_parse_response_headers_parses_lower_cased_header_name_and_value_with_colon
    @headers.parse("HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nLocation: http://sushi.com/\r\n\r\n")
    assert_equal 'http://sushi.com/', @headers['location']
  end

  def test_parse_response_headers_parses_blank_lines
    @headers.parse("HTTP/1.1 200 OK\r\n\r\nContent-Type: text/html\r\n\r\n")
    assert_equal 'text/html', @headers['content-type']
  end
end

class ResponseTest < Faraday::TestCase
  def setup
    @env = Faraday::Env.from \
      :status => 404, :body => 'yikes',
      :response_headers => {'Content-Type' => 'text/plain'}
    @response = Faraday::Response.new @env
  end

  def test_finished
    assert @response.finished?
  end

  def test_error_on_finish
    assert_raises RuntimeError do
      @response.finish({})
    end
  end

  def test_body_is_parsed_on_finish
    response = Faraday::Response.new
    response.on_complete { |env| env[:body] = env[:body].upcase }
    response.finish(@env)

    assert_equal "YIKES", response.body
  end

  def test_response_body_is_available_during_on_complete
    response = Faraday::Response.new
    response.on_complete { |env| env[:body] = response.body.upcase }
    response.finish(@env)

    assert_equal "YIKES", response.body
  end

  def test_env_in_on_complete_is_identical_to_response_env
    response = Faraday::Response.new
    callback_env = nil
    response.on_complete { |env| callback_env = env }
    response.finish({})

    assert_same response.env, callback_env
  end

  def test_not_success
    assert !@response.success?
  end

  def test_status
    assert_equal 404, @response.status
  end

  def test_body
    assert_equal 'yikes', @response.body
  end

  def test_headers
    assert_equal 'text/plain', @response.headers['Content-Type']
    assert_equal 'text/plain', @response['content-type']
  end

  def test_apply_request
    @response.apply_request :body => 'a=b', :method => :post
    assert_equal 'yikes', @response.body
    assert_equal :post, @response.env[:method]
  end

  def test_marshal_response
    @response = Faraday::Response.new
    @response.on_complete { }
    @response.finish @env.merge(:params => 'moo')

    loaded = Marshal.load Marshal.dump(@response)
    assert_nil loaded.env[:params]
    assert_equal %w[body response_headers status], loaded.env.keys.map { |k| k.to_s }.sort
  end

  def test_marshal_request
    @request = Faraday::Request.create(:post) do |request|
      request.options      = Faraday::RequestOptions.new
      request.params       = Faraday::Utils::ParamsHash.new({ 'a' => 'c' })
      request.headers      = { 'b' => 'd' }
      request.body         = 'hello, world!'
      request.url 'http://localhost/foo'
    end

    loaded = Marshal.load(Marshal.dump(@request))

    assert_equal @request, loaded
  end

  def test_hash
    hash = @response.to_hash
    assert_kind_of Hash, hash
    assert_equal @env.to_hash, hash
    assert_equal hash[:status], @response.status
    assert_equal hash[:response_headers], @response.headers
    assert_equal hash[:body], @response.body
  end
end
