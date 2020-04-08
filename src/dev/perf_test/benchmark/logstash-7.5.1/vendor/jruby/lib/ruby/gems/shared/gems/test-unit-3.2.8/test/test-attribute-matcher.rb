require 'test/unit'
require 'testunit-test-util'

class TestAttributeMatcher < Test::Unit::TestCase
  include TestUnitTestUtil

  def setup
    @test = {}
    @matcher = Test::Unit::AttributeMatcher.new(@test)
  end

  def test_nonexistent
    assert_false(@matcher.match?("nonexistent"))
  end

  def test_existent
    @test[:existent] = true
    assert_true(@matcher.match?("existent"))
  end

  def test_and
    @test[:slow] = true
    @test[:important] = true
    assert_true(@matcher.match?("important and slow"))
  end

  def test_complex
    @test[:tags] = [:slow, :web]
    @test[:bug] = "2929"
    assert_true(@matcher.match?("tags.include?(:web) or bug == '29'"))
  end

  def test_exception
    assert_raise(NoMethodError) do
      @matcher.match?("nonexistent > 100")
    end
  end
end
