require_relative "spec_helper"

Sequel.extension :sql_expr

describe "Sequel sql_expr extension" do
  before do
    @ds = Sequel.mock.dataset
  end

  it "Object#sql_expr should wrap the object in a GenericComplexExpression" do
    o = Object.new
    def o.sql_literal(ds) 'foo' end
    s = o.sql_expr
    @ds.literal(s).must_equal "foo"
    @ds.literal(s+1).must_equal "(foo + 1)"
    @ds.literal(s & true).must_equal "(foo AND 't')"
    @ds.literal(s < 1).must_equal "(foo < 1)"
    @ds.literal(s.sql_subscript(1)).must_equal "(foo)[1]"
    @ds.literal(s.like('a')).must_equal "(foo LIKE 'a' ESCAPE '\\')"
    @ds.literal(s.as(:a)).must_equal "foo AS a"
    @ds.literal(s.cast(Integer)).must_equal "CAST(foo AS integer)"
    @ds.literal(s.desc).must_equal "foo DESC"
    @ds.literal(s.sql_string + '1').must_equal "(foo || '1')"
  end

  it "Numeric#sql_expr should wrap the object in a NumericExpression" do
    [1, 2.0, 2^70, BigDecimal('1.0')].each do |o|
      @ds.literal(o.sql_expr).must_equal @ds.literal(o)
      @ds.literal(o.sql_expr + 1).must_equal "(#{@ds.literal(o)} + 1)"
    end
  end

  it "String#sql_expr should wrap the object in a StringExpression" do
    @ds.literal("".sql_expr).must_equal "''"
    @ds.literal("".sql_expr + :a).must_equal "('' || a)"
  end

  it "NilClass, TrueClass, and FalseClass#sql_expr should wrap the object in a BooleanExpression" do
    [nil, true, false].each do |o|
      @ds.literal(o.sql_expr).must_equal @ds.literal(o)
      @ds.literal(o.sql_expr & :a).must_equal "(#{@ds.literal(o)} AND a)"
    end
  end

  it "Proc#sql_expr should should treat the object as a virtual row block" do
    @ds.literal(proc{a}.sql_expr).must_equal "a"
    @ds.literal(proc{a(b)}.sql_expr).must_equal "a(b)"
  end

  it "Proc#sql_expr should should wrap the object in a GenericComplexExpression if the object is not already an expression" do
    @ds.literal(proc{1}.sql_expr).must_equal "1"
    @ds.literal(proc{1}.sql_expr + 2).must_equal "(1 + 2)"
  end

  it "Proc#sql_expr should should convert a hash or array of two element arrays to a BooleanExpression" do
    @ds.literal(proc{{a=>b}}.sql_expr).must_equal "(a = b)"
    @ds.literal(proc{[[a, b]]}.sql_expr & :a).must_equal "((a = b) AND a)"
  end
end
