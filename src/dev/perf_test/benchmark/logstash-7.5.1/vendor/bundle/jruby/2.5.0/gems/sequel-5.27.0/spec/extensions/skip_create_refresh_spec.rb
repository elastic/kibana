require_relative "spec_helper"

describe "Sequel::Plugins::SkipCreateRefresh" do
  it "should skip the refresh after saving a new object" do
    c = Class.new(Sequel::Model(:a))
    c.columns :id, :x
    c.dataset = c.dataset.with_autoid(2)
    c.db.reset
    c.create(:x=>1)
    c.db.sqls.must_equal ['INSERT INTO a (x) VALUES (1)', 'SELECT * FROM a WHERE id = 2']

    c.dataset = c.dataset.with_autoid(2)
    c.plugin :skip_create_refresh
    c.db.reset
    c.create(:x=>3).values.must_equal(:id=>2, :x=>3)
    c.db.sqls.must_equal ['INSERT INTO a (x) VALUES (3)']
  end
end
