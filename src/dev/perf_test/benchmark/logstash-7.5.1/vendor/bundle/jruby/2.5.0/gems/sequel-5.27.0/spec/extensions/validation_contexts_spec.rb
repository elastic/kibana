require_relative "spec_helper"

describe "Sequel::Plugins::ValidationHelpers" do
  before do
    @c = Class.new(Sequel::Model(:foo))
    @c.class_eval do
      columns :a, :b, :c
      plugin :validation_contexts
      def validate
        errors.add(:a, 'bad') if a == 1 && validation_context == :create
        errors.add(:b, 'bad') if b == 2 && validation_context == :update
        errors.add(:c, 'bad') if c == 3 && validation_context == :foo
      end
    end
  end

  it "should support :validation_context option to valid?" do
    @c.new(:c=>3).valid?.must_equal true
    @c.new(:c=>3).valid?(:validation_context=>:foo).must_equal false
  end

  it "should support :validation_context option to save?" do
    @c.new(:c=>3).save
    proc{@c.new(:c=>3).save(:validation_context=>:foo)}.must_raise Sequel::ValidationFailed
  end

  it "should raise error if using a validation context on a frozen model instance" do
    @c.new(:c=>3).freeze.valid?.must_equal true
    proc{@c.new(:c=>3).freeze.valid?(:validation_context=>:foo)}.must_raise RuntimeError, TypeError
  end
end
