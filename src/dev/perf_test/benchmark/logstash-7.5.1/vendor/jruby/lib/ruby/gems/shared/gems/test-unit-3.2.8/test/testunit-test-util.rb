module TestUnitTestUtil
  private
  def jruby?
    RUBY_PLATFORM == "java"
  end

  def jruby_only_test
    if jruby?
      require "java"
    else
      omit("test for JRuby")
    end
  end

  def assert_fault_messages(expected, faults)
    assert_equal(expected, faults.collect {|fault| fault.message})
  end

  def _run_test(test_case, name)
    result = Test::Unit::TestResult.new
    test = test_case.new(name)
    yield(test) if block_given?
    test.run(result) {}
    result
  end

  def fixture_file_path(file_name)
    base_dir = File.dirname(__FILE__)
    File.join(base_dir, "fixtures", file_name)
  end
end
