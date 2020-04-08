require 'test/unit'

require 'test/unit/util/backtracefilter'

module Test::Unit::Util
  class TestBacktraceFilter < Test::Unit::TestCase
    include BacktraceFilter
    
    def test_filter_backtrace
      backtrace = [%q{C:\some\old\path/test/unit/assertions.rb:44:in 'assert'},
        %q{tc_thing.rb:4:in 'a'},
        %q{tc_thing.rb:4:in 'test_stuff'},
        %q{C:\some\old\path/test/unit/testcase.rb:44:in 'send'},
        %q{C:\some\old\path\test\unit\testcase.rb:44:in 'run'},
        %q{C:\some\old\path\test\unit.rb:44:in 'run'},
        %q{tc_thing.rb:3}]
      assert_equal(backtrace[1..2], filter_backtrace(backtrace, %q{C:\some\old\path\test\unit}), "Should filter out all TestUnit-specific lines")

      backtrace = [%q{tc_thing.rb:4:in 'a'},
        %q{tc_thing.rb:4:in 'test_stuff'},
        %q{tc_thing.rb:3}]
      assert_equal(backtrace, filter_backtrace(backtrace, %q{C:\some\old\path\test\unit}), "Shouldn't filter too much")

      backtrace = [%q{C:\some\old\path/test/unit/assertions.rb:44:in 'assert'},
        %q{tc_thing.rb:4:in 'a'},
        %q{tc_thing.rb:4:in 'test_stuff'},
        %q{tc_thing.rb:3}]
      assert_equal(backtrace[1..3], filter_backtrace(backtrace, %q{C:\some\old\path\test\unit}), "Should filter out all TestUnit-specific lines")
      
      backtrace = [%q{C:\some\old\path/test/unit/assertions.rb:44:in 'assert'},
        %q{C:\some\old\path/test/unit/testcase.rb:44:in 'send'},
        %q{C:\some\old\path\test\unit\testcase.rb:44:in 'run'},
        %q{C:\some\old\path\test\unit.rb:44:in 'run'}]
      assert_equal(backtrace, filter_backtrace(backtrace, %q{C:\some\old\path\test\unit}), "Should filter out all TestUnit-specific lines")
    end

    def test_nil_backtrace
      assert_equal(["No backtrace"], filter_backtrace(nil))
    end

    def test_power_assert_backtrace
      omit('test for power_assert') unless defined?(PowerAssert)
      blk = Proc.new {caller.find {|i| /power_assert.*in \`start\'/ =~ i}}
      PowerAssert.start(blk) do |pa|
        backtrace = [pa.yield,
          %q{tc_thing.rb:4:in 'a'},
          %q{tc_thing.rb:4:in 'test_stuff'}]
        assert_equal(backtrace[1..2], filter_backtrace(backtrace))
      end
    end
  end
end
