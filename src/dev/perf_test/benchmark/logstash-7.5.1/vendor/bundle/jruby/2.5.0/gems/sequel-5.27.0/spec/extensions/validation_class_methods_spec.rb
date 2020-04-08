require_relative "spec_helper"

model_class = proc do |klass, &block|
  c = Class.new(klass)
  c.plugin :validation_class_methods
  c.class_eval(&block) if block
  c
end

describe Sequel::Model do
  before do
    @c = model_class.call Sequel::Model do
      def self.validates_coolness_of(attr)
        validates_each(attr) {|o, a, v| o.errors.add(a, 'is not cool') if v != :cool}
      end
    end
  end
  
  it "should freeze validation metadata when freezing model class" do
    @c.validates_acceptance_of(:a)
    @c.freeze
    @c.validations.frozen?.must_equal true
    @c.validations.values.all?(&:frozen?).must_equal true
    @c.validation_reflections.frozen?.must_equal true
    @c.validation_reflections.values.all? do |vs|
      vs.frozen? && vs.all? do |v|
        v.frozen? && v.last.frozen?
      end
    end.must_equal true
  end

  it "should respond to validations, has_validations?, and validation_reflections" do
    @c.must_respond_to(:validations)
    @c.must_respond_to(:has_validations?)
    @c.must_respond_to(:validation_reflections)
  end
  
  it "should be able to reflect on validations" do
    @c.validation_reflections.must_equal({})
    @c.validates_acceptance_of(:a)
    @c.validation_reflections.must_equal(:a=>[[:acceptance, {:tag=>:acceptance, :message=>"is not accepted", :allow_nil=>true, :accept=>"1"}]])
    @c.validates_presence_of(:a)
    @c.validation_reflections[:a].length.must_equal 2
    @c.validation_reflections[:a].last.must_equal [:presence, {:tag=>:presence, :message=>"is not present"}]
  end

  it "should handle validation reflections correctly when subclassing" do
    @c.validates_acceptance_of(:a)
    c = Class.new(@c)
    c.validation_reflections.map{|k,v| k}.must_equal [:a]
    c.validates_presence_of(:a)
    @c.validation_reflections.must_equal(:a=>[[:acceptance, {:tag=>:acceptance, :message=>"is not accepted", :allow_nil=>true, :accept=>"1"}]])
    c.validation_reflections[:a].last.must_equal [:presence, {:tag=>:presence, :message=>"is not present"}]
  end

  it "should acccept validation definitions using validates_each" do
    @c.validates_each(:xx, :yy) {|o, a, v| o.errors.add(a, 'too low') if v < 50}
    o = @c.new
    def o.xx; 40; end
    def o.yy; 60; end
    o.valid?.must_equal false
    o.errors.full_messages.must_equal ['xx too low']
  end

  it "should return true/false for has_validations?" do
    @c.has_validations?.must_equal false
    @c.validates_each(:xx) {1}
    @c.has_validations?.must_equal true
  end
  
  it "should validate multiple attributes at once" do
    o = @c.new
    def o.xx
      1
    end
    def o.yy
      2
    end
    vals = nil
    atts = nil
    @c.validates_each([:xx, :yy]){|obj,a,v| atts=a; vals=v}
    o.valid?
    vals.must_equal [1,2]
    atts.must_equal [:xx, :yy]
  end
  
  it "should respect allow_missing option when using multiple attributes" do
    o = @c.new
    def o.xx
      self[:xx]
    end
    def o.yy
      self[:yy]
    end
    vals = nil
    atts = nil
    @c.validates_each([:xx, :yy], :allow_missing=>true){|obj,a,v| atts=a; vals=v}

    o.values[:xx] = 1
    o.valid?
    vals.must_equal [1,nil]
    atts.must_equal [:xx, :yy]

    vals = nil
    atts = nil
    o.values.clear
    o.values[:yy] = 2
    o.valid?
    vals.must_equal [nil, 2]
    atts.must_equal [:xx, :yy]

    vals = nil
    atts = nil
    o.values.clear
    o.valid?.must_equal true
    vals.must_be_nil
    atts.must_be_nil
  end
  
  it "should overwrite existing validation with the same tag and attribute" do
    @c.validates_each(:xx, :xx, :tag=>:low) {|o, a, v| o.xxx; o.errors.add(a, 'too low') if v < 50}
    @c.validates_each(:yy, :yy) {|o, a, v| o.yyy; o.errors.add(a, 'too low') if v < 50}
    @c.validates_presence_of(:zz, :zz)
    @c.validates_length_of(:aa, :aa, :tag=>:blah)
    o = @c.new
    def o.zz
      @a ||= 0
      @a += 1
    end
    def o.aa
      @b ||= 0
      @b += 1
    end
    def o.xx; 40; end
    def o.yy; 60; end
    def o.xxx; end
    def o.yyy; end
    o.valid?.must_equal false
    o.zz.must_equal 2
    o.aa.must_equal 2
    o.errors.full_messages.must_equal ['xx too low']
  end

  it "should provide a validates method that takes block with validation definitions" do
    @c.validates do
      coolness_of :blah
    end
    @c.validations[:blah].wont_be :empty?
    o = @c.new
    def o.blah; end
    o.valid?.must_equal false
    o.errors.full_messages.must_equal ['blah is not cool']
  end

  it "should have the validates block have appropriate respond_to?" do
    c = nil
    @c.validates{c = respond_to?(:foo)}
    c.must_equal false
    @c.validates{c = respond_to?(:length_of)}
    c.must_equal true
  end
end

describe Sequel::Model do
  before do
    @c = model_class.call Sequel::Model do
      columns :score
      validates_each :score do |o, a, v|
        o.errors.add(a, 'too low') if v < 87
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
end

describe "Sequel::Plugins::ValidationClassMethods::ClassMethods::Generator" do
  before do
    @testit = testit = []
    
    @c = model_class.call Sequel::Model do
      singleton_class.send(:define_method, :validates_blah) do
        testit << 1324
      end
    end
  end
  
  it "should instance_eval the block, sending everything to its receiver" do
    @c.validates do
      blah
    end
    @testit.must_equal [1324]
  end
end

describe Sequel::Model do
  before do
    @c = model_class.call Sequel::Model do
      columns :value
      
      def self.where(*args)
        o = Object.new
        def o.count; 2; end
        o
      end

      def skip; false; end
      def dont_skip; true; end
    end
    @m = @c.new
  end

  it "should validate acceptance_of" do
    @c.validates_acceptance_of :value
    @m.must_be :valid?
    @m.value = '1'
    @m.must_be :valid?
  end
  
  it "should validate acceptance_of with accept" do
    @c.validates_acceptance_of :value, :accept => 'true'
    @m.value = '1'
    @m.wont_be :valid?
    @m.value = 'true'
    @m.must_be :valid?
  end
  
  it "should validate acceptance_of with allow_nil => false" do
    @c.validates_acceptance_of :value, :allow_nil => false
    @m.wont_be :valid?
  end

  it "should validate acceptance_of with allow_missing => true" do
    @c.validates_acceptance_of :value, :allow_missing => true
    @m.must_be :valid?
  end

  it "should validate acceptance_of with allow_missing => true and allow_nil => false" do
    @c.validates_acceptance_of :value, :allow_missing => true, :allow_nil => false
    @m.must_be :valid?
    @m.value = nil
    @m.wont_be :valid?
  end

  it "should validate acceptance_of with if => true" do
    @c.validates_acceptance_of :value, :if => :dont_skip
    @m.value = '0'
    @m.wont_be :valid?
  end

  it "should validate acceptance_of with if => false" do
    @c.validates_acceptance_of :value, :if => :skip
    @m.value = '0'
    @m.must_be :valid?
  end

  it "should validate acceptance_of with if proc that evaluates to true" do
    @c.validates_acceptance_of :value, :if => proc{true}
    @m.value = '0'
    @m.wont_be :valid?
  end

  it "should validate acceptance_of with if proc that evaluates to false" do
    @c.validates_acceptance_of :value, :if => proc{false}
    @m.value = '0'
    @m.must_be :valid?
  end

  it "should raise an error if :if option is not a Symbol, Proc, or nil" do
    @c.validates_acceptance_of :value, :if => 1
    @m.value = '0'
    proc{@m.valid?}.must_raise(Sequel::Error)
  end

  it "should validate confirmation_of" do
    @c.send(:attr_accessor, :value_confirmation)
    @c.validates_confirmation_of :value
    
    @m.value = 'blah'
    @m.wont_be :valid?
    
    @m.value_confirmation = 'blah'
    @m.must_be :valid?
  end
  
  it "should validate confirmation_of with if => true" do
    @c.send(:attr_accessor, :value_confirmation)
    @c.validates_confirmation_of :value, :if => :dont_skip

    @m.value = 'blah'
    @m.wont_be :valid?
  end

  it "should validate confirmation_of with if => false" do
    @c.send(:attr_accessor, :value_confirmation)
    @c.validates_confirmation_of :value, :if => :skip

    @m.value = 'blah'
    @m.must_be :valid?
  end

  it "should validate confirmation_of with allow_missing => true" do
    @c.send(:attr_accessor, :value_confirmation)
    @c.validates_acceptance_of :value, :allow_missing => true
    @m.must_be :valid?
    @m.value_confirmation = 'blah'
    @m.must_be :valid?
    @m.value = nil
    @m.wont_be :valid?
  end

  it "should validate format_of" do
    @c.validates_format_of :value, :with => /.+_.+/
    @m.value = 'abc_'
    @m.wont_be :valid?
    @m.value = 'abc_def'
    @m.must_be :valid?
  end
  
  it "should raise for validate_format_of without regexp" do
    proc {@c.validates_format_of :value}.must_raise(ArgumentError)
    proc {@c.validates_format_of :value, :with => :blah}.must_raise(ArgumentError)
  end
  
  it "should validate format_of with if => true" do
    @c.validates_format_of :value, :with => /_/, :if => :dont_skip

    @m.value = 'a'
    @m.wont_be :valid?
  end

  it "should validate format_of with if => false" do
    @c.validates_format_of :value, :with => /_/, :if => :skip

    @m.value = 'a'
    @m.must_be :valid?
  end
  
  it "should validate format_of with allow_missing => true" do
    @c.validates_format_of :value, :allow_missing => true, :with=>/./
    @m.must_be :valid?
    @m.value = nil
    @m.wont_be :valid?
  end

  it "should validate length_of with maximum" do
    @c.validates_length_of :value, :maximum => 5
    @m.wont_be :valid?
    @m.value = '12345'
    @m.must_be :valid?
    @m.value = '123456'
    @m.wont_be :valid?
    @m.errors[:value].must_equal ['is too long']
    @m.value = nil
    @m.wont_be :valid?
    @m.errors[:value].must_equal ['is not present']
  end

  it "should validate length_of with maximum using customized error messages" do
    @c.validates_length_of :value, :maximum => 5, :too_long=>'tl', :nil_message=>'np'
    @m.value = '123456'
    @m.wont_be :valid?
    @m.errors[:value].must_equal ['tl']
    @m.value = nil
    @m.wont_be :valid?
    @m.errors[:value].must_equal ['np']
  end

  it "should validate length_of with minimum" do
    @c.validates_length_of :value, :minimum => 5
    @m.wont_be :valid?
    @m.value = '12345'
    @m.must_be :valid?
    @m.value = '1234'
    @m.wont_be :valid?
  end

  it "should validate length_of with within" do
    @c.validates_length_of :value, :within => 2..5
    @m.wont_be :valid?
    @m.value = '12345'
    @m.must_be :valid?
    @m.value = '1'
    @m.wont_be :valid?
    @m.value = '123456'
    @m.wont_be :valid?
  end

  it "should validate length_of with is" do
    @c.validates_length_of :value, :is => 3
    @m.wont_be :valid?
    @m.value = '123'
    @m.must_be :valid?
    @m.value = '12'
    @m.wont_be :valid?
    @m.value = '1234'
    @m.wont_be :valid?
  end
  
  it "should validate length_of with allow_nil" do
    @c.validates_length_of :value, :is => 3, :allow_nil => true
    @m.must_be :valid?
  end

  it "should validate length_of with if => true" do
    @c.validates_length_of :value, :is => 3, :if => :dont_skip

    @m.value = 'a'
    @m.wont_be :valid?
  end

  it "should validate length_of with if => false" do
    @c.validates_length_of :value, :is => 3, :if => :skip

    @m.value = 'a'
    @m.must_be :valid?
  end

  it "should validate length_of with allow_missing => true" do
    @c.validates_length_of :value, :allow_missing => true, :minimum => 5
    @m.must_be :valid?
    @m.value = nil
    @m.wont_be :valid?
  end

  it "should allow multiple calls to validates_length_of with different options without overwriting" do
    @c.validates_length_of :value, :maximum => 5
    @c.validates_length_of :value, :minimum => 5
    @m.wont_be :valid?
    @m.value = '12345'
    @m.must_be :valid?
    @m.value = '123456'
    @m.wont_be :valid?
    @m.value = '12345'
    @m.must_be :valid?
    @m.value = '1234'
    @m.wont_be :valid?
  end

  it "should validate numericality_of" do
    @c.validates_numericality_of :value
    @m.value = 'blah'
    @m.wont_be :valid?
    @m.value = '123'
    @m.must_be :valid?
    @m.value = '123.1231'
    @m.must_be :valid?
    @m.value = '+1'
    @m.must_be :valid?
    @m.value = '-1'
    @m.must_be :valid?
    @m.value = '+1.123'
    @m.must_be :valid?
    @m.value = '-0.123'
    @m.must_be :valid?
    @m.value = '-0.123E10'
    @m.must_be :valid?
    @m.value = '32.123e10'
    @m.must_be :valid?
    @m.value = '+32.123E10'
    @m.must_be :valid?
    @m.must_be :valid?
    @m.value = '.0123'
  end

  it "should validate numericality_of with only_integer" do
    @c.validates_numericality_of :value, :only_integer => true
    @m.value = 'blah'
    @m.wont_be :valid?
    @m.value = '123'
    @m.must_be :valid?
    @m.value = '123.1231'
    @m.wont_be :valid?
  end
  
  it "should validate numericality_of with if => true" do
    @c.validates_numericality_of :value, :if => :dont_skip

    @m.value = 'a'
    @m.wont_be :valid?
  end

  it "should validate numericality_of with if => false" do
    @c.validates_numericality_of :value, :if => :skip

    @m.value = 'a'
    @m.must_be :valid?
  end

  it "should validate numericality_of with allow_missing => true" do
    @c.validates_numericality_of :value, :allow_missing => true
    @m.must_be :valid?
    @m.value = nil
    @m.wont_be :valid?
  end

  it "should validate presence_of" do
    @c.validates_presence_of :value
    @m.wont_be :valid?
    @m.value = ''
    @m.wont_be :valid?
    @m.value = 1234
    @m.must_be :valid?
    @m.value = nil
    @m.wont_be :valid?
    @m.value = true
    @m.must_be :valid?
    @m.value = false
    @m.must_be :valid?
  end
  
  it "should validate inclusion_of with an array" do
    @c.validates_inclusion_of :value, :in => [1,2]
    @m.wont_be :valid?
    @m.value = 1
    @m.must_be :valid?
    @m.value = 1.5
    @m.wont_be :valid?
    @m.value = 2
    @m.must_be :valid?    
    @m.value = 3
    @m.wont_be :valid? 
  end
  
  it "should validate inclusion_of with a range" do
    @c.validates_inclusion_of :value, :in => 1..4
    @m.wont_be :valid?
    @m.value = 1
    @m.must_be :valid?
    @m.value = 1.5
    @m.must_be :valid?
    @m.value = 0
    @m.wont_be :valid?
    @m.value = 5
    @m.wont_be :valid?    
  end
  
  it "should raise an error if inclusion_of doesn't receive a valid :in option" do
    lambda{@c.validates_inclusion_of :value}.must_raise(ArgumentError)
    lambda{@c.validates_inclusion_of :value, :in => 1}.must_raise(ArgumentError)
  end
  
  it "should raise an error if inclusion_of handles :allow_nil too" do
    @c.validates_inclusion_of :value, :in => 1..4, :allow_nil => true
    @m.value = nil
    @m.must_be :valid?
    @m.value = 0
    @m.wont_be :valid?
  end

  it "should validate presence_of with if => true" do
    @c.validates_presence_of :value, :if => :dont_skip
    @m.wont_be :valid?
  end

  it "should validate presence_of with if => false" do
    @c.validates_presence_of :value, :if => :skip
    @m.must_be :valid?
  end

  it "should validate presence_of with allow_missing => true" do
    @c.validates_presence_of :value, :allow_missing => true
    @m.must_be :valid?
    @m.value = nil
    @m.wont_be :valid?
  end

  it "should validate uniqueness_of with if => true" do
    @c.validates_uniqueness_of :value, :if => :dont_skip

    @m.value = 'a'
    @m.wont_be :valid?
  end

  it "should validate uniqueness_of with if => false" do
    @c.validates_uniqueness_of :value, :if => :skip
    @m.value = 'a'
    @m.must_be :valid?
  end
  
  it "should validate uniqueness_of with allow_missing => true" do
    @c.validates_uniqueness_of :value, :allow_missing => true
    @m.must_be :valid?
    @m.value = 1
    @m.wont_be :valid?
  end
end

describe "Superclass validations" do
  before do
    @c1 = model_class.call Sequel::Model do
      columns :value
      validates_length_of :value, :minimum => 5
    end
    
    @c2 = Class.new(@c1)
    @c2.class_eval do
      columns :value
      validates_format_of :value, :with => /^[a-z]+$/
    end
  end
  
  it "should be checked when validating" do
    o = @c2.new
    o.value = 'ab'
    o.valid?.must_equal false
    o.errors.full_messages.must_equal ['value is too short']

    o.value = '12'
    o.valid?.must_equal false
    o.errors.full_messages.must_equal ['value is too short', 'value is invalid']

    o.value = 'abcde'
    o.valid?.must_equal true
  end
  
  it "should have skip_superclass_validations? return whether superclass validations were skipped" do
    @c2.skip_superclass_validations?.must_be_nil
    @c2.skip_superclass_validations
    @c2.skip_superclass_validations?.must_equal true
  end

  it "should be skipped if skip_superclass_validations is called" do
    @c2.skip_superclass_validations

    o = @c2.new
    o.value = 'ab'
    o.valid?.must_equal true

    o.value = '12'
    o.valid?.must_equal false
    o.errors.full_messages.must_equal ['value is invalid']

    o.value = 'abcde'
    o.valid?.must_equal true
  end
end

describe ".validates with block" do
  it "should support calling .each" do
    @c = model_class.call Sequel::Model do
      columns :vvv
      validates do
        each :vvv do |o, a, v|
          o.errors.add(a, "is less than zero") if v.to_i < 0
        end
      end
    end
    
    o = @c.new
    o.vvv = 1
    o.must_be :valid?
    o.vvv = -1
    o.wont_be :valid?
  end
end

describe Sequel::Model, "Validations" do
  before do
    class ::Person < Sequel::Model
      plugin :validation_class_methods
      columns :id,:name,:first_name,:last_name,:middle_name,:initials,:age, :terms
    end

    class ::Smurf < Person
    end

    class ::Can < Sequel::Model
      plugin :validation_class_methods
      columns :id, :name
    end
    
    class ::Cow < Sequel::Model
      plugin :validation_class_methods
      columns :id, :name, :got_milk
    end

    class ::User < Sequel::Model
      plugin :validation_class_methods
      columns :id, :username, :password
    end
    
    class ::Address < Sequel::Model
      plugin :validation_class_methods
      columns :id, :zip_code
    end
  end
  after do
    [:Person, :Smurf, :Cow, :User, :Address].each{|c| Object.send(:remove_const, c)}
  end
  
  it "should validate the acceptance of a column" do
    class ::Cow < Sequel::Model
      validations.clear
      validates_acceptance_of :got_milk, :accept => 'blah', :allow_nil => false
    end
    
    @cow = Cow.new
    @cow.wont_be :valid?
    @cow.errors.full_messages.must_equal ["got_milk is not accepted"]
    
    @cow.got_milk = "blah"
    @cow.must_be :valid?
  end
  
  it "should validate the confirmation of a column" do
    class ::User < Sequel::Model
      def password_confirmation
        "test"
      end
      
      validations.clear
      validates_confirmation_of :password
    end
    
    @user = User.new
    @user.wont_be :valid?
    @user.errors.full_messages.must_equal ["password is not confirmed"]
    
    @user.password = "test"
    @user.must_be :valid?
  end
  
  it "should validate format of column" do
    class ::Person < Sequel::Model
      validates_format_of :first_name, :with => /^[a-zA-Z]+$/
    end

    @person = Person.new :first_name => "Lancelot99"
    @person.valid?.must_equal false
    @person = Person.new :first_name => "Anita"
    @person.valid?.must_equal true
  end
  
  it "should validate length of column" do
    class ::Person < Sequel::Model
      validations.clear
      validates_length_of :first_name, :maximum => 30
      validates_length_of :last_name, :minimum => 30
      validates_length_of :middle_name, :within => 1..5
      validates_length_of :initials, :is => 2
    end
    
    @person = Person.new(
      :first_name => "Anamethatiswaytofreakinglongandwayoverthirtycharacters",
      :last_name => "Alastnameunderthirtychars",
      :initials => "LGC",
      :middle_name => "danger"
    )
    
    @person.wont_be :valid?
    @person.errors.full_messages.size.must_equal 4
    @person.errors.full_messages.sort.must_equal [
      'first_name is too long',
      'initials is the wrong length',
      'last_name is too short',
      'middle_name is the wrong length'
    ]
    
    @person.first_name  = "Lancelot"
    @person.last_name   = "1234567890123456789012345678901"
    @person.initials    = "LC"
    @person.middle_name = "Will"
    @person.must_be :valid?
  end
  
  it "should validate that a column has the correct type for the schema column" do
    p = model_class.call Sequel::Model do
      columns :age, :d
      self.raise_on_typecast_failure = false
      validates_schema_type :age
      validates_schema_type :d, :message=>'is a bad choice'
      @db_schema = {:age=>{:type=>:integer}, :d=>{:type=>:date}}
    end
    
    @person = p.new
    @person.must_be :valid?

    @person.age = 'a'
    @person.wont_be :valid?
    @person.errors.full_messages.must_equal ['age is not a valid integer']
    @person.age = 1
    @person.must_be :valid?

    @person.d = 'a'
    @person.wont_be :valid?
    @person.errors.full_messages.must_equal ['d is a bad choice']
    @person.d = Date.today
    @person.must_be :valid?
  end

  it "should validate numericality of column" do
    class ::Person < Sequel::Model
      validations.clear
      validates_numericality_of :age
    end
    
    @person = Person.new :age => "Twenty"
    @person.wont_be :valid?
    @person.errors.full_messages.must_equal ['age is not a number']
    
    @person.age = 20
    @person.must_be :valid?
  end
  
  it "should validate the presence of a column" do
    class ::Cow < Sequel::Model
      validations.clear
      validates_presence_of :name
    end
    
    @cow = Cow.new
    @cow.wont_be :valid?
    @cow.errors.full_messages.must_equal ['name is not present']
    
    @cow.name = "Betsy"
    @cow.must_be :valid?
  end
 
  it "should validate the uniqueness of a column" do
    class ::User < Sequel::Model
      validations.clear
      validates do
        uniqueness_of :username
      end
    end
    User.dataset = User.dataset.with_fetch(proc do |sql|
      case sql
      when /count.*username = '0records'/
        {:v => 0}
      when /count.*username = '2records'/
        {:v => 2}
      when /count.*username = '1record'/
        {:v => 1}
      when /username = '1record'/
        {:id => 3, :username => "1record", :password => "test"}
      end
    end)
    
    @user = User.new(:username => "2records", :password => "anothertest")
    @user.wont_be :valid?
    @user.errors.full_messages.must_equal ['username is already taken']

    @user = User.new(:username => "1record", :password => "anothertest")
    @user.wont_be :valid?
    @user.errors.full_messages.must_equal ['username is already taken']

    @user = User.load(:id=>4, :username => "1record", :password => "anothertest")
    @user.wont_be :valid?
    @user.errors.full_messages.must_equal ['username is already taken']

    @user = User.load(:id=>3, :username => "1record", :password => "anothertest")
    @user.must_be :valid?
    @user.errors.full_messages.must_equal []

    @user = User.new(:username => "0records", :password => "anothertest")
    @user.must_be :valid?
    @user.errors.full_messages.must_equal []

    User.db.sqls
    @user = User.new(:password => "anothertest")
    @user.must_be :valid?
    @user.errors.full_messages.must_equal []
    User.db.sqls.must_equal []
  end
  
  it "should validate the uniqueness of multiple columns" do
    class ::User < Sequel::Model
      validations.clear
      validates do
        uniqueness_of [:username, :password]
      end
    end
    User.dataset = User.dataset.with_fetch(proc do |sql|
      case sql
      when /count.*username = '0records'/
        {:v => 0}
      when /count.*username = '2records'/
        {:v => 2}
      when /count.*username = '1record'/
        {:v => 1}
      when /username = '1record'/
        if sql =~ /password = 'anothertest'/
          {:id => 3, :username => "1record", :password => "anothertest"}
        else
          {:id => 4, :username => "1record", :password => "test"}
        end
      end
    end)
    
    @user = User.new(:username => "2records", :password => "anothertest")
    @user.wont_be :valid?
    @user.errors.full_messages.must_equal ['username and password is already taken']

    @user = User.new(:username => "1record", :password => "anothertest")
    @user.wont_be :valid?
    @user.errors.full_messages.must_equal ['username and password is already taken']

    @user = User.load(:id=>4, :username => "1record", :password => "anothertest")
    @user.wont_be :valid?
    @user.errors.full_messages.must_equal ['username and password is already taken']

    @user = User.load(:id=>3, :username => "1record", :password => "test")
    @user.wont_be :valid?
    @user.errors.full_messages.must_equal ['username and password is already taken']

    @user = User.load(:id=>3, :username => "1record", :password => "anothertest")
    @user.must_be :valid?
    @user.errors.full_messages.must_equal []

    @user = User.new(:username => "0records", :password => "anothertest")
    @user.must_be :valid?
    @user.errors.full_messages.must_equal []

    User.db.sqls
    @user = User.new(:password => "anothertest")
    @user.must_be :valid?
    @user.errors.full_messages.must_equal []
    @user = User.new(:username => "0records")
    @user.must_be :valid?
    @user.errors.full_messages.must_equal []
    @user = User.new
    @user.must_be :valid?
    @user.errors.full_messages.must_equal []
    User.db.sqls.must_equal []
  end
  
  it "should have a validates block that contains multiple validations" do
    class ::Person < Sequel::Model
      validations.clear
      validates do
        format_of :first_name, :with => /^[a-zA-Z]+$/
        length_of :first_name, :maximum => 30
      end
    end

    Person.validations[:first_name].size.must_equal 2
    
    @person = Person.new :first_name => "Lancelot99"
    @person.valid?.must_equal false
    
    @person2 = Person.new :first_name => "Wayne"
    @person2.valid?.must_equal true
  end

  it "should allow 'longhand' validations direcly within the model." do
    class ::Person < Sequel::Model
      validations.clear
      validates_length_of :first_name, :maximum => 30
    end
    Person.validations.length.must_equal(1)
  end

  it "should define a has_validations? method which returns true if the model has validations, false otherwise" do
    class ::Person < Sequel::Model
      validations.clear
      validates do
        format_of :first_name, :with => /\w+/
        length_of :first_name, :maximum => 30
      end
    end

    class ::Smurf < Person
      validations.clear
    end

    Person.validations.wont_be :empty?
    Smurf.validations.must_be :empty?
  end

  it "should validate correctly instances initialized with string keys" do
    class ::Can < Sequel::Model
      validates_length_of :name, :minimum => 4
    end
    
    Can.new('name' => 'ab').wont_be :valid?
    Can.new('name' => 'abcd').must_be :valid?
  end
  
end

describe "Model#save" do
  before do
    @c = model_class.call Sequel::Model(:people) do
      columns :id, :x

      validates_each :x do |o, a, v|
        o.errors.add(a, 'blah') unless v == 7
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
    
  it "should raise error if validations fail and raise_on_save_faiure is true" do
    proc{@m.save}.must_raise(Sequel::ValidationFailed)
  end
  
  it "should return nil if validations fail and raise_on_save_faiure is false" do
    @m.raise_on_save_failure = false
    @m.save.must_be_nil
  end
end
