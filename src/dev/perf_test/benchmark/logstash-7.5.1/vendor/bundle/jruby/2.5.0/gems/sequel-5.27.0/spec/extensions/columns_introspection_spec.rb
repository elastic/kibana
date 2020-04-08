require_relative "spec_helper"

Sequel.extension :columns_introspection

describe "columns_introspection extension" do
  before do
    @db = Sequel.mock.extension(:columns_introspection)
    @ds = @db[:a]
    @db.sqls
  end

  it "should not issue a database query if the columns are already loaded" do
    @ds.send(:columns=, [:x])
    @ds.columns.must_equal [:x]
    @db.sqls.length.must_equal 0
  end
  
  it "should handle plain symbols without a database query" do
    @ds.select(:x).columns.must_equal [:x]
    @db.sqls.length.must_equal 0
  end

  with_symbol_splitting "should handle qualified symbols without a database query" do
    @ds.select(:t__x).columns.must_equal [:x]
    @db.sqls.length.must_equal 0
  end

  with_symbol_splitting "should handle aliased symbols without a database query" do
    @ds.select(:x___a).columns.must_equal [:a]
    @db.sqls.length.must_equal 0
  end

  with_symbol_splitting "should handle qualified and aliased symbols without a database query" do
    @ds.select(:t__x___a).columns.must_equal [:a]
    @db.sqls.length.must_equal 0
  end

  it "should handle SQL::Identifiers " do
    @ds.select(Sequel.identifier(:x)).columns.must_equal [:x]
    @db.sqls.length.must_equal 0
  end

  it "should handle SQL::QualifiedIdentifiers" do
    @ds.select(Sequel.qualify(:t, :x)).columns.must_equal [:x]
    @ds.select(Sequel.identifier(:x).qualify(:t)).columns.must_equal [:x]
    @db.sqls.length.must_equal 0
  end

  it "should handle SQL::AliasedExpressions" do
    @ds.select(Sequel.as(:x, :a)).columns.must_equal [:a]
    @ds.select(Sequel.as(:x, Sequel.identifier(:a))).columns.must_equal [:a]
    @db.sqls.length.must_equal 0
  end

  it "should handle selecting * from a single subselect with no joins without a database query if the subselect's columns can be handled" do
    @ds.select(:x).from_self.columns.must_equal [:x]
    @db.sqls.length.must_equal 0
    @ds.select(:x).from_self.from_self.columns.must_equal [:x]
    @db.sqls.length.must_equal 0
  end

  it "should handle selecting * from a single table with no joins without a database query if the database has cached schema columns for the table" do
    @db.instance_variable_set(:@schemas, "a"=>[[:x, {}]])
    @ds.columns.must_equal [:x]
    @db.sqls.length.must_equal 0
  end

  it "should issue a database query for multiple subselects or joins" do
    @ds.from(@ds.select(:x), @ds.select(:y)).columns
    @db.sqls.length.must_equal 1
    @ds.select(:x).from_self.natural_join(:a).columns
    @db.sqls.length.must_equal 1
  end

  it "should issue a database query when common table expressions are used" do
    @db.instance_variable_set(:@schemas, "a"=>[[:x, {}]])
    @ds.with_extend{def supports_cte?(*) true end}.with(:a, @ds).columns
    @db.sqls.length.must_equal 1
  end

  it "should issue a database query if the wildcard is selected" do
    @ds.columns
    @db.sqls.length.must_equal 1
  end

  it "should issue a database query if an unsupported type is used" do
    @ds.select(1).columns
    @db.sqls.length.must_equal 1
  end
end
