require File.expand_path(File.join(File.dirname(__FILE__), 'helper'))
require 'stringio'

class CompositeReadIOTest < Faraday::TestCase
  Part = Struct.new(:to_io) do
    def length() to_io.string.length end
  end

  def part(str)
    Part.new StringIO.new(str)
  end

  def composite_io(*parts)
    Faraday::CompositeReadIO.new(*parts)
  end

  def test_empty
    io = composite_io
    assert_equal 0, io.length
    assert_equal "", io.read
  end

  def test_empty_returns_nil_for_limited_read
    assert_nil composite_io.read(1)
  end

  def test_empty_parts_returns_nil_for_limited_read
    io = composite_io(part(""), part(""))
    assert_nil io.read(1)
  end

  def test_multipart_read_all
    io = composite_io(part("abcd"), part("1234"))
    assert_equal 8, io.length
    assert_equal "abcd1234", io.read
  end

  def test_multipart_read_limited
    io = composite_io(part("abcd"), part("1234"))
    assert_equal "abc", io.read(3)
    assert_equal "d12", io.read(3)
    assert_equal "34", io.read(3)
    assert_nil io.read(3)
    assert_nil io.read(3)
  end

  def test_multipart_read_limited_size_larger_than_part
    io = composite_io(part("abcd"), part("1234"))
    assert_equal "abcd12", io.read(6)
    assert_equal "34", io.read(6)
    assert_nil io.read(6)
  end

  def test_multipart_read_with_blank_parts
    io = composite_io(part(""), part("abcd"), part(""), part("1234"), part(""))
    assert_equal "abcd12", io.read(6)
    assert_equal "34", io.read(6)
    assert_nil io.read(6)
  end

  def test_multipart_rewind
    io = composite_io(part("abcd"), part("1234"))
    assert_equal "abc", io.read(3)
    assert_equal "d12", io.read(3)
    io.rewind
    assert_equal "abc", io.read(3)
    assert_equal "d1234", io.read(5)
    assert_nil io.read(3)
    io.rewind
    assert_equal "ab", io.read(2)
  end

  # JRuby enforces types to copy_stream to be String or IO
  if IO.respond_to?(:copy_stream) && !jruby?
    def test_compatible_with_copy_stream
      target_io = StringIO.new
      def target_io.ensure_open_and_writable
        # Rubinius compatibility
      end
      io = composite_io(part("abcd"), part("1234"))

      Faraday::Timer.timeout(1) do
        IO.copy_stream(io, target_io)
      end
      assert_equal "abcd1234", target_io.string
    end
  end

  def test_read_from_multibyte
    File.open(File.dirname(__FILE__) + '/multibyte.txt') do |utf8|
      io = composite_io(part("\x86"), Part.new(utf8))
      assert_equal bin("\x86\xE3\x83\x95\xE3\x82\xA1\xE3\x82\xA4\xE3\x83\xAB\n"), io.read
    end
  end

  def test_limited_from_multibyte
    File.open(File.dirname(__FILE__) + '/multibyte.txt') do |utf8|
      io = composite_io(part("\x86"), Part.new(utf8))
      assert_equal bin("\x86\xE3\x83"), io.read(3)
      assert_equal bin("\x95\xE3\x82"), io.read(3)
      assert_equal bin("\xA1\xE3\x82\xA4\xE3\x83\xAB\n"), io.read(8)
    end
  end

  def bin(str)
    str.force_encoding("BINARY") if str.respond_to?(:force_encoding)
    str
  end
end
