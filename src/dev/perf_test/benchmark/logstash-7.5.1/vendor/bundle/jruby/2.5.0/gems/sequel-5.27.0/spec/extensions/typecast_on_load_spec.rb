require_relative "spec_helper"

describe Sequel::Model, "TypecastOnLoad plugin" do
  before do
    @db = Sequel.mock(:fetch=>{:id=>1, :b=>"1", :y=>"0"}, :columns=>[:id, :b, :y], :numrows=>1)
    def @db.supports_schema_parsing?() true end
    def @db.schema(*args)
      [[:id, {}], [:y, {:type=>:boolean, :db_type=>'tinyint(1)'}], [:b, {:type=>:integer, :db_type=>'integer'}]]
    end
    @c = Class.new(Sequel::Model(@db[:items])) do
      attr_accessor :bset
      def b=(x)
        self.bset = true
        super
      end
    end
  end 

  it "should call setter method with value when loading the object, for all given columns" do
    @c.plugin :typecast_on_load, :b
    o = @c.load(:id=>1, :b=>"1", :y=>"0")
    o.values.must_equal(:id=>1, :b=>1, :y=>"0")
    o.bset.must_equal true
  end

  it "should call setter method with value when reloading the object, for all given columns" do
    @c.plugin :typecast_on_load, :b
    o = @c.load(:id=>1, :b=>"1", :y=>"0")
    o.refresh
    o.values.must_equal(:id=>1, :b=>1, :y=>"0")
    o.bset.must_equal true
  end

  it "should call setter method with value when automatically reloading the object on creation" do
    @c.plugin :typecast_on_load, :b
    o = @c.new(:b=>"1", :y=>"0")
    o.save.values.must_equal(:id=>1, :b=>1, :y=>"0")
    o.bset.must_equal true
  end

  it "should call setter method with value when automatically reloading the object on creation via insert_select" do
    @c.plugin :typecast_on_load, :b
    @c.dataset = @c.dataset.with_extend{def insert_select(h) insert(h); first end}
    o = @c.new(:b=>"1", :y=>"0")
    o.save.values.must_equal(:id=>1, :b=>1, :y=>"0")
    o.bset.must_equal true
  end

  it "should allowing setting columns separately via add_typecast_on_load_columns" do
    @c.plugin :typecast_on_load
    @c.load(:id=>1, :b=>"1", :y=>"0").values.must_equal(:id=>1, :b=>"1", :y=>"0")
    @c.add_typecast_on_load_columns :b
    @c.load(:id=>1, :b=>"1", :y=>"0").values.must_equal(:id=>1, :b=>1, :y=>"0")
    @c.add_typecast_on_load_columns :y
    @c.load(:id=>1, :b=>"1", :y=>"0").values.must_equal(:id=>1, :b=>1, :y=>false)
  end

  it "should work with subclasses" do
    @c.plugin :typecast_on_load
    @c.load(:id=>1, :b=>"1", :y=>"0").values.must_equal(:id=>1, :b=>"1", :y=>"0")

    c1 = Class.new(@c)
    @c.add_typecast_on_load_columns :b
    @c.load(:id=>1, :b=>"1", :y=>"0").values.must_equal(:id=>1, :b=>1, :y=>"0")
    c1.load(:id=>1, :b=>"1", :y=>"0").values.must_equal(:id=>1, :b=>"1", :y=>"0")

    c2 = Class.new(@c)
    @c.add_typecast_on_load_columns :y
    @c.load(:id=>1, :b=>"1", :y=>"0").values.must_equal(:id=>1, :b=>1, :y=>false)
    c2.load(:id=>1, :b=>"1", :y=>"0").values.must_equal(:id=>1, :b=>1, :y=>"0")
    
    c1.add_typecast_on_load_columns :y
    c1.load(:id=>1, :b=>"1", :y=>"0").values.must_equal(:id=>1, :b=>"1", :y=>false)
  end

  it "should not mark the object as modified" do
    @c.plugin :typecast_on_load, :b
    @c.load(:id=>1, :b=>"1", :y=>"0").modified?.must_equal false
  end

  it "should freeze typecast_on_load columns when freezing model class" do
    @c.plugin :typecast_on_load, :b
    @c.freeze
    @c.typecast_on_load_columns.frozen?.must_equal true
  end
end
