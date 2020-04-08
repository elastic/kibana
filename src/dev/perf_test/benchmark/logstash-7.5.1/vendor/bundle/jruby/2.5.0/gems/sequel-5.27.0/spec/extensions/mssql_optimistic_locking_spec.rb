require_relative "spec_helper"

describe "MSSSQL optimistic locking plugin" do
  before do
    @db = Sequel.mock(:host=>'mssql')
    @ds = @db[:items].with_quote_identifiers(false).with_extend{def input_identifier(v); v.to_s end}
    @c = Class.new(Sequel::Model(@ds))
    @c.columns :id, :name, :timestamp
    @c.plugin :mssql_optimistic_locking
    @o = @c.load(:id=>1, :name=>'a', :timestamp=>'1234')
    @db.sqls
  end

  it "should not include the lock column when updating" do
    @db.fetch = [[{:timestamp=>'2345'}]]
    @o.save
    @db.sqls.must_equal ["UPDATE TOP (1) items SET name = 'a' OUTPUT inserted.timestamp WHERE ((id = 1) AND (timestamp = 0x31323334))"]
  end

  it "should automatically update lock column using new value from database" do
    @db.fetch = [[{:timestamp=>'2345'}]]
    @o.save
    @o.timestamp.must_equal '2345'
  end

  it "should raise error when updating stale object" do
    @db.fetch = []
    @o.timestamp = '2345'
    proc{@o.save}.must_raise(Sequel::NoExistingObject)
    @o.timestamp.must_equal '2345'
    @db.sqls.must_equal ["UPDATE TOP (1) items SET name = 'a' OUTPUT inserted.timestamp WHERE ((id = 1) AND (timestamp = 0x32333435))"]
  end

  it "should raise error when destroying stale object" do
    @db.numrows = 0
    @o.timestamp = '2345'
    proc{@o.destroy}.must_raise(Sequel::NoExistingObject)
    @db.sqls.must_equal ["DELETE TOP (1) FROM items WHERE ((id = 1) AND (timestamp = 0x32333435))"]
  end

  it "should allow refresh after failed save" do
    @db.fetch = []
    @o.timestamp = '2345'
    proc{@o.save}.must_raise(Sequel::NoExistingObject)
    @db.fetch = {:id=>1, :name=>'a', :timestamp=>'2345'}
    @o.refresh
    @db.sqls
    @o.save
    @db.sqls.must_equal ["UPDATE TOP (1) items SET name = 'a' OUTPUT inserted.timestamp WHERE ((id = 1) AND (timestamp = 0x32333435))"]
  end

  it "should allow changing the lock column via model.lock_column=" do
    @c = Class.new(Sequel::Model(@ds))
    @c.columns :id, :name, :lv
    @c.plugin :mssql_optimistic_locking
    @c.lock_column = :lv
    @o = @c.load(:id=>1, :name=>'a', :lv=>'1234')
    @db.sqls
    @db.fetch = []
    proc{@o.save}.must_raise(Sequel::NoExistingObject)
    @o.lv.must_equal '1234'
    @db.sqls.must_equal ["UPDATE TOP (1) items SET name = 'a' OUTPUT inserted.lv WHERE ((id = 1) AND (lv = 0x31323334))"]
    @o = @c.load(:id=>1, :name=>'a', :lv=>'1234')
    @db.fetch = {:lv=>'2345'}
    @o.save
    @o.lv.must_equal '2345'
  end

  it "should allow changing the lock column via plugin option" do
    @c = Class.new(Sequel::Model(@ds))
    @c.columns :id, :name, :lv
    @c.plugin :mssql_optimistic_locking, :lock_column=>:lv
    @o = @c.load(:id=>1, :name=>'a', :lv=>'1234')
    @db.sqls
    @db.fetch = []
    proc{@o.save}.must_raise(Sequel::NoExistingObject)
    @o.lv.must_equal '1234'
    @db.sqls.must_equal ["UPDATE TOP (1) items SET name = 'a' OUTPUT inserted.lv WHERE ((id = 1) AND (lv = 0x31323334))"]
    @o = @c.load(:id=>1, :name=>'a', :lv=>'1234')
    @db.fetch = {:lv=>'2345'}
    @o.save
    @o.lv.must_equal '2345'
  end

  it "should work when subclassing" do
    c = Class.new(@c)
    o = c.load(:id=>1, :name=>'a', :timestamp=>'1234')
    @db.fetch = [[{:timestamp=>'2345'}]]
    o.save
    @db.sqls.must_equal ["UPDATE TOP (1) items SET name = 'a' OUTPUT inserted.timestamp WHERE ((id = 1) AND (timestamp = 0x31323334))"]
  end
end
