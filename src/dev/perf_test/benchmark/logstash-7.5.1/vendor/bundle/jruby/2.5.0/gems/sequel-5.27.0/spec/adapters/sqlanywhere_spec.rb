SEQUEL_ADAPTER_TEST = :sqlanywhere

require_relative 'spec_helper'

describe "convert_smallint_to_bool" do
  before do
    @db = DB
    @ds = @db[:booltest]
  end
  after do
    @db.convert_smallint_to_bool = true
  end
  
  describe "Database#convert_smallint_to_bool" do
    before do
      @db.create_table!(:booltest){column :b, 'smallint'; column :i, 'integer'}
    end
    after do
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
      @ds.delete
      @ds.insert(:b=>true, :i=>10)
      @ds.all.must_equal [{:b=>true, :i=>10}]
      @ds.delete
      @ds.insert(:b=>false, :i=>0)
      @ds.all.must_equal [{:b=>false, :i=>0}]
      @ds.delete
      @ds.insert(:b=>true, :i=>1)
      @ds.all.must_equal [{:b=>true, :i=>1}]
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
    end
  end

  describe "Dataset#convert_smallint_to_bool" do
    before do
      @db.create_table!(:booltest){column :b, 'smallint'; column :i, 'integer'}
    end
    after do
      @db.drop_table(:booltest)
    end
    
    it "should return smallints as bools and integers as integers when set" do
      @ds.delete
      @ds.insert(:b=>true, :i=>10)
      @ds.all.must_equal [{:b=>true, :i=>10}]
      @ds.delete
      @ds.insert(:b=>false, :i=>0)
      @ds.all.must_equal [{:b=>false, :i=>0}]
      @ds.delete
      @ds.insert(:b=>true, :i=>1)
      @ds.all.must_equal [{:b=>true, :i=>1}]
    end

    it "should support with_convert_smallint_to_bool for returning modified dataset with setting changed" do
      @ds = @ds.with_convert_smallint_to_bool(false)
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
    end
  end
end
