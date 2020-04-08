require_relative "spec_helper"

if (RUBY_VERSION >= '2.0.0' && RUBY_ENGINE == 'ruby') || (RUBY_VERSION >= '2.3.0' && RUBY_ENGINE == 'jruby')
Sequel.extension :symbol_as_refinement
using Sequel::SymbolAs

describe "symbol_as_refinement extension" do
  before do
    @db = Sequel.mock
  end

  it "Symbol#as should create aliased expression" do
    @db.literal(:x.as(:y)).must_equal "x AS y"
  end

  it "Symbol#as should create aliased expression with columns" do
    @db.literal(:x.as(:y, [:c1, :c2])).must_equal "x AS y(c1, c2)"
  end
end
end

