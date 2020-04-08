require_relative "spec_helper"

describe "ValidatesAssociated plugin" do
  before do
    @db = Sequel.mock(:autoid=>1, :numrows=>1, :fetch=>{:id=>1, :name=>'a', :c_id=>nil})
    @c = Class.new(Sequel::Model(@db[:cs]))
    @c.plugin :validate_associated
    @c.columns :id, :name, :c_id
    @c.one_to_many :cs, :class=>@c, :key=>:c_id
    @o = @c.load(:id=>1, :name=>'a')
    @db.sqls
  end
  
  it "should return nil when saving if the associated object is invalid when raise_on_save_failure is false" do
    @c.raise_on_save_failure = false
    @c.send(:define_method, :validate){|*| errors.add(:name, 'is b') if name == 'b'}
    o = @c.load(:id=>2, :name=>'b')
    @o.send(:delay_validate_associated_object, @c.association_reflection(:cs), o)
    @o.save.must_be_nil
    @o.errors[:cs].must_equal ["name is b"]
    o.errors[:name].must_equal ['is b']
  end

  it "should support creating new one_to_many and one_to_one objects with presence validations on the foreign key" do
    @c.class_eval do
      plugin :validation_helpers
      def validate
        validates_integer :c_id
        super
      end
    end
    @o.c_id = 5
    @o.send(:delay_validate_associated_object, @c.association_reflection(:cs), @c.load(:id=>2, :name=>'b', :c_id=>2))
    @o.valid?.must_equal true
  end

  it "should should not remove existing values from object when validating" do
    o = @c.load(:id=>2, :name=>'b', :c_id=>3)
    @o.send(:delay_validate_associated_object, @c.association_reflection(:cs), o)
    @o.valid?.must_equal true
    o.c_id.must_equal 3
  end
  
  it "should not attempt to validate associated_object if the :validate=>false option is passed to save" do
    @c.one_to_many :cs, :class=>@c, :key=>:c_id
    @c.send(:define_method, :validate){|*| errors.add(:name, 'is b') if name == 'b'}
    o = @c.load(:id=>2, :name=>'b', :c_id=>3)
    @o.send(:delay_validate_associated_object, @c.association_reflection(:cs), o)
    @o.save(:validate=>false).must_equal @o
    @db.sqls.must_equal ["UPDATE cs SET name = 'a' WHERE (id = 1)"]
  end
end
