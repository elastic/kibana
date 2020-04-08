require "test-unit"
require "testunit-test-util"

class TestCodeSnippet < Test::Unit::TestCase
  include TestUnitTestUtil

  class TestJRuby < self
    def test_error_inside_jruby
      jruby_only_test

      backtrace = backtrace_from_jruby
      no_rb_entries = backtrace.find_all do |(file, _, _)|
        File.extname(file) != ".rb"
      end

      fetcher = Test::Unit::CodeSnippetFetcher.new
      snippets = no_rb_entries.collect do |(file, line, _)|
        fetcher.fetch(file, line)
      end
      assert_equal([[]] * no_rb_entries.size,
                   snippets)
    end

    private
    def backtrace_from_jruby
      begin
        java.util.Vector.new(-1)
      rescue Exception
        $@.collect do |entry|
          entry.split(/:/, 3)
        end
      else
        flunk("failed to raise an exception from JRuby.")
      end
    end
  end
end
