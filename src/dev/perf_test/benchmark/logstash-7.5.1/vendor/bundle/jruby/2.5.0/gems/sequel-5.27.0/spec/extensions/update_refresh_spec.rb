require_relative "spec_helper"

describe "Sequel::Plugins::UpdateRefresh" do
  before do
    @db = Sequel.mock(:numrows=>1, :fetch=>{:id=>1, :name=>'b'})
    @c = Class.new(Sequel::Model(@db[:test]))
    @ds = @c.dataset
    @c.columns :id, :name
    @c.plugin :update_refresh
    @db.sqls
  end

  it "should refresh the instance after updating" do
    o = @c.load(:id=>1, :name=>'a')
    o.save
    @db.sqls.must_equal ["UPDATE test SET name = 'a' WHERE (id = 1)", "SELECT * FROM test WHERE (id = 1) LIMIT 1"]
    o.name.must_equal 'b'
  end

  it "should refresh the instance after updating" do
    @db.extend_datasets{def supports_returning?(x) true end; def update_sql(*); sql = super; update_returning_sql(sql); sql end}
    @c.dataset = @db[:test]
    @db.sqls
    o = @c.load(:id=>1, :name=>'a')
    o.save
    @db.sqls.must_equal ["UPDATE test SET name = 'a' WHERE (id = 1) RETURNING *"]
    o.name.must_equal 'b'
  end

  it "should support specifying columns to return" do
    @db.extend_datasets{def supports_returning?(x) true end; def update_sql(*); sql = super; update_returning_sql(sql); sql end}
    @c.plugin :update_refresh, :columns => [ :a ]
    @c.dataset = @db[:test]
    @db.sqls
    o = @c.load(:id=>1, :name=>'a')
    o.save
    @db.sqls.must_equal ["UPDATE test SET name = 'a' WHERE (id = 1) RETURNING a"]
    o.name.must_equal 'b'
  end

  it "should refresh the instance after updating when returning specific columns" do
    @db.extend_datasets{def supports_returning?(x) true end; def update_sql(*); sql = super; update_returning_sql(sql); sql end}
    @c.plugin :insert_returning_select
    @c.dataset = @db[:test].select(:id, :name)
    @db.sqls
    o = @c.load(:id=>1, :name=>'a')
    o.instance_variable_set(:@this, o.this.returning(:id, :name))
    o.save
    @db.sqls.must_equal ["UPDATE test SET name = 'a' WHERE (id = 1) RETURNING id, name"]
    o.name.must_equal 'b'
  end

  it "should freeze update refresh columns when freezing model class" do
    @db.extend_datasets{def supports_returning?(x) true end; def update_sql(*); sql = super; update_returning_sql(sql); sql end}
    @c.plugin :update_refresh, :columns => [ :a ]
    @c.freeze
    @c.update_refresh_columns.frozen?.must_equal true
  end
end
