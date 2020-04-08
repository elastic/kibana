# -*- ruby encoding: utf-8 -*-

require 'mime/types'
require 'minitest_helper'

class TestMIMETypes < Minitest::Test
  def setup
    @mime_types = MIME::Types.new
    @mime_types.add(MIME::Type.new(['text/plain', %w(txt)]),
                    MIME::Type.new(['image/jpeg', %w(jpg jpeg)]),
                    MIME::Type.new('application/x-wordperfect6.1'),
                    MIME::Type.new('content-type' => 'application/x-www-form-urlencoded', 'registered' => true),
                    MIME::Type.new(['application/x-gzip', %w(gz)]),
                    MIME::Type.new(['application/gzip', %w(gz)]))
  end

  def test_enumerable
    assert(@mime_types.any? { |type| type.content_type == 'text/plain' })
    assert_kind_of(Enumerator, @mime_types.each)
    assert_equal(6, @mime_types.each.count)
  end

  def test_index_with_mime_type
    xtxp = MIME::Type.new('x-text/x-plain')
    assert_includes(@mime_types[xtxp], 'text/plain')
    assert_equal(1, @mime_types[xtxp].size)
  end

  def test_index_with_regex
    assert_includes(@mime_types[/plain/], 'text/plain')
    assert_equal(1, @mime_types[/plain/].size)
  end

  def test_index_with_string
    assert_includes(@mime_types['text/plain'], 'text/plain')
    assert_equal(1, @mime_types['text/plain'].size)
  end

  def test_index_with_complete_flag
    assert_empty(@mime_types['text/vnd.fly', complete: true])
    refute_empty(@mime_types['text/plain', complete: true])
  end

  def test_index_with_registered_flag
    assert_empty(@mime_types['application/x-wordperfect6.1',
                             registered: true])
    refute_empty(@mime_types['application/x-www-form-urlencoded',
                             registered: true])
    refute_empty(@mime_types['application/gzip', registered: true])
    refute_equal(@mime_types['application/gzip'].size,
                 @mime_types['application/gzip', registered: true])
  end

  def test_index_with_platform_flag
    assert_deprecated('MIME::Types#[]', 'using the :platform flag') do
      assert_empty(MIME::Types['text/plain', platform: true])
    end
  end

  def test_add
    eruby = MIME::Type.new('application/x-eruby') do |t|
      t.extensions = 'rhtml'
      t.encoding = '8bit'
    end

    @mime_types.add(eruby)

    assert_equal(@mime_types['application/x-eruby'], [eruby])
  end

  def test_type_for
    assert_equal(%w(application/gzip application/x-gzip),
                 @mime_types.type_for('gz'))
    assert_equal(%w(image/jpeg), MIME::Types.of('foo.jpeg'))
    assert_equal(%w(image/jpeg text/plain),
                 MIME::Types.type_for(%w(foo.txt foo.jpeg)))
    assert_deprecated('MIME::Types#type_for', 'using the platform parameter') do
      assert_equal(@mime_types.of('gif', true), @mime_types['image/gif'])
    end
    assert_empty(MIME::Types.type_for('coverallsjson'))
    assert_deprecated('MIME::Types#type_for', 'using the platform parameter') do
      assert_empty(MIME::Types.type_for('jpeg', true))
    end
    assert_empty(@mime_types.type_for('zzz'))
  end

  def test_count
    assert_equal(6, @mime_types.count)
  end

  # This tests the instance implementation through the class implementation.
  def test_add_type_variant
    xtxp = MIME::Type.new('x-text/x-plain')
    assert_deprecated('MIME::Types#add_type_variant', 'and will be private') do
      @mime_types.add_type_variant(xtxp)
    end
    assert_includes(@mime_types['text/plain'], xtxp)
  end

  def test_data_version
    assert_equal(MIME::Type::VERSION, @mime_types.data_version)
  end

  # This tests the instance implementation through the class implementation.
  def test_index_extensions
    xtxp = MIME::Type.new(['x-text/x-plain', %w(tzt)])
    assert_deprecated('MIME::Types#index_extensions', 'and will be private') do
      @mime_types.index_extensions(xtxp)
    end
    assert_includes(@mime_types.of('tzt'), xtxp)
  end

  def test_defined_types
    assert_deprecated('MIME::Types#defined_types') do
      assert_empty(MIME::Types.new.defined_types)
    end
    assert_deprecated('MIME::Types#defined_types') do
      refute_empty(@mime_types.defined_types)
    end
  end
end
