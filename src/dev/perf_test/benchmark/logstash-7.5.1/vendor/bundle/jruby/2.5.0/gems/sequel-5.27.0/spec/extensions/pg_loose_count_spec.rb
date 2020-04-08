require_relative "spec_helper"

describe "pg_loose_count extension" do
  before do
    @db = Sequel.mock(:host=>'postgres', :fetch=>{:v=>1}).extension(:pg_loose_count)
    @db.extend_datasets{def quote_identifiers?; false end}
  end

  it "should add loose_count method getting fast count for entire table using table statistics" do
    @db.loose_count(:a).must_equal 1
    @db.sqls.must_equal ["SELECT CAST(reltuples AS integer) AS v FROM pg_class WHERE (oid = CAST(CAST('a' AS regclass) AS oid)) LIMIT 1"]
  end

  it "should support schema qualified tables" do
    @db.loose_count(Sequel[:a][:b]).must_equal 1
    @db.sqls.must_equal ["SELECT CAST(reltuples AS integer) AS v FROM pg_class WHERE (oid = CAST(CAST('a.b' AS regclass) AS oid)) LIMIT 1"]
  end

  with_symbol_splitting "should support schema qualified table symbols" do
    @db.loose_count(:a__b).must_equal 1
    @db.sqls.must_equal ["SELECT CAST(reltuples AS integer) AS v FROM pg_class WHERE (oid = CAST(CAST('a.b' AS regclass) AS oid)) LIMIT 1"]
  end
end
