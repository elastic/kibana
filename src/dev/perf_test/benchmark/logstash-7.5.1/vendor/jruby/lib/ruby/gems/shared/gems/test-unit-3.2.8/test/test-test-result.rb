# Author:: Nathaniel Talbott.
# Copyright:: Copyright (c) 2000-2002 Nathaniel Talbott. All rights reserved.
# License:: Ruby license.

require 'test/unit/testcase'
require 'test/unit/testresult'

module Test
  module Unit
    class TC_TestResult < TestCase
      def setup
        @my_result = TestResult.new
        @my_result.add_assertion()
        @failure = "failure"
        @my_result.add_failure(@failure)
        @error = "error"
        @my_result.add_error(@error)
      end

      def test_result_changed_notification
        called1 = false
        @my_result.add_listener(TestResult::CHANGED) do |result|
          assert_equal(@my_result, result)
          called1 = true
        end
        @my_result.add_assertion
        assert_true(called1)

        called1, called2 = false, false
        @my_result.add_listener(TestResult::CHANGED) do |result|
          assert_equal(@my_result, result)
          called2 = true
        end
        @my_result.add_assertion
        assert_equal([true, true], [called1, called2])

        called1, called2 = false, false
        @my_result.add_failure("")
        assert_equal([true, true], [called1, called2])

        called1, called2 = false, false
        @my_result.add_error("")
        assert_equal([true, true], [called1, called2])

        called1, called2 = false, false
        @my_result.add_run
        assert_equal([true, true], [called1, called2])
      end

      def test_fault_notification
        called1 = false
        fault = "fault"
        @my_result.add_listener(TestResult::FAULT) do |passed_fault|
          assert_equal(fault, passed_fault)
          called1 = true
        end

        @my_result.add_assertion
        assert_false(called1)

        @my_result.add_failure(fault)
        assert_true(called1)

        called1, called2 = false, false
        @my_result.add_listener(TestResult::FAULT) do |passed_fault|
          assert_equal(fault, passed_fault)
          called2 = true
        end

        @my_result.add_assertion
        assert_equal([false, false], [called1, called2])

        called1, called2 = false, false
        @my_result.add_failure(fault)
        assert_equal([true, true], [called1, called2])

        called1, called2 = false, false
        @my_result.add_error(fault)
        assert_equal([true, true], [called1, called2])

        called1, called2 = false, false
        @my_result.add_run
        assert_equal([false, false], [called1, called2])
      end

      def test_passed?
        result = TestResult.new
        assert_true(result.passed?)

        result.add_assertion
        assert_true(result.passed?)

        result.add_run
        assert_true(result.passed?)

        result.add_failure("")
        assert_false(result.passed?)

        result = TestResult.new
        result.add_error("")
        assert_false(result.passed?)
      end

      def test_faults
        assert_equal([@failure, @error], @my_result.faults)

        notification = "notification"
        @my_result.add_notification(notification)
        assert_equal([@failure, @error, notification], @my_result.faults)
      end
    end
  end
end
