# -*- coding: utf-8 -*-
#
# Author:: Nathaniel Talbott.
# Copyright:: Copyright (c) 2000-2002 Nathaniel Talbott. All rights reserved.
#             Copyright (c) 2009-2014 Kouhei Sutou. All rights reserved.
# License:: Ruby license.

require 'test/unit'
require "testunit-test-util"

module Test
  module Unit
    module AssertionCheckable
      include TestUnitTestUtil

      private
      def check(value, message="")
        add_assertion
        raise AssertionFailedError.new(message) unless value
      end

      def check_assertions(expect_fail, options={})
        expected_message = options[:expected_message]
        actual_message_normalizer = options[:actual_message_normalizer]
        return_value_expected = options[:return_value_expected]
        @actual_assertion_count = 0
        failed = true
        actual_message = nil
        @catch_assertions = true
        return_value = nil
        begin
          return_value = yield
          failed = false
        rescue AssertionFailedError => error
          actual_message = error.message
        end
        @catch_assertions = false

        if expect_fail
          message = "Should have failed, but didn't"
        else
          message = "Should not have failed, but did with message\n" +
            "<#{actual_message}>"
        end
        check(expect_fail == failed, message)

        message = "Should have made one assertion but made\n" +
          "<#{@actual_assertion_count}>"
        check(1 == @actual_assertion_count, message)

        if expect_fail
          if actual_message_normalizer
            actual_message = actual_message_normalizer.call(actual_message)
          end
          case expected_message
          when String
            check(expected_message == actual_message,
                  "Should have the correct message.\n" +
                  "<#{expected_message.inspect}> expected but was\n" +
                  "<#{actual_message.inspect}>")
          when Regexp
            check(expected_message =~ actual_message,
                  "The message should match correctly.\n" +
                  "</#{expected_message.source}/> expected to match\n" +
                  "<#{actual_message.inspect}>")
          else
            check(false,
                  "Incorrect expected message type in assert_nothing_failed")
          end
        else
          case return_value_expected
          when :dont_care
            # do nothing
          when true
            check(!return_value.nil?, "Should return a value")
          else
            check(return_value.nil?,
                  "Should not return a value but returned <#{return_value}>")
          end
        end

        return_value
      end

      def check_nothing_fails(return_value_expected=false, &proc)
        check_assertions(false,
                         {:expected_message => nil,
                          :return_value_expected => return_value_expected},
                         &proc)
      end

      def check_fail(expected_message, options={}, &proc)
        check_assertions(true,
                         options.merge(:expected_message => expected_message),
                         &proc)
      end

      def check_fail_exception(expected_message, options={}, &proc)
        normalizer = lambda do |actual_message|
          actual_message.gsub(/(^[^:\n]+:\d+:.+\n?)+\z/, "")
        end
        check_assertions(true,
                         options.merge(:expected_message => expected_message,
                                       :actual_message_normalizer => normalizer),
                         &proc)
      end

      def inspect_tag(tag)
        tag.inspect
      end

      def add_failure(message, location=caller, options=nil)
        unless @catch_assertions
          super
        end
      end

      def add_assertion
        if @catch_assertions
          @actual_assertion_count += 1
        else
          super
        end
      end
    end

    class TestAssertions < TestCase
      include AssertionCheckable

      class TestAssertBlock < self
        def test_pass_without_message
          check_nothing_fails {
            assert_block {true}
          }
        end

        def test_pass_with_message
          check_nothing_fails {
            assert_block("successful assert_block") {true}
          }
        end

        def test_failure_without_message
          check_fail("assert_block failed.") {
            assert_block {false}
          }
        end

        def test_failure_with_message
          check_fail("failed assert_block") {
            assert_block("failed assert_block") {false}
          }
        end
      end

      class TestAssertEqual < self
        class TestSuccess < self
          def test_without_message
            check_nothing_fails {
              assert_equal("string1", "string1")
            }
          end

          def test_with_message
            check_nothing_fails {
              assert_equal("string1", "string1", "successful assert_equal")
            }
          end
        end

        class TestFailure < self
          def test_without_message
            message = <<-EOM.chomp
<"string1"> expected but was
<"string2">.

diff:
- string1
?       ^
+ string2
?       ^
EOM
            check_fail(message) {
              assert_equal("string1", "string2")
            }
          end

          def test_with_message
            message = <<-EOM.chomp
failed assert_equal.
<"string1"> expected but was
<"string2">.

diff:
- string1
?       ^
+ string2
?       ^
EOM
           check_fail(message) {
             assert_equal("string1", "string2", "failed assert_equal")
            }
          end

          def test_with_message_proc
            message = <<-EOM.chomp
failed assert_equal.
<"string1"> expected but was
<"string2">.

diff:
- string1
?       ^
+ string2
?       ^
EOM
           check_fail(message) do
              assert_equal("string1", "string2", lambda {"failed assert_equal"})
            end
          end
        end

        class TestSystemMessage < self
          def test_different_type
            message = <<-EOM.chomp
<"111111"> expected but was
<111111>.

diff:
- "111111"
? -      -
+ 111111
EOM
            check_fail(message) do
              assert_equal("111111", 111111)
            end
          end

          def test_long_line
            expected = ["0123456789",
                        "1123456789",
                        "2123456789",
                        "3123456789",
                        "4123456789",
                        "5123456789",
                        "6123456789",
                        "7123456789",
                        "8123456789"].join
            actual =   ["0000000000",
                        "1123456789",
                        "2123456789",
                        "3123456789",
                        "4123456789",
                        "5123456789",
                        "6123456789",
                        "7123456789",
                        "8123456789"].join
            message = <<-EOM.chomp
<"#{expected}"> expected but was
<"#{actual}">.

diff:
- #{expected}
?  ^^^^^^^^^
+ #{actual}
?  ^^^^^^^^^

folded diff:
- 012345678911234567892123456789312345678941234567895123456789612345678971234567
?  ^^^^^^^^^
+ 000000000011234567892123456789312345678941234567895123456789612345678971234567
?  ^^^^^^^^^
  898123456789
EOM
            check_fail(message) do
              assert_equal(expected, actual)
            end
          end

          def test_too_small_difference
            message = <<-EOM.chomp
<1> expected but was
<2>.
EOM
            check_fail(message) do
              assert_equal(1, 2)
            end
          end

          def test_same_inspected_objects
            now = Time.now
            now_without_usec = Time.at(now.to_i)
            message = <<-EOM.chomp
<#{now.inspect}> expected but was
<#{now.inspect}>.
EOM
            check_fail(message) do
              assert_equal(now, now_without_usec)
            end
          end

          def test_multi_lines_result
            message = <<-EOM.chomp
<#{AssertionMessage.convert("a\nb")}> expected but was
<#{AssertionMessage.convert("x")}>.

diff:
+ x
- a
- b
EOM
            check_fail(message) do
              assert_equal("a\nb", "x")
            end
          end

          def test_large_string
            message = <<-EOM.chomp
<#{AssertionMessage.convert("a\n" + "x" * 997)}> expected but was
<#{AssertionMessage.convert("x")}>.

diff:
+ x
- a
- #{"x" * 997}

folded diff:
+ x
- a
#{(["- " + ("x" * 78)] * 12).join("\n")}
- #{"x" * 61}
EOM
            check_fail(message) do
              assert_equal("a\n" + "x" * 997, "x")
            end

            message = <<-EOM.chomp
<#{AssertionMessage.convert("a\n" + "x" * 998)}> expected but was
<#{AssertionMessage.convert("x")}>.
EOM
            check_fail(message) do
              assert_equal("a\n" + "x" * 998, "x")
            end
          end

          def test_max_diff_target_string_size
            key = "TEST_UNIT_MAX_DIFF_TARGET_STRING_SIZE"
            before_value = ENV[key]
            ENV[key] = "100"
            begin
              message = <<-EOM.chomp
<#{AssertionMessage.convert("a\n" + "x" * 97)}> expected but was
<#{AssertionMessage.convert("x")}>.

diff:
+ x
- a
- #{"x" * 97}

folded diff:
+ x
- a
#{(["- " + ("x" * 78)]).join("\n")}
- #{"x" * 19}
EOM
              check_fail(message) do
                assert_equal("a\n" + "x" * 97, "x")
              end

              message = <<-EOM.chomp
<#{AssertionMessage.convert("a\n" + "x" * 98)}> expected but was
<#{AssertionMessage.convert("x")}>.
EOM
              check_fail(message) do
                assert_equal("a\n" + "x" * 98, "x")
              end
            ensure
              ENV[key] = before_value
            end
          end

          def test_different_encoding
            utf8_string = "こんにちは"
            unless utf8_string.respond_to?(:force_encoding)
              omit("encoding test is for Ruby >= 1.9")
            end
            ascii_8bit_string = utf8_string.dup.force_encoding("ascii-8bit")
            message = <<-EOM.chomp
<#{utf8_string.inspect}>("UTF-8") expected but was
<#{ascii_8bit_string.inspect}>("ASCII-8BIT").
EOM
            check_fail(message) do
              assert_equal(utf8_string, ascii_8bit_string)
            end
          end

          def test_different_hash
            designers = {
              "Ruby" => "Matz",
              "Lisp" => "John McCarthy",
            }
            categories = {
              "LL" => ["Ruby", "Python"],
              "Heavy" => ["C", "C++"],
            }
            message = <<-EOM.chomp
<{"Lisp"=>"John McCarthy", "Ruby"=>"Matz"}> expected but was
<{"Heavy"=>["C", "C++"], "LL"=>["Ruby", "Python"]}>.
EOM
            check_fail(message) do
              assert_equal(designers, categories)
            end
          end

          def test_recursive_hash
            alice = {"name" => "Alice"}
            bob = {"name" => "Bob"}
            alice["followers"] = [bob]
            bob["followers"] = [alice]
            message = <<-EOM.chomp
<{"followers"=>[{"followers"=>[{...}], "name"=>"Bob"}], "name"=>"Alice"}> expected but was
<{"followers"=>[{"followers"=>[{...}], "name"=>"Alice"}], "name"=>"Bob"}>.

diff:
- {"followers"=>[{"followers"=>[{...}], "name"=>"Bob"}], "name"=>"Alice"}
?                                       -----------------
+ {"followers"=>[{"followers"=>[{...}], "name"=>"Alice"}], "name"=>"Bob"}
?                                                       +++++++++++++++++
EOM
            check_fail(message) do
              assert_equal(alice, bob)
            end
          end

          def test_numeric
            numeric_family_class = Class.new(Numeric) do
              def inspect
                "inspect is called"
              end

              def to_s
                "to_s is called"
              end
            end
            numeric = numeric_family_class.new

            message = <<-MESSAGE.chomp
<to_s is called> expected but was
<"must be failed">.
            MESSAGE
            check_fail(message) do
              assert_equal(numeric, "must be failed")
            end
          end
        end
      end

      def test_assert_raise_success
        return_value = nil
        check_nothing_fails(true) do
          return_value = assert_raise(RuntimeError) do
            raise "Error"
          end
        end
        check(return_value.kind_of?(Exception),
              "Should have returned the exception " +
              "from a successful assert_raise")
        check(return_value.message == "Error",
              "Should have returned the correct exception " +
              "from a successful assert_raise")

        check_nothing_fails(true) do
          assert_raise(ArgumentError, "successful assert_raise") do
            raise ArgumentError.new("Error")
          end
        end

        check_nothing_fails(true) do
          assert_raise(RuntimeError) do
            raise "Error"
          end
        end

        check_nothing_fails(true) do
          assert_raise(RuntimeError, "successful assert_raise") do
            raise "Error"
          end
        end

        check_nothing_fails(true) do
          assert_raise do
            raise Exception, "Any exception"
          end
        end
      end

      def test_assert_raise_fail
        check_fail("<RuntimeError> exception was expected but none was thrown.") do
          assert_raise(RuntimeError) do
            1 + 1
          end
        end

        message = <<-EOM.chomp
failed assert_raise.
<ArgumentError> exception expected but was
<RuntimeError(<Error>)>.
EOM
        check_fail_exception(message) do
          assert_raise(ArgumentError, "failed assert_raise") do
            raise "Error"
          end
        end

        message = <<-EOM
<Object> must be a subclass of Exception, an object of Exception subclasses or a Module.
EOM
        check_fail(message.chomp) do
          assert_nothing_raised(Object) do
            1 + 1
          end
        end
      end

      def test_assert_raise_module
        exceptions = [ArgumentError, TypeError]
        modules = [Math, Comparable]
        rescues = exceptions + modules

        exceptions.each do |exc|
          return_value = nil
          check_nothing_fails(true) do
            return_value = assert_raise(*rescues) do
              raise exc, "Error"
            end
          end
          check(return_value.instance_of?(exc),
                "Should have returned #{exc} but was #{return_value.class}")
          check(return_value.message == "Error",
                "Should have returned the correct exception " +
                "from a successful assert_raise")
        end

        modules.each do |mod|
          return_value = nil
          check_nothing_fails(true) do
            return_value = assert_raise(*rescues) do
              raise Exception.new("Error").extend(mod)
            end
          end
          check(mod === return_value,
                "Should have returned #{mod}")
          check(return_value.message == "Error",
                "Should have returned the correct exception " +
                "from a successful assert_raise")
        end

        check_fail("<[ArgumentError, TypeError, Math, Comparable]> exception " +
                    "was expected but none was thrown.") do
          assert_raise(*rescues) do
            1 + 1
          end
        end

        message = <<-EOM.chomp
failed assert_raise.
<[ArgumentError, TypeError]> exception expected but was
<RuntimeError(<Error>)>.
EOM
        check_fail_exception(message) do
          assert_raise(ArgumentError, TypeError, "failed assert_raise") do
            raise "Error"
          end
        end
      end

      def test_assert_raise_instance
        return_value = nil
        check_nothing_fails(true) do
          return_value = assert_raise(RuntimeError.new("Error")) do
            raise "Error"
          end
        end
        check(return_value.kind_of?(Exception),
              "Should have returned the exception " +
              "from a successful assert_raise")
        check(return_value.message == "Error",
              "Should have returned the correct exception " +
              "from a successful assert_raise")

        message = <<-EOM.chomp
<RuntimeError(<XXX>)> exception expected but was
<RuntimeError(<Error>)>.

diff:
- RuntimeError(<XXX>)
?               ^^^
+ RuntimeError(<Error>)
?               ^^^^^
EOM
        check_fail_exception(message) do
          return_value = assert_raise(RuntimeError.new("XXX")) do
            raise "Error"
          end
        end

        different_error_class = Class.new(StandardError)
        message = <<-EOM.chomp
<#{different_error_class.inspect}(<Error>)> exception expected but was
<RuntimeError(<Error>)>.
EOM
        check_fail_exception(message) do
          assert_raise(different_error_class.new("Error")) do
            raise "Error"
          end
        end

        different_error = different_error_class.new("Error")
        def different_error.inspect
          "DifferentError: \"Error\""
        end
        message = <<-EOM.chomp
<DifferentError: "Error"> exception expected but was
<RuntimeError(<Error>)>.
EOM
        check_fail_exception(message) do
          assert_raise(different_error) do
            raise "Error"
          end
        end

        check_nothing_fails(true) do
          assert_raise(different_error_class.new("Error"),
                       RuntimeError.new("Error"),
                       RuntimeError.new("XXX")) do
            raise "Error"
          end
        end
      end

      def test_assert_raise_jruby
        omit("For JRuby") unless Object.const_defined?(:Java)

        exception = Java::JavaLang::StringIndexOutOfBoundsException

        return_value = nil
        check_nothing_fails(true) do
          return_value = assert_raise(exception) do
            Java::JavaLang::String.new("abc").char_at(4)
          end
        end
        check(return_value.instance_of?(exception),
              "Should have returned #{exception} but was #{return_value.class}")
      end

      def test_assert_instance_of
        check_nothing_fails {
          assert_instance_of(String, "string")
        }
        check_nothing_fails {
          assert_instance_of(String, "string", "successful assert_instance_of")
        }
        check_nothing_fails {
          assert_instance_of(String, "string", "successful assert_instance_of")
        }
        check_fail(%Q{<"string"> was expected to be instance_of?\n<Hash> but was\n<String>.}) {
          assert_instance_of(Hash, "string")
        }
        check_fail(%Q{failed assert_instance_of.\n<"string"> was expected to be instance_of?\n<Hash> but was\n<String>.}) {
          assert_instance_of(Hash, "string", "failed assert_instance_of")
        }

        check_nothing_fails do
          assert_instance_of([Class, NilClass], Array)
        end
        check_fail(%Q{<"string"> was expected to be instance_of?\n[<Class>, <NilClass>] but was\n<String>.}) do
          assert_instance_of([Class, NilClass], "string")
        end
        check_fail(%Q{<Array> was expected to be instance_of?\n[<Module>, <NilClass>] but was\n<Class>.}) do
          assert_instance_of([Module, NilClass], Array)
        end
      end

      def test_assert_not_instance_of
        check_nothing_fails {
          assert_not_instance_of(NilClass, "string")
        }
        check_nothing_fails {
          assert_not_instance_of(NilClass, "string", "successful assert_instance_of")
        }
        check_fail(%Q{<"string"> was expected to not be instance_of?\n<String> but was.}) {
          assert_not_instance_of(String, "string")
        }
        check_fail(%Q{failed assert.\n<"string"> was expected to not be instance_of?\n<String> but was.}) {
          assert_not_instance_of(String, "string", "failed assert")
        }

        check_nothing_fails do
          assert_not_instance_of([Module, NilClass], Array)
        end
        check_fail(%Q{<Array> was expected to not be instance_of?\n[<Class>, <NilClass>] but was.}) do
          assert_not_instance_of([Class, NilClass], Array)
        end
        check_fail(%Q{<"str"> was expected to not be instance_of?\n[<Numeric>, <String>] but was.}) do
          assert_not_instance_of([Numeric, String], 'str')
        end
      end

      def test_assert_nil
        check_nothing_fails {
          assert_nil(nil)
        }
        check_nothing_fails {
          assert_nil(nil, "successful assert_nil")
        }
        check_nothing_fails {
          assert_nil(nil, "successful assert_nil")
        }
        check_fail(%Q{<"string"> was expected to be nil.}) {
          assert_nil("string")
        }
        check_fail(%Q{failed assert_nil.\n<"string"> was expected to be nil.}) {
          assert_nil("string", "failed assert_nil")
        }
      end

      def test_assert_not_nil
        check_nothing_fails{assert_not_nil(false)}
        check_nothing_fails{assert_not_nil(false, "message")}
        check_fail("<nil> was expected to not be nil."){assert_not_nil(nil)}
        check_fail("message.\n<nil> was expected to not be nil.") {assert_not_nil(nil, "message")}
      end

      def test_assert_kind_of
        check_nothing_fails {
          assert_kind_of(Module, Array)
        }
        check_nothing_fails {
          assert_kind_of(Object, "string", "successful assert_kind_of")
        }
        check_nothing_fails {
          assert_kind_of(String, "string", "successful assert_kind_of")
        }
        check_nothing_fails {
          assert_kind_of(Comparable, 1)
        }
        check_fail(%Q{<"string"> was expected to be kind_of?\n<Class> but was\n<String>.}) {
          assert_kind_of(Class, "string")
        }
        check_fail(%Q{failed assert_kind_of.\n<"string"> was expected to be kind_of?\n<Class> but was\n<String>.}) {
          assert_kind_of(Class, "string", "failed assert_kind_of")
        }

        check_nothing_fails do
          assert_kind_of([Class, NilClass], Array)
        end
        check_fail(%Q{<"string"> was expected to be kind_of?\n[<Class>, <NilClass>] but was\n<String>.}) do
          assert_kind_of([Class, NilClass], "string")
        end
      end

      def test_assert_not_kind_of
        check_nothing_fails {
          assert_not_kind_of(Class, 42)
        }
        check_nothing_fails {
          assert_not_kind_of(Symbol, "string", "successful assert_not_kind_of")
        }
        check_nothing_fails {
          assert_not_kind_of(Integer, 1.1)
        }
        check_fail(%Q{<1> was expected to not be kind_of?\n<Integer> but was.}) {
          assert_not_kind_of(Integer, 1)
        }
        check_fail(%Q{failed assert_not_kind_of.\n<"string"> was expected to not be kind_of?\n<String> but was.}) {
          assert_not_kind_of(String, "string", "failed assert_not_kind_of")
        }

        check_nothing_fails do
          assert_not_kind_of([String, NilClass], 100)
        end
        check_fail(%Q{<Array> was expected to not be kind_of?\n[<Class>, <NilClass>] but was.}) do
          assert_not_kind_of([Class, NilClass], Array)
        end
      end

      def test_assert_match
        check_nothing_fails {
          assert_match(/strin./, "string")
        }
        check_nothing_fails {
          assert_match("strin", "string")
        }
        check_nothing_fails {
          assert_match(/strin./, "string", "successful assert_match")
        }
        check_nothing_fails {
          assert_match(/strin./, "string", "successful assert_match")
        }
        check_fail(%Q{</slin./> was expected to be =~\n<"string">.}) {
          assert_match(/slin./, "string")
        }
        check_fail(%Q{</strin\\./> was expected to be =~\n<"string">.}) {
          assert_match("strin.", "string")
        }
        check_fail(%Q{failed assert_match.\n</slin./> was expected to be =~\n<"string">.}) {
          assert_match(/slin./, "string", "failed assert_match")
        }
      end

      def test_assert_same
        thing = "thing"
        check_nothing_fails {
          assert_same(thing, thing)
        }
        check_nothing_fails {
          assert_same(thing, thing, "successful assert_same")
        }
        check_nothing_fails {
          assert_same(thing, thing, "successful assert_same")
        }
        thing2 = thing.dup
        check_fail(%Q{<"thing">\nwith id <#{thing.__id__}> was expected to be equal? to\n<"thing">\nwith id <#{thing2.__id__}>.}) {
          assert_same(thing, thing2)
        }
        check_fail(%Q{failed assert_same.\n<"thing">\nwith id <#{thing.__id__}> was expected to be equal? to\n<"thing">\nwith id <#{thing2.__id__}>.}) {
          assert_same(thing, thing2, "failed assert_same")
        }
      end

      def test_assert_nothing_raised
        check_nothing_fails(:dont_care) {
          assert_nothing_raised {
            1 + 1
          }
        }
        check_nothing_fails(:dont_care) {
          assert_nothing_raised("successful assert_nothing_raised") {
            1 + 1
          }
        }
        check_nothing_fails(:dont_care) {
          assert_nothing_raised("successful assert_nothing_raised") {
            1 + 1
          }
        }
        check_nothing_fails(:dont_care) {
          begin
            assert_nothing_raised(RuntimeError, StandardError, Comparable, "successful assert_nothing_raised") {
              raise ZeroDivisionError.new("ArgumentError")
            }
          rescue ZeroDivisionError
          end
        }
        expected_message =
          "<Object> must be a subclass of Exception, " +
          "an object of Exception subclasses or a Module."
        check_fail(expected_message) {
          assert_nothing_raised(Object) {
            1 + 1
          }
        }
        expected_message = <<-EOM.chomp
Exception raised:
RuntimeError(<Error>)
EOM
        check_fail_exception(expected_message) {
          assert_nothing_raised {
            raise "Error"
          }
        }
        expected_message = <<-EOM.chomp
failed assert_nothing_raised.
Exception raised:
RuntimeError(<Error>)
EOM
        check_fail_exception(expected_message) {
          assert_nothing_raised("failed assert_nothing_raised") {
            raise "Error"
          }
        }
        expected_message = <<-EOM.chomp
Exception raised:
RuntimeError(<Error>)
EOM
        check_fail_exception(expected_message) {
          assert_nothing_raised(StandardError, RuntimeError) {
            raise "Error"
          }
        }
        check_fail("Failure.") do
          assert_nothing_raised do
            flunk("Failure")
          end
        end
      end

      def test_flunk
        check_fail("Flunked.") {
          flunk
        }
        check_fail("flunk message.") {
          flunk("flunk message")
        }
      end

      def test_assert_not_same
        thing = "thing"
        thing2 = thing.dup
        check_nothing_fails {
          assert_not_same(thing, thing2)
        }
        check_nothing_fails {
          assert_not_same(thing, thing2, "message")
        }
        check_fail(%Q{<"thing">\nwith id <#{thing.__id__}> was expected to not be equal? to\n<"thing">\nwith id <#{thing.__id__}>.}) {
          assert_not_same(thing, thing)
        }
        check_fail(%Q{message.\n<"thing">\nwith id <#{thing.__id__}> was expected to not be equal? to\n<"thing">\nwith id <#{thing.__id__}>.}) {
          assert_not_same(thing, thing, "message")
        }
      end

      def test_assert_not_equal
        check_nothing_fails {
          assert_not_equal("string1", "string2")
        }
        check_nothing_fails {
          assert_not_equal("string1", "string2", "message")
        }
        check_fail(%Q{<"string"> was expected to be != to\n<"string">.}) {
          assert_not_equal("string", "string")
        }
        check_fail(%Q{message.\n<"string"> was expected to be != to\n<"string">.}) {
          assert_not_equal("string", "string", "message")
        }
      end

      def test_assert_not_match_pass
        check_nothing_fails do
          assert_not_match(/sling/, "string")
        end
      end

      def test_assert_not_match_pass_with_message
        check_nothing_fails do
          assert_not_match(/sling/, "string", "message")
        end
      end

      def test_assert_not_match_fail_not_regexp
        check_fail("<REGEXP> in assert_not_match(<REGEXP>, ...) " +
                    "should be a Regexp.\n" +
                    "<\"asdf\"> was expected to be instance_of?\n" +
                    "<Regexp> but was\n" +
                    "<String>.") do
          assert_not_match("asdf", "asdf")
        end
      end

      def test_assert_not_match_fail_match
        check_fail("</string/> was expected to not match\n" +
                    "<\"string\">.") do
          assert_not_match(/string/, "string")
        end
      end

      def test_assert_not_match_fail_match_with_message
        check_fail("message.\n" +
                    "</string/> was expected to not match\n" +
                    "<\"string\">.") do
          assert_not_match(/string/, "string", "message")
        end
      end

      def test_assert_no_match
        check_nothing_fails{assert_no_match(/sling/, "string")}
        check_nothing_fails{assert_no_match(/sling/, "string", "message")}
        check_fail(%Q{The first argument to assert_no_match should be a Regexp.\n<"asdf"> was expected to be instance_of?\n<Regexp> but was\n<String>.}) do
          assert_no_match("asdf", "asdf")
        end
        check_fail(%Q{</string/> was expected to not match\n<"string">.}) do
          assert_no_match(/string/, "string")
        end
        check_fail(%Q{message.\n</string/> was expected to not match\n<"string">.}) do
          assert_no_match(/string/, "string", "message")
        end
      end

      def test_assert_throw
        check_nothing_fails do
          assert_throw(:thing, "message") do
            throw :thing
          end
        end

        tag = :thing2
        check_fail("message.\n" +
                    "<:thing> was expected to be thrown but\n" +
                    "<#{inspect_tag(tag)}> was thrown.") do
          assert_throw(:thing, "message") do
            throw :thing2
          end
        end
        check_fail("message.\n" +
                    "<:thing> should have been thrown.") do
          assert_throw(:thing, "message") do
            1 + 1
          end
        end
      end

      def test_assert_nothing_thrown
        check_nothing_fails do
          assert_nothing_thrown("message") do
            1 + 1
          end
        end

        tag = :thing
        inspected = inspect_tag(tag)
        check_fail("message.\n" +
                    "<#{inspected}> was thrown when nothing was expected.") do
          assert_nothing_thrown("message") do
            throw tag
          end
        end
      end

      def test_assert_operator
        check_nothing_fails {
          assert_operator("thing", :==, "thing", "message")
        }
        check_fail(%Q{<0.15>\ngiven as the operator for #assert_operator must be a Symbol or #respond_to?(:to_str).}) do
          assert_operator("thing", 0.15, "thing")
        end
        check_fail(%Q{message.\n<"thing1"> was expected to be\n==\n<"thing2">.}) {
          assert_operator("thing1", :==, "thing2", "message")
        }
      end

      def test_assert_not_operator
        check_nothing_fails {
          assert_not_operator("thing", :==, "Thing", "message")
        }
        check_fail(%Q{<42>\ngiven as the operator for #assert_not_operator must be a Symbol or #respond_to?(:to_str).}) do
          assert_not_operator("thing", 42, "message")
        end
        check_fail(%Q{message.\n<0> was expected to not be\n==\n<0.0>.}) {
          assert_not_operator(0, :==, 0.0, "message")
        }
      end

      def test_assert_respond_to
        check_nothing_fails {
          assert_respond_to("thing", :to_s, "message")
        }
        check_nothing_fails {
          assert_respond_to("thing", "to_s", "message")
        }
        check_fail("<0.15>.kind_of?(Symbol) or\n" +
                    "<0.15>.respond_to?(:to_str) expected") {
          assert_respond_to("thing", 0.15)
        }
        check_fail("message.\n" +
                    "<:symbol>.respond_to?(:nonexistence) expected\n" +
                    "(Class: <Symbol>)") {
          assert_respond_to(:symbol, :nonexistence, "message")
        }
      end

      def test_assert_not_respond_to_pass_symbol
        check_nothing_fails do
          assert_not_respond_to("thing", :nonexistent, "message")
        end
      end

      def test_assert_not_respond_to_pass_string
        check_nothing_fails do
          assert_not_respond_to("thing", :nonexistent, "message")
        end
      end

      def test_assert_not_respond_to_fail_number
        check_fail("<0.15>.kind_of?(Symbol) or\n" +
                    "<0.15>.respond_to?(:to_str) expected") do
          assert_respond_to("thing", 0.15)
        end
      end

      def tset_assert_not_respond_to_fail_existence
        check_fail("message.\n" +
                    "!<:symbol>.respond_to?(:to_s) expected\n" +
                    "(Class: <Symbol>)") do
          assert_respond_to(:symbol, :to_s, "message")
        end
      end

      def test_assert_send
        object = Object.new
        class << object
          private
          def return_argument(argument, bogus)
            return argument
          end
        end
        check_nothing_fails do
          assert_send([object, :return_argument, true, "bogus"], "message")
        end

        inspected_object = AssertionMessage.convert(object)
        expected_message = <<-EOM
message.
<#{inspected_object}> was expected to respond to
<return_argument(*[false, "bogus"])> with a true value but was
<false>.
EOM
        check_fail(expected_message.chomp) do
          assert_send([object, :return_argument, false, "bogus"], "message")
        end
      end

      def test_condition_invariant
        object = Object.new
        def object.inspect
          @changed = true
        end
        def object.==(other)
          @changed ||= false
          return (!@changed)
        end
        check_nothing_fails do
          assert_equal(object, object, "message")
        end
      end

      def test_assert_boolean
        check_nothing_fails do
          assert_boolean(true)
        end
        check_nothing_fails do
          assert_boolean(false)
        end

        check_fail("<true> or <false> expected but was\n<1>") do
          assert_boolean(1)
        end

        check_fail("<true> or <false> expected but was\n<nil>") do
          assert_boolean(nil)
        end

        check_fail("message.\n<true> or <false> expected but was\n<\"XXX\">") do
          assert_boolean("XXX", "message")
        end
      end

      def test_assert_true
        check_nothing_fails do
          assert_true(true)
        end

        check_fail("<true> expected but was\n<false>") do
          assert_true(false)
        end

        check_fail("<true> expected but was\n<1>") do
          assert_true(1)
        end

        check_fail("message.\n<true> expected but was\n<nil>") do
          assert_true(nil, "message")
        end
      end

      def test_assert_false
        check_nothing_fails do
          assert_false(false)
        end

        check_fail("<false> expected but was\n<true>") do
          assert_false(true)
        end

        check_fail("<false> expected but was\n<nil>") do
          assert_false(nil)
        end

        check_fail("message.\n<false> expected but was\n<:false>") do
          assert_false(:false, "message")
        end
      end

      def test_assert_compare
        check_nothing_fails do
          assert_compare(1.4, "<", 10.0)
        end

        check_nothing_fails do
          assert_compare(2, "<=", 2)
        end

        check_nothing_fails do
          assert_compare(14, ">=", 10.0)
        end

        check_nothing_fails do
          assert_compare(14, ">", 13.9)
        end

        expected_message = <<-EOM
<15> < <10> should be true
<15> was expected to be less than
<10>.
EOM
        check_fail(expected_message.chomp) do
          assert_compare(15, "<", 10)
        end

        expected_message = <<-EOM
<15> <= <10> should be true
<15> was expected to be less than or equal to
<10>.
EOM
        check_fail(expected_message.chomp) do
          assert_compare(15, "<=", 10)
        end

        expected_message = <<-EOM
<10> > <15> should be true
<10> was expected to be greater than
<15>.
EOM
        check_fail(expected_message.chomp) do
          assert_compare(10, ">", 15)
        end

        expected_message = <<-EOM
<10> >= <15> should be true
<10> was expected to be greater than or equal to
<15>.
EOM
        check_fail(expected_message.chomp) do
          assert_compare(10, ">=", 15)
        end
      end

      def test_assert_fail_assertion
        check_nothing_fails do
          assert_fail_assertion do
            flunk
          end
        end

        check_fail("Failed assertion was expected.") do
          assert_fail_assertion do
          end
        end
      end

      def test_assert_raise_message
        check_nothing_fails do
          assert_raise_message("Raise!") do
            raise "Raise!"
          end
        end

        check_nothing_fails do
          assert_raise_message("Raise!") do
            raise Exception, "Raise!"
          end
        end

        check_nothing_fails do
          assert_raise_message(/raise/i) do
            raise "Raise!"
          end
        end

        expected_message = <<-EOM
<"Expected message"> exception message expected but was
<"Actual message">.
EOM
        check_fail(expected_message.chomp) do
          assert_raise_message("Expected message") do
            raise "Actual message"
          end
        end

        expected_message = <<-EOM
<"Expected message"> exception message was expected but none was thrown.
EOM
        check_fail(expected_message.chomp) do
          assert_raise_message("Expected message") do
          end
        end
      end

      def test_assert_raise_kind_of
        check_nothing_fails(true) do
          assert_raise_kind_of(SystemCallError) do
            raise Errno::EACCES
          end
        end

        expected_message = <<-EOM.chomp
<SystemCallError> family exception expected but was
<RuntimeError(<XXX>)>.
EOM
        check_fail_exception(expected_message) do
          assert_raise_kind_of(SystemCallError) do
            raise RuntimeError, "XXX"
          end
        end
      end

      def test_assert_const_defined
        check_nothing_fails do
          assert_const_defined(Test, :Unit)
        end

        check_nothing_fails do
          assert_const_defined(Test, "Unit")
        end

        check_fail("<Test>.const_defined?(<:Nonexistence>) expected.") do
          assert_const_defined(Test, :Nonexistence)
        end
      end

      def test_assert_not_const_defined
        check_nothing_fails do
          assert_not_const_defined(Test, :Nonexistence)
        end

        check_fail("!<Test>.const_defined?(<:Unit>) expected.") do
          assert_not_const_defined(Test, :Unit)
        end

        check_fail("!<Test>.const_defined?(<\"Unit\">) expected.") do
          assert_not_const_defined(Test, "Unit")
        end
      end

      def test_assert_predicate
        check_nothing_fails do
          assert_predicate([], :empty?)
        end

        check_fail("<[1]>.empty? is true value expected but was\n<false>") do
          assert_predicate([1], :empty?)
        end

        check_fail("<[1]>.respond_to?(:nonexistent?) expected\n" +
                    "(Class: <Array>)") do
          assert_predicate([1], :nonexistent?)
        end
      end

      def test_assert_not_predicate
        check_nothing_fails do
          assert_not_predicate([1], :empty?)
        end

        check_fail("<[]>.empty? is false value expected but was\n<true>") do
          assert_not_predicate([], :empty?)
        end

        check_fail("<[]>.respond_to?(:nonexistent?) expected\n" +
                    "(Class: <Array>)") do
          assert_not_predicate([], :nonexistent?)
        end
      end

      def test_assert_alias_method
        object = Object.new
        class << object
          def original_method
          end
          alias_method :alias_method, :original_method

          def other
          end
        end

        check_nothing_fails do
          assert_alias_method(object, :alias_method, :original_method)
        end

        check_nothing_fails do
          assert_alias_method(object, :original_method, :alias_method)
        end

        check_fail("<#{object.method(:other).inspect}> is alias of\n" +
                    "<#{object.method(:original_method).inspect}> expected") do
          assert_alias_method(object, :other, :original_method)
        end

        inspected_object = AssertionMessage.convert(object)
        check_fail("<#{inspected_object}>.nonexistent doesn't exist\n" +
                    "(Class: <Object>)") do
          assert_alias_method(object, :nonexistent, :original_method)
        end

        check_fail("<#{inspected_object}>.nonexistent doesn't exist\n" +
                    "(Class: <Object>)") do
          assert_alias_method(object, :alias_method, :nonexistent)
        end
      end

      def test_assert_path_exist
        check_nothing_fails do
          assert_path_exist(__FILE__)
        end

        nonexistent_file = __FILE__ + ".nonexistent"
        check_fail("<#{nonexistent_file.inspect}> was expected to exist") do
          assert_path_exist(nonexistent_file)
        end
      end

      def test_assert_path_not_exist
        nonexistent_file = __FILE__ + ".nonexistent"
        check_nothing_fails do
          assert_path_not_exist(nonexistent_file)
        end

        check_fail("<#{__FILE__.inspect}> was expected to not exist") do
          assert_path_not_exist(__FILE__)
        end
      end
    end

    class TestAssert < TestCase
      include AssertionCheckable

      def test_pass
        check_nothing_fails do
          assert(true)
        end
      end

      def test_pass_neither_false_or_nil
        check_nothing_fails do
          assert("a")
        end
      end

      def test_pass_with_message
        check_nothing_fails do
          assert(true, "successful assert")
        end
      end

      def test_pass_block
        check_nothing_fails do
          assert do
            true
          end
        end
      end

      def test_fail_nil
        check_fail("<nil> is not true.") do
          assert(nil)
        end
      end

      def test_fail_false
        check_fail("<false> is not true.") do
          assert(false)
        end
      end

      def test_fail_false_with_message
        check_fail("failed assert.\n" +
                    "<false> is not true.") do
          assert(false, "failed assert")
        end
      end

      def test_fail_with_assertion_message
        check_fail("user message.\n" +
                    "placeholder <:in> message") do
          assert(false, build_message("user message",
                                      "placeholder <?> message",
                                      :in))
        end
      end

      def test_fail_block
        check_fail(//) do
          assert do
            0.odd?
          end
        end
      end

      def test_error_invalid_message_true
        check_fail("assertion message must be String, Proc or " +
                    "Test::Unit::Assertions::AssertionMessage: " +
                    "<true>(<TrueClass>)") do
          begin
            assert(true, true)
          rescue ArgumentError
            raise AssertionFailedError, $!.message
          end
        end
      end

      def test_error_wrong_number_of_arguments
        check_fail("wrong number of arguments (0 for 1..2)") do
          begin
            assert
          rescue ArgumentError
            raise AssertionFailedError, $!.message
          end
        end
      end

      class TestBlock < self
        def test_with_message
          if defined?(PowerAssert)
            system_message = <<-MESSAGE.chomp
              1.to_s == "2"
                |    |
                |    false
                "1"
MESSAGE
          else
            system_message = "<false> is not true."
          end
          check_fail("user message.\n#{system_message}") do
            assert("user message") do
              1.to_s == "2"
            end
          end
        end
      end
    end

    class TestRefute < TestCase
      include AssertionCheckable

      class TestPass < self
        def test_nil
          check_nothing_fails do
            refute(nil)
          end
        end

        def test_false
          check_nothing_fails do
            refute(false)
          end
        end

        def test_with_message
          check_nothing_fails do
            refute(nil, "successful refute")
          end
        end
      end

      class TestFailure < self
        def test_true
          check_fail("<true> is neither nil or false.") do
            refute(true)
          end
        end

        def test_with_message
          check_fail("failed refute.\n" +
                       "<true> is neither nil or false.") do
            refute(true, "failed refute")
          end
        end

        def test_fail_with_assertion_message
          check_fail("user message.\n" +
                       "placeholder <:in> message") do
            refute(true, build_message("user message",
                                       "placeholder <?> message",
                                       :in))
          end
        end

        def test_error_invalid_message_true
          check_fail("assertion message must be String, Proc or " +
                       "Test::Unit::Assertions::AssertionMessage: " +
                "<false>(<FalseClass>)") do
            begin
              refute(true, false)
            rescue ArgumentError
              raise AssertionFailedError, $!.message
            end
          end
        end
      end
    end

    class TestAssertInDelta < TestCase
      include AssertionCheckable

      def test_pass
        check_nothing_fails do
          assert_in_delta(1.4, 1.4, 0)
        end
      end

      def test_pass_without_delta
        check_nothing_fails do
          assert_in_delta(1.401, 1.402)
        end
      end

      def test_pass_with_message
        check_nothing_fails do
          assert_in_delta(0.5, 0.4, 0.1, "message")
        end
      end

      def test_pass_float_like_object
        check_nothing_fails do
          float_thing = Object.new
          def float_thing.to_f
            0.2
          end
          assert_in_delta(0.1, float_thing, 0.1)
        end
      end

      def test_pass_string_expected
        check_nothing_fails do
          assert_in_delta("0.5", 0.4, 0.1)
        end
      end

      def test_fail_with_message
        check_fail("message.\n" +
                    "<0.5> -/+ <0.05> was expected to include\n" +
                    "<0.4>.\n" +
                    "\n" +
                    "Relation:\n" +
                    "<<0.4> < <0.5>-<0.05>[0.45] <= <0.5>+<0.05>[0.55]>") do
          assert_in_delta(0.5, 0.4, 0.05, "message")
        end
      end

      def test_fail_because_not_float_like_object
        object = Object.new
        inspected_object = AssertionMessage.convert(object)
        check_fail("The arguments must respond to to_f; " +
                    "the first float did not.\n" +
                    "<#{inspected_object}>.respond_to?(:to_f) expected\n" +
                    "(Class: <Object>)") do
          assert_in_delta(object, 0.4, 0.1)
        end
      end

      def test_fail_because_negaitve_delta
        check_fail("The delta should not be negative.\n" +
                    "<-0.1> was expected to be\n>=\n<0.0>.") do
          assert_in_delta(0.5, 0.4, -0.1, "message")
        end
      end

      def test_fail_without_delta
        check_fail("<1.402> -/+ <0.001> was expected to include\n" +
                    "<1.404>.\n" +
                    "\n" +
                    "Relation:\n" +
                    "<" +
                    "<1.402>-<0.001>[#{1.402 - 0.001}] <= " +
                    "<1.402>+<0.001>[#{1.402 + 0.001}] < " +
                    "<1.404>" +
                    ">") do
          assert_in_delta(1.402, 1.404)
        end
      end
    end

    class TestAssertNotInDelta < Test::Unit::TestCase
      include AssertionCheckable

      def test_pass
        check_nothing_fails do
          assert_not_in_delta(1.42, 1.44, 0.01)
        end
      end

      def test_pass_without_delta
        check_nothing_fails do
          assert_not_in_delta(1.402, 1.404)
        end
      end

      def test_pass_with_message
        check_nothing_fails do
          assert_not_in_delta(0.5, 0.4, 0.09, "message")
        end
      end

      def test_pass_float_like_object
        check_nothing_fails do
          float_thing = Object.new
          def float_thing.to_f
            0.2
          end
          assert_not_in_delta(0.1, float_thing, 0.09)
        end
      end

      def test_pass_string_epxected
        check_nothing_fails do
          assert_not_in_delta("0.5", 0.4, 0.09)
        end
      end

      def test_fail
        check_fail("<1.4> -/+ <0.11> was expected to not include\n" +
                    "<1.5>.\n" +
                    "\n" +
                    "Relation:\n" +
                    "<" +
                    "<1.4>-<0.11>[#{1.4 - 0.11}] <= " +
                    "<1.5> <= " +
                    "<1.4>+<0.11>[#{1.4 + 0.11}]" +
                    ">") do
          assert_not_in_delta(1.4, 1.5, 0.11)
        end
      end

      def test_fail_without_delta
        check_fail("<1.402> -/+ <0.001> was expected to not include\n" +
                    "<1.4021>.\n" +
                    "\n" +
                    "Relation:\n" +
                    "<" +
                    "<1.402>-<0.001>[#{1.402 - 0.001}] <= " +
                    "<1.4021> <= " +
                    "<1.402>+<0.001>[#{1.402 + 0.001}]" +
                    ">") do
          assert_not_in_delta(1.402, 1.4021)
        end
      end

      def test_fail_with_message
        check_fail("message.\n" +
                    "<0.5> -/+ <0.11> was expected to not include\n" +
                    "<0.4>.\n" +
                    "\n" +
                    "Relation:\n" +
                    "<" +
                    "<0.5>-<0.11>[0.39] <= " +
                    "<0.4> <= " +
                    "<0.5>+<0.11>[0.61]" +
                    ">") do
          assert_not_in_delta(0.5, 0.4, 0.11, "message")
        end
      end

      def test_fail_because_not_float_like_object
        object = Object.new
        inspected_object = AssertionMessage.convert(object)
        check_fail("The arguments must respond to to_f; " +
                    "the first float did not.\n" +
                    "<#{inspected_object}>.respond_to?(:to_f) expected\n" +
                    "(Class: <Object>)") do
          assert_not_in_delta(object, 0.4, 0.1)
        end
      end

      def test_fail_because_negaitve_delta
        check_fail("The delta should not be negative.\n" +
                    "<-0.11> was expected to be\n>=\n<0.0>.") do
          assert_not_in_delta(0.5, 0.4, -0.11, "message")
        end
      end
    end

    class TestAssertInEpsilon < TestCase
      include AssertionCheckable

      def test_pass
        check_nothing_fails do
          assert_in_epsilon(10000, 9000, 0.1)
        end
      end

      def test_pass_without_epsilon
        check_nothing_fails do
          assert_in_epsilon(10000, 9991)
        end
      end

      def test_pass_with_message
        check_nothing_fails do
          assert_in_epsilon(10000, 9000, 0.1, "message")
        end
      end

      def test_pass_float_like_object
        check_nothing_fails do
          float_thing = Object.new
          def float_thing.to_f
            9000.0
          end
          assert_in_epsilon(10000, float_thing, 0.1)
        end
      end

      def test_pass_string_expected
        check_nothing_fails do
          assert_in_epsilon("10000", 9000, 0.1)
        end
      end

      def test_pass_zero_expected
        check_nothing_fails do
          assert_in_epsilon(0, 0.00000001)
        end
      end

      def test_pass_minus_expected
        check_nothing_fails do
          assert_in_epsilon(-1, -1)
        end
      end

      def test_fail_with_message
        check_fail("message.\n" +
                    "<10000> -/+ (<10000> * <0.1>)[1000.0] " +
                    "was expected to include\n" +
                    "<8999>.\n" +
                    "\n" +
                    "Relation:\n" +
                    "<" +
                    "<8999> < " +
                    "<10000>-(<10000>*<0.1>)[9000.0] <= " +
                    "<10000>+(<10000>*<0.1>)[11000.0]" +
                    ">") do
          assert_in_epsilon(10000, 8999, 0.1, "message")
        end
      end

      def test_fail_because_not_float_like_object
        object = Object.new
        inspected_object = AssertionMessage.convert(object)
        check_fail("The arguments must respond to to_f; " +
                    "the first float did not.\n" +
                    "<#{inspected_object}>.respond_to?(:to_f) expected\n" +
                    "(Class: <Object>)") do
          assert_in_epsilon(object, 9000, 0.1)
        end
      end

      def test_fail_because_negaitve_epsilon
        check_fail("The epsilon should not be negative.\n" +
                    "<-0.1> was expected to be\n>=\n<0.0>.") do
          assert_in_epsilon(10000, 9000, -0.1, "message")
        end
      end

      def test_fail_without_epsilon
        check_fail("<10000> -/+ (<10000> * <0.001>)[10.0] " +
                    "was expected to include\n" +
                    "<10011>.\n" +
                    "\n" +
                    "Relation:\n" +
                    "<" +
                    "<10000>-(<10000>*<0.001>)[9990.0] <= " +
                    "<10000>+(<10000>*<0.001>)[10010.0] < " +
                    "<10011>" +
                    ">") do
          assert_in_epsilon(10000, 10011)
        end
      end
    end

    class TestAssertNotInEpsilon < Test::Unit::TestCase
      include AssertionCheckable

      def test_pass
        check_nothing_fails do
          assert_not_in_epsilon(10000, 8999, 0.1)
        end
      end

      def test_pass_without_epsilon
        check_nothing_fails do
          assert_not_in_epsilon(10000, 9989)
        end
      end

      def test_pass_with_message
        check_nothing_fails do
          assert_not_in_epsilon(10000, 8999, 0.1, "message")
        end
      end

      def test_pass_float_like_object
        check_nothing_fails do
          float_thing = Object.new
          def float_thing.to_f
            8999.0
          end
          assert_not_in_epsilon(10000, float_thing, 0.1)
        end
      end

      def test_pass_string_epxected
        check_nothing_fails do
          assert_not_in_epsilon("10000", 8999, 0.1)
        end
      end

      def test_fail
        check_fail("<10000> -/+ (<10000> * <0.1>)[1000.0] " +
                    "was expected to not include\n" +
                    "<9000>.\n" +
                    "\n" +
                    "Relation:\n" +
                    "<" +
                    "<10000>-(<10000>*<0.1>)[9000.0] <= " +
                    "<9000> <= " +
                    "<10000>+(<10000>*<0.1>)[11000.0]" +
                    ">") do
          assert_not_in_epsilon(10000, 9000, 0.1)
        end
      end

      def test_fail_without_epsilon
        check_fail("<10000> -/+ (<10000> * <0.001>)[10.0] " +
                    "was expected to not include\n" +
                    "<9990>.\n" +
                    "\n" +
                    "Relation:\n" +
                    "<" +
                    "<10000>-(<10000>*<0.001>)[9990.0] <= " +
                    "<9990> <= " +
                    "<10000>+(<10000>*<0.001>)[10010.0]" +
                    ">") do
          assert_not_in_epsilon(10000, 9990)
        end
      end

      def test_fail_with_message
        check_fail("message.\n" +
                    "<10000> -/+ (<10000> * <0.1>)[1000.0] " +
                    "was expected to not include\n" +
                    "<9000>.\n" +
                    "\n" +
                    "Relation:\n" +
                    "<" +
                    "<10000>-(<10000>*<0.1>)[9000.0] <= " +
                    "<9000> <= " +
                    "<10000>+(<10000>*<0.1>)[11000.0]" +
                    ">") do
          assert_not_in_epsilon(10000, 9000, 0.1, "message")
        end
      end

      def test_fail_because_not_float_like_object
        object = Object.new
        inspected_object = AssertionMessage.convert(object)
        check_fail("The arguments must respond to to_f; " +
                    "the first float did not.\n" +
                    "<#{inspected_object}>.respond_to?(:to_f) expected\n" +
                    "(Class: <Object>)") do
          assert_not_in_epsilon(object, 9000, 0.1)
        end
      end

      def test_fail_because_negaitve_epsilon
        check_fail("The epsilon should not be negative.\n" +
                    "<-0.1> was expected to be\n>=\n<0.0>.") do
          assert_not_in_epsilon(10000, 9000, -0.1, "message")
        end
      end
    end

    class TestAssertInclude < Test::Unit::TestCase
      include AssertionCheckable

      def test_pass
        check_nothing_fails do
          assert_include([1, 2, 3], 1)
        end
      end

      def test_pass_with_message
        check_nothing_fails do
          assert_include([1, 2, 3], 1, "message")
        end
      end

      def test_fail
        check_fail("<[1, 2, 3]> was expected to include\n" +
                    "<4>.") do
          assert_include([1, 2, 3], 4)
        end
      end

      def test_fail_with_message
        check_fail("message.\n" +
                    "<[1, 2, 3]> was expected to include\n" +
                    "<4>.") do
          assert_include([1, 2, 3], 4, "message")
        end
      end

      def test_fail_because_not_collection_like_object
        object = Object.new
        inspected_object = AssertionMessage.convert(object)
        check_fail("The collection must respond to :include?.\n" +
                    "<#{inspected_object}>.respond_to?(:include?) expected\n" +
                    "(Class: <Object>)") do
          assert_include(object, 1)
        end
      end
    end

    class TestAssertNotInclude < Test::Unit::TestCase
      include AssertionCheckable

      def test_pass
        check_nothing_fails do
          assert_not_include([1, 2, 3], 5)
        end
      end

      def test_pass_with_message
        check_nothing_fails do
          assert_not_include([1, 2, 3], 5, "message")
        end
      end

      def test_fail
        check_fail("<[1, 2, 3]> was expected to not include\n" +
                    "<2>.") do
          assert_not_include([1, 2, 3], 2)
        end
      end

      def test_fail_with_message
        check_fail("message.\n" +
                    "<[1, 2, 3]> was expected to not include\n" +
                    "<2>.") do
          assert_not_include([1, 2, 3], 2, "message")
        end
      end

      def test_fail_because_not_collection_like_object
        object = Object.new
        inspected_object = AssertionMessage.convert(object)
        check_fail("The collection must respond to :include?.\n" +
                    "<#{inspected_object}>.respond_to?(:include?) expected\n" +
                    "(Class: <Object>)") do
          assert_not_include(object, 1)
        end
      end
    end

    class TestAssertEmpty < Test::Unit::TestCase
      include AssertionCheckable

      def test_pass
        check_nothing_fails do
          assert_empty([])
        end
      end

      def test_pass_with_message
        check_nothing_fails do
          assert_empty([], "message")
        end
      end

      def test_fail
        check_fail("<[1]> was expected to be empty.") do
          assert_empty([1])
        end
      end

      def test_fail_with_message
        check_fail("message.\n" +
                    "<[1]> was expected to be empty.") do
          assert_empty([1], "message")
        end
      end

      def test_fail_because_no_empty_method
        object = Object.new
        inspected_object = AssertionMessage.convert(object)
        check_fail("The object must respond to :empty?.\n" +
                    "<#{inspected_object}>.respond_to?(:empty?) expected\n" +
                    "(Class: <Object>)") do
          assert_empty(object)
        end
      end
    end

    class TestAssertNotEmpty < Test::Unit::TestCase
      include AssertionCheckable

      def test_pass
        check_nothing_fails do
          assert_not_empty([1])
        end
      end

      def test_pass_with_message
        check_nothing_fails do
          assert_not_empty([1], "message")
        end
      end

      def test_fail
        check_fail("<[]> was expected to not be empty.") do
          assert_not_empty([])
        end
      end

      def test_fail_with_message
        check_fail("message.\n" +
                    "<[]> was expected to not be empty.") do
          assert_not_empty([], "message")
        end
      end

      def test_fail_because_no_empty_method
        object = Object.new
        inspected_object = AssertionMessage.convert(object)
        check_fail("The object must respond to :empty?.\n" +
                    "<#{inspected_object}>.respond_to?(:empty?) expected\n" +
                    "(Class: <Object>)") do
          assert_not_empty(object)
        end
      end
    end

    class TestAssertNotSend < Test::Unit::TestCase
      include AssertionCheckable

      def test_pass
        check_nothing_fails do
          assert_not_send([[1, 2], :member?, 4], "message")
        end
      end

      def test_fail
        expected_message = <<-EOM
message.
<[1, 2]> was expected to respond to
<member?(*[2])> with not a true value but was
<true>.
EOM
        check_fail(expected_message.chomp) do
          assert_not_send([[1, 2], :member?, 2], "message")
        end
      end
    end

    class TestTemplate < Test::Unit::TestCase
      def test_incompatible_encoding_by_diff
        need_encoding
        assert_raise(AssertionFailedError) do
          assert_equal("UTF-8の日本語\n" * 3,
                       ("Shift_JISの日本語\n" * 3).force_encoding("ASCII-8BIT"))
        end
      end

      private
      def need_encoding
        omit("need Encoding") unless Object.const_defined?(:Encoding)
      end
    end
  end
end
