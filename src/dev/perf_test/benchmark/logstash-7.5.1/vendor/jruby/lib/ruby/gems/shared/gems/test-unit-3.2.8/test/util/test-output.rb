require 'test/unit'

class TestUnitOutput < Test::Unit::TestCase
  def test_capture_output
    assert_equal(["stdout\n", "stderr\n"],
                 capture_output do
                   puts("stdout")
                   warn("stderr")
                 end)
  end
end
