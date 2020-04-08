$:.unshift(File.expand_path(File.join(File.dirname(__FILE__), "..", "lib")))
require 'gelfd2'
require 'json'
require 'test/unit'

class TestUncompressedGelf < Test::Unit::TestCase
  FIXTURE_PATH = File.expand_path(File.join(File.dirname(__FILE__), 'fixtures'))

  def test_uncompressed_message
    data = File.open("#{FIXTURE_PATH}/unchunked.uc", "rb") {|f| f.read}
    t = Gelfd2::Parser.parse(data)
    assert_equal('{"this":"is","my":"boomstick"}', t)
  end
end
