require File.expand_path('../helper', __FILE__)

class TestUtils < Faraday::TestCase

  # Headers parsing

  def test_headers
    "HTTP/1.x 500 OK\r\nContent-Type: text/html; charset=UTF-8\r\n" \
    "HTTP/1.x 200 OK\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n"
  end

  def test_headers_parsing_for_aggregated_responses
    headers = Faraday::Utils::Headers.new()
    headers.parse(test_headers)

    result = headers.to_hash

    assert_equal result["Content-Type"], "application/json; charset=UTF-8"
  end

  # URI parsing

  def setup
    @url = "http://example.com/abc"
  end

  # emulates ActiveSupport::SafeBuffer#gsub
  FakeSafeBuffer = Struct.new(:string) do
    def to_s() self end
    def gsub(regex)
      string.gsub(regex) {
        match, = $&, '' =~ /a/
        yield(match)
      }
    end
  end

  def test_escaping_safe_buffer
    str = FakeSafeBuffer.new('$32,000.00')
    assert_equal '%2432%2C000.00', Faraday::Utils.escape(str)
  end

  def test_parses_with_default
    with_default_uri_parser(nil) do
      uri = normalize(@url)
      assert_equal 'example.com', uri.host
    end
  end

  def test_parses_with_URI
    with_default_uri_parser(::URI) do
      uri = normalize(@url)
      assert_equal 'example.com', uri.host
    end
  end

  def test_parses_with_block
    with_default_uri_parser(lambda {|u| "booya#{"!" * u.size}" }) do
      assert_equal 'booya!!!!!!!!!!!!!!!!!!!!!!', normalize(@url)
    end
  end

  def test_replace_header_hash
    headers = Faraday::Utils::Headers.new('authorization' => 't0ps3cr3t!')
    assert headers.include?('authorization')

    headers.replace({'content-type' => 'text/plain'})

    assert !headers.include?('authorization')
  end

  def normalize(url)
    Faraday::Utils::URI(url)
  end

  def with_default_uri_parser(parser)
    old_parser = Faraday::Utils.default_uri_parser
    begin
      Faraday::Utils.default_uri_parser = parser
      yield
    ensure
      Faraday::Utils.default_uri_parser = old_parser
    end
  end

  # YAML parsing

  def test_headers_yaml_roundtrip
    headers = Faraday::Utils::Headers.new('User-Agent' => 'safari', 'Content-type' => 'text/html')
    result = YAML.load(headers.to_yaml)

    assert result.include?('user-agent'), 'Unable to hydrate to a correct Headers'
    assert result.include?('content-type'), 'Unable to hydrate to a correct Headers'
    assert result['user-agent'] == 'safari', 'Unable to access rehydrated Headers'
    assert result['content-type'] == 'text/html', 'Unable to access rehydrated Headers'
  end
end

