require_relative "spec_helper"

describe "Sequel::Plugins::UpdatePrimaryKey" do
  before do
    @c = Class.new(Sequel::Model(:a))
    @c.plugin :update_primary_key
    @c.columns :a, :b
    def @c.set_dataset(*)
      super
      set_primary_key :a
    end
    @c.set_primary_key :a
    @c.unrestrict_primary_key
    @ds = @c.dataset
    DB.reset
  end

  it "should handle regular updates" do
    @c.dataset = @c.dataset.with_fetch([[{:a=>1, :b=>3}], [{:a=>1, :b=>4}], [{:a=>1, :b=>4}], [{:a=>1, :b=>5}], [{:a=>1, :b=>5}], [{:a=>1, :b=>6}], [{:a=>1, :b=>6}]])
    @c.first.update(:b=>4)
    @c.all.must_equal [@c.load(:a=>1, :b=>4)]
    DB.sqls.must_equal ["SELECT * FROM a LIMIT 1", "UPDATE a SET b = 4 WHERE (a = 1)", "SELECT * FROM a"]
    @c.first.set(:b=>5).save
    @c.all.must_equal [@c.load(:a=>1, :b=>5)]
    DB.sqls.must_equal ["SELECT * FROM a LIMIT 1", "UPDATE a SET b = 5 WHERE (a = 1)", "SELECT * FROM a"]
    @c.first.set(:b=>6).save(:columns=>:b)
    @c.all.must_equal [@c.load(:a=>1, :b=>6)]
    DB.sqls.must_equal ["SELECT * FROM a LIMIT 1", "UPDATE a SET b = 6 WHERE (a = 1)", "SELECT * FROM a"]
  end

  it "should handle updating the primary key field with another field" do
    @c.dataset = @c.dataset.with_fetch([[{:a=>1, :b=>3}], [{:a=>2, :b=>4}]])
    @c.first.update(:a=>2, :b=>4)
    @c.all.must_equal [@c.load(:a=>2, :b=>4)]
    sqls = DB.sqls
    ["UPDATE a SET a = 2, b = 4 WHERE (a = 1)", "UPDATE a SET b = 4, a = 2 WHERE (a = 1)"].must_include(sqls.slice!(1))
    sqls.must_equal ["SELECT * FROM a LIMIT 1", "SELECT * FROM a"]
  end

  it "should handle updating just the primary key field when saving changes" do
    @c.dataset = @c.dataset.with_fetch([[{:a=>1, :b=>3}], [{:a=>2, :b=>3}], [{:a=>2, :b=>3}], [{:a=>3, :b=>3}]])
    @c.first.update(:a=>2)
    @c.all.must_equal [@c.load(:a=>2, :b=>3)]
    DB.sqls.must_equal ["SELECT * FROM a LIMIT 1", "UPDATE a SET a = 2 WHERE (a = 1)", "SELECT * FROM a"]
    @c.first.set(:a=>3).save(:columns=>:a)
    @c.all.must_equal [@c.load(:a=>3, :b=>3)]
    DB.sqls.must_equal ["SELECT * FROM a LIMIT 1", "UPDATE a SET a = 3 WHERE (a = 2)", "SELECT * FROM a"]
  end

  it "should handle saving after modifying the primary key field with another field" do
    @c.dataset = @c.dataset.with_fetch([[{:a=>1, :b=>3}], [{:a=>2, :b=>4}]])
    @c.first.set(:a=>2, :b=>4).save
    @c.all.must_equal [@c.load(:a=>2, :b=>4)]
    sqls = DB.sqls
    ["UPDATE a SET a = 2, b = 4 WHERE (a = 1)", "UPDATE a SET b = 4, a = 2 WHERE (a = 1)"].must_include(sqls.slice!(1))
    sqls.must_equal ["SELECT * FROM a LIMIT 1", "SELECT * FROM a"]
  end

  it "should handle saving after modifying just the primary key field" do
    @c.dataset = @c.dataset.with_fetch([[{:a=>1, :b=>3}], [{:a=>2, :b=>3}]])
    @c.first.set(:a=>2).save
    @c.all.must_equal [@c.load(:a=>2, :b=>3)]
    sqls = DB.sqls
    ["UPDATE a SET a = 2, b = 3 WHERE (a = 1)", "UPDATE a SET b = 3, a = 2 WHERE (a = 1)"].must_include(sqls.slice!(1))
    sqls.must_equal ["SELECT * FROM a LIMIT 1", "SELECT * FROM a"]
  end

  it "should handle saving after updating the primary key" do
    @c.dataset = @c.dataset.with_fetch([[{:a=>1, :b=>3}], [{:a=>2, :b=>5}]])
    @c.first.update(:a=>2).update(:b=>4).set(:b=>5).save
    @c.all.must_equal [@c.load(:a=>2, :b=>5)]
    DB.sqls.must_equal ["SELECT * FROM a LIMIT 1", "UPDATE a SET a = 2 WHERE (a = 1)", "UPDATE a SET b = 4 WHERE (a = 2)", "UPDATE a SET b = 5 WHERE (a = 2)", "SELECT * FROM a"]
  end

  it "should work correctly when using the prepared_statements plugin" do
    @c.plugin :prepared_statements
    @c.dataset = @c.dataset.with_fetch([[{:a=>1, :b=>3}], [{:a=>2, :b=>4}], [{:a=>3}]])
    o = @c.first
    o.update(:a=>2, :b=>4)
    @c.all.must_equal [@c.load(:a=>2, :b=>4)]
    sqls = DB.sqls
    ["UPDATE a SET a = 2, b = 4 WHERE (a = 1)", "UPDATE a SET b = 4, a = 2 WHERE (a = 1)"].must_include(sqls.slice!(1))
    sqls.must_equal ["SELECT * FROM a LIMIT 1", "SELECT * FROM a"]

    @c.create(:a=>3)
    DB.sqls.must_equal ["INSERT INTO a (a) VALUES (3)", "SELECT * FROM a WHERE a = 3"]
  end

  it "should clear the associations cache of non-many_to_one associations when changing the primary key" do
    @c.one_to_many :cs, :class=>@c
    @c.many_to_one :c, :class=>@c
    o = @c.new(:a=>1)
    o.associations[:cs] = @c.new
    o.associations[:c] = o2 = @c.new
    o.a = 2
    o.associations.must_equal(:c=>o2)
  end

  it "should handle frozen instances" do
    o = @c.new
    o.a = 1
    o.freeze
    o.pk_hash.must_equal(:a=>1)
  end
end
