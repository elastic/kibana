require_relative "spec_helper"

describe "insert_conflict plugin" do
  def model_class(adapter)
    db = Sequel.mock(:host=>adapter, :fetch=>{:id=>1, :s=>2}, :autoid=>1)
    db.extend_datasets{def quote_identifiers?; false end}
    model = Class.new(Sequel::Model)
    model.dataset = db[:t]
    model.columns :id, :s, :o
    model.plugin :insert_conflict
    db.sqls
    model
  end

  def model_class_plugin_first(adapter)
    model = Class.new(Sequel::Model)
    model.plugin :insert_conflict
    model = Class.new(model)
    db = Sequel.mock(:host=>adapter, :fetch=>{:id=>1, :s=>2}, :autoid=>1)
    db.extend_datasets{def quote_identifiers?; false end}
    model.dataset = db[:t]
    model.columns :id, :s, :o
    db.sqls
    model
  end

  it "should use INSERT ON CONFLICT when inserting on PostgreSQL" do
    model = model_class(:postgres)
    model.new(:s=>'A', :o=>1).insert_conflict.save
    model.db.sqls.must_equal ["INSERT INTO t (s, o) VALUES ('A', 1) ON CONFLICT DO NOTHING RETURNING *"]

    model.new(:s=>'A', :o=>1).insert_conflict(:target=>:s, :update => {:o => Sequel[:excluded][:o]}).save
    model.db.sqls.must_equal ["INSERT INTO t (s, o) VALUES ('A', 1) ON CONFLICT (s) DO UPDATE SET o = excluded.o RETURNING *"]
  end

  it "should use INSERT ON CONFLICT when inserting on SQLITE" do
    model = model_class(:sqlite)
    model.new(:s=>'A', :o=>1).insert_conflict.save
    model.db.sqls.must_equal ["INSERT INTO t (s, o) VALUES ('A', 1) ON CONFLICT DO NOTHING",
      "SELECT * FROM t WHERE (id = 1) LIMIT 1"]

    model.new(:s=>'A', :o=>1).insert_conflict(:target=>:s, :update => {:o => Sequel[:excluded][:o]}).save
    model.db.sqls.must_equal ["INSERT INTO t (s, o) VALUES ('A', 1) ON CONFLICT (s) DO UPDATE SET o = excluded.o",
      "SELECT * FROM t WHERE (id = 2) LIMIT 1"]
  end

  it "should raise Error if calling insert_conflict on a model instance that isn't new" do
    m = model_class(:postgres).load(:s=>'A', :o=>1)
    proc{m.insert_conflict}.must_raise Sequel::Error
  end

  it "should raise if loading plugin into a model class with a dataset that doesn't support insert_conflict" do
    model = Class.new(Sequel::Model)
    model.dataset = Sequel.mock[:t]
    proc{model.plugin :insert_conflict}.must_raise Sequel::Error
  end

  it "should work if loading into a model class without a dataset on PostgreSQL" do
    model = model_class_plugin_first(:postgres)
    model.new(:s=>'A', :o=>1).insert_conflict.save
    model.db.sqls.must_equal ["INSERT INTO t (s, o) VALUES ('A', 1) ON CONFLICT DO NOTHING RETURNING *"]

    model.new(:s=>'A', :o=>1).insert_conflict(:target=>:s, :update => {:o => Sequel[:excluded][:o]}).save
    model.db.sqls.must_equal ["INSERT INTO t (s, o) VALUES ('A', 1) ON CONFLICT (s) DO UPDATE SET o = excluded.o RETURNING *"]
  end

  it "should work if loading into a model class without a dataset on SQLITE" do
    model = model_class_plugin_first(:sqlite)
    model.new(:s=>'A', :o=>1).insert_conflict.save
    model.db.sqls.must_equal ["INSERT INTO t (s, o) VALUES ('A', 1) ON CONFLICT DO NOTHING",
      "SELECT * FROM t WHERE (id = 1) LIMIT 1"]

    model.new(:s=>'A', :o=>1).insert_conflict(:target=>:s, :update => {:o => Sequel[:excluded][:o]}).save
    model.db.sqls.must_equal ["INSERT INTO t (s, o) VALUES ('A', 1) ON CONFLICT (s) DO UPDATE SET o = excluded.o",
      "SELECT * FROM t WHERE (id = 2) LIMIT 1"]
  end

  it "should work if the prepared_statements plugin is loaded before" do
    db = Sequel.mock(:host=>'sqlite', :fetch=>{:id=>1, :s=>2}, :autoid=>1, :numrows=>1)
    db.extend_datasets{def quote_identifiers?; false end}
    model = Class.new(Sequel::Model)
    model.dataset = db[:t]
    model.columns :id, :s
    model.plugin :prepared_statements
    model.plugin :insert_conflict
    db.sqls
    model.create(:s=>'a').update(:s=>'b')
    db.sqls.must_equal ["INSERT INTO t (s) VALUES ('a')", "SELECT * FROM t WHERE (id = 1) LIMIT 1", "UPDATE t SET s = 'b' WHERE (id = 1)"]
  end

  it "should work if the prepared_statements plugin is loaded after" do
    db = Sequel.mock(:host=>'postgres', :fetch=>{:id=>1, :s=>2}, :autoid=>1, :numrows=>1)
    db.extend_datasets{def quote_identifiers?; false end}
    model = Class.new(Sequel::Model)
    model.dataset = db[:t]
    model.columns :id, :s
    model.plugin :insert_conflict
    model.plugin :prepared_statements
    db.sqls
    model.create(:s=>'a').update(:s=>'b')
    db.sqls.must_equal ["INSERT INTO t (s) VALUES ('a') RETURNING *", "UPDATE t SET s = 'b' WHERE (id = 1)"]
  end
end
