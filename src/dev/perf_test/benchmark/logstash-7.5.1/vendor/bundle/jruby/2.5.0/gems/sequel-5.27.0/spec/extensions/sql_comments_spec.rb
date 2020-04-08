require_relative "spec_helper"

describe "sql_comments extension" do
  before do
    @ds = Sequel.mock[:t].extension(:sql_comments)
  end

  it "should not add a comment if one is not set for the dataset" do
    @ds.select_sql.must_equal 'SELECT * FROM t'
    @ds.insert_sql(:a=>1).must_equal 'INSERT INTO t (a) VALUES (1)'
    @ds.delete_sql.must_equal 'DELETE FROM t'
    @ds.update_sql(:a=>1).must_equal 'UPDATE t SET a = 1'
  end

  it "should add a comment if one is set for the dataset" do
    ds = @ds.comment("Some\nComment\r\n Here")
    ds.select_sql.must_equal "SELECT * FROM t -- Some Comment Here\n"
    ds.insert_sql(:a=>1).must_equal "INSERT INTO t (a) VALUES (1) -- Some Comment Here\n"
    ds.delete_sql.must_equal "DELETE FROM t -- Some Comment Here\n"
    ds.update_sql(:a=>1).must_equal "UPDATE t SET a = 1 -- Some Comment Here\n"
  end

  it "should handle comments used in nested datasets" do
    ds = @ds.comment("Some\nComment\r\n Here")
    ds.where(:id=>ds).select_sql.must_equal "SELECT * FROM t WHERE (id IN (SELECT * FROM t -- Some Comment Here\n)) -- Some Comment Here\n"
  end

  it "should handle frozen SQL strings" do
    @ds = Sequel.mock[:t].with_extend{def select_sql; super.freeze; end}.extension(:sql_comments)
    ds = @ds.comment("Some\nComment\r\n Here")
    ds.select_sql.must_equal "SELECT * FROM t -- Some Comment Here\n"
  end
end
