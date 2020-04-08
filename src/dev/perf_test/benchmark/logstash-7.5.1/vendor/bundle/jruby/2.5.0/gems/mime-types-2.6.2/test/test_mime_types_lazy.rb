# -*- ruby encoding: utf-8 -*-

require 'mime/types'
require 'minitest_helper'

class TestMIMETypesLazy < Minitest::Test
  def setup
    @cache_file = File.expand_path('../cache.tst', __FILE__)
    ENV['RUBY_MIME_TYPES_LAZY_LOAD'] = 'true'
    ENV['RUBY_MIME_TYPES_CACHE'] = @cache_file
    MIME::Types::Cache.save
  end

  def teardown
    clear_cache_file
    reset_mime_types
    if File.exist? ENV['RUBY_MIME_TYPES_CACHE']
      FileUtils.rm ENV['RUBY_MIME_TYPES_CACHE']
      ENV.delete('RUBY_MIME_TYPES_CACHE')
    end
    ENV.delete('RUBY_MIME_TYPES_LAZY_LOAD')
  end

  def clear_cache_file
    FileUtils.rm @cache_file if File.exist? @cache_file
  end

  def reset_mime_types
    MIME::Types.instance_variable_set(:@__types__, nil)
    MIME::Types.send(:load_default_mime_types)
  end

  def test_lazy_load?
    assert_equal(true, MIME::Types.send(:lazy_load?))
    ENV['RUBY_MIME_TYPES_LAZY_LOAD'] = nil
    assert_equal(nil, MIME::Types.send(:lazy_load?))
    ENV['RUBY_MIME_TYPES_LAZY_LOAD'] = 'false'
    assert_equal(false, MIME::Types.send(:lazy_load?))
  end

  def test_lazy_loading
    MIME::Types.instance_variable_set(:@__types__, nil)
    assert_nil(MIME::Types.instance_variable_get(:@__types__))
    refute_nil(MIME::Types['text/html'].first)
    refute_nil(MIME::Types.instance_variable_get(:@__types__))
  end
end
