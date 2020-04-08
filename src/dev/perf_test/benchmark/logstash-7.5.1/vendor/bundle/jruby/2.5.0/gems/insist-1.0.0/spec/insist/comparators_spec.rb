require "spec_setup"
require "insist"

describe Insist::Comparators do
  subject do
    Insist.new { 30 }
  end

  describe "#==" do
    it "should be OK if the #value is equal" do
      subject == 30
    end

    it "should fail if the #value is not equal" do
      insist { subject == 0 }.fails
    end
  end

  describe "#<=" do
    it "should be OK if the #value is less than or equal" do
      larger = subject.value + 1
      subject <= larger
    end

    it "should be OK if the #value is equal" do
      subject >= subject.value
    end

    it "should fail if the #value is greater" do
      smaller = subject.value - 1
      insist { subject <= smaller }.fails
    end
  end

  describe "#>=" do
    it "should be OK if the #value is greater than" do
      smaller = subject.value - 1
      subject >= smaller
    end

    it "should be OK if the #value is equal" do
      subject >= subject.value
    end

    it "should fail if the #value is lesser" do
      larger = subject.value + 1
      insist { subject >= larger }.fails
    end
  end

  describe "#<" do
    it "should be OK if the #value is less than" do
      larger = subject.value + 1
      subject < larger
    end

    it "should fail if the #value is equal" do
      insist { subject < subject.value }.fails
    end

    it "should fail if the #value is greater" do
      smaller = subject.value - 1
      insist { subject < smaller }.fails
    end
  end

  describe "#>" do
    it "should be OK if the #value is greater than" do
      smaller = subject.value - 1
      subject > smaller
    end

    it "should fail if the #value is equal" do
      insist { subject > subject.value }.fails
    end

    it "should fail if the #value is lesser" do
      larger = subject.value + 1
      insist { subject > larger }.fails
    end
  end

  describe "#=~", :if => (RUBY_VERSION >= "1.9.2") do
    subject do
      Insist.new { "hello" }
    end

    it "should be OK if the #value matches the given pattern" do
      subject =~ /hello/
    end

    it "should fail if the #value does not match the pattern" do
      insist { subject =~ /world/ }.fails
    end
  end

  describe "#!~", :if => (RUBY_VERSION >= "1.9.2") do
    subject do
      Insist.new { "hello" }
    end

    it "should be OK if the #value does not match the pattern" do
      subject !~ /world/
    end

    it "should fail if the #value matches the given pattern" do
      insist { subject !~ /hello/ }.fails
    end
  end
end
