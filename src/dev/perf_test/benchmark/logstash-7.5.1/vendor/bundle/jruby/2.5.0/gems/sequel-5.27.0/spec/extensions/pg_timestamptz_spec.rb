require_relative "spec_helper"

describe "pg_timestamptz extension" do
  before do
    @db = Sequel.mock(:host=>'postgres').extension :pg_timestamptz
  end

  it "should use timestamptz as default timestamp type" do
    @db.create_table(:t){Time :t; DateTime :tz; Time :ot, :only_time=>true}
    @db.sqls.must_equal ['CREATE TABLE "t" ("t" timestamptz, "tz" timestamptz, "ot" time)']
  end

  it "should use timestamptz when casting" do
    @db.get(Sequel.cast('a', Time))
    @db.sqls.must_equal ["SELECT CAST('a' AS timestamptz) AS \"v\" LIMIT 1"]
  end
end
