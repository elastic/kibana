# -*- ruby encoding: utf-8 -*-

require 'mime/types'
require 'minitest_helper'

class TestMIMETypesLoader < Minitest::Test
  def setup
    @path     = File.expand_path('../fixture', __FILE__)
    @loader   = MIME::Types::Loader.new(@path)
    @bad_path = File.expand_path('../bad-fixtures', __FILE__)
  end

  def assert_correctly_loaded(types)
    assert_includes(types, 'application/1d-interleaved-parityfec')
    assert_deprecated('MIME::Type#references') do
      assert_includes(types['application/acad'].first.references, 'LTSW')
    end
    assert_deprecated('MIME::Type#urls') do
      assert_equal([%w(WebM http://www.webmproject.org/code/specs/container/)],
                   types['audio/webm'].first.urls)
    end
    assert_equal(%w(webm), types['audio/webm'].first.extensions)
    refute(types['audio/webm'].first.registered?)

    assert_equal('Fixes a bug with IE6 and progressive JPEGs',
                 types['image/pjpeg'].first.docs)

    assert_deprecated('MIME::Type#system?') do
      assert(types['application/x-apple-diskimage'].first.system?)
    end
    assert_deprecated('MIME::Type#system') do
      assert_equal(/mac/, types['application/x-apple-diskimage'].first.system)
    end

    assert(types['audio/vnd.qcelp'].first.obsolete?)
    assert_equal('audio/QCELP', types['audio/vnd.qcelp'].first.use_instead)
  end

  def test_load_yaml
    assert_correctly_loaded(@loader.load_yaml)
  end

  def test_load_json
    assert_correctly_loaded(@loader.load_json)
  end

  def test_load_v1
    assert_deprecated('MIME::Types::Loader.load_v1') do
      assert_correctly_loaded(@loader.load_v1)
    end
  end

  def test_malformed_v1
    assert_output(nil, /1: Parsing error in v1 MIME type definition/) {
      assert_raises(MIME::Types::Loader::BadV1Format) {
        MIME::Types::Loader.load_from_v1(File.join(@bad_path, 'malformed'))
      }
    }
  end
end
