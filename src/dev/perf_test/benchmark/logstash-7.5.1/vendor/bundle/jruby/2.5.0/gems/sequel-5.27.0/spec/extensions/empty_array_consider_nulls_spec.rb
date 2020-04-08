require_relative "spec_helper"

describe "filter_having extension" do
  before do
    @dataset = Sequel.mock[:test].extension(:empty_array_consider_nulls)
  end

  it "should handle all types of IN/NOT IN queries with empty arrays" do
    @dataset.filter(:id => []).sql.must_equal "SELECT * FROM test WHERE (id != id)"
    @dataset.filter([:id1, :id2] => []).sql.must_equal "SELECT * FROM test WHERE ((id1 != id1) AND (id2 != id2))"
    @dataset.exclude(:id => []).sql.must_equal "SELECT * FROM test WHERE (id = id)"
    @dataset.exclude([:id1, :id2] => []).sql.must_equal "SELECT * FROM test WHERE ((id1 = id1) AND (id2 = id2))"
  end

  it "should handle IN/NOT IN queries with multiple columns and an empty dataset where the database doesn't support it" do
    db = Sequel.mock
    d1 = db[:test].select(:id1, :id2).filter(:region=>'Asia').columns(:id1, :id2)
    @dataset = @dataset.with_extend{def supports_multiple_column_in?; false end}
    @dataset.filter([:id1, :id2] => d1).sql.must_equal "SELECT * FROM test WHERE ((id1 != id1) AND (id2 != id2))"
    db.sqls.must_equal ["SELECT id1, id2 FROM test WHERE (region = 'Asia')"]
    @dataset.exclude([:id1, :id2] => d1).sql.must_equal "SELECT * FROM test WHERE ((id1 = id1) AND (id2 = id2))"
    db.sqls.must_equal ["SELECT id1, id2 FROM test WHERE (region = 'Asia')"]
  end
end
