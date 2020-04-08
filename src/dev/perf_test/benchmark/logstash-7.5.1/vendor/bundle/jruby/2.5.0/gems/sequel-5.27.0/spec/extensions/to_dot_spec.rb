require_relative "spec_helper"

describe Sequel::Model, "to_dot extension" do
  def dot(ds)
    Sequel::ToDot.new(ds).instance_variable_get(:@dot)[4...-1]
  end

  before do
    @db = DB
    @ds = @db.dataset.extension(:to_dot)
  end

  it "should output a string suitable for input to the graphviz dot program" do
    @ds.to_dot.must_equal((<<END).strip)
digraph G {
0 [label="self"];
0 -> 1 [label=""];
1 [label="Dataset"];
}
END
  end

  it "should handle an empty dataset" do
    dot(@ds).must_equal []
  end

  it "should handle WITH" do
    a = dot(@ds.with_extend{def supports_cte?(*) true end}.with(:a, @ds))
    a[0..3].must_equal ["1 -> 2 [label=\"with\"];", "2 [label=\"Array\"];", "2 -> 3 [label=\"0\"];", "3 [label=\"Hash\"];"]
    [["3 -> 4 [label=\"dataset\"];", "4 [label=\"Dataset\"];", "3 -> 5 [label=\"name\"];", "5 [label=\":a\"];"],
     ["3 -> 4 [label=\"name\"];", "4 [label=\":a\"];", "3 -> 5 [label=\"dataset\"];", "5 [label=\"Dataset\"];"]].must_include(a[4..-1])
  end

  it "should handle DISTINCT" do
    dot(@ds.distinct).must_equal ["1 -> 2 [label=\"distinct\"];", "2 [label=\"Array\"];"]
  end

  it "should handle FROM" do
    dot(@ds.from(:a)).must_equal ["1 -> 2 [label=\"from\"];", "2 [label=\"Array\"];", "2 -> 3 [label=\"0\"];", "3 [label=\":a\"];"]
  end

  it "should handle JOIN" do
    dot(@ds.join(:a)).must_equal ["1 -> 2 [label=\"join\"];", "2 [label=\"Array\"];", "2 -> 3 [label=\"0\"];", "3 [label=\"INNER JOIN\"];", "3 -> 4 [label=\"table\"];", "4 [label=\":a\"];"]
  end

  it "should handle WHERE" do
    dot(@ds.filter(true)).must_equal ["1 -> 2 [label=\"where\"];", "2 [label=\"ComplexExpression: NOOP\"];", "2 -> 3 [label=\"0\"];", "3 [label=\"true\"];"]
  end

  it "should handle GROUP" do
    dot(@ds.group(:a)).must_equal ["1 -> 2 [label=\"group\"];", "2 [label=\"Array\"];", "2 -> 3 [label=\"0\"];", "3 [label=\":a\"];"]
  end

  it "should handle HAVING" do
    dot(@ds.having(:a)).must_equal ["1 -> 2 [label=\"having\"];", "2 [label=\":a\"];"]
  end

  it "should handle UNION" do
    dot(@ds.union(@ds)).must_equal ["1 -> 2 [label=\"from\"];", "2 [label=\"Array\"];", "2 -> 3 [label=\"0\"];", "3 [label=\"AliasedExpression\"];", "3 -> 4 [label=\"expression\"];", "4 [label=\"Dataset\"];", "4 -> 5 [label=\"compounds\"];", "5 [label=\"Array\"];", "5 -> 6 [label=\"0\"];", "6 [label=\"Array\"];", "6 -> 7 [label=\"0\"];", "7 [label=\":union\"];", "6 -> 8 [label=\"1\"];", "8 [label=\"Dataset\"];", "6 -> 9 [label=\"2\"];", "9 [label=\"nil\"];", "3 -> 10 [label=\"alias\"];", "10 [label=\":t1\"];"]
  end

  it "should handle INTERSECT" do
    dot(@ds.intersect(@ds)).must_equal ["1 -> 2 [label=\"from\"];", "2 [label=\"Array\"];", "2 -> 3 [label=\"0\"];", "3 [label=\"AliasedExpression\"];", "3 -> 4 [label=\"expression\"];", "4 [label=\"Dataset\"];", "4 -> 5 [label=\"compounds\"];", "5 [label=\"Array\"];", "5 -> 6 [label=\"0\"];", "6 [label=\"Array\"];", "6 -> 7 [label=\"0\"];", "7 [label=\":intersect\"];", "6 -> 8 [label=\"1\"];", "8 [label=\"Dataset\"];", "6 -> 9 [label=\"2\"];", "9 [label=\"nil\"];", "3 -> 10 [label=\"alias\"];", "10 [label=\":t1\"];"]
  end

  it "should handle EXCEPT" do
    dot(@ds.except(@ds)).must_equal ["1 -> 2 [label=\"from\"];", "2 [label=\"Array\"];", "2 -> 3 [label=\"0\"];", "3 [label=\"AliasedExpression\"];", "3 -> 4 [label=\"expression\"];", "4 [label=\"Dataset\"];", "4 -> 5 [label=\"compounds\"];", "5 [label=\"Array\"];", "5 -> 6 [label=\"0\"];", "6 [label=\"Array\"];", "6 -> 7 [label=\"0\"];", "7 [label=\":except\"];", "6 -> 8 [label=\"1\"];", "8 [label=\"Dataset\"];", "6 -> 9 [label=\"2\"];", "9 [label=\"nil\"];", "3 -> 10 [label=\"alias\"];", "10 [label=\":t1\"];"]
  end

  it "should handle ORDER" do
    dot(@ds.order(:a)).must_equal ["1 -> 2 [label=\"order\"];", "2 [label=\"Array\"];", "2 -> 3 [label=\"0\"];", "3 [label=\":a\"];"]
  end

  it "should handle LIMIT and OFFSET" do
    dot(@ds.limit(1, 2)).must_equal ["1 -> 2 [label=\"limit\"];", "2 [label=\"1\"];", "1 -> 3 [label=\"offset\"];", "3 [label=\"2\"];"]
  end

  it "should handle FOR UPDATE" do
    dot(@ds.for_update).must_equal ["1 -> 2 [label=\"lock\"];", "2 [label=\":update\"];"]
  end

  it "should handle LiteralStrings" do
    dot(@ds.filter(Sequel.lit('a'))).must_equal ["1 -> 2 [label=\"where\"];", "2 [label=\"Sequel.lit(\\\"(a)\\\")\"];"]
  end

  it "should handle true, false, nil" do
    dot(@ds.select(true, false, nil)).must_equal ["1 -> 2 [label=\"select\"];", "2 [label=\"Array\"];", "2 -> 3 [label=\"0\"];", "3 [label=\"true\"];", "2 -> 4 [label=\"1\"];", "4 [label=\"false\"];", "2 -> 5 [label=\"2\"];", "5 [label=\"nil\"];"]
  end

  it "should handle SQL::ComplexExpressions" do
    dot(@ds.filter(:a=>:b)).must_equal ["1 -> 2 [label=\"where\"];", "2 [label=\"ComplexExpression: =\"];", "2 -> 3 [label=\"0\"];", "3 [label=\":a\"];", "2 -> 4 [label=\"1\"];", "4 [label=\":b\"];"]
  end

  it "should handle SQL::Identifiers" do
    dot(@ds.select{a}).must_equal ["1 -> 2 [label=\"select\"];", "2 [label=\"Array\"];", "2 -> 3 [label=\"0\"];", "3 [label=\"Identifier\"];", "3 -> 4 [label=\"value\"];", "4 [label=\":a\"];"]
  end

  it "should handle SQL::QualifiedIdentifiers" do
    dot(@ds.select{a[b]}).must_equal ["1 -> 2 [label=\"select\"];", "2 [label=\"Array\"];", "2 -> 3 [label=\"0\"];", "3 [label=\"QualifiedIdentifier\"];", "3 -> 4 [label=\"table\"];", "4 [label=\"\\\"a\\\"\"];", "3 -> 5 [label=\"column\"];", "5 [label=\"\\\"b\\\"\"];"]
  end

  it "should handle SQL::OrderedExpressions" do
    dot(@ds.order(Sequel.desc(:a, :nulls=>:last))).must_equal ["1 -> 2 [label=\"order\"];", "2 [label=\"Array\"];", "2 -> 3 [label=\"0\"];", "3 [label=\"OrderedExpression: DESC NULLS LAST\"];", "3 -> 4 [label=\"expression\"];", "4 [label=\":a\"];"]
  end

  it "should handle SQL::AliasedExpressions" do
    dot(@ds.from(Sequel.as(:a, :b))).must_equal ["1 -> 2 [label=\"from\"];", "2 [label=\"Array\"];", "2 -> 3 [label=\"0\"];", "3 [label=\"AliasedExpression\"];", "3 -> 4 [label=\"expression\"];", "4 [label=\":a\"];", "3 -> 5 [label=\"alias\"];", "5 [label=\":b\"];"]
  end

  it "should handle SQL::AliasedExpressions with column aliases" do
    dot(@ds.from(Sequel.as(:a, :b, [:c, :d]))).must_equal ["1 -> 2 [label=\"from\"];", "2 [label=\"Array\"];", "2 -> 3 [label=\"0\"];", "3 [label=\"AliasedExpression\"];", "3 -> 4 [label=\"expression\"];", "4 [label=\":a\"];", "3 -> 5 [label=\"alias\"];", "5 [label=\":b\"];", "3 -> 6 [label=\"columns\"];", "6 [label=\"Array\"];", "6 -> 7 [label=\"0\"];", "7 [label=\":c\"];", "6 -> 8 [label=\"1\"];", "8 [label=\":d\"];"]
  end

  it "should handle SQL::CaseExpressions" do
    dot(@ds.select(Sequel.case({:a=>:b}, :c, :d))).must_equal ["1 -> 2 [label=\"select\"];", "2 [label=\"Array\"];", "2 -> 3 [label=\"0\"];", "3 [label=\"CaseExpression\"];", "3 -> 4 [label=\"expression\"];", "4 [label=\":d\"];", "3 -> 5 [label=\"conditions\"];", "5 [label=\"Array\"];", "5 -> 6 [label=\"0\"];", "6 [label=\"Array\"];", "6 -> 7 [label=\"0\"];", "7 [label=\":a\"];", "6 -> 8 [label=\"1\"];", "8 [label=\":b\"];", "3 -> 9 [label=\"default\"];", "9 [label=\":c\"];"]
  end

  it "should handle SQL::Cast" do
    dot(@ds.select(Sequel.cast(:a, Integer))).must_equal  ["1 -> 2 [label=\"select\"];", "2 [label=\"Array\"];", "2 -> 3 [label=\"0\"];", "3 [label=\"Cast\"];", "3 -> 4 [label=\"expr\"];", "4 [label=\":a\"];", "3 -> 5 [label=\"type\"];", "5 [label=\"Integer\"];"]
  end

  it "should handle SQL::Function" do
    dot(@ds.select{a(b)}).must_equal ["1 -> 2 [label=\"select\"];", "2 [label=\"Array\"];", "2 -> 3 [label=\"0\"];", "3 [label=\"Function: a\"];", "3 -> 4 [label=\"0\"];", "4 [label=\"Identifier\"];", "4 -> 5 [label=\"value\"];", "5 [label=\":b\"];", "3 -> 6 [label=\"args\"];", "6 [label=\"Array\"];", "6 -> 7 [label=\"0\"];", "7 [label=\"Identifier\"];", "7 -> 8 [label=\"value\"];", "8 [label=\":b\"];", "3 -> 9 [label=\"opts\"];", "9 [label=\"Hash\"];"]
  end

  it "should handle SQL::Subscript" do
    dot(@ds.select(Sequel.subscript(:a, 1))).must_equal ["1 -> 2 [label=\"select\"];", "2 [label=\"Array\"];", "2 -> 3 [label=\"0\"];", "3 [label=\"Subscript\"];", "3 -> 4 [label=\"f\"];", "4 [label=\":a\"];", "3 -> 5 [label=\"sub\"];", "5 [label=\"Array\"];", "5 -> 6 [label=\"0\"];", "6 [label=\"1\"];"]
  end

  it "should handle SQL::Function with a window" do
    dot(@ds.select(Sequel.function(:sum).over(:partition=>:a))).must_equal ["1 -> 2 [label=\"select\"];", "2 [label=\"Array\"];", "2 -> 3 [label=\"0\"];", "3 [label=\"Function: sum\"];", "3 -> 4 [label=\"args\"];", "4 [label=\"Array\"];", "3 -> 5 [label=\"opts\"];", "5 [label=\"Hash\"];", "5 -> 6 [label=\"over\"];", "6 [label=\"Window\"];", "6 -> 7 [label=\"opts\"];", "7 [label=\"Hash\"];", "7 -> 8 [label=\"partition\"];", "8 [label=\":a\"];"]
  end

  it "should handle SQL::PlaceholderLiteralString" do
    dot(@ds.where(Sequel.lit("?", true))).must_equal ["1 -> 2 [label=\"where\"];", "2 [label=\"PlaceholderLiteralString: \\\"(?)\\\"\"];", "2 -> 3 [label=\"args\"];", "3 [label=\"Array\"];", "3 -> 4 [label=\"0\"];", "4 [label=\"true\"];"]
  end

  it "should handle JOIN ON" do
    dot(@ds.from(:a).join(:d, :b=>:c)).must_equal ["1 -> 2 [label=\"from\"];", "2 [label=\"Array\"];", "2 -> 3 [label=\"0\"];", "3 [label=\":a\"];", "1 -> 4 [label=\"join\"];", "4 [label=\"Array\"];", "4 -> 5 [label=\"0\"];", "5 [label=\"INNER JOIN ON\"];", "5 -> 6 [label=\"table\"];", "6 [label=\":d\"];", "5 -> 7 [label=\"on\"];", "7 [label=\"ComplexExpression: =\"];", "7 -> 8 [label=\"0\"];", "8 [label=\"QualifiedIdentifier\"];", "8 -> 9 [label=\"table\"];", "9 [label=\"\\\"d\\\"\"];", "8 -> 10 [label=\"column\"];", "10 [label=\"\\\"b\\\"\"];", "7 -> 11 [label=\"1\"];", "11 [label=\"QualifiedIdentifier\"];", "11 -> 12 [label=\"table\"];", "12 [label=\"\\\"a\\\"\"];", "11 -> 13 [label=\"column\"];", "13 [label=\"\\\"c\\\"\"];"]
  end

  it "should handle JOIN USING" do
    dot(@ds.from(:a).join(:d, [:c], :table_alias=>:c)).must_equal ["1 -> 2 [label=\"from\"];", "2 [label=\"Array\"];", "2 -> 3 [label=\"0\"];", "3 [label=\":a\"];", "1 -> 4 [label=\"join\"];", "4 [label=\"Array\"];", "4 -> 5 [label=\"0\"];", "5 [label=\"INNER JOIN USING\"];", "5 -> 6 [label=\"table\"];", "6 [label=\"AliasedExpression\"];", "6 -> 7 [label=\"expression\"];", "7 [label=\":d\"];", "6 -> 8 [label=\"alias\"];", "8 [label=\":c\"];", "5 -> 9 [label=\"using\"];", "9 [label=\"Array\"];", "9 -> 10 [label=\"0\"];", "10 [label=\":c\"];"]
  end

  it "should handle other types" do
    o = Object.new
    def o.inspect
      "blah"
    end
    dot(@ds.select(o)).must_equal ["1 -> 2 [label=\"select\"];", "2 [label=\"Array\"];", "2 -> 3 [label=\"0\"];", "3 [label=\"Unhandled: blah\"];"]
  end
end
