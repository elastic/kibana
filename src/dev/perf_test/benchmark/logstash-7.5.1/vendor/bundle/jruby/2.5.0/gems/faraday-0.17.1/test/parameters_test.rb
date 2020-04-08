require File.expand_path("../helper", __FILE__)
require "rack/utils"

class TestParameters < Faraday::TestCase
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

  def test_escaping_safe_buffer_nested
    monies = FakeSafeBuffer.new("$32,000.00")
    assert_equal "a=%2432%2C000.00", Faraday::NestedParamsEncoder.encode("a" => monies)
  end

  def test_escaping_safe_buffer_flat
    monies = FakeSafeBuffer.new("$32,000.00")
    assert_equal "a=%2432%2C000.00", Faraday::FlatParamsEncoder.encode("a" => monies)
  end

  def test_raises_typeerror_nested
    error = assert_raises TypeError do
      Faraday::NestedParamsEncoder.encode("")
    end
    assert_equal "Can't convert String into Hash.", error.message
  end

  def test_raises_typeerror_flat
    error = assert_raises TypeError do
      Faraday::FlatParamsEncoder.encode("")
    end
    assert_equal "Can't convert String into Hash.", error.message
  end

  def test_decode_array_nested
    query = "a[1]=one&a[2]=two&a[3]=three"
    expected = {"a" => ["one", "two", "three"]}
    assert_equal expected, Faraday::NestedParamsEncoder.decode(query)
  end

  def test_decode_array_flat
    query = "a=one&a=two&a=three"
    expected = {"a" => ["one", "two", "three"]}
    assert_equal expected, Faraday::FlatParamsEncoder.decode(query)
  end

  def test_nested_decode_hash
    query = "a[b1]=one&a[b2]=two&a[b][c]=foo"
    expected = {"a" => {"b1" => "one", "b2" => "two", "b" => {"c" => "foo"}}}
    assert_equal expected, Faraday::NestedParamsEncoder.decode(query)
  end

  def test_encode_nil_nested
    assert_equal "a", Faraday::NestedParamsEncoder.encode("a" => nil)
  end

  def test_encode_nil_flat
    assert_equal "a", Faraday::FlatParamsEncoder.encode("a" => nil)
  end

  def test_decode_nested_array_rack_compat
    query = "a[][one]=1&a[][two]=2&a[][one]=3&a[][two]=4"
    expected = Rack::Utils.parse_nested_query(query)
    assert_equal expected, Faraday::NestedParamsEncoder.decode(query)
  end

  def test_decode_nested_array_mixed_types
    query = "a[][one]=1&a[]=2&a[]=&a[]"
    expected = Rack::Utils.parse_nested_query(query)
    assert_equal expected, Faraday::NestedParamsEncoder.decode(query)
  end

  def test_decode_nested_ignores_invalid_array
    query = "[][a]=1&b=2"
    expected = {"a" => "1", "b" => "2"}
    assert_equal expected, Faraday::NestedParamsEncoder.decode(query)
  end

  def test_decode_nested_ignores_repeated_array_notation
    query = "a[][][]=1"
    expected = {"a" => ["1"]}
    assert_equal expected, Faraday::NestedParamsEncoder.decode(query)
  end

  def test_decode_nested_ignores_malformed_keys
    query = "=1&[]=2"
    expected = {}
    assert_equal expected, Faraday::NestedParamsEncoder.decode(query)
  end

  def test_decode_nested_subkeys_dont_have_to_be_in_brackets
    query = "a[b]c[d]e=1"
    expected = {"a" => {"b" => {"c" => {"d" => {"e" => "1"}}}}}
    assert_equal expected, Faraday::NestedParamsEncoder.decode(query)
  end

  def test_decode_nested_raises_error_when_expecting_hash
    error = assert_raises TypeError do
      Faraday::NestedParamsEncoder.decode("a=1&a[b]=2")
    end
    assert_equal "expected Hash (got String) for param `a'", error.message

    error = assert_raises TypeError do
      Faraday::NestedParamsEncoder.decode("a[]=1&a[b]=2")
    end
    assert_equal "expected Hash (got Array) for param `a'", error.message

    error = assert_raises TypeError do
      Faraday::NestedParamsEncoder.decode("a[b]=1&a[]=2")
    end
    assert_equal "expected Array (got Hash) for param `a'", error.message

    error = assert_raises TypeError do
      Faraday::NestedParamsEncoder.decode("a=1&a[]=2")
    end
    assert_equal "expected Array (got String) for param `a'", error.message

    error = assert_raises TypeError do
      Faraday::NestedParamsEncoder.decode("a[b]=1&a[b][c]=2")
    end
    assert_equal "expected Hash (got String) for param `b'", error.message
  end

  def test_decode_nested_final_value_overrides_any_type
    query = "a[b][c]=1&a[b]=2"
    expected = {"a" => {"b" => "2"}}
    assert_equal expected, Faraday::NestedParamsEncoder.decode(query)
  end

  def test_encode_rack_compat_nested
    params = { :a => [{:one => "1", :two => "2"}, "3", ""] }
    expected = Rack::Utils.build_nested_query(params)
    assert_equal expected.split("&").sort,
      Faraday::Utils.unescape(Faraday::NestedParamsEncoder.encode(params)).split("&").sort
  end

  def test_encode_empty_string_array_value
    expected = 'baz=&foo%5Bbar%5D='
    assert_equal expected, Faraday::NestedParamsEncoder.encode(foo: {bar: ''}, baz: '')
  end

  def test_encode_nil_array_value
    expected = 'baz&foo%5Bbar%5D'
    assert_equal expected, Faraday::NestedParamsEncoder.encode(foo: {bar: nil}, baz: nil)
  end

  def test_encode_empty_array_value
    expected = 'baz%5B%5D&foo%5Bbar%5D%5B%5D'
    Faraday::NestedParamsEncoder.encode(foo: { bar: [] }, baz: [])
    assert_equal expected, Faraday::NestedParamsEncoder.encode(foo: { bar: [] }, baz: [])
  end
end
