require 'test/unit'
require 'testunit-test-util'

class TestUnitNotification < Test::Unit::TestCase
  include TestUnitTestUtil

  class TestCase < Test::Unit::TestCase
    class << self
      def suite
        Test::Unit::TestSuite.new(name)
      end
    end

    def test_notify
      notify("1st notify")
      notify("2nd notify. Reach here.")
    end
  end

  def test_notify
    result = _run_test("test_notify")
    assert_equal("1 tests, 0 assertions, 0 failures, 0 errors, 0 pendings, " \
                 "0 omissions, 2 notifications",
                 result.to_s)
    assert_fault_messages(["1st notify", "2nd notify. Reach here."],
                          result.notifications)
  end

  private
  def _run_test(name)
    super(TestCase, name)
  end
end
