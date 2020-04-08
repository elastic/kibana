require 'test/unit'
require 'testunit-test-util'

class TestUnitPending < Test::Unit::TestCase
  include TestUnitTestUtil

  class TestCase < Test::Unit::TestCase
    class << self
      def suite
        Test::Unit::TestSuite.new(name)
      end
    end

    def test_pend
      pend("1st pend")
      pend("2nd pend. Should not be reached here.")
      assert(true, "Should not be reached here too.")
    end

    def test_pend_with_failure_in_block
      pend("Wait a minute") do
        raise "Not implemented yet"
      end
      assert(true, "Reached here.")
    end

    def test_pend_with_no_failure_in_block
      pend("Wait a minute") do
        "Nothing raised"
      end
      assert(true, "Not reached here.")
    end
  end

  def test_pend
    test = nil
    result = _run_test("test_pend") {|t| test = t}
    assert_equal("1 tests, 0 assertions, 0 failures, 0 errors, 1 pendings, " \
                 "0 omissions, 0 notifications",
                 result.to_s)
    assert_fault_messages(["1st pend"], result.pendings)
    assert_true(test.interrupted?)
  end

  def test_pend_with_failure_in_block
    test = nil
    result = _run_test("test_pend_with_failure_in_block") {|t| test = t}
    assert_equal("1 tests, 1 assertions, 0 failures, 0 errors, 1 pendings, " \
                 "0 omissions, 0 notifications",
                 result.to_s)
    assert_fault_messages(["Wait a minute"], result.pendings)
    assert_false(test.interrupted?)
  end

  def test_pend_with_no_failure_in_block
    test = nil
    result = _run_test("test_pend_with_no_failure_in_block") {|t| test = t}
    assert_equal("1 tests, 1 assertions, 1 failures, 0 errors, 0 pendings, " \
                 "0 omissions, 0 notifications",
                 result.to_s)
    assert_fault_messages(["Pending block should not be passed: Wait a minute."],
                          result.failures)
    assert_true(test.interrupted?)
  end

  private
  def _run_test(name, &block)
    super(TestCase, name, &block)
  end
end
