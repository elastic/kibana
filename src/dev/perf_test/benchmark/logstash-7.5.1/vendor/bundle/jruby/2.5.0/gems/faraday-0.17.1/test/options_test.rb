require File.expand_path('../helper', __FILE__)

class OptionsTest < Faraday::TestCase
  SubOptions = Class.new(Faraday::Options.new(:sub_a, :sub_b))
  class ParentOptions < Faraday::Options.new(:a, :b, :c)
    options :c => SubOptions
  end

  def test_deep_merge
    sub_opts1 = SubOptions.from(sub_a: 3)
    sub_opts2 = SubOptions.from(sub_b: 4)
    opt1 = ParentOptions.from(a: 1, c: sub_opts1)
    opt2 = ParentOptions.from(b: 2, c: sub_opts2)

    merged = opt1.merge(opt2)

    expected_sub_opts = SubOptions.from(sub_a: 3, sub_b: 4)
    assert_equal merged, ParentOptions.from(a: 1, b: 2, c: expected_sub_opts)
  end

  def test_deep_merge_with_hash
    sub_opts1 = SubOptions.from(sub_a: 3)
    sub_opts2 = { sub_b: 4 }
    opt1 = ParentOptions.from(a: 1, c: sub_opts1)
    opt2 = { b: 2, c: sub_opts2 }

    merged = opt1.merge(opt2)

    expected_sub_opts = SubOptions.from(sub_a: 3, sub_b: 4)
    assert_equal merged, ParentOptions.from(a: 1, b: 2, c: expected_sub_opts)
  end

  def test_deep_merge_with_nil
    sub_opts = SubOptions.new(3, 4)
    options = ParentOptions.new(1, 2, sub_opts)
    assert_equal options.a, 1
    assert_equal options.b, 2
    assert_equal options.c.sub_a, 3
    assert_equal options.c.sub_b, 4

    options2 = ParentOptions.from(b: 5, c: nil)

    merged = options.merge(options2)

    assert_equal merged.b, 5
    assert_equal merged.c, sub_opts
  end

  def test_deep_merge_with_sub_nil
    options = ParentOptions.from(a: 1)

    sub_opts = SubOptions.new(3, 4)
    options2 = ParentOptions.from(b: 2, c: sub_opts)

    assert_equal options.a, 1
    assert_equal options2.b, 2
    assert_equal options2.c.sub_a, 3
    assert_equal options2.c.sub_b, 4

    merged = options.merge(options2)

    assert_equal merged.c, sub_opts
  end

  def test_dup_is_shallow
    sub_opts = SubOptions.from(sub_a: 3)
    opts = ParentOptions.from(b: 1, c: sub_opts)

    duped = opts.dup
    duped.b = 2
    duped.c.sub_a = 4

    assert_equal opts.b, 1
    assert_equal opts.c.sub_a, 4
  end

  def test_deep_dup
    sub_opts = SubOptions.from(sub_a: 3)
    opts = ParentOptions.from(b: 1, c: sub_opts)

    duped = opts.deep_dup
    duped.b = 2
    duped.c.sub_a = 4

    assert_equal opts.b, 1
    assert_equal opts.c.sub_a, 3
  end

  def test_clear
    options = SubOptions.new(1)
    assert !options.empty?
    assert options.clear
    assert options.empty?
  end

  def test_empty
    options = SubOptions.new
    assert options.empty?
    options.sub_a = 1
    assert !options.empty?
    options.delete(:sub_a)
    assert options.empty?
  end

  def test_each_key
    options = ParentOptions.new(1, 2, 3)
    enum = options.each_key
    assert_equal enum.next.to_sym, :a
    assert_equal enum.next.to_sym, :b
    assert_equal enum.next.to_sym, :c
  end

  def test_key?
    options = SubOptions.new
    assert !options.key?(:sub_a)
    options.sub_a = 1
    assert options.key?(:sub_a)
  end

  def test_each_value
    options = ParentOptions.new(1, 2, 3)
    enum = options.each_value
    assert_equal enum.next, 1
    assert_equal enum.next, 2
    assert_equal enum.next, 3
  end

  def test_value?
    options = SubOptions.new
    assert !options.value?(1)
    options.sub_a = 1
    assert options.value?(1)
  end

  def test_request_proxy_setter
    options = Faraday::RequestOptions.new
    assert_nil options.proxy

    assert_raises NoMethodError do
      options[:proxy] = {:booya => 1}
    end

    options[:proxy] = {:user => 'user'}
    assert_kind_of Faraday::ProxyOptions, options.proxy
    assert_equal 'user', options.proxy.user

    options.proxy = nil
    assert_nil options.proxy
  end

  def test_proxy_options_from_string
    options = Faraday::ProxyOptions.from 'http://user:pass@example.org'
    assert_equal 'user', options.user
    assert_equal 'pass', options.password
    assert_kind_of URI, options.uri
    assert_equal '', options.path
    assert_equal 80, options.port
    assert_equal 'example.org', options.host
    assert_equal 'http', options.scheme
  end

  def test_proxy_options_from_nil
    options = Faraday::ProxyOptions.from nil
    assert_kind_of Faraday::ProxyOptions, options
  end

  def test_proxy_options_hash_access
    proxy = Faraday::ProxyOptions.from 'http://a%40b:pw%20d@example.org'
    assert_equal 'a@b', proxy[:user]
    assert_equal 'a@b', proxy.user
    assert_equal 'pw d', proxy[:password]
    assert_equal 'pw d', proxy.password
  end

  def test_proxy_options_no_auth
    proxy = Faraday::ProxyOptions.from 'http://example.org'
    assert_nil proxy.user
    assert_nil proxy.password
  end

  def test_from_options
    options = ParentOptions.new(1)

    value = ParentOptions.from(options)
    assert_equal 1, value.a
    assert_nil value.b
  end

  def test_from_options_with_sub_object
    sub = SubOptions.new(1)
    options = ParentOptions.from :a => 1, :c => sub
    assert_kind_of ParentOptions, options
    assert_equal 1, options.a
    assert_nil options.b
    assert_kind_of SubOptions, options.c
    assert_equal 1, options.c.sub_a
  end

  def test_from_hash
    options = ParentOptions.from :a => 1
    assert_kind_of ParentOptions, options
    assert_equal 1, options.a
    assert_nil options.b
  end

  def test_from_hash_with_sub_object
    options = ParentOptions.from :a => 1, :c => {:sub_a => 1}
    assert_kind_of ParentOptions, options
    assert_equal 1, options.a
    assert_nil options.b
    assert_kind_of SubOptions, options.c
    assert_equal 1, options.c.sub_a
  end

  def test_inheritance
    subclass = Class.new(ParentOptions)
    options = subclass.from(:c => {:sub_a => 'hello'})
    assert_kind_of SubOptions, options.c
    assert_equal 'hello', options.c.sub_a
  end

  def test_from_deep_hash
    hash = {:b => 1}
    options = ParentOptions.from :a => hash
    assert_equal 1, options.a[:b]

    hash[:b] = 2
    assert_equal 1, options.a[:b]

    options.a[:b] = 3
    assert_equal 2, hash[:b]
    assert_equal 3, options.a[:b]
  end

  def test_from_nil
    options = ParentOptions.from(nil)
    assert_kind_of ParentOptions, options
    assert_nil options.a
    assert_nil options.b
  end

  def test_invalid_key
    assert_raises NoMethodError do
      ParentOptions.from :invalid => 1
    end
  end

  def test_update
    options = ParentOptions.new(1)
    assert_equal 1, options.a
    assert_nil options.b

    updated = options.update :a => 2, :b => 3
    assert_equal 2, options.a
    assert_equal 3, options.b
    assert_equal options, updated
  end

  def test_delete
    options = ParentOptions.new(1)
    assert_equal 1, options.a
    assert_equal 1, options.delete(:a)
    assert_nil options.a
  end

  def test_merge
    options = ParentOptions.new(1)
    assert_equal 1, options.a
    assert_nil options.b

    dup = options.merge :a => 2, :b => 3
    assert_equal 2, dup.a
    assert_equal 3, dup.b
    assert_equal 1, options.a
    assert_nil options.b
  end

  def test_env_access_member
    e = Faraday::Env.new
    assert_nil e.method
    e.method = :get
    assert_equal :get, e.method
  end

  def test_env_access_symbol_non_member
    e = Faraday::Env.new
    assert_nil e[:custom]
    e[:custom] = :boom
    assert_equal :boom, e[:custom]
  end

  def test_env_access_string_non_member
    e = Faraday::Env.new
    assert_nil e["custom"]
    e["custom"] = :boom
    assert_equal :boom, e["custom"]
  end

  def test_env_fetch_ignores_false
    ssl = Faraday::SSLOptions.new
    ssl.verify = false
    assert !ssl.fetch(:verify, true)
  end

  def test_fetch_grabs_value
    opt = Faraday::SSLOptions.new
    opt.verify = 1
    assert_equal 1, opt.fetch(:verify, false) { |k| :blah }
  end

  def test_fetch_uses_falsey_default
    opt = Faraday::SSLOptions.new
    assert_equal false, opt.fetch(:verify, false) { |k| :blah }
  end

  def test_fetch_accepts_block
    opt = Faraday::SSLOptions.new
    assert_equal "yo :verify", opt.fetch(:verify) { |k| "yo #{k.inspect}"}
  end

  def test_fetch_needs_a_default_if_key_is_missing
    opt = Faraday::SSLOptions.new
    assert_raises Faraday::Options.fetch_error_class do
      opt.fetch :verify
    end
  end

  def test_fetch_works_with_key
    opt = Faraday::SSLOptions.new
    opt.verify = 1
    assert_equal 1, opt.fetch(:verify)
  end
end
