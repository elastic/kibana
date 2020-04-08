# Author:: Nathaniel Talbott.
# Copyright:: Copyright (c) 2008-2014  Kouhei Sutou <kou@clear-code.com>
# Copyright:: Copyright (c) 2011  Haruka Yoshihara <yoshihara@clear-code.com>
# Copyright:: Copyright (c) 2000-2002  Nathaniel Talbott
# License:: Ruby license.

require 'test/unit'

module Test
  module Unit
    class TestTestCase < TestCase
      self.test_order = :random
      def test_creation
        test_case = Class.new(TestCase) do
          def test_with_arguments(arg1, arg2)
          end
        end

        test = test_case.new(:test_with_arguments)
        check("Should have caught an invalid test when there are arguments",
              !test.valid?)

        test = test_case.new(:non_existent_test)
        check("Should have caught an invalid test when the method does not exist",
              !test.valid?)
      end

      def setup
        @tc_failure_error = Class.new(TestCase) do
          def test_failure
            assert_block("failure") do
              false
            end
          end
          def test_error
            1 / 0
          end
          def test_nested_failure
            nested
          end
          def nested
            assert_block("nested") do
              false
            end
          end
          def return_passed?
            return passed?
          end
        end

        def @tc_failure_error.name
          "TC_FailureError"
        end
      end

      def jruby_backtrace_entry?(entry)
        entry.start_with?("org/jruby/")
      end

      def rubinius_backtrace_entry?(entry)
        entry.start_with?("kernel/")
      end

      def normalize_location(location)
        filtered_location = location.reject do |entry|
          jruby_backtrace_entry?(entry) or
            rubinius_backtrace_entry?(entry)
        end
        filtered_location.collect do |entry|
          entry.sub(/:\d+:/, ":0:")
        end
      end

      def test_add_failed_assertion
        test_case = @tc_failure_error.new(:test_failure)
        assert do
          test_case.passed?
        end

        result = TestResult.new
        faults = []
        result.add_listener(TestResult::FAULT) do |fault|
          faults << fault
        end
        progress = []
        test_case.run(result) do |*arguments|
          progress << arguments
        end
        fault_details = faults.collect do |fault|
          {
            :class     => fault.class,
            :message   => fault.message,
            :test_name => fault.test_name,
            :location  => normalize_location(fault.location),
          }
        end
        assert_equal([
                       {
                         :class     => Failure,
                         :message   => "failure",
                         :test_name => "test_failure(TC_FailureError)",
                         :location  => [
                           "#{__FILE__}:0:in `test_failure'",
                           "#{__FILE__}:0:in `#{__method__}'",
                         ],
                       },
                     ],
                     fault_details)

        assert do
          not test_case.passed?
        end
        assert_equal([
                       [TestCase::STARTED,         test_case.name],
                       [TestCase::STARTED_OBJECT,  test_case],
                       [TestCase::FINISHED,        test_case.name],
                       [TestCase::FINISHED_OBJECT, test_case],
                     ],
                     progress)
      end

      def test_add_failure_nested
        test_case = @tc_failure_error.new(:test_nested_failure)
        assert do
          test_case.passed?
        end

        result = TestResult.new
        faults = []
        result.add_listener(TestResult::FAULT) do |fault|
          faults << fault
        end
        test_case.run(result) do
        end
        fault_details = faults.collect do |fault|
          {
            :class     => fault.class,
            :message   => fault.message,
            :test_name => fault.test_name,
            :location  => normalize_location(fault.location),
          }
        end
        assert_equal([
                       {
                         :class     => Failure,
                         :message   => "nested",
                         :test_name => "test_nested_failure(TC_FailureError)",
                         :location  => [
                           "#{__FILE__}:0:in `nested'",
                           "#{__FILE__}:0:in `test_nested_failure'",
                           "#{__FILE__}:0:in `#{__method__}'",
                         ],
                       },
                     ],
                     fault_details)

        assert do
          not test_case.passed?
        end
      end

      def jruby?
        defined?(JRUBY_VERSION)
      end

      def rubinius?
        false # TODO
      end

      def cruby?
        (not jruby?) and (not rubinius?)
      end

      def test_add_error
        test_case = @tc_failure_error.new(:test_error)
        assert do
          test_case.passed?
        end

        result = TestResult.new
        faults = []
        result.add_listener(TestResult::FAULT) do |fault|
          faults << fault
        end
        test_case.run(result) do
        end
        fault_details = faults.collect do |fault|
          {
            :class     => fault.class,
            :message   => fault.message,
            :test_name => fault.test_name,
            :location  => normalize_location(fault.location),
          }
        end
        location = []
        location << "#{__FILE__}:0:in `/'" if cruby?
        location << "#{__FILE__}:0:in `test_error'"
        location << "#{__FILE__}:0:in `#{__method__}'"
        assert_equal([
                       {
                         :class     => Error,
                         :message   => "ZeroDivisionError: divided by 0",
                         :test_name => "test_error(TC_FailureError)",
                         :location  => location,
                       },
                     ],
                     fault_details)

        assert do
          not test_case.passed?
        end
      end

      def test_no_tests
        suite = TestCase.suite
        check("Should have a test suite", suite.instance_of?(TestSuite))
        check("Should have one test", suite.size == 1)
        check("Should have the default test", suite.tests.first.name == "default_test(Test::Unit::TestCase)")

        result = TestResult.new
        suite.run(result) {}
        check("Should have had one test run", result.run_count == 1)
        check("Should have had one test failure", result.failure_count == 1)
        check("Should have had no errors", result.error_count == 0)
      end

      def test_suite
        tc = Class.new(TestCase) do
          def test_succeed
            assert_block {true}
          end
          def test_fail
            assert_block {false}
          end
          def test_error
            1/0
          end
          def dont_run
            assert_block {true}
          end
          def test_dont_run(argument)
            assert_block {true}
          end
          def test
            assert_block {true}
          end
        end

        suite = tc.suite
        check("Should have a test suite", suite.instance_of?(TestSuite))
        check("Should have three tests", suite.size == 3)

        result = TestResult.new
        suite.run(result) {}
        check("Should have had three test runs", result.run_count == 3)
        check("Should have had one test failure", result.failure_count == 1)
        check("Should have had one test error", result.error_count == 1)
      end

      def test_setup_teardown
        tc = Class.new(TestCase) do
          attr_reader(:setup_called, :teardown_called)
          def initialize(test)
            super(test)
            @setup_called = false
            @teardown_called = false
          end
          def setup
            @setup_called = true
          end
          def teardown
            @teardown_called = true
          end
          def test_succeed
            assert_block {true}
          end
          def test_fail
            assert_block {false}
          end
          def test_error
            raise "Error!"
          end
        end
        result = TestResult.new

        test = tc.new(:test_succeed)
        test.run(result) {}
        check("Should have called setup the correct number of times", test.setup_called)
        check("Should have called teardown the correct number of times", test.teardown_called)

        test = tc.new(:test_fail)
        test.run(result) {}
        check("Should have called setup the correct number of times", test.setup_called)
        check("Should have called teardown the correct number of times", test.teardown_called)

        test = tc.new(:test_error)
        test.run(result) {}
        check("Should have called setup the correct number of times", test.setup_called)
        check("Should have called teardown the correct number of times", test.teardown_called)

        check("Should have had two test runs", result.run_count == 3)
        check("Should have had a test failure", result.failure_count == 1)
        check("Should have had a test error", result.error_count == 1)
      end

      def test_assertion_failed_not_called
        tc = Class.new(TestCase) do
          def test_thing
            raise AssertionFailedError.new
          end
        end

        suite = tc.suite
        check("Should have one test", suite.size == 1)
        result = TestResult.new
        suite.run(result) {}
        check("Should have had one test run", result.run_count == 1)
        check("Should have had one assertion failure", result.failure_count == 1)
        check("Should not have any assertion errors but had #{result.error_count}", result.error_count == 0)
      end

      def test_equality
        tc1 = Class.new(TestCase) do
          def test_1
          end
          def test_2
          end
        end

        tc2 = Class.new(TestCase) do
          def test_1
          end
        end

        test1 = tc1.new('test_1')
        test2 = tc1.new('test_1')
        check("Should be equal", test1 == test2)
        check("Should be equal", test2 == test1)

        test1 = tc1.new('test_2')
        check("Should not be equal", test1 != test2)
        check("Should not be equal", test2 != test1)

        test2 = tc1.new('test_2')
        check("Should be equal", test1 == test2)
        check("Should be equal", test2 == test1)

        test1 = tc1.new('test_1')
        test2 = tc2.new('test_1')
        check("Should not be equal", test1 != test2)
        check("Should not be equal", test2 != test1)

        check("Should not be equal", test1 != Object.new)
        check("Should not be equal", Object.new != test1)
      end

      def test_re_raise_exception
        test_case = Class.new(TestCase) do
          def test_raise_interrupt
            raise Interrupt, "from test"
          end
        end

        test = test_case.new("test_raise_interrupt")
        begin
          test.run(TestResult.new) {}
          check("Should not be reached", false)
        rescue Exception
          check("Interrupt exception should be re-raised", $!.class == Interrupt)
        end
      end

      def test_timeout_error
        test_case = Class.new(TestCase) do
          def test_raise_timeout_error
            require "timeout"
            raise Timeout::Error
          end
        end

        test_suite = test_case.suite
        result = TestResult.new
        begin
          test_suite.run(result) {}
          check("Timeout::Error should be handled as error",
                result.error_count == 1)
        rescue Exception
          check("Timeout::Error should not be passed through: #{$!}", false)
        end
      end

      def test_interrupted
        test_case = Class.new(TestCase) do
          def test_fail
            flunk
          end

          def test_nothing
          end
        end

        failed_test = test_case.new(:test_fail)
        failed_test.run(TestResult.new) {}
        check("Should be interrupted", failed_test.interrupted?)

        success_test = test_case.new(:test_nothing)
        success_test.run(TestResult.new) {}
        check("Should not be interrupted", !success_test.interrupted?)
      end

      def test_inherited_test_should_be_ignored
        test_case = Class.new(TestCase) do
          def test_nothing
          end
        end

        sub_test_case = Class.new(test_case) do
          def test_fail
            flunk
          end
        end

        test = test_case.new("test_nothing")
        assert_predicate(test, :valid?)

        test = sub_test_case.new("test_fail")
        assert_predicate(test, :valid?)

        test = sub_test_case.new("test_nothing")
        assert_not_predicate(test, :valid?)
      end

      def test_mixin_test_should_not_be_ignored
        test_module = Module.new do
          def test_nothing
          end
        end

        test_case = Class.new(Test::Unit::TestCase) do
          include test_module

          def test_fail
            flunk
          end
        end

        assert_nothing_thrown do
          test_case.new("test_nothing")
        end

        assert_nothing_thrown do
          test_case.new("test_fail")
        end
      end

      def test_defined_order
        test_case = Class.new(Test::Unit::TestCase) do
          def test_z
          end

          def test_1
          end

          def test_a
          end
        end

        test_case.test_order = :defined
        assert_equal(["test_z", "test_1", "test_a"],
                     test_case.suite.tests.collect {|test| test.method_name})
      end

      def test_declarative_style
        test_case = Class.new(Test::Unit::TestCase) do
          test "declarative style test definition" do
          end

          test "include parenthesis" do
          end

          test "1 + 2 = 3" do
          end
        end

        test_case.test_order = :defined

        assert_equal(["test: declarative style test definition",
                      "test: include parenthesis",
                      "test: 1 + 2 = 3"],
                     test_case.suite.tests.collect {|test| test.method_name})

        assert_equal(["declarative style test definition",
                      "include parenthesis",
                      "1 + 2 = 3"],
                     test_case.suite.tests.collect {|test| test.description})
      end

      def test_test_mark
        test_case = Class.new(Test::Unit::TestCase) do
          test
          def my_test_method
          end
        end

        test_case.test_order = :defined

        assert_equal(["my_test_method"],
                     test_case.suite.tests.collect {|test| test.method_name})
      end

      def test_redefine_method
        test_case = Class.new(Test::Unit::TestCase) do
          self.test_order = :alphabetic

          def test_name
          end
          alias_method :test_name2, :test_name

          def test_name
          end
        end

        suite = test_case.suite
        assert_equal(["test_name", "test_name2"],
                     suite.tests.collect {|test| test.method_name})
        result = TestResult.new
        suite.run(result) {}
        assert_equal("2 tests, 0 assertions, 0 failures, " +
                     "0 errors, 0 pendings, 0 omissions, 1 notifications",
                     result.summary)
      end

      def test_data_driven_test
        test_case = Class.new(TestCase) do
          def test_with_data(data)
          end
        end

        test = test_case.new("test_with_data")
        assert_not_predicate(test, :valid?)
        test.assign_test_data("label1", :test_data1)
        assert_predicate(test, :valid?)
      end

      def test_data_driven_test_without_parameter
        test_case = Class.new(TestCase) do
          data("label" => "value")
          def test_without_parameter
          end
        end

        suite = test_case.suite
        assert_equal(["test_without_parameter"],
                     suite.tests.collect {|test| test.method_name})
        result = TestResult.new
        suite.run(result) {}
        assert_equal("1 tests, 0 assertions, 0 failures, " +
                     "0 errors, 0 pendings, 0 omissions, 1 notifications",
                     result.summary)
      end

      private
      def check(message, passed)
        add_assertion
        raise AssertionFailedError.new(message) unless passed
      end

      class TestTestDefined < self
        class TestNoQuery < self
          def test_no_test
            test_case = Class.new(TestCase) do
            end
            assert_false(test_case.test_defined?({}))
          end

          def test_have_def_style_test
            test_case = Class.new(TestCase) do
              def test_nothing
              end
            end
            assert_true(test_case.test_defined?({}))
          end

          def test_have_method_style_test
            test_case = Class.new(TestCase) do
              test "nothing" do
              end
            end
            assert_true(test_case.test_defined?({}))
          end
        end

        class TestPath < self
          class TestDefStyle < self
            def test_base_name
              test_case = Class.new(TestCase) do
                def test_nothing
                end
              end
              base_name = File.basename(__FILE__)
              assert_true(test_case.test_defined?(:path => base_name))
            end

            def test_absolute_path
              test_case = Class.new(TestCase) do
                def test_nothing
                end
              end
              assert_true(test_case.test_defined?(:path => __FILE__))
            end

            def test_not_match
              test_case = Class.new(TestCase) do
                def test_nothing
                end
              end
              assert_false(test_case.test_defined?(:path => "nonexistent.rb"))
            end
          end

          class TestMethodStyle < self
            def test_base_name
              test_case = Class.new(TestCase) do
                test "nothing" do
                end
              end
              base_name = File.basename(__FILE__)
              assert_true(test_case.test_defined?(:path => base_name))
            end

            def test_absolute_path
              test_case = Class.new(TestCase) do
                test "nothing" do
                end
              end
              assert_true(test_case.test_defined?(:path => __FILE__))
            end

            def test_not_match
              test_case = Class.new(TestCase) do
                test "nothing" do
                end
              end
              assert_false(test_case.test_defined?(:path => "nonexistent.rb"))
            end
          end
        end

        class TestLine < self
          class TestDefStyle < self
            def test_before
              line_before = nil
              test_case = Class.new(TestCase) do
                line_before = __LINE__
                def test_nothing
                end
              end
              assert_false(test_case.test_defined?(:line => line_before))
            end

            def test_def
              line_def = nil
              test_case = Class.new(TestCase) do
                line_def = __LINE__; def test_nothing
                end
              end
              assert_true(test_case.test_defined?(:line => line_def))
            end

            def test_after
              line_after = nil
              test_case = Class.new(TestCase) do
                def test_nothing
                end
                line_after = __LINE__
              end
              assert_true(test_case.test_defined?(:line => line_after))
            end

            def test_child
              child_test_case = nil
              line_child = nil
              parent_test_case = Class.new(TestCase) do
                test "parent" do
                end

                child_test_case = Class.new(self) do
                  line_child = __LINE__; test "child" do
                  end
                end
              end
              assert_equal([
                             false,
                             true,
                           ],
                           [
                             parent_test_case.test_defined?(:line => line_child),
                             child_test_case.test_defined?(:line => line_child),
                           ])
            end
          end

          class TestMethodStyle < self
            def test_before
              line_before = nil
              test_case = Class.new(TestCase) do
                line_before = __LINE__
                test "nothing" do
                end
              end
              assert_false(test_case.test_defined?(:line => line_before))
            end

            def test_method
              line_method = nil
              test_case = Class.new(TestCase) do
                line_method = __LINE__; test "nothing" do
                end
              end
              assert_true(test_case.test_defined?(:line => line_method))
            end

            def test_after
              line_after = nil
              test_case = Class.new(TestCase) do
                test "nothing" do
                end
                line_after = __LINE__
              end
              assert_true(test_case.test_defined?(:line => line_after))
            end

            def test_child
              child_test_case = nil
              line_child = nil
              parent_test_case = Class.new(TestCase) do
                test "parent" do
                end

                child_test_case = Class.new(self) do
                  line_child = __LINE__; test "child" do
                  end
                end
              end
              assert_equal([
                             false,
                             true,
                           ],
                           [
                             parent_test_case.test_defined?(:line => line_child),
                             child_test_case.test_defined?(:line => line_child),
                           ])
            end

            def test_with_setup
              line = nil
              test_case = Class.new(TestCase) do
                setup do
                end

                line = __LINE__; test "with setup" do
                end
              end
              assert do
                test_case.test_defined?(:line => line,
                                        :method_name => "test: with setup")
              end
            end
          end
        end

        class TestMethodName < self
          class TestDefStyle < self
            def test_match
              test_case = Class.new(TestCase) do
                def test_nothing
                end
              end
              query = {:method_name => "test_nothing"}
              assert_true(test_case.test_defined?(query))
            end

            def test_not_match
              test_case = Class.new(TestCase) do
                def test_nothing
                end
              end
              query = {:method_name => "test_nonexistent"}
              assert_false(test_case.test_defined?(query))
            end
          end

          class TestMethodStyle < self
            def test_match
              test_case = Class.new(TestCase) do
                test "nothing" do
                end
              end
              query = {:method_name => "test: nothing"}
              assert_true(test_case.test_defined?(query))
            end

            def test_not_match
              test_case = Class.new(TestCase) do
                test "nothing" do
                end
              end
              query = {:method_name => "test: nonexistent"}
              assert_false(test_case.test_defined?(query))
            end
          end
        end

        class TestCombine < self
          class TestDefStyle < self
            def test_line_middle
              line_middle = nil
              test_case = Class.new(TestCase) do
                def test_before
                end
                line_middle = __LINE__
                def test_after
                end
              end
              query = {
                :path => __FILE__,
                :line => line_middle,
                :method_name => "test_before",
              }
              assert_true(test_case.test_defined?(query))
            end

            def test_line_after_def
              line_after_def = nil
              test_case = Class.new(TestCase) do
                def test_before
                end

                line_after_def = __LINE__; def test_after
                end
              end
              query = {
                :path => __FILE__,
                :line => line_after_def,
                :method_name => "test_before",
              }
              assert_false(test_case.test_defined?(query))
            end
          end

          class TestMethodStyle < self
            def test_line_middle
              line_middle = nil
              test_case = Class.new(TestCase) do
                test "before" do
                end
                line_middle = __LINE__
                test "after" do
                end
              end
              query = {
                :path => __FILE__,
                :line => line_middle,
                :method_name => "test: before",
              }
              assert_true(test_case.test_defined?(query))
            end

            def test_line_after_method
              line_after_method = nil
              test_case = Class.new(TestCase) do
                test "before" do
                end

                line_after_method = __LINE__; test "after" do
                end
              end
              query = {
                :path => __FILE__,
                :line => line_after_method,
                :method_name => "test: before",
              }
              assert_false(test_case.test_defined?(query))
            end
          end
        end
      end

      class TestSubTestCase < self
        class TestName < self
          def test_anonymous
            test_case = Class.new(TestCase)
            sub_test_case = test_case.sub_test_case("sub test case") do
            end
            assert_equal("sub test case", sub_test_case.name)
          end

          def test_named
            test_case = Class.new(TestCase)
            def test_case.name
              "ParentTestCase"
            end
            sub_test_case = test_case.sub_test_case("sub test case") do
            end
            assert_equal("ParentTestCase::sub test case", sub_test_case.name)
          end
        end

        def test_suite
          test_case = Class.new(TestCase)
          sub_test_case = test_case.sub_test_case("sub test case") do
            def test_nothing
            end
          end
          test_method_names = sub_test_case.suite.tests.collect do |test|
            test.method_name
          end
          assert_equal(["test_nothing"], test_method_names)
        end

        def test_duplicated_name
          test_case = Class.new(TestCase) do
            def test_nothing
            end
          end
          sub_test_case = test_case.sub_test_case("sub test case") do
            def test_nothing
            end
          end

          test_method_names = test_case.suite.tests.collect do |test|
            test.method_name
          end
          sub_test_method_names = sub_test_case.suite.tests.collect do |test|
            test.method_name
          end

          assert_equal([
                         ["test_nothing"],
                         ["test_nothing"],
                       ],
                       [
                         test_method_names,
                         sub_test_method_names,
                       ])
        end
      end

      class TestStartupShutdown < self
        class TestOrder < self
          module CallLogger
            def called
              @@called ||= []
            end
          end

          def call_order(test_case)
            test_case.called.clear
            test_suite = test_case.suite
            test_suite.run(TestResult.new) {}
            test_case.called
          end

          class TestNoInheritance < self
            def setup
              @test_case = Class.new(TestCase) do
                extend CallLogger

                class << self
                  def startup
                    called << :startup
                  end

                  def shutdown
                    called << :shutdown
                  end
                end

                def setup
                  self.class.called << :setup
                end

                def teardown
                  self.class.called << :teardown
                end

                def test1
                end

                def test2
                end
              end
            end

            def test_call_order
              assert_equal([
                             :startup,
                             :setup, :teardown,
                             :setup, :teardown,
                             :shutdown,
                           ],
                           call_order(@test_case))
            end
          end

          class TestInheritance < self
            def setup
              @original_descendants = TestCase::DESCENDANTS.dup
              TestCase::DESCENDANTS.clear

              @parent_test_case = Class.new(TestCase) do
                extend CallLogger

                self.test_order = :alphabetic

                class << self
                  def startup
                    called << :startup_parent
                  end

                  def shutdown
                    called << :shutdown_parent
                  end
                end

                def setup
                  self.class.called << :setup_parent
                end

                def teardown
                  self.class.called << :teardown_parent
                end

                def test1_parent
                  self.class.called << :test1_parent
                end

                def test2_parent
                  self.class.called << :test2_parent
                end
              end

              @child_test_case = Class.new(@parent_test_case) do
                class << self
                  def startup
                    called << :startup_child
                  end

                  def shutdown
                    called << :shutdown_child
                  end
                end

                def setup
                  self.class.called << :setup_child
                end

                def teardown
                  self.class.called << :teardown_child
                end

                def test1_child
                  self.class.called << :test1_child
                end

                def test2_child
                  self.class.called << :test2_child
                end
              end
            end

            def teardown
              TestCase::DESCENDANTS.replace(@original_descendants)
            end

            def test_call_order
              collector = Collector::Descendant.new
              test_suite = collector.collect
              test_suite.run(TestResult.new) {}
              called = @parent_test_case.called
              assert_equal([
                             :startup_parent,
                             :setup_parent, :test1_parent, :teardown_parent,
                             :setup_parent, :test2_parent, :teardown_parent,
                             :startup_child,
                             :setup_child, :test1_child, :teardown_child,
                             :setup_child, :test2_child, :teardown_child,
                             :shutdown_child,
                             :shutdown_parent,
                           ],
                           called)
            end
          end
        end

        class TestError < self
          def run_test_case(test_case)
            test_suite = test_case.suite
            result = TestResult.new
            test_suite.run(result) {}
            result
          end

          def error_count(test_case)
            run_test_case(test_case).error_count
          end

          def test_on_startup
            test_case = Class.new(TestCase) do
              class << self
                def startup
                  raise "from startup"
                end
              end

              def test_nothing
              end
            end

            assert_equal(1, error_count(test_case))
          end

          def test_pass_through_on_startup
            test_case = Class.new(TestCase) do
              class << self
                def startup
                  raise Interrupt, "from startup"
                end
              end

              def test_nothing
              end
            end

            assert_raise(Interrupt) do
              run_test_case(test_case)
            end
          end

          def test_on_shutdown
            test_case = Class.new(TestCase) do
              class << self
                def shutdown
                  raise "from shutdown"
                end
              end

              def test_nothing
              end
            end

            assert_equal(1, error_count(test_case))
          end

          def test_pass_through_on_shutdown
            test_case = Class.new(TestCase) do
              class << self
                def shutdown
                  raise Interrupt, "from shutdown"
                end
              end

              def test_nothing
              end
            end

            assert_raise(Interrupt) do
              run_test_case(test_case)
            end
          end

          def test_pass_through_in_test
            test_case = Class.new(TestCase) do
              @called = []
              class << self
                def called
                  @called
                end

                def startup
                  @called << :startup
                end

                def shutdown
                  @called << :shutdown
                end
              end

              def test_error
                raise Interrupt, "from test"
              end
            end

            assert_raise(Interrupt) do
              run_test_case(test_case)
            end
            assert_equal([:startup, :shutdown],
                         test_case.called)
          end

          class TestName < self
            def test_no_data
              test_case = Class.new(TestCase) do
                class << self
                  def name
                    "TestCase"
                  end
                end

                def test_nothing
                end
              end

              test = test_case.new("test_nothing")
              assert_equal("test_nothing(TestCase)",
                           test.name)
            end

            def test_data
              test_case = Class.new(TestCase) do
                class << self
                  def name
                    "TestCase"
                  end
                end

                def test_nothing
                end
              end

              test = test_case.new("test_nothing")
              test.assign_test_data("(nil)", nil)
              assert_equal("test_nothing[(nil)](TestCase)",
                           test.name)
            end
          end

          class TestLocalName < self
            def test_no_data
              test_case = Class.new(TestCase) do
                class << self
                  def name
                    "TestCase"
                  end
                end

                def test_nothing
                end
              end

              test = test_case.new("test_nothing")
              assert_equal("test_nothing",
                           test.local_name)
            end

            def test_data
              test_case = Class.new(TestCase) do
                class << self
                  def name
                    "TestCase"
                  end
                end

                def test_nothing
                end
              end

              test = test_case.new("test_nothing")
              test.assign_test_data("(nil)", nil)
              assert_equal("test_nothing[(nil)]",
                           test.local_name)
            end
          end
        end
      end
    end
  end
end
