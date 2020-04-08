require_relative "spec_helper"

describe "Sequel::Plugins::UnlimitedUpdate" do
  before do
    @db = Sequel.mock(:host=>'mysql', :numrows=>1)
    @db.extend_datasets{def quote_identifiers?; false end}
    @c = Class.new(Sequel::Model(@db[:test]))
    @c.columns :id, :name
    @o = @c.load(:id=>1, :name=>'a')
    @db.sqls
  end

  it "should remove limit from update dataset" do
    @o.save
    @db.sqls.must_equal ["UPDATE test SET name = 'a' WHERE (id = 1) LIMIT 1"]

    @c.plugin :unlimited_update
    @o.save
    @db.sqls.must_equal ["UPDATE test SET name = 'a' WHERE (id = 1)"]
  end
end
