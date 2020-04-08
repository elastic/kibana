require_relative "spec_helper"

describe "Sequel::Plugins::Timestamps" do
  before do
    dc = Object.new
    dc.instance_eval do
      def now
        '2009-08-01'
      end
    end
    Sequel.datetime_class = dc
    @c = Class.new(Sequel::Model(:t))
    @c.class_eval do
      columns :id, :created_at, :updated_at
      plugin :timestamps
      def _save_refresh(*) end
      db.reset
    end
  end 
  after do
    Sequel.datetime_class = Time
  end
  
  it "should handle validations on the timestamp fields for new objects" do
    @c.plugin :timestamps, :update_on_create=>true
    o = @c.new
    def o.validate
      errors.add(model.create_timestamp_field, 'not present') unless send(model.create_timestamp_field)
      errors.add(model.update_timestamp_field, 'not present') unless send(model.update_timestamp_field)
    end
    o.valid?.must_equal true
  end

  it "should set timestamp fields when skipping validations" do
    @c.plugin :timestamps
    @c.new.save(:validate=>false)
    @c.db.sqls.must_equal ["INSERT INTO t (created_at) VALUES ('2009-08-01')"]
  end

  it "should set the create timestamp field on creation" do
    o = @c.create
    @c.db.sqls.must_equal ["INSERT INTO t (created_at) VALUES ('2009-08-01')"]
    o.created_at.must_equal '2009-08-01'
  end

  it "should set the update timestamp field on update" do
    o = @c.load(:id=>1).save
    @c.db.sqls.must_equal ["UPDATE t SET updated_at = '2009-08-01' WHERE (id = 1)"]
    o.updated_at.must_equal '2009-08-01'
  end

  it "should leave manually set update timestamp, if :allow_manual_update was given" do
    o = @c.load(:id=>1).update(:updated_at=>Date.new(2016))
    @c.db.sqls.must_equal ["UPDATE t SET updated_at = '2009-08-01' WHERE (id = 1)"]
    o.updated_at.must_equal '2009-08-01'

    @c.plugin :timestamps, :allow_manual_update=>true
    o = @c.load(:id=>1).update(:updated_at=>Date.new(2016))
    @c.db.sqls.must_equal ["UPDATE t SET updated_at = '2016-01-01' WHERE (id = 1)"]
    o.updated_at.must_equal Date.new(2016)
  end

  it "should work with current_datetime_timestamp extension" do
    Sequel.datetime_class = Time
    @c.dataset = @c.dataset.extension(:current_datetime_timestamp)
    @c.create
    @c.db.sqls.must_equal ["INSERT INTO t (created_at) VALUES (CURRENT_TIMESTAMP)"]
    @c.load(:id=>1).save
    @c.db.sqls.must_equal ["UPDATE t SET updated_at = CURRENT_TIMESTAMP WHERE (id = 1)"]
  end

  it "should not update the update timestamp on creation" do
    @c.create.updated_at.must_be_nil
  end

  it "should use the same value for the creation and update timestamps when creating if the :update_on_create option is given" do
    @c.plugin :timestamps, :update_on_create=>true
    o = @c.create
    @c.db.sqls.must_equal ["INSERT INTO t (created_at, updated_at) VALUES ('2009-08-01', '2009-08-01')"]
    o.created_at.must_be :===, o.updated_at
  end

  it "should allow specifying the create timestamp field via the :create option" do
    c = Class.new(Sequel::Model(:t))
    c.class_eval do
      columns :id, :c
      plugin :timestamps, :create=>:c
      def _save_refresh(*) end
    end
    o = c.create
    c.db.sqls.must_equal ["INSERT INTO t (c) VALUES ('2009-08-01')"]
    o.c.must_equal '2009-08-01'
  end

  it "should allow specifying the update timestamp field via the :update option" do
    c = Class.new(Sequel::Model(:t))
    c.class_eval do
      columns :id, :u
      plugin :timestamps, :update=>:u
      db.reset
    end
    o = c.load(:id=>1).save
    c.db.sqls.must_equal ["UPDATE t SET u = '2009-08-01' WHERE (id = 1)"]
    o.u.must_equal '2009-08-01'
  end

  it "should not raise an error if the model doesn't have the timestamp columns" do
    c = Class.new(Sequel::Model(:t))
    c.class_eval do
      columns :id, :x
      plugin :timestamps
      db.reset
      def _save_refresh; self end
    end
    c.create(:x=>2)
    c.load(:id=>1, :x=>2).save
    c.db.sqls.must_equal ["INSERT INTO t (x) VALUES (2)", "UPDATE t SET x = 2 WHERE (id = 1)"] 
  end

  it "should not overwrite an existing create timestamp" do
    o = @c.create(:created_at=>'2009-08-03')
    @c.db.sqls.must_equal ["INSERT INTO t (created_at) VALUES ('2009-08-03')"]
    o.created_at.must_equal '2009-08-03'
  end

  it "should overwrite an existing create timestamp if the :force option is used" do
    @c.plugin :timestamps, :force=>true
    o = @c.create(:created_at=>'2009-08-03')
    @c.db.sqls.must_equal ["INSERT INTO t (created_at) VALUES ('2009-08-01')"]
    o.created_at.must_equal '2009-08-01'
  end

  it "should set update timestamp to same timestamp as create timestamp when setting creating timestamp" do
    i = 1
    Sequel.datetime_class.define_singleton_method(:now){"2009-08-0#{i+=1}"}
    @c.plugin :timestamps, :update_on_create=>true
    o = @c.create
    sqls = @c.db.sqls
    sqls.length.must_equal 1
    ["INSERT INTO t (created_at, updated_at) VALUES ('2009-08-02', '2009-08-02')",
     "INSERT INTO t (updated_at, created_at) VALUES ('2009-08-02', '2009-08-02')"].must_include sqls.first
    o.created_at.must_equal '2009-08-02'
    o.updated_at.must_equal '2009-08-02'
  end

  it "should set update timestamp when using not overriding create timestamp" do
    i = 1
    Sequel.datetime_class.define_singleton_method(:now){"2009-08-0#{i+=1}"}
    @c.plugin :timestamps, :update_on_create=>true
    o = @c.create(:created_at=>'2009-08-10')
    sqls = @c.db.sqls
    sqls.length.must_equal 1
    ["INSERT INTO t (created_at, updated_at) VALUES ('2009-08-10', '2009-08-02')",
     "INSERT INTO t (updated_at, created_at) VALUES ('2009-08-02', '2009-08-10')"].must_include sqls.first
    o.created_at.must_equal '2009-08-10'
    o.updated_at.must_equal '2009-08-02'
  end

  it "should have create_timestamp_field give the create timestamp field" do
    @c.create_timestamp_field.must_equal :created_at
    @c.plugin :timestamps, :create=>:c
    @c.create_timestamp_field.must_equal :c
  end

  it "should have update_timestamp_field give the update timestamp field" do
    @c.update_timestamp_field.must_equal :updated_at
    @c.plugin :timestamps, :update=>:u
    @c.update_timestamp_field.must_equal :u
  end

  it "should have create_timestamp_overwrite? give the whether to overwrite an existing create timestamp" do
    @c.create_timestamp_overwrite?.must_equal false
    @c.plugin :timestamps, :force=>true
    @c.create_timestamp_overwrite?.must_equal true
  end

  it "should have set_update_timestamp_on_create? give whether to set the update timestamp on create" do
    @c.set_update_timestamp_on_create?.must_equal false
    @c.plugin :timestamps, :update_on_create=>true
    @c.set_update_timestamp_on_create?.must_equal true
  end

  it "should work with subclasses" do
    c = Class.new(@c)
    o = c.create
    o.created_at.must_equal '2009-08-01'
    o.updated_at.must_be_nil
    o = c.load(:id=>1).save
    o.updated_at.must_equal '2009-08-01'
    c.db.sqls.must_equal ["INSERT INTO t (created_at) VALUES ('2009-08-01')", "UPDATE t SET updated_at = '2009-08-01' WHERE (id = 1)"]
    c.create(:created_at=>'2009-08-03').created_at.must_equal '2009-08-03'

    c.class_eval do
      columns :id, :c, :u
      plugin :timestamps, :create=>:c, :update=>:u, :force=>true, :update_on_create=>true
    end
    c2 = Class.new(c)
    c2.db.reset
    o = c2.create
    o.c.must_equal '2009-08-01'
    o.u.must_be :===, o.c 
    c2.db.sqls.must_equal ["INSERT INTO t (c, u) VALUES ('2009-08-01', '2009-08-01')"]
    c2.db.reset
    o = c2.load(:id=>1).save
    o.u.must_equal '2009-08-01'
    c2.db.sqls.must_equal ["UPDATE t SET u = '2009-08-01' WHERE (id = 1)"]
    c2.create(:c=>'2009-08-03').c.must_equal '2009-08-01'
  end
end
