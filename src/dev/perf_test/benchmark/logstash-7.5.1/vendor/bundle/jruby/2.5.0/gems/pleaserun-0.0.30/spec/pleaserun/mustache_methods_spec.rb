require "testenv"
require "pleaserun/mustache_methods"

# Fixture for use in testing PleaseRun::MustacheMethods
class MustacheMethodTester
  include PleaseRun::MustacheMethods

  def whatever
    return "hello world"
  end

  def args
    ["hello world", "fancy pants"]
  end

  def render(s)
    return s
  end
end

describe PleaseRun::MustacheMethods do
  subject { MustacheMethodTester.new }

  context "{{shell_args}}" do
    it "should escape multiple arguments via quoting" do
      insist { subject.shell_args } == "\"hello world\" \"fancy pants\""
    end
  end

  context "{{shell_quote}}" do
    it "quotes with spaces correctly" do
      insist { subject.shell_quote("hello world") } == "\"hello world\""
    end
    it "escapes $" do
      insist { subject.shell_quote("$") } == "\"\\$\""
    end
  end

  context "{{shell_continuation}}" do
    let(:input) { "hello\nworld\nfizzle" }
      
    it "should render correctly" do
      insist { subject.shell_continuation(input) } == "hello \\\nworld \\\nfizzle"
    end
  end
  context "{{quoted}}"
end
