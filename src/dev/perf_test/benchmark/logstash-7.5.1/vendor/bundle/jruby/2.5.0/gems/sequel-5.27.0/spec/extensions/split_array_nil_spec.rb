require_relative "spec_helper"

describe "split_array_nil extension" do
  before do
    @ds = Sequel.mock[:table].extension(:split_array_nil)
  end

  it "should split IN with nil in array into separate OR IS NULL clause" do
    @ds.filter(:a=>[1, nil]).sql.must_equal "SELECT * FROM table WHERE ((a IN (1)) OR (a IS NULL))"
  end

  it "should split NOT IN with nil in array into separate AND IS NOT NULL clause" do
    @ds.exclude(:a=>[1, nil]).sql.must_equal "SELECT * FROM table WHERE ((a NOT IN (1)) AND (a IS NOT NULL))"
  end

  it "should not affect other IN/NOT in clauses" do
    @ds.filter(:a=>[1, 2]).sql.must_equal "SELECT * FROM table WHERE (a IN (1, 2))"
    @ds.exclude(:a=>[1, 2]).sql.must_equal "SELECT * FROM table WHERE (a NOT IN (1, 2))"
  end

  it "should not affect other types of filters clauses" do
    @ds.filter(:a=>1).sql.must_equal "SELECT * FROM table WHERE (a = 1)"
  end
end
