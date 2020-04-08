require_relative "spec_helper"

describe "integer64 extension" do
  before do
    @db = Sequel.mock.extension(:integer64)
  end

  it "should use bigint as default integer type" do
    @db.create_table(:t){Integer :a; column :b, Integer}
    @db.sqls.must_equal ['CREATE TABLE t (a bigint, b bigint)']
  end

  it "should use bigint as default type for primary_key and foreign_key" do
    @db.create_table(:t){primary_key :id; foreign_key :t_id, :t}
    @db.sqls.must_equal ['CREATE TABLE t (id bigint PRIMARY KEY AUTOINCREMENT, t_id bigint REFERENCES t)']
  end

  it "should use bigint when casting" do
    @db.get(Sequel.cast('a', Integer))
    @db.sqls.must_equal ["SELECT CAST('a' AS bigint) AS v LIMIT 1"]
  end
end
