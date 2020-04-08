require_relative "spec_helper"

describe "Sequel::Plugins::PgRow" do
  before do
    @db = Sequel.connect('mock://postgres')
    @db.extend_datasets{def quote_identifiers?; false end}
    @db.extension(:pg_array)
    @c = Class.new(Sequel::Model(@db[:address]))
    @c.columns :street, :city
    @c.db_schema[:street][:type] = :string
    @c.db_schema[:city][:type] = :string
    @db.fetch = [[{:oid=>1098, :typrelid=>2, :typarray=>3}], [{:attname=>'street', :atttypid=>1324}, {:attname=>'city', :atttypid=>1324}]]
    @c.plugin :pg_row

    @c2 = Class.new(Sequel::Model(@db[:company]))
    @c2.columns :address
    @c2.db_schema[:address].merge!(:type=>:pg_row_address)
  end

  it "should have schema_type_class include Sequel::Model" do
    @c2.new.send(:schema_type_class, :address).must_equal @c
    @db.conversion_procs[1098].call('(123 Foo St,Bar City)').must_equal @c.load(:street=>'123 Foo St', :city=>'Bar City')
  end

  it "should set up a parser for the type that creates a model class" do
    @db.conversion_procs[1098].call('(123 Foo St,Bar City)').must_equal @c.load(:street=>'123 Foo St', :city=>'Bar City')
  end

  it "should set up type casting for the type" do
    @c2.new(:address=>{'street'=>123, 'city'=>:Bar}).address.must_equal @c.load(:street=>'123', :city=>'Bar')
  end

  it "should return model instances as is when typecasting to rows" do
    o = @c.load(:street=>'123', :city=>'Bar')
    @c2.new(:address=>o).address.must_be_same_as(o)
  end

  it "should handle literalizing model instances" do
    @db.literal(@c.load(:street=>'123 Foo St', :city=>'Bar City')).must_equal "ROW('123 Foo St', 'Bar City')::address"
  end

  it "should handle literalizing model instances when model table is aliased" do
    @c.dataset = @c.dataset.from(Sequel.as(:address, :a))
    @db.literal(@c.load(:street=>'123 Foo St', :city=>'Bar City')).must_equal "ROW('123 Foo St', 'Bar City')::address"
  end

  it "should handle model instances in bound variables" do
    @db.bound_variable_arg(1, nil).must_equal 1
    @db.bound_variable_arg(@c.load(:street=>'123 Foo St', :city=>'Bar City'), nil).must_equal '("123 Foo St","Bar City")'
  end

  it "should handle model instances in arrays of bound variables" do
    @db.bound_variable_arg(1, nil).must_equal 1
    @db.bound_variable_arg(Sequel.pg_array([@c.load(:street=>'123 Foo St', :city=>'Bar City')]), nil).must_equal '{"(\\"123 Foo St\\",\\"Bar City\\")"}'
  end

  it "should allow inserting just this model value" do
    @c2.dataset.insert_sql(@c.load(:street=>'123', :city=>'Bar')).must_equal "INSERT INTO company VALUES (ROW('123', 'Bar')::address)"
  end
end
