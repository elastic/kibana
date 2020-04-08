require_relative "spec_helper"

describe "Supported types" do
  def create_items_table_with_column(name, type, opts={})
    DB.create_table!(:items){column name, type, opts}
    DB[:items]
  end

  after(:all) do
    DB.drop_table?(:items)
  end

  it "should support casting correctly" do
    ds = create_items_table_with_column(:number, Integer)
    ds.insert(:number => 1)
    ds.select(Sequel.cast(:number, String).as(:n)).map(:n).must_equal %w'1'
    ds = create_items_table_with_column(:name, String)
    ds.insert(:name=> '1')
    ds.select(Sequel.cast(:name, Integer).as(:n)).map(:n).must_equal [1]
  end

  it "should support NULL correctly" do
    ds = create_items_table_with_column(:number, Integer)
    ds.insert(:number => nil)
    ds.all.must_equal [{:number=>nil}]
  end

  it "should support generic integer type" do
    ds = create_items_table_with_column(:number, Integer)
    ds.insert(:number => 2)
    ds.all.must_equal [{:number=>2}]
  end
  
  it "should support generic bignum type" do
    ds = create_items_table_with_column(:number, :Bignum)
    ds.insert(:number => 2**34)
    ds.all.must_equal [{:number=>2**34}]
  end
  
  it "should support generic float type" do
    ds = create_items_table_with_column(:number, Float)
    ds.insert(:number => 2.1)
    ds.all.must_equal [{:number=>2.1}]
  end
  
  cspecify "should support generic numeric type", [:odbc, :mssql] do
    ds = create_items_table_with_column(:number, Numeric, :size=>[15, 10])
    ds.insert(:number => BigDecimal('2.123456789'))
    ds.all.must_equal [{:number=>BigDecimal('2.123456789')}]
    ds = create_items_table_with_column(:number, BigDecimal, :size=>[15, 10])
    ds.insert(:number => BigDecimal('2.123456789'))
    ds.all.must_equal [{:number=>BigDecimal('2.123456789')}]
  end

  it "should support generic string type" do
    ds = create_items_table_with_column(:name, String)
    ds.insert(:name => 'Test User')
    ds.all.must_equal [{:name=>'Test User'}]
  end
  
  it "should support generic text type" do
    ds = create_items_table_with_column(:name, String, :text=>true)
    ds.insert(:name => 'Test User'*100)
    ds.all.must_equal [{:name=>'Test User'*100}]

    ds.update(:name=>ds.get(:name))
    ds.all.must_equal [{:name=>'Test User'*100}]
  end
  
  cspecify "should support generic date type", [:jdbc, :sqlite], [:tinytds], [:jdbc, :mssql], :oracle do
    ds = create_items_table_with_column(:dat, Date)
    d = Date.today
    ds.insert(:dat => d)
    ds.first[:dat].must_be_kind_of(Date)
    ds.first[:dat].to_s.must_equal d.to_s
  end
  
  cspecify "should support generic time type", [:odbc], [:jdbc, :mssql], [:jdbc, :sqlite], [:mysql2], [:tinytds], :oracle, [:ado] do
    ds = create_items_table_with_column(:tim, Time, :only_time=>true)
    t = Sequel::SQLTime.now
    ds.insert(:tim => t)
    v = ds.first[:tim]
    ds.literal(v).must_equal ds.literal(t)
    v.must_be_kind_of(Sequel::SQLTime)
    ds.delete
    ds.insert(:tim => v)
    v2 = ds.first[:tim]
    ds.literal(v2).must_equal ds.literal(t)
    v2.must_be_kind_of(Sequel::SQLTime)
  end
  
  cspecify "should support generic datetime type", [:jdbc, :sqlite] do
    ds = create_items_table_with_column(:tim, DateTime)
    t = DateTime.now
    ds.insert(:tim => t)
    ds.first[:tim].strftime('%Y%m%d%H%M%S').must_equal t.strftime('%Y%m%d%H%M%S')
    ds = create_items_table_with_column(:tim, Time)
    t = Time.now
    ds.insert(:tim => t)
    ds.first[:tim].strftime('%Y%m%d%H%M%S').must_equal t.strftime('%Y%m%d%H%M%S')
  end
  
  cspecify "should support generic file type", [:odbc, :mssql], [:mysql2], [:tinytds] do
    ds = create_items_table_with_column(:name, File)
    ds.insert(:name =>Sequel.blob("a\0"*300))
    ds.all.must_equal [{:name=>Sequel.blob("a\0"*300)}]
    ds.first[:name].must_be_kind_of(::Sequel::SQL::Blob)
  end
  
  cspecify "should support generic boolean type", [:jdbc, :sqlite], [:jdbc, :db2], :oracle do
    ds = create_items_table_with_column(:number, TrueClass)
    ds.insert(:number => true)
    ds.all.must_equal [{:number=>true}]
    ds = create_items_table_with_column(:number, FalseClass)
    ds.insert(:number => true)
    ds.all.must_equal [{:number=>true}]
  end
  
  cspecify "should support generic boolean type with defaults", [:jdbc, :sqlite], [:jdbc, :db2], :oracle do
    ds = create_items_table_with_column(:number, TrueClass, :default=>true)
    ds.insert
    ds.all.must_equal [{:number=>true}]
    ds = create_items_table_with_column(:number, FalseClass, :default=>false)
    ds.insert
    ds.all.must_equal [{:number=>false}]
  end
end
