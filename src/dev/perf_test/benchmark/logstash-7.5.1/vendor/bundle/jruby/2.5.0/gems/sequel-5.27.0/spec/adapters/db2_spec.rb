SEQUEL_ADAPTER_TEST = :db2

require_relative 'spec_helper'

if DB.table_exists?(:test)
  DB.drop_table(:test)
end

describe Sequel::Database do
  before do
    @db = DB
    @db.create_table(:test){String :a}
    @ds = @db[:test]
  end

  after do
    @db.drop_table(:test)
  end
  
  it "should provide disconnect functionality after preparing a connection" do
    @ds.prepare(:first, :a).call
    @db.disconnect
    @db.pool.size.must_equal 0
  end

  it "should return version correctly" do
    @db.db2_version.must_match(/DB2 v/i)
  end
end

describe "Simple Dataset operations" do
  before(:all) do
    DB.use_clob_as_blob = true
    DB.create_table!(:items) do
      Integer :id, :primary_key => true
      Integer :number
      column  :bin_string, 'varchar(20) for bit data'
      column  :bin_clob, 'clob'
    end
    @ds = DB[:items]
  end
  after(:each) do
    @ds.delete
  end
  after(:all) do
    DB.use_clob_as_blob = false
    DB.drop_table(:items)
  end

  it "should insert with a primary key specified" do
    @ds.insert(:id => 1,   :number => 10)
    @ds.insert(:id => 100, :number => 20)
    @ds.select_hash(:id, :number).must_equal(1 => 10, 100 => 20)
  end

  it "should insert into binary columns" do
    @ds.insert(:id => 1, :bin_string => Sequel.blob("\1"), :bin_clob => Sequel.blob("\2"))
    @ds.select(:bin_string, :bin_clob).first.must_equal(:bin_string => "\1", :bin_clob => "\2")
  end
end

describe Sequel::Database do
  before do
    @db = DB
  end
  after do
    @db.drop_table(:items)
  end

  it "should parse primary keys from the schema properly" do
    @db.create_table!(:items){Integer :number}
    @db.schema(:items).collect{|k,v| k if v[:primary_key]}.compact.must_equal []
    @db.create_table!(:items){primary_key :number}
    @db.schema(:items).collect{|k,v| k if v[:primary_key]}.compact.must_equal [:number]
    @db.create_table!(:items){Integer :number1, :null => false; Integer :number2, :null => false; primary_key [:number1, :number2]}
    @db.schema(:items).collect{|k,v| k if v[:primary_key]}.compact.must_equal [:number1, :number2]
  end

  it "should not error on alter_table operations that need REORG" do
    @db.create_table!(:items) do
      varchar :a
    end
    @db.alter_table(:items) do
      add_column :b, :varchar, :null => true
      set_column_allow_null :a, false
      add_index :a, :unique => true
    end
  end
end

describe "Sequel::IBMDB::Database#convert_smallint_to_bool" do
  before do
    @db = DB
    @db.create_table!(:booltest){column :b, 'smallint'; column :i, 'integer'}
    @ds = @db[:booltest]
  end
  after do
    @db.convert_smallint_to_bool = true
    @db.drop_table(:booltest)
  end
  
  it "should consider smallint datatypes as boolean if set, but not larger smallints" do
    @db.schema(:booltest, :reload=>true).first.last[:type].must_equal :boolean
    @db.schema(:booltest, :reload=>true).first.last[:db_type].must_match /smallint/i
    @db.convert_smallint_to_bool = false
    @db.schema(:booltest, :reload=>true).first.last[:type].must_equal :integer
    @db.schema(:booltest, :reload=>true).first.last[:db_type].must_match /smallint/i
  end
  
  it "should return smallints as bools and integers as integers when set" do
    @db.convert_smallint_to_bool = true
    @ds.delete
    @ds.insert(:b=>true, :i=>10)
    @ds.all.must_equal [{:b=>true, :i=>10}]
    @ds.delete
    @ds.insert(:b=>false, :i=>0)
    @ds.all.must_equal [{:b=>false, :i=>0}]
    @ds.delete
    @ds.insert(:b=>true, :i=>1)
    @ds.all.must_equal [{:b=>true, :i=>1}]

    @ds = @ds.with_convert_smallint_to_bool(false)
    @ds.delete
    @ds.insert(:b=>true, :i=>10)
    @ds.all.must_equal [{:b=>1, :i=>10}]
  end

  it "should return all smallints as integers when unset" do
    @db.convert_smallint_to_bool = false
    @ds.delete
    @ds.insert(:b=>true, :i=>10)
    @ds.all.must_equal [{:b=>1, :i=>10}]
    @ds.delete
    @ds.insert(:b=>false, :i=>0)
    @ds.all.must_equal [{:b=>0, :i=>0}]
    
    @ds.delete
    @ds.insert(:b=>1, :i=>10)
    @ds.all.must_equal [{:b=>1, :i=>10}]
    @ds.delete
    @ds.insert(:b=>0, :i=>0)
    @ds.all.must_equal [{:b=>0, :i=>0}]

    @ds = @ds.with_convert_smallint_to_bool(true)
    @ds.delete
    @ds.insert(:b=>true, :i=>10)
    @ds.all.must_equal [{:b=>true, :i=>10}]
  end
end if DB.adapter_scheme == :ibmdb

describe "Simple Dataset operations in transactions" do
  before do
    DB.create_table!(:items_insert_in_transaction) do
      Integer :id, :primary_key => true
      integer :number
    end
    @ds = DB[:items_insert_in_transaction]
  end
  after do
    DB.drop_table(:items_insert_in_transaction)
  end

  it "should insert correctly with a primary key specified inside a transaction" do
    DB.transaction do
      @ds.insert(:id=>100, :number=>20)
      @ds.count.must_equal 1
      @ds.order(:id).all.must_equal [{:id=>100, :number=>20}]
    end
  end
end
