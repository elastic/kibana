require_relative "spec_helper"

describe "Sequel::Plugins::ConstraintValidations" do
  def model_class(opts={})
    return @c if @c
    @c = Class.new(Sequel::Model(@db[:items]))
    @c.columns :name
    @db.sqls
    set_fetch(opts)
    @c.plugin :constraint_validations
    @c
  end

  def set_fetch(opts)
    @db.fetch = {:table=>'items', :message=>nil, :allow_nil=>nil, :constraint_name=>nil, :validation_type=>'presence', :argument=>nil, :column=>'name'}.merge(opts)
  end

  before do
    @db = Sequel.mock
    set_fetch({})
    @ds = @db[:items]
    @ds.send(:columns=, [:name])
    @ds2 = Sequel.mock[:items2]
    @ds2.send(:columns=, [:name])
  end

  it "should load the validation_helpers plugin into the class" do
    model_class.new.must_respond_to(:validates_presence)
  end

  it "should parse constraint validations when loading plugin" do
    @c = model_class
    @db.sqls.must_equal ["SELECT * FROM sequel_constraint_validations"]
    @db.constraint_validations.must_equal("items"=>[{:allow_nil=>nil, :constraint_name=>nil, :message=>nil, :validation_type=>"presence", :column=>"name", :argument=>nil, :table=>"items"}])
    @c.constraint_validations.must_equal [[:validates_presence, :name]]
    @c.constraint_validation_reflections.must_equal(:name=>[[:presence, {}]])
  end

  it "should parse constraint validations with a custom constraint validations table" do
    c = Class.new(Sequel::Model(@db[:items]))
    @db.sqls
    c.plugin :constraint_validations, :constraint_validations_table=>:foo
    @db.sqls.must_equal ["SELECT * FROM foo"]
    @db.constraint_validations.must_equal("items"=>[{:allow_nil=>nil, :constraint_name=>nil, :message=>nil, :validation_type=>"presence", :column=>"name", :argument=>nil, :table=>"items"}])
    c.constraint_validations.must_equal [[:validates_presence, :name]]
    c.constraint_validation_reflections.must_equal(:name=>[[:presence, {}]])
  end

  it "should populate constraint_validations when subclassing" do
    c = Class.new(Sequel::Model(@db))
    c.plugin :constraint_validations
    @db.sqls.must_equal ["SELECT * FROM sequel_constraint_validations"]
    sc = Class.new(c)
    sc.set_dataset @ds
    @db.sqls.must_equal []
    sc.constraint_validations.must_equal [[:validates_presence, :name]]
    sc.constraint_validation_reflections.must_equal(:name=>[[:presence, {}]])
  end

  it "should handle plugin being loaded in subclass when superclass uses a custom constraint validations table" do
    c = Class.new(Sequel::Model(@db))
    c.plugin :constraint_validations, :constraint_validations_table=>:foo
    @db.sqls.must_equal ["SELECT * FROM foo"]
    sc = Class.new(c)
    sc.plugin :constraint_validations
    sc.constraint_validations_table.must_equal :foo
    sc.set_dataset @ds
    @db.sqls.must_equal []
    sc.constraint_validations.must_equal [[:validates_presence, :name]]
    sc.constraint_validation_reflections.must_equal(:name=>[[:presence, {}]])
  end

  it "should populate constraint_validations when changing the model's dataset" do
    c = Class.new(Sequel::Model(@db[:foo]))
    c.columns :name
    @db.sqls
    c.plugin :constraint_validations
    @db.sqls.must_equal ["SELECT * FROM sequel_constraint_validations"]
    sc = Class.new(c)
    sc.set_dataset @ds
    @db.sqls.must_equal []
    sc.constraint_validations.must_equal [[:validates_presence, :name]]
    sc.constraint_validation_reflections.must_equal(:name=>[[:presence, {}]])
  end

  it "should reparse constraint validations when changing the model's database" do
    c = Class.new(Sequel::Model(@ds2))
    c.plugin :constraint_validations
    @ds2.db.sqls.must_equal ["SELECT * FROM sequel_constraint_validations"]
    sc = Class.new(c)
    sc.set_dataset @ds
    @db.sqls.must_equal ["SELECT * FROM sequel_constraint_validations"]
    sc.constraint_validations.must_equal [[:validates_presence, :name]]
    sc.constraint_validation_reflections.must_equal(:name=>[[:presence, {}]])
  end

  it "should reparse constraint validations when changing the model's database with a custom constraint validations table" do
    c = Class.new(Sequel::Model(@ds2))
    c.plugin :constraint_validations, :constraint_validations_table=>:foo
    @ds2.db.sqls.must_equal ["SELECT * FROM foo"]
    sc = Class.new(c)
    sc.set_dataset @ds
    @db.sqls.must_equal ["SELECT * FROM foo"]
    sc.constraint_validations.must_equal [[:validates_presence, :name]]
    sc.constraint_validation_reflections.must_equal(:name=>[[:presence, {}]])
  end

  it "should correctly retrieve :message option from constraint validations table" do
    model_class(:message=>'foo').constraint_validations.must_equal [[:validates_presence, :name, {:message=>'foo'}]]
    @c.constraint_validation_reflections.must_equal(:name=>[[:presence, {:message=>'foo'}]])
  end

  it "should correctly retrieve :allow_nil option from constraint validations table" do
    model_class(:allow_nil=>true).constraint_validations.must_equal [[:validates_presence, :name, {:allow_nil=>true}]]
    @c.constraint_validation_reflections.must_equal(:name=>[[:presence, {:allow_nil=>true}]])
  end

  it "should handle presence validation" do
    model_class(:validation_type=>'presence').constraint_validations.must_equal [[:validates_presence, :name]]
    @c.constraint_validation_reflections.must_equal(:name=>[[:presence, {}]])
  end

  it "should handle exact_length validation" do
    model_class(:validation_type=>'exact_length', :argument=>'5').constraint_validations.must_equal [[:validates_exact_length, 5, :name]]
    @c.constraint_validation_reflections.must_equal(:name=>[[:exact_length, {:argument=>5}]])
  end

  it "should handle min_length validation" do
    model_class(:validation_type=>'min_length', :argument=>'5').constraint_validations.must_equal [[:validates_min_length, 5, :name]]
    @c.constraint_validation_reflections.must_equal(:name=>[[:min_length, {:argument=>5}]])
  end

  it "should handle max_length validation" do
    model_class(:validation_type=>'max_length', :argument=>'5').constraint_validations.must_equal [[:validates_max_length, 5, :name]]
    @c.constraint_validation_reflections.must_equal(:name=>[[:max_length, {:argument=>5}]])
  end

  it "should handle length_range validation" do
    model_class(:validation_type=>'length_range', :argument=>'3..5').constraint_validations.must_equal [[:validates_length_range, 3..5, :name]]
    @c.constraint_validation_reflections.must_equal(:name=>[[:length_range, {:argument=>3..5}]])
  end

  it "should handle length_range validation with an exclusive end" do
    model_class(:validation_type=>'length_range', :argument=>'3...5').constraint_validations.must_equal [[:validates_length_range, 3...5, :name]]
    @c.constraint_validation_reflections.must_equal(:name=>[[:length_range, {:argument=>3...5}]])
  end

  it "should handle format validation" do
    model_class(:validation_type=>'format', :argument=>'^foo.*').constraint_validations.must_equal [[:validates_format, /^foo.*/, :name]]
    @c.constraint_validation_reflections.must_equal(:name=>[[:format, {:argument=>/^foo.*/}]])
  end

  it "should handle format validation with case insensitive format" do
    model_class(:validation_type=>'iformat', :argument=>'^foo.*').constraint_validations.must_equal [[:validates_format, /^foo.*/i, :name]]
    @c.constraint_validation_reflections.must_equal(:name=>[[:format, {:argument=>/^foo.*/i}]])
  end

  it "should handle includes validation with array of strings" do
    model_class(:validation_type=>'includes_str_array', :argument=>'a,b,c').constraint_validations.must_equal [[:validates_includes, %w'a b c', :name]]
    @c.constraint_validation_reflections.must_equal(:name=>[[:includes, {:argument=>%w'a b c'}]])
  end

  it "should handle includes validation with array of integers" do
    model_class(:validation_type=>'includes_int_array', :argument=>'1,2,3').constraint_validations.must_equal [[:validates_includes, [1, 2, 3], :name]]
    @c.constraint_validation_reflections.must_equal(:name=>[[:includes, {:argument=>[1, 2, 3]}]])
  end

  it "should handle includes validation with inclusive range of integers" do
    model_class(:validation_type=>'includes_int_range', :argument=>'3..5').constraint_validations.must_equal [[:validates_includes, 3..5, :name]]
    @c.constraint_validation_reflections.must_equal(:name=>[[:includes, {:argument=>3..5}]])
  end

  it "should handle includes validation with exclusive range of integers" do
    model_class(:validation_type=>'includes_int_range', :argument=>'3...5').constraint_validations.must_equal [[:validates_includes, 3...5, :name]]
    @c.constraint_validation_reflections.must_equal(:name=>[[:includes, {:argument=>3...5}]])
  end

  it "should handle like validation" do
    model_class(:validation_type=>'like', :argument=>'foo').constraint_validations.must_equal [[:validates_format, /\Afoo\z/, :name]]
    @c.constraint_validation_reflections.must_equal(:name=>[[:format, {:argument=>/\Afoo\z/}]])
  end

  it "should handle ilike validation" do
    model_class(:validation_type=>'ilike', :argument=>'foo').constraint_validations.must_equal [[:validates_format, /\Afoo\z/i, :name]]
    @c.constraint_validation_reflections.must_equal(:name=>[[:format, {:argument=>/\Afoo\z/i}]])
  end

  it "should handle operator validation" do
    [[:str_lt, :<], [:str_lte, :<=], [:str_gt, :>], [:str_gte, :>=]].each do |vt, op|
      model_class(:validation_type=>vt.to_s, :argument=>'a').constraint_validations.must_equal [[:validates_operator, op, 'a', :name]]
      @c.constraint_validation_reflections.must_equal(:name=>[[:operator, {:operator=>op, :argument=>'a'}]])
      @c = @c.db.constraint_validations = nil
    end

    [[:int_lt, :<], [:int_lte, :<=], [:int_gt, :>], [:int_gte, :>=]].each do |vt, op|
      model_class(:validation_type=>vt.to_s, :argument=>'1').constraint_validations.must_equal [[:validates_operator, op, 1, :name]]
      @c.constraint_validation_reflections.must_equal(:name=>[[:operator, {:operator=>op, :argument=>1}]])
      @c = @c.db.constraint_validations = nil
    end
  end

  it "should handle like validation with % metacharacter" do
    model_class(:validation_type=>'like', :argument=>'%foo%').constraint_validations.must_equal [[:validates_format, /\A.*foo.*\z/, :name]]
    @c.constraint_validation_reflections.must_equal(:name=>[[:format, {:argument=>/\A.*foo.*\z/}]])
  end

  it "should handle like validation with %% metacharacter" do
    model_class(:validation_type=>'like', :argument=>'%%foo%%').constraint_validations.must_equal [[:validates_format, /\A%foo%\z/, :name]]
    @c.constraint_validation_reflections.must_equal(:name=>[[:format, {:argument=>/\A%foo%\z/}]])
  end

  it "should handle like validation with _ metacharacter" do
    model_class(:validation_type=>'like', :argument=>'f_o').constraint_validations.must_equal [[:validates_format, /\Af.o\z/, :name]]
    @c.constraint_validation_reflections.must_equal(:name=>[[:format, {:argument=>/\Af.o\z/}]])
  end

  it "should handle like validation with Regexp metacharacter" do
    model_class(:validation_type=>'like', :argument=>'\wfoo\d').constraint_validations.must_equal [[:validates_format, /\A\\wfoo\\d\z/, :name]]
    @c.constraint_validation_reflections.must_equal(:name=>[[:format, {:argument=>/\A\\wfoo\\d\z/}]])
  end

  it "should handle unique validation" do
    model_class(:validation_type=>'unique').constraint_validations.must_equal [[:validates_unique, [:name]]]
    @c.constraint_validation_reflections.must_equal(:name=>[[:unique, {}]])
  end

  it "should handle unique validation with multiple columns" do
    model_class(:validation_type=>'unique', :column=>'name,id').constraint_validations.must_equal [[:validates_unique, [:name, :id]]]
    @c.constraint_validation_reflections.must_equal([:name, :id]=>[[:unique, {}]])
  end

  it "should handle :validation_options" do
    c = model_class(:validation_type=>'unique', :column=>'name')
    c.plugin :constraint_validations, :validation_options=>{:unique=>{:message=>'is bad'}}
    c.constraint_validations.must_equal [[:validates_unique, [:name], {:message=>'is bad'}]]
    c.constraint_validation_reflections.must_equal(:name=>[[:unique, {:message=>'is bad'}]])
    c.dataset = c.dataset.with_fetch(:count=>1)
    o = c.new(:name=>'a')
    o.valid?.must_equal false
    o.errors.full_messages.must_equal ['name is bad']
  end

  it "should handle :validation_options merging with constraint validation options" do
    c = model_class(:validation_type=>'unique', :column=>'name', :allow_nil=>true)
    c.plugin :constraint_validations, :validation_options=>{:unique=>{:message=>'is bad'}}
    c.constraint_validations.must_equal [[:validates_unique, [:name], {:message=>'is bad', :allow_nil=>true}]]
    c.constraint_validation_reflections.must_equal(:name=>[[:unique, {:message=>'is bad', :allow_nil=>true}]])
    c.dataset = c.dataset.with_fetch(:count=>1)
    o = c.new(:name=>'a')
    o.valid?.must_equal false
    o.errors.full_messages.must_equal ['name is bad']
  end

  it "should handle :validation_options merging with subclasses" do
    c = model_class(:validation_type=>'unique', :column=>'name')
    c.plugin :constraint_validations, :validation_options=>{:unique=>{:message=>'is bad', :allow_nil=>true}}
    sc = Class.new(c)
    sc.plugin :constraint_validations, :validation_options=>{:unique=>{:allow_missing=>true, :allow_nil=>false}}
    sc.constraint_validations.must_equal [[:validates_unique, [:name], {:message=>'is bad', :allow_missing=>true, :allow_nil=>false}]]
    sc.constraint_validation_reflections.must_equal(:name=>[[:unique, {:message=>'is bad', :allow_missing=>true, :allow_nil=>false}]])
    sc.dataset = sc.dataset.with_fetch(:count=>1)
    o = sc.new(:name=>'a')
    o.valid?.must_equal false
    o.errors.full_messages.must_equal ['name is bad']
  end

  it "should used parsed constraint validations when validating" do
    o = model_class.new
    o.valid?.must_equal false
    o.errors.full_messages.must_equal ['name is not present']
  end

  it "should handle a table name specified as SQL::Identifier" do
    set_fetch(:table=>'sch__items')
    c = Class.new(Sequel::Model(@db[Sequel.identifier(:sch__items)]))
    c.plugin :constraint_validations
    c.constraint_validations.must_equal [[:validates_presence, :name]]
    c.constraint_validation_reflections.must_equal(:name=>[[:presence, {}]])
  end

  it "should handle a table name specified as SQL::QualifiedIdentifier" do
    set_fetch(:table=>'sch.items')
    c = Class.new(Sequel::Model(@db[Sequel.qualify(:sch, :items)]))
    c.plugin :constraint_validations
    c.constraint_validations.must_equal [[:validates_presence, :name]]
    c.constraint_validation_reflections.must_equal(:name=>[[:presence, {}]])
  end

  it "should freeze constraint validations data when freezing model class" do
    @c = model_class
    @c.freeze
    @c.constraint_validations.frozen?.must_equal true
    @c.constraint_validations.all?(&:frozen?).must_equal true
    @c.constraint_validation_reflections.frozen?.must_equal true
    @c.constraint_validation_reflections.values.all?(&:frozen?).must_equal true
    @c.constraint_validation_reflections.values.all?{|r| r.all?(&:frozen?)}.must_equal true
    @c.instance_variable_get(:@constraint_validation_options).frozen?.must_equal true
    @c.instance_variable_get(:@constraint_validation_options).values.all?(&:frozen?).must_equal true
  end
end
