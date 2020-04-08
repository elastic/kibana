require "spec_setup"
require "insist"
require "insist/predicates"

# The predicates feature will delegateany predicate method calls (ones ending
# in "?") to the block value and fail if the return is false.
describe Insist::Predicates do
  describe "#is_a?" do
    it "should succeed if value#is_a? returns true" do
      insist { "some string" }.is_a?(Object)
      insist { "some string" }.is_a?(String)
    end
    it "should fail if value#is_a? returns false" do
      reject { "some string" }.is_a?(Numeric)
      reject { "some string" }.is_a?(Fixnum)
      reject { "some string" }.is_a?(File)
    end
  end

  describe "#respond_to?" do
    subject do
      insist { [1, 2, 3] }
    end

    it "should be OK if the #value responds to a given method" do
      subject.respond_to?(:[])
      subject.respond_to?(:to_a)
      subject.respond_to?(:each)
    end

    it "should fail if the #value does not respond to a given method" do
      insist { subject.respond_to?(:SOME_INVALID_METHOD) }.fails
    end

    it "should fail if the respond_to? is invoked incorrectly" do
      insist { subject.respond_to? }.raises(ArgumentError)
    end
  end # #respond_to?

  describe "#empty?" do
    it "should be OK if the #value.empty? returns true" do
      insist { [] }.empty?
      insist { {} }.empty?
      insist { "" }.empty?
    end

    it "should fail if the #value.empty? returns a false" do
     insist {  insist { [1] }.empty? }.fails
     insist { insist { { :foo => :bar } }.empty? }.fails
     insist { insist { "hello" }.empty? }.fails
    end
  end # #empty?
end
