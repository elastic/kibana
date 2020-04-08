require_relative "spec_helper"

describe Sequel::Model::Errors do
  before do
    @errors = Sequel::Model::Errors.new
  end
  
  it "should be clearable using #clear" do
    @errors.add(:a, 'b')
    @errors.must_equal(:a=>['b'])
    @errors.clear
    @errors.must_equal({})
  end
  
  it "should be empty if there are no errors" do
    @errors.must_be :empty?
  end
  
  it "should not be empty if there are errors" do
    @errors.add(:blah, "blah")
    @errors.wont_be :empty?
  end
  
  it "should return an array of errors for a specific attribute using #on if there are errors" do
    @errors.add(:blah, 'blah')
    @errors.on(:blah).must_equal ['blah']
  end
  
  it "should return nil using #on if there are no errors for that attribute" do
    @errors.on(:blah).must_be_nil
  end
  
  it "should accept errors using #add" do
    @errors.add :blah, 'zzzz'
    @errors[:blah].must_equal ['zzzz']
  end
  
  it "should return full messages using #full_messages" do
    @errors.full_messages.must_equal []
    
    @errors.add(:blow, 'blieuh')
    @errors.add(:blow, 'blich')
    @errors.add(:blay, 'bliu')
    msgs = @errors.full_messages
    msgs.sort.must_equal ['blay bliu', 'blow blich', 'blow blieuh']
  end

  it "should not add column names for LiteralStrings" do
    @errors.full_messages.must_equal []
    
    @errors.add(:blow, 'blieuh')
    @errors.add(:blow, Sequel.lit('blich'))
    @errors.add(:blay, 'bliu')
    msgs = @errors.full_messages
    msgs.sort.must_equal ['blay bliu', 'blich', 'blow blieuh']
  end

  it "should return the number of error messages using #count" do
    @errors.count.must_equal 0
    @errors.add(:a, 'b')
    @errors.count.must_equal 1
    @errors.add(:a, 'c')
    @errors.count.must_equal 2
    @errors.add(:b, 'c')
    @errors.count.must_equal 3
  end

  it "should return the array of error messages for a given attribute using #on" do
    @errors.add(:a, 'b')
    @errors.on(:a).must_equal ['b']
    @errors.add(:a, 'c')
    @errors.on(:a).must_equal ['b', 'c']
    @errors.add(:b, 'c')
    @errors.on(:a).must_equal ['b', 'c']
  end

  it "should return nil if there are no error messages for a given attribute using #on" do
    @errors.on(:a).must_be_nil
    @errors.add(:b, 'b')
    @errors.on(:a).must_be_nil
  end
end

describe Sequel::Model do
  before do
    @c = Class.new(Sequel::Model) do
      columns :score
      def validate
        errors.add(:score, 'too low') if score < 87
      end
    end
    
    @o = @c.new
  end
  
  it "should supply a #valid? method that returns true if validations pass" do
    @o.score = 50
    @o.wont_be :valid?
    @o.score = 100
    @o.must_be :valid?
  end
  
  it "should provide an errors object" do
    @o.score = 100
    @o.must_be :valid?
    @o.errors.must_be :empty?
    
    @o.score = 86
    @o.wont_be :valid?
    @o.errors[:score].must_equal ['too low']
    @o.errors.on(:blah).must_be_nil
  end
  
  it "should allow raising of ValidationFailed with a Model instance with errors" do
    @o.errors.add(:score, 'is too low')
    begin
      raise Sequel::ValidationFailed, @o
    rescue Sequel::ValidationFailed => e
    end
    e.model.must_be_same_as(@o)
    e.errors.must_be_same_as(@o.errors)
    e.message.must_equal 'score is too low'
  end
  
  it "should allow raising of ValidationFailed with an Errors instance" do
    @o.errors.add(:score, 'is too low')
    begin
      raise Sequel::ValidationFailed, @o.errors
    rescue Sequel::ValidationFailed => e
    end
    e.model.must_be_nil
    e.errors.must_be_same_as(@o.errors)
    e.message.must_equal 'score is too low'
  end

  it "should allow raising of ValidationFailed with a string" do
    proc{raise Sequel::ValidationFailed, "no reason"}.must_raise(Sequel::ValidationFailed, "no reason")
  end
end

describe "Model#save" do
  before do
    @c = Class.new(Sequel::Model(:people)) do
      columns :id, :x

      def validate
        errors.add(:id, 'blah') unless x == 7
      end
    end
    @m = @c.load(:id => 4, :x=>6)
    DB.reset
  end

  it "should save only if validations pass" do
    @m.raise_on_save_failure = false
    @m.wont_be :valid?
    @m.save
    DB.sqls.must_be :empty?
    
    @m.x = 7
    @m.must_be :valid?
    @m.save.wont_equal false
    DB.sqls.must_equal ['UPDATE people SET x = 7 WHERE (id = 4)']
  end
  
  it "should skip validations if the :validate=>false option is used" do
    @m.raise_on_save_failure = false
    @m.wont_be :valid?
    @m.save(:validate=>false)
    DB.sqls.must_equal ['UPDATE people SET x = 6 WHERE (id = 4)']
  end

  it "should skip validations if the skip_validation_on_save! method is used" do
    @m.raise_on_save_failure = false
    @m.wont_be :valid?
    @m.skip_validation_on_next_save!
    @m.save
    DB.sqls.must_equal ['UPDATE people SET x = 6 WHERE (id = 4)']
  end

  it "should not skip future validations if the skip_validation_on_save! method is used" do
    @m.wont_be :valid?
    @m.skip_validation_on_next_save!
    @m.save
    DB.sqls.must_equal ['UPDATE people SET x = 6 WHERE (id = 4)']
    proc{@m.save}.must_raise Sequel::ValidationFailed

    @m.skip_validation_on_next_save!
    @m.save
    DB.sqls.must_equal ['UPDATE people SET x = 6 WHERE (id = 4)']
  end

  it "should skip validations if the skip_validation_on_save! method is used and :validate=>true option is used" do
    @m.wont_be :valid?
    @m.skip_validation_on_next_save!
    @m.save(:validate=>true)
    DB.sqls.must_equal ['UPDATE people SET x = 6 WHERE (id = 4)']
  end

  it "should raise error if validations fail and raise_on_save_failure is true" do
    begin
      @m.save
    rescue Sequel::ValidationFailed => e
      e.model.must_be_same_as(@m)
      e.errors.must_be_same_as(@m.errors)
    else
      raise
    end
  end

  it "should raise error if validations fail and :raise_on_failure option is true" do
    @m.raise_on_save_failure = false
    proc{@m.save(:raise_on_failure => true)}.must_raise(Sequel::ValidationFailed)
  end

  it "should return nil if validations fail and raise_on_save_faiure is false" do
    @m.raise_on_save_failure = false
    @m.save.must_be_nil
  end
end
