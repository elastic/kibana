require 'test/unit'
require 'test/unit/ui/emacs/testrunner'

class TestUnitEmacsRunner < Test::Unit::TestCase
  def test_format_failure_with_a_location
    runner = create_runner
    test_name = "test_failure"
    file = "/home/user/test_xxx.rb"
    line = "3"
    info = "in `xxx'"
    location = "#{file}:#{line}: #{info}"
    message = "FAIL!!!"
    failure = Test::Unit::Failure.new(test_name, [location], message)
    assert_equal(<<-EOM.chomp, runner.send(:format_fault, failure))
Failure:
#{test_name} [#{file}:#{line}]:
#{message}
EOM
  end

  def test_format_failure_with_locations
    runner = create_runner
    test_name = "test_failure"
    locations = ["/home/user/test_xxx.rb:3: in `xxx'",
                 "/home/user/yyy/test_yyy.rb:999: in `yyy'",
                 "/home/user/xyz/zzz.rb:29: in `zzz'"]
    message = "Many backtrace!!!"
    failure = Test::Unit::Failure.new(test_name, locations, message)
    assert_equal(<<-EOM.chomp, runner.send(:format_fault, failure))
Failure:
#{test_name}
#{locations.join("\n")}:
#{message}
EOM
  end

  def test_format_error
    runner = create_runner
    test_name = "test_error"
    message = "Error Message!!!"
    backtrace = ["/home/user/test_xxx.rb:3: in `xxx'",
                 "/home/user/yyy/test_yyy.rb:999: in `yyy'",
                 "/home/user/xyz/zzz.rb:29: in `zzz'"]
    exception = RuntimeError.new(message)
    exception.set_backtrace(backtrace)
    error = Test::Unit::Error.new(test_name, exception)
    assert_equal(<<-EOM.chomp, runner.send(:format_fault, error))
Error:
#{test_name}:
#{exception.class.name}: #{message}
#{backtrace.join("\n")}
EOM
  end

  private
  def create_runner(suite=nil)
    suite ||= Test::Unit::TestSuite.new
    Test::Unit::UI::Emacs::TestRunner.new(suite)
  end
end
