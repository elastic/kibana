require_relative "spec_helper"

if (RUBY_VERSION >= '2.0.0' && RUBY_ENGINE == 'ruby') || (RUBY_VERSION >= '2.3.0' && RUBY_ENGINE == 'jruby')
Sequel.extension :symbol_aref_refinement
using Sequel::SymbolAref

describe "symbol_aref_refinement extension" do
  before do
    @db = Sequel.mock
  end

  it "Symbol#[] should create qualified identifier if given a symbol" do
    @db.literal(:x[:y]).must_equal "x.y"
  end

  it "Symbol#[] should create qualified identifier if given an identifier" do
    @db.literal(:x[Sequel[:y]]).must_equal "x.y"
  end

  it "Symbol#[] should create qualified identifier if given a qualified identifier" do
    @db.literal(:x[:y[:z]]).must_equal "x.y.z"
  end

  it "should not affect other arguments to Symbol#[]" do
    :x[0].must_equal "x"
  end
end
end
