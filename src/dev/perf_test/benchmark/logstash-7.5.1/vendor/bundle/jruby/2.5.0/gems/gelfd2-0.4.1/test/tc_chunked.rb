$:.unshift(File.expand_path(File.join(File.dirname(__FILE__), "..", "lib")))
require 'gelfd2'
require 'json'
require 'test/unit'

class TestChhunkedGelf < Test::Unit::TestCase
  JSON_MESSAGE = '{"version":"1.0","host":"somehost","level":"debug","facility":"myapp","short_message":"boom","full_message":"something failed horribly","file":"myapp.rb","timestamp":1315539095.041,"line":105}'
  FIXTURE_PATH = File.expand_path(File.join(File.dirname(__FILE__), 'fixtures'))
  def test_chunked_message
    files = Dir.glob("#{FIXTURE_PATH}/*.chunk")
    files.each do |file|
      data = File.open("#{file}", "rb") { |f| f.read }
      @t = Gelfd2::Parser.parse(data)
    end
    assert_equal(JSON_MESSAGE, @t)
  end
end
