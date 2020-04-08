require_relative "spec_helper"

describe "Sequel::Plugins::DelayAddAssociation" do
  before do
    @db = Sequel.mock(:autoid=>1, :numrows=>1, :fetch=>{:id=>1, :name=>'a', :c_id=>nil})
    @c = Class.new(Sequel::Model(@db[:cs]))
    @c.send(:define_method, :save){|*| super(:changed=>true)}
    @c.plugin :delay_add_association
    @c.columns :id, :name, :c_id
    @c.one_to_many :cs, :class=>@c, :key=>:c_id
    @db.sqls
  end

  it "should delay adding of the association until after creation" do
    @o = @c.new(:name=>'a')
    @o.add_c(@c.load(:id=>2, :name=>'b'))
    @db.sqls.must_equal []
    @o.save
    @db.sqls.must_equal ["INSERT INTO cs (name) VALUES ('a')", "SELECT * FROM cs WHERE (id = 1) LIMIT 1", "UPDATE cs SET c_id = 1 WHERE (id = 2)"]
  end

  it "should immediately reflect changes in cached association" do
    @o = @c.new(:name=>'a')
    o = @c.load(:id=>2, :name=>'b')
    @o.add_c(o)
    @o.cs.must_equal [o]
    @db.sqls.must_equal []
  end

  it "should not affect adding associations to existing rows" do
    @o = @c.load(:id=>1, :name=>'a')
    @o.add_c(@c.load(:id=>2, :name=>'b'))
    @db.sqls.must_equal ["UPDATE cs SET c_id = 1 WHERE (id = 2)"]
  end

  it "should raise an error when saving if the associated object is invalid" do
    @c.send(:define_method, :validate){|*| errors.add(:name, 'is b') if name == 'b'}
    @o = @c.new(:name=>'a')
    @o.add_c(@c.load(:id=>2, :name=>'b'))
    proc{@o.save}.must_raise Sequel::ValidationFailed
  end

  it "should return nil when saving if the associated object is invalid when raise_on_save_failure is false" do
    @c.raise_on_save_failure = false
    @c.send(:define_method, :validate){|*| errors.add(:name, 'is b') if name == 'b'}
    @o = @c.new(:name=>'a')
    @o.add_c(@c.load(:id=>2, :name=>'b'))
    @o.save.must_be_nil
    @o.errors[:cs].must_equal ["name is b"]
    @o.cs.first.errors[:name].must_equal ['is b']
  end

  it "should work when passing in hashes" do
    @o = @c.new(:name=>'a')
    @o.add_c(:name=>'b')
    @db.sqls.must_equal []
    @o.save
    @db.sqls.must_equal [
      "INSERT INTO cs (name) VALUES ('a')",
      "SELECT * FROM cs WHERE (id = 1) LIMIT 1",
      "INSERT INTO cs (name, c_id) VALUES ('b', 1)",
      "SELECT * FROM cs WHERE (id = 2) LIMIT 1"]
  end

  it "should work when passing in primary keys" do
    @db.fetch = [[{:id=>2, :name=>'b', :c_id=>nil}], [{:id=>1, :name=>'a', :c_id=>nil}]]
    @o = @c.new(:name=>'a')
    @o.add_c(2)
    @db.sqls.must_equal ["SELECT * FROM cs WHERE (id = 2) LIMIT 1"]
    @o.save
    @db.sqls.must_equal ["INSERT INTO cs (name) VALUES ('a')", "SELECT * FROM cs WHERE (id = 1) LIMIT 1", "UPDATE cs SET c_id = 1 WHERE (id = 2)"]
  end
end
