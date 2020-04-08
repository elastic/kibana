require File.expand_path('../helper', __FILE__)

class AuthenticationMiddlewareTest < Faraday::TestCase
  def conn
    Faraday::Connection.new('http://example.net/') do |builder|
      yield(builder)
      builder.adapter :test do |stub|
        stub.get('/auth-echo') do |env|
          [200, {}, env[:request_headers]['Authorization']]
        end
      end
    end
  end

  def test_basic_middleware_adds_basic_header
    response = conn { |b| b.request :basic_auth, 'aladdin', 'opensesame' }.get('/auth-echo')
    assert_equal 'Basic YWxhZGRpbjpvcGVuc2VzYW1l', response.body
  end

  def test_basic_middleware_adds_basic_header_correctly_with_long_values
    response = conn { |b| b.request :basic_auth, 'A' * 255, '' }.get('/auth-echo')
    assert_equal "Basic #{'QUFB' * 85}Og==", response.body
  end

  def test_basic_middleware_does_not_interfere_with_existing_authorization
    response = conn { |b| b.request :basic_auth, 'aladdin', 'opensesame' }.
      get('/auth-echo', nil, :authorization => 'Token token="bar"')
    assert_equal 'Token token="bar"', response.body
  end

  def test_token_middleware_adds_token_header
    response = conn { |b| b.request :token_auth, 'quux' }.get('/auth-echo')
    assert_equal 'Token token="quux"', response.body
  end

  def test_token_middleware_includes_other_values_if_provided
    response = conn { |b|
      b.request :token_auth, 'baz', :foo => 42
    }.get('/auth-echo')
    assert_match(/^Token /, response.body)
    assert_match(/token="baz"/, response.body)
    assert_match(/foo="42"/, response.body)
  end

  def test_token_middleware_does_not_interfere_with_existing_authorization
    response = conn { |b| b.request :token_auth, 'quux' }.
      get('/auth-echo', nil, :authorization => 'Token token="bar"')
    assert_equal 'Token token="bar"', response.body
  end

  def test_authorization_middleware_with_string
    response = conn { |b|
      b.request :authorization, 'custom', 'abc def'
    }.get('/auth-echo')
    assert_match(/^custom abc def$/, response.body)
  end

  def test_authorization_middleware_with_hash
    response = conn { |b|
      b.request :authorization, 'baz', :foo => 42
    }.get('/auth-echo')
    assert_match(/^baz /, response.body)
    assert_match(/foo="42"/, response.body)
  end
end
