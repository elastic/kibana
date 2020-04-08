require 'test/unit'
require 'testunit-test-util'

class TestUnitOmission < Test::Unit::TestCase
  include TestUnitTestUtil

  class TestCase < Test::Unit::TestCase
    class << self
      def suite
        Test::Unit::TestSuite.new(name)
      end
    end

    def test_omit
      omit("1st omit")
      omit("2nd omit. Should not be reached here.")
      assert(true, "Should not be reached here too.")
    end

    def test_omit_with_condition
      omit_if(false, "Never omit.")
      omit_unless(true, "Never omit too.")
      omit_if(true, "Should omit.")
      omit("The last omit. Should not be reached here.")
    end

    def test_omit_with_block
      omit("Omit block") do
        flunk("Should not be reached here.")
      end
      assert(true, "Should be reached here.")
    end

    def test_omit_with_block_and_condition
      omit_if(false, "Never omit.") do
        assert(true, "Should be reached here.")
      end
      omit_if(true, "Should omit.") do
        flunk("Never reached here.")
      end
      assert(true, "Should be reached here too.")
    end
  end

  def test_omit
    result = _run_test("test_omit")
    assert_equal("1 tests, 0 assertions, 0 failures, 0 errors, 0 pendings, " \
                 "1 omissions, 0 notifications",
                 result.to_s)
    assert_fault_messages(["1st omit"], result.omissions)
  end

  def test_omit_with_condition
    result = _run_test("test_omit_with_condition")
    assert_equal("1 tests, 0 assertions, 0 failures, 0 errors, 0 pendings, " \
                 "1 omissions, 0 notifications",
                 result.to_s)
    assert_fault_messages(["Should omit."], result.omissions)
  end

  def test_omit_with_block
    result = _run_test("test_omit_with_block")
    assert_equal("1 tests, 1 assertions, 0 failures, 0 errors, 0 pendings, " \
                 "1 omissions, 0 notifications",
                 result.to_s)
    assert_fault_messages(["Omit block"], result.omissions)
  end

  def test_omit_with_condition_and_block
    result = _run_test("test_omit_with_block_and_condition")
    assert_equal("1 tests, 2 assertions, 0 failures, 0 errors, 0 pendings, " \
                 "1 omissions, 0 notifications",
                 result.to_s)
    assert_fault_messages(["Should omit."], result.omissions)
  end

  private
  def _run_test(name)
    super(TestCase, name)
  end
end
