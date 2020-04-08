require_relative "spec_helper"

describe Sequel::Model, "#(set|update)_except" do
  before do
    @c = Class.new(Sequel::Model(:items))
    @c.class_eval do
      plugin :blacklist_security
      set_primary_key :id
      columns :x, :y, :z, :id
      set_restricted_columns :y
    end
    @c.strict_param_setting = false
    @o1 = @c.new
    DB.reset
  end

  it "should raise errors if not all hash fields can be set and strict_param_setting is true" do
    @c.strict_param_setting = true
    proc{@c.new.set_except({:x => 1, :y => 2, :z=>3, :id=>4}, :x, :y)}.must_raise(Sequel::MassAssignmentRestriction)
    proc{@c.new.set_except({:x => 1, :y => 2, :z=>3}, :x, :y)}.must_raise(Sequel::MassAssignmentRestriction)
    (o = @c.new).set_except({:z => 3}, :x, :y)
    o.values.must_equal(:z=>3)
  end

  it "#set_except should not set given attributes or the primary key" do
    @o1.set_except({:x => 1, :y => 2, :z=>3, :id=>4}, [:y, :z])
    @o1.values.must_equal(:x => 1)
    @o1.set_except({:x => 4, :y => 2, :z=>3, :id=>4}, :y, :z)
    @o1.values.must_equal(:x => 4)
  end

  it "#update_except should not update given attributes" do
    @o1.update_except({:x => 1, :y => 2, :z=>3, :id=>4}, [:y, :z])
    DB.sqls.must_equal ["INSERT INTO items (x) VALUES (1)", "SELECT * FROM items WHERE id = 10"]
    @c.new.update_except({:x => 1, :y => 2, :z=>3, :id=>4}, :y, :z)
    DB.sqls.must_equal ["INSERT INTO items (x) VALUES (1)", "SELECT * FROM items WHERE id = 10"]
  end
end

describe Sequel::Model, ".restricted_columns " do
  before do
    @c = Class.new(Sequel::Model(:blahblah))
    @c.class_eval do
      plugin :blacklist_security
      columns :x, :y, :z
    end
    @c.strict_param_setting = false
    @c.instance_variable_set(:@columns, [:x, :y, :z])
    DB.sqls
  end
  
  it "should set the restricted columns correctly" do
    @c.restricted_columns.must_be_nil
    @c.set_restricted_columns :x
    @c.restricted_columns.must_equal [:x]
    @c.set_restricted_columns :x, :y
    @c.restricted_columns.must_equal [:x, :y]
  end

  it "should not set restricted columns by default" do
    @c.set_restricted_columns :z
    i = @c.new(:x => 1, :y => 2, :z => 3)
    i.values.must_equal(:x => 1, :y => 2)
    i.set(:x => 4, :y => 5, :z => 6)
    i.values.must_equal(:x => 4, :y => 5)

    @c.dataset = @c.dataset.with_fetch(:x => 7)
    i = @c.new
    i.update(:x => 7, :z => 9)
    i.values.must_equal(:x => 7)
    DB.sqls.must_equal ["INSERT INTO blahblah (x) VALUES (7)", "SELECT * FROM blahblah WHERE id = 10"]
  end

  it "should have allowed take precedence over restricted" do
    @c.plugin :whitelist_security
    @c.set_allowed_columns :x, :y
    @c.set_restricted_columns :y, :z
    i = @c.new(:x => 1, :y => 2, :z => 3)
    i.values.must_equal(:x => 1, :y => 2)
    i.set(:x => 4, :y => 5, :z => 6)
    i.values.must_equal(:x => 4, :y => 5)

    @c.dataset = @c.dataset.with_fetch(:y => 7)
    i = @c.new
    i.update(:y => 7, :z => 9)
    i.values.must_equal(:y => 7)
    DB.sqls.must_equal ["INSERT INTO blahblah (y) VALUES (7)", "SELECT * FROM blahblah WHERE id = 10"]
  end

  it "should freeze restricted_columns when freezing class" do
    @c.set_restricted_columns :z
    @c.freeze
    @c.restricted_columns.frozen?.must_equal true
  end
end
