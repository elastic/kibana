require_relative "spec_helper"

describe Sequel::Model, "#(set|update)_(all|only)" do
  before do
    @c = Class.new(Sequel::Model(:items)) do
      set_primary_key :id
      columns :x, :y, :z, :id
    end
    @c.plugin :whitelist_security
    @c.set_allowed_columns :x
    @c.strict_param_setting = false
    @o1 = @c.new
    DB.reset
  end

  it "should raise errors if not all hash fields can be set and strict_param_setting is true" do
    @c.strict_param_setting = true

    proc{@c.new.set_all(:x => 1, :y => 2, :z=>3, :use_transactions => false)}.must_raise(Sequel::MassAssignmentRestriction)
    (o = @c.new).set_all(:x => 1, :y => 2, :z=>3)
    o.values.must_equal(:x => 1, :y => 2, :z=>3)

    proc{@c.new.set_only({:x => 1, :y => 2, :z=>3, :id=>4}, :x, :y)}.must_raise(Sequel::MassAssignmentRestriction)
    proc{@c.new.set_only({:x => 1, :y => 2, :z=>3}, :x, :y)}.must_raise(Sequel::MassAssignmentRestriction)
    (o = @c.new).set_only({:x => 1, :y => 2}, :x, :y)
    o.values.must_equal(:x => 1, :y => 2)
  end

  it "#set_all should set all attributes including the primary key" do
    @o1.set_all(:x => 1, :y => 2, :z=>3, :id=>4)
    @o1.values.must_equal(:id =>4, :x => 1, :y => 2, :z=>3)
  end

  it "#set_all should set not set restricted fields" do
    @o1.use_transactions.must_equal false 
    @o1.set_all(:x => 1, :use_transactions => true)
    @o1.use_transactions.must_equal false
    @o1.values.must_equal(:x => 1)
  end

  it "#set_only should only set given attributes" do
    @o1.set_only({:x => 1, :y => 2, :z=>3, :id=>4}, [:x, :y])
    @o1.values.must_equal(:x => 1, :y => 2)
    @o1.set_only({:x => 4, :y => 5, :z=>6, :id=>7}, :x, :y)
    @o1.values.must_equal(:x => 4, :y => 5)
    @o1.set_only({:x => 9, :y => 8, :z=>6, :id=>7}, :x, :y, :id)
    @o1.values.must_equal(:x => 9, :y => 8, :id=>7)
  end

  it "#update_all should update all attributes" do
    @c.new.update_all(:x => 1)
    DB.sqls.must_equal ["INSERT INTO items (x) VALUES (1)", "SELECT * FROM items WHERE id = 10"]
    @c.new.update_all(:y => 1)
    DB.sqls.must_equal ["INSERT INTO items (y) VALUES (1)", "SELECT * FROM items WHERE id = 10"]
    @c.new.update_all(:z => 1)
    DB.sqls.must_equal ["INSERT INTO items (z) VALUES (1)", "SELECT * FROM items WHERE id = 10"]
  end

  it "#update_only should only update given attributes" do
    @o1.update_only({:x => 1, :y => 2, :z=>3, :id=>4}, [:x])
    DB.sqls.must_equal ["INSERT INTO items (x) VALUES (1)", "SELECT * FROM items WHERE id = 10"]
    @c.new.update_only({:x => 1, :y => 2, :z=>3, :id=>4}, :x)
    DB.sqls.must_equal ["INSERT INTO items (x) VALUES (1)", "SELECT * FROM items WHERE id = 10"]
  end
end

describe Sequel::Model, "#(set|update)_(all|only) without set_allowed_columns" do
  before do
    @c = Class.new(Sequel::Model(:items)) do
      set_primary_key :id
      columns :x, :y, :z, :id
    end
    @c.plugin :whitelist_security
    @c.strict_param_setting = false
    @o1 = @c.new
    DB.reset
  end
end

describe Sequel::Model, ".strict_param_setting" do
  before do
    @c = Class.new(Sequel::Model(:blahblah)) do
      columns :x, :y, :z, :id
    end
    @c.plugin :whitelist_security
    @c.set_allowed_columns :x, :y
  end

  it "should raise an error if a missing/restricted column/method is accessed" do
    proc{@c.new(:z=>1)}.must_raise(Sequel::MassAssignmentRestriction)
    proc{@c.create(:z=>1)}.must_raise(Sequel::MassAssignmentRestriction)
    c = @c.new
    proc{c.set(:z=>1)}.must_raise(Sequel::MassAssignmentRestriction)
    proc{c.update(:z=>1)}.must_raise(Sequel::MassAssignmentRestriction)
    proc{c.set_all(:use_after_commit_rollback => false)}.must_raise(Sequel::MassAssignmentRestriction)
    proc{c.set_only({:x=>1}, :y)}.must_raise(Sequel::MassAssignmentRestriction)
    proc{c.update_all(:use_after_commit_rollback=>false)}.must_raise(Sequel::MassAssignmentRestriction)
    proc{c.update_only({:x=>1}, :y)}.must_raise(Sequel::MassAssignmentRestriction)
  end
end

describe Sequel::Model, ".allowed_columns " do
  before do
    @c = Class.new(Sequel::Model(:blahblah)) do
      columns :x, :y, :z
    end
    @c.plugin :whitelist_security
    @c.strict_param_setting = false
    @c.instance_variable_set(:@columns, [:x, :y, :z])
    DB.reset
  end
  
  it "should set the allowed columns correctly" do
    @c.allowed_columns.must_be_nil
    @c.set_allowed_columns :x
    @c.allowed_columns.must_equal [:x]
    @c.set_allowed_columns :x, :y
    @c.allowed_columns.must_equal [:x, :y]
  end

  it "should not change behavior if allowed_columns are not set" do
    i = @c.new(:x => 1, :y => 2, :z => 3)
    i.values.must_equal(:x => 1, :y => 2, :z => 3)
    i.set(:x => 4, :y => 5, :z => 6)
    i.values.must_equal(:x => 4, :y => 5, :z => 6)

    @c.dataset = @c.dataset.with_fetch(:x => 7)
    i = @c.new
    i.update(:x => 7)
    i.values.must_equal(:x => 7)
    DB.sqls.must_equal ["INSERT INTO blahblah (x) VALUES (7)", "SELECT * FROM blahblah WHERE id = 10"]
  end

  it "should only set allowed columns by default" do
    @c.set_allowed_columns :x, :y
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
end

describe "Sequel::Model.freeze" do
  it "should freeze the model class and not allow any changes" do
    model = Class.new(Sequel::Model(:items))
    model.plugin :whitelist_security
    model.set_allowed_columns [:id]
    model.freeze
    model.allowed_columns.frozen?.must_equal true
  end
end
