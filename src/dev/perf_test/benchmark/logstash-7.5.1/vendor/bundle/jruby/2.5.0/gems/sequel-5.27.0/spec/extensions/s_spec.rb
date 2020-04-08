require_relative "spec_helper"

Sequel.extension :s

describe "s extension as refinement" do
  include Sequel::S

  before do
    @db = Sequel.mock
  end

  it "S should be callable with different arguments" do
    @db.literal(S(:s) + 1).must_equal "(s + 1)"
    @db.literal(S('s') + '1').must_equal "('s' || '1')"
    @db.literal(~S([[:s, 1], [:z, 2]])).must_equal "((s != 1) OR (z != 2))"
  end

  it "S should be callable with blocks" do
    @db.literal(S{x + 1}).must_equal "(x + 1)"
  end

  it "S should raise an error if called with multiple objects" do
    proc{S(:x, 1)}.must_raise ArgumentError
  end

  it "S should raise an error if called with objects and block" do
    proc{S(:x){}}.must_raise Sequel::Error
  end
end


if (RUBY_VERSION >= '2.0.0' && RUBY_ENGINE == 'ruby') || (RUBY_ENGINE == 'jruby' && (JRUBY_VERSION >= '9.3' || (JRUBY_VERSION.match(/\A9\.2\.(\d+)/) && $1.to_i >= 7)))
using Sequel::S

describe "s extension as refinement" do
  before do
    @db = Sequel.mock
  end

  it "S should be callable with different arguments" do
    @db.literal(S(:s) + 1).must_equal "(s + 1)"
    @db.literal(S('s') + '1').must_equal "('s' || '1')"
    @db.literal(~S([[:s, 1], [:z, 2]])).must_equal "((s != 1) OR (z != 2))"
  end

  it "S should be callable with blocks" do
    @db.literal(S{x + 1}).must_equal "(x + 1)"
  end

  it "S should raise an error if called with multiple objects" do
    proc{S(:x, 1)}.must_raise ArgumentError
  end

  it "S should raise an error if called with objects and block" do
    proc{S(:x){}}.must_raise Sequel::Error
  end
end
end


