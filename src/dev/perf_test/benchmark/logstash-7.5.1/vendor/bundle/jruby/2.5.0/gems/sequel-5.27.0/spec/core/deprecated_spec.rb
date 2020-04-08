require_relative "spec_helper"

describe "Sequel::Deprecated" do
  before do
    @d = Sequel::Deprecation
    @prev_prefix = @d.prefix
    @prev_output = @d.output
    @prev_backtrace_filter = @d.backtrace_filter
    @output = []
    def @output.puts(s)
      self << s
    end
    @d.prefix = false
    @d.output = @output
    @d.backtrace_filter = false
  end
  after do
    @d.prefix = @prev_prefix
    @d.output = @prev_output
    @d.backtrace_filter = @prev_backtrace_filter
  end

  it "should output full messages to the given output" do
    @d.deprecate("foo")
    @output.must_equal ['foo']
  end

  it "should consider two arguments to be a method name and additional text" do
    @d.deprecate("foo", "Use bar instead")
    @output.must_equal ['foo is deprecated and will be removed in Sequel 5.1.  Use bar instead.']
  end

  it "should include a prefix if set" do
    @d.prefix = "DEPWARN: "
    @d.deprecate("foo")
    @output.must_equal ['DEPWARN: foo']
  end

  it "should not output anything if output is false" do
    @d.output = false
    @d.deprecate("foo")
  end

  it "should include full backtrace if backtrace_filter is true" do
    @d.backtrace_filter = true
    @d.deprecate("foo")
    @output.first.must_equal 'foo'
    (4..100).must_include(@output.count)
  end

  it "should include given lines of backtrace if backtrace_filter is an integer" do
    @d.backtrace_filter = 1
    @d.deprecate("foo")
    @output.first.must_equal 'foo'
    @output.count.must_equal 2
    
    @output.clear
    @d.backtrace_filter = 3
    @d.deprecate("foo")
    @output.first.must_equal 'foo'
    @output.count.must_equal 4
  end

  it "should select backtrace lines if backtrace_filter is a proc" do
    @d.backtrace_filter = lambda{|line, line_no| line_no < 3 && line =~ /./}
    @d.deprecate("foo")
    @output.first.must_equal 'foo'
    @output.count.must_equal 4
  end
end
