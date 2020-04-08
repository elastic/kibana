require_relative "spec_helper"

describe "pg_hstore extension" do
  before do
    Sequel.extension :pg_array, :pg_hstore
    @db = Sequel.connect('mock://postgres')
    @db.extend_datasets{def quote_identifiers?; false end}
    @m = Sequel::Postgres
    @c = @m::HStore
    @db.fetch = {:oid=>9999, :typname=>'hstore'}
    @db.extension :pg_hstore
  end

  it "should parse hstore strings correctly" do
    @c.parse('').to_hash.must_equal({})
    @c.parse('"a"=>"b"').to_hash.must_equal('a'=>'b')
    @c.parse('"a"=>"b", "c"=>NULL').to_hash.must_equal('a'=>'b', 'c'=>nil)
    @c.parse('"a"=>"b", "c"=>"NULL"').to_hash.must_equal('a'=>'b', 'c'=>'NULL')
    @c.parse('"a"=>"b", "c"=>"\\\\ \\"\'=>"').to_hash.must_equal('a'=>'b', 'c'=>'\ "\'=>')
  end

  it "should cache parse results" do
    r = @c::Parser.new('')
    o = r.parse
    o.must_equal({})
    r.parse.must_be_same_as(o)
  end

  it "should literalize HStores to strings correctly" do
    @db.literal(Sequel.hstore({})).must_equal '\'\'::hstore'
    @db.literal(Sequel.hstore("a"=>"b")).must_equal '\'"a"=>"b"\'::hstore'
    @db.literal(Sequel.hstore("c"=>nil)).must_equal '\'"c"=>NULL\'::hstore'
    @db.literal(Sequel.hstore("c"=>'NULL')).must_equal '\'"c"=>"NULL"\'::hstore'
    @db.literal(Sequel.hstore('c'=>'\ "\'=>')).must_equal '\'"c"=>"\\\\ \\"\'\'=>"\'::hstore'
    @db.literal(Sequel.hstore("a"=>"b","c"=>"d")).must_equal '\'"a"=>"b","c"=>"d"\'::hstore'
  end

  it "should register conversion proc correctly" do
    @db.conversion_procs[9999].call('"a"=>"b"').must_equal('a'=>'b')
  end

  it "should have Sequel.hstore method for creating HStore instances" do
    Sequel.hstore({}).class.must_equal(@c)
  end

  it "should have Sequel.hstore return HStores as-is" do
    a = Sequel.hstore({})
    Sequel.hstore(a).object_id.must_equal(a.object_id)
  end

  it "should HStore#to_hash method for getting underlying hash" do
    Sequel.hstore({}).to_hash.must_be_kind_of(Hash)
  end

  it "should convert keys and values to strings on creation" do
    Sequel.hstore(1=>2).to_hash.must_equal("1"=>"2")
  end

  it "should convert keys and values to strings on assignment" do
    v = Sequel.hstore({})
    v[1] = 2
    v.to_hash.must_equal("1"=>"2")
    v.store(:'1', 3)
    v.to_hash.must_equal("1"=>"3")
  end

  it "should not convert nil values to strings on creation" do
    Sequel.hstore(:foo=>nil).to_hash.must_equal("foo"=>nil)
  end

  it "should not convert nil values to strings on assignment" do
    v = Sequel.hstore({})
    v[:foo] = nil
    v.to_hash.must_equal("foo"=>nil)
  end

  it "should convert lookups by key to string" do
    Sequel.hstore('foo'=>'bar')[:foo].must_equal 'bar'
    Sequel.hstore('1'=>'bar')[1].must_equal 'bar'

    Sequel.hstore('foo'=>'bar').fetch(:foo).must_equal 'bar'
    Sequel.hstore('foo'=>'bar').fetch(:foo2, 2).must_equal 2
    k = nil
    Sequel.hstore('foo2'=>'bar').fetch(:foo){|key| k = key }.must_equal 'foo'
    k.must_equal 'foo'
    
    Sequel.hstore('foo'=>'bar').has_key?(:foo).must_equal true
    Sequel.hstore('foo'=>'bar').has_key?(:bar).must_equal false
    Sequel.hstore('foo'=>'bar').key?(:foo).must_equal true
    Sequel.hstore('foo'=>'bar').key?(:bar).must_equal false
    Sequel.hstore('foo'=>'bar').member?(:foo).must_equal true
    Sequel.hstore('foo'=>'bar').member?(:bar).must_equal false
    Sequel.hstore('foo'=>'bar').include?(:foo).must_equal true
    Sequel.hstore('foo'=>'bar').include?(:bar).must_equal false

    Sequel.hstore('foo'=>'bar', '1'=>'2').values_at(:foo3, :foo, :foo2, 1).must_equal [nil, 'bar', nil, '2']

    Sequel.hstore('foo'=>'bar').assoc(:foo).must_equal ['foo', 'bar']
    Sequel.hstore('foo'=>'bar').assoc(:foo2).must_be_nil
  end

  it "should convert has_value?/value? lookups to string" do
    Sequel.hstore('foo'=>'bar').has_value?(:bar).must_equal true
    Sequel.hstore('foo'=>'bar').has_value?(:foo).must_equal false
    Sequel.hstore('foo'=>'bar').value?(:bar).must_equal true
    Sequel.hstore('foo'=>'bar').value?(:foo).must_equal false
  end

  it "should handle nil values in has_value?/value? lookups" do
    Sequel.hstore('foo'=>'').has_value?('').must_equal true
    Sequel.hstore('foo'=>'').has_value?(nil).must_equal false
    Sequel.hstore('foo'=>nil).has_value?(nil).must_equal true
  end

  it "should have underlying hash convert lookups by key to string" do
    Sequel.hstore('foo'=>'bar').to_hash[:foo].must_equal 'bar'
    Sequel.hstore('1'=>'bar').to_hash[1].must_equal 'bar'
  end

  it "should convert key lookups to string" do
    Sequel.hstore('foo'=>'bar').key(:bar).must_equal 'foo'
    Sequel.hstore('foo'=>'bar').key(:bar2).must_be_nil
  end

  it "should handle nil values in key lookups" do
    Sequel.hstore('foo'=>'').key('').must_equal 'foo'
    Sequel.hstore('foo'=>'').key(nil).must_be_nil
    Sequel.hstore('foo'=>nil).key(nil).must_equal 'foo'
  end

  it "should convert rassoc lookups to string" do
    Sequel.hstore('foo'=>'bar').rassoc(:bar).must_equal ['foo', 'bar']
    Sequel.hstore('foo'=>'bar').rassoc(:bar2).must_be_nil
  end

  it "should handle nil values in rassoc lookups" do
    Sequel.hstore('foo'=>'').rassoc('').must_equal ['foo', '']
    Sequel.hstore('foo'=>'').rassoc(nil).must_be_nil
    Sequel.hstore('foo'=>nil).rassoc(nil).must_equal ['foo', nil]
  end

  it "should have delete convert key to string" do
    v = Sequel.hstore('foo'=>'bar')
    v.delete(:foo).must_equal 'bar'
    v.to_hash.must_equal({})
  end

  it "should handle #replace with hashes that do not use strings" do
    v = Sequel.hstore('foo'=>'bar')
    v.replace(:bar=>1)
    v.class.must_equal(@c)
    v.must_equal('bar'=>'1')
    v.to_hash[:bar].must_equal '1'
  end

  it "should handle #merge with hashes that do not use strings" do
    v = Sequel.hstore('foo'=>'bar').merge(:bar=>1)
    v.class.must_equal(@c)
    v.must_equal('foo'=>'bar', 'bar'=>'1')
  end

  it "should handle #merge/#update with hashes that do not use strings" do
    v = Sequel.hstore('foo'=>'bar')
    v.merge!(:bar=>1)
    v.class.must_equal(@c)
    v.must_equal('foo'=>'bar', 'bar'=>'1')

    v = Sequel.hstore('foo'=>'bar')
    v.update(:bar=>1)
    v.class.must_equal(@c)
    v.must_equal('foo'=>'bar', 'bar'=>'1')
  end

  it "should support using hstores as bound variables" do
    @db.bound_variable_arg(1, nil).must_equal 1
    @db.bound_variable_arg({'1'=>'2'}, nil).must_equal '"1"=>"2"'
    @db.bound_variable_arg(Sequel.hstore('1'=>'2'), nil).must_equal '"1"=>"2"'
    @db.bound_variable_arg(Sequel.hstore('1'=>nil), nil).must_equal '"1"=>NULL'
    @db.bound_variable_arg(Sequel.hstore('1'=>"NULL"), nil).must_equal '"1"=>"NULL"'
    @db.bound_variable_arg(Sequel.hstore('1'=>"'\\ \"=>"), nil).must_equal '"1"=>"\'\\\\ \\"=>"'
    @db.bound_variable_arg(Sequel.hstore("a"=>"b","c"=>"d"), nil).must_equal '"a"=>"b","c"=>"d"'
  end

  it "should parse hstore type from the schema correctly" do
    @db.fetch = [{:name=>'id', :db_type=>'integer'}, {:name=>'i', :db_type=>'hstore'}]
    @db.schema(:items).map{|e| e[1][:type]}.must_equal [:integer, :hstore]
  end

  it "should set :callable_default schema entries if default value is recognized" do
    @db.fetch = [{:name=>'id', :db_type=>'integer', :default=>'1'}, {:name=>'t', :db_type=>'hstore', :default=>"''::hstore"}]
    s = @db.schema(:items)
    s[0][1][:callable_default].must_be_nil
    v = s[1][1][:callable_default].call
    Sequel::Postgres::HStore.===(v).must_equal true
    @db.literal(v).must_equal "''::hstore"
    v['a'] = 'b'
    @db.literal(v).must_equal "'\"a\"=>\"b\"'::hstore"
  end

  it "should support typecasting for the hstore type" do
    h = Sequel.hstore(1=>2)
    @db.typecast_value(:hstore, h).object_id.must_equal(h.object_id)
    @db.typecast_value(:hstore, {}).class.must_equal(@c)
    @db.typecast_value(:hstore, {}).must_equal Sequel.hstore({})
    @db.typecast_value(:hstore, {'a'=>'b'}).must_equal Sequel.hstore("a"=>"b")
    proc{@db.typecast_value(:hstore, [])}.must_raise(Sequel::InvalidValue)
  end

  it "should be serializable" do 
    v = Sequel.hstore('foo'=>'bar')
    dump = Marshal.dump(v) 
    Marshal.load(dump).must_equal v    
  end 

  it "should return correct results for Database#schema_type_class" do
    @db.schema_type_class(:hstore).must_equal Sequel::Postgres::HStore
    @db.schema_type_class(:integer).must_equal Integer
  end
end
