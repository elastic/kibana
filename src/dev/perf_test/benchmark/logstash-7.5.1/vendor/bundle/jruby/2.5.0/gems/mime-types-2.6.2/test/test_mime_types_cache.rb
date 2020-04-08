# -*- ruby encoding: utf-8 -*-

require 'mime/types'
require 'minitest_helper'

class TestMIMETypesCache < Minitest::Test
  def setup
    require 'fileutils'
    @cache_file = File.expand_path('../cache.tst', __FILE__)
    ENV['RUBY_MIME_TYPES_CACHE'] = @cache_file
    clear_cache_file
  end

  def teardown
    clear_cache_file
    ENV.delete('RUBY_MIME_TYPES_CACHE')
  end

  def reset_mime_types
    MIME::Types.instance_variable_set(:@__types__, nil)
    MIME::Types.send(:load_default_mime_types)
  end

  def clear_cache_file
    FileUtils.rm @cache_file if File.exist? @cache_file
  end

  def test_does_not_use_cache_when_unset
    ENV.delete('RUBY_MIME_TYPES_CACHE')
    assert_equal(nil, MIME::Types::Cache.load)
  end

  def test_does_not_use_cache_when_missing
    assert_equal(nil, MIME::Types::Cache.load)
  end

  def test_does_not_create_cache_when_unset
    ENV.delete('RUBY_MIME_TYPES_CACHE')
    assert_equal(nil, MIME::Types::Cache.save)
  end

  def test_creates_cache
    assert_equal(false, File.exist?(@cache_file))
    MIME::Types::Cache.save
    assert_equal(true, File.exist?(@cache_file))
  end

  def test_uses_cache
    MIME::Types['text/html'].first.extensions << 'hex'
    MIME::Types::Cache.save
    MIME::Types.instance_variable_set(:@__types__, nil)

    assert_includes(MIME::Types['text/html'].first.extensions, 'hex')

    reset_mime_types
  end

  def test_load_different_version
    v = MIME::Types::VERSION.dup
    MIME::Types::VERSION.gsub!(/.*/, '0.0')
    MIME::Types::Cache.save
    MIME::Types::VERSION.gsub!(/.*/, v)
    MIME::Types.instance_variable_set(:@__types__, nil)
    assert_output(nil, /MIME::Types cache: invalid version/) do
      MIME::Types['text/html']
    end
  end

  def test_cache_load_failure
    MIME::Types::Cache.save
    data = File.binread(@cache_file).reverse
    File.open(@cache_file, 'wb') { |f| f.write(data) }
    MIME::Types.instance_variable_set(:@__types__, nil)
    assert_output(nil, /Could not load MIME::Types cache: incompatible marshal file format/) do
      MIME::Types['text/html']
    end
  end

  def test_container_marshalling
    container = MIME::Types::Container.new
    # default proc should return []
    assert_equal([], container['abc'])

    marshalled = Marshal.dump(container)
    loaded_container = Marshal.load(marshalled)

    # default proc should still return []
    assert_equal([], loaded_container['abcd'])
  end
end
