require_relative "spec_helper"

Sequel.extension :pg_array, :pg_json

describe "pg_json extension" do
  integer_class = RUBY_VERSION >= '2.4' ? Integer : Fixnum

  before(:all) do
    m = Sequel::Postgres
    @m = m::JSONDatabaseMethods
    @hc = m::JSONHash
    @ac = m::JSONArray
    @bhc = m::JSONBHash
    @bac = m::JSONBArray
  end
  before do
    @db = Sequel.connect('mock://postgres')
    @db.extend_datasets{def quote_identifiers?; false end}
    @db.extension(:pg_array, :pg_json)
  end

  it "should set up conversion procs correctly" do
    cp = @db.conversion_procs
    cp[114].call("{}").must_equal @hc.new({})
    cp[3802].call("{}").must_equal @bhc.new({})
  end

  it "should set up conversion procs for arrays correctly" do
    cp = @db.conversion_procs
    cp[199].call("{[]}").must_equal [@ac.new([])]
    cp[3807].call("{[]}").must_equal [@bac.new([])]
  end

  deprecated "should parse json strings correctly" do
    @m.parse_json('[]').class.must_equal(@ac)
    @m.parse_json('[]').to_a.must_equal []
    @m.parse_json('[1]').to_a.must_equal [1]
    @m.parse_json('[1, 2]').to_a.must_equal [1, 2]
    @m.parse_json('[1, [2], {"a": "b"}]').to_a.must_equal [1, [2], {'a'=>'b'}]
    @m.parse_json('{}').class.must_equal(@hc)
    @m.parse_json('{}').to_hash.must_equal({})
    @m.parse_json('{"a": "b"}').to_hash.must_equal('a'=>'b')
    @m.parse_json('{"a": "b", "c": [1, 2, 3]}').to_hash.must_equal('a'=>'b', 'c'=>[1, 2, 3])
    @m.parse_json('{"a": "b", "c": {"d": "e"}}').to_hash.must_equal('a'=>'b', 'c'=>{'d'=>'e'})
    proc{@m.parse_json("a")}.must_raise Sequel::InvalidValue

    begin
      Sequel.instance_eval do
        alias pj parse_json
        def parse_json(v)
          {'1'=>1, "'a'"=>'a', 'true'=>true, 'false'=>false, 'null'=>nil, 'o'=>Object.new, '[one]'=>[1]}.fetch(v){pj(v)}
        end
      end
      proc{@m.parse_json('o')}.must_raise(Sequel::InvalidValue)
    ensure
      Sequel.instance_eval do
        alias parse_json pj
      end
    end
  end

  deprecated "should parse json and non-json plain strings, integers, and floats correctly in db_parse_json" do
    @m.db_parse_json('{"a": "b", "c": {"d": "e"}}').to_hash.must_equal('a'=>'b', 'c'=>{'d'=>'e'})
    @m.db_parse_json('[1, [2], {"a": "b"}]').to_a.must_equal [1, [2], {'a'=>'b'}]
    @m.db_parse_json('1').must_equal 1
    @m.db_parse_json('"b"').must_equal 'b'
    @m.db_parse_json('1.1').must_equal 1.1
    proc{@m.db_parse_json("a")}.must_raise Sequel::InvalidValue
  end

  deprecated "should parse jsonb and non-jsonb plain strings, integers, and floats correctly in db_parse_jsonb" do
    @m.db_parse_jsonb('{"a": "b", "c": {"d": "e"}}').to_hash.must_equal('a'=>'b', 'c'=>{'d'=>'e'})
    @m.db_parse_jsonb('[1, [2], {"a": "b"}]').to_a.must_equal [1, [2], {'a'=>'b'}]
    @m.db_parse_jsonb('1').must_equal 1
    @m.db_parse_jsonb('"b"').must_equal 'b'
    @m.db_parse_jsonb('1.1').must_equal 1.1
    proc{@m.db_parse_jsonb("a")}.must_raise Sequel::InvalidValue
  end

  it "should parse json and non-json plain strings, integers, and floats correctly in conversion_proc" do
    cp = @db.conversion_procs[114]
    cp.call('{"a": "b", "c": {"d": "e"}}').to_hash.must_equal('a'=>'b', 'c'=>{'d'=>'e'})
    cp.call('[1, [2], {"a": "b"}]').to_a.must_equal [1, [2], {'a'=>'b'}]
    cp.call('1').must_equal 1
    cp.call('"b"').must_equal 'b'
    cp.call('1.1').must_equal 1.1
  end

  it "should parse jsonb and non-jsonb plain strings, integers, and floats correctly in conversion_proc" do
    cp = @db.conversion_procs[3802]
    cp.call('{"a": "b", "c": {"d": "e"}}').to_hash.must_equal('a'=>'b', 'c'=>{'d'=>'e'})
    cp.call('[1, [2], {"a": "b"}]').to_a.must_equal [1, [2], {'a'=>'b'}]
    cp.call('1').must_equal 1
    cp.call('"b"').must_equal 'b'
    cp.call('1.1').must_equal 1.1
  end

  it "should raise an error when attempting to parse invalid json" do
    [114, 3802].each do |oid|
      cp = @db.conversion_procs[oid]
      proc{cp.call('a')}.must_raise(Sequel::InvalidValue)

      begin
        Sequel.instance_eval do
          alias pj parse_json
          def parse_json(v)
            {'1'=>1, "'a'"=>'a', 'true'=>true, 'false'=>false, 'null'=>nil, 'o'=>Object.new, '[one]'=>[1]}.fetch(v){pj(v)}
          end
        end
        cp.call('1').must_equal 1
        cp.call("'a'").must_equal 'a'
        cp.call('true').must_equal true
        cp.call('false').must_equal false
        cp.call('null').must_be_nil
        proc{cp.call('o')}.must_raise(Sequel::InvalidValue)
        cp.call('one').must_equal 1
      ensure
        Sequel.instance_eval do
          alias parse_json pj
        end
      end
    end
  end

  it "should literalize JSONHash and JSONArray to strings correctly" do
    @db.literal(Sequel.pg_json([])).must_equal "'[]'::json"
    @db.literal(Sequel.pg_json([1, [2], {'a'=>'b'}])).must_equal "'[1,[2],{\"a\":\"b\"}]'::json"
    @db.literal(Sequel.pg_json({})).must_equal "'{}'::json"
    @db.literal(Sequel.pg_json('a'=>'b')).must_equal "'{\"a\":\"b\"}'::json"
  end

  it "should literalize JSONBHash and JSONBArray to strings correctly" do
    @db.literal(Sequel.pg_jsonb([])).must_equal "'[]'::jsonb"
    @db.literal(Sequel.pg_jsonb([1, [2], {'a'=>'b'}])).must_equal "'[1,[2],{\"a\":\"b\"}]'::jsonb"
    @db.literal(Sequel.pg_jsonb({})).must_equal "'{}'::jsonb"
    @db.literal(Sequel.pg_jsonb('a'=>'b')).must_equal "'{\"a\":\"b\"}'::jsonb"
  end

  it "should have Sequel.pg_json return JSONHash and JSONArray as is" do
    a = Sequel.pg_json({})
    Sequel.pg_json(a).object_id.must_equal(a.object_id)
    a = Sequel.pg_json([])
    Sequel.pg_json(a).object_id.must_equal(a.object_id)
  end

  it "should have Sequel.pg_json convert jsonb values" do
    a = {}
    v = Sequel.pg_json(Sequel.pg_jsonb(a))
    v.to_hash.must_be_same_as(a)
    v.class.must_equal(@hc)

    a = []
    v = Sequel.pg_json(Sequel.pg_jsonb(a))
    v.to_a.must_be_same_as(a)
    v.class.must_equal(@ac)
  end

  it "should have Sequel.pg_jsonb return JSONBHash and JSONBArray as is" do
    a = Sequel.pg_jsonb({})
    Sequel.pg_jsonb(a).object_id.must_equal(a.object_id)
    a = Sequel.pg_jsonb([])
    Sequel.pg_jsonb(a).object_id.must_equal(a.object_id)
  end

  it "should have Sequel.pg_jsonb convert json values" do
    a = {}
    v = Sequel.pg_jsonb(Sequel.pg_json(a))
    v.to_hash.must_be_same_as(a)
    v.class.must_equal(@bhc)

    a = []
    v = Sequel.pg_jsonb(Sequel.pg_json(a))
    v.to_a.must_be_same_as(a)
    v.class.must_equal(@bac)
  end

  it "should have JSONHashBase#to_hash method for getting underlying hash" do
    Sequel.pg_json({}).to_hash.must_be_kind_of(Hash)
    Sequel.pg_jsonb({}).to_hash.must_be_kind_of(Hash)
  end

  it "should allow aliasing json objects" do
    @db.literal(Sequel.pg_json({}).as(:a)).must_equal "'{}'::json AS a"
    @db.literal(Sequel.pg_json([]).as(:a)).must_equal "'[]'::json AS a"
    @db.literal(Sequel.pg_jsonb({}).as(:a)).must_equal "'{}'::jsonb AS a"
    @db.literal(Sequel.pg_jsonb([]).as(:a)).must_equal "'[]'::jsonb AS a"
  end

  it "should allow casting json objects" do
    @db.literal(Sequel.pg_json({}).cast(String)).must_equal "CAST('{}'::json AS text)"
    @db.literal(Sequel.pg_json([]).cast(String)).must_equal "CAST('[]'::json AS text)"
    @db.literal(Sequel.pg_jsonb({}).cast(String)).must_equal "CAST('{}'::jsonb AS text)"
    @db.literal(Sequel.pg_jsonb([]).cast(String)).must_equal "CAST('[]'::jsonb AS text)"
  end

  it "should have JSONArrayBase#to_a method for getting underlying array" do
    Sequel.pg_json([]).to_a.must_be_kind_of(Array)
    Sequel.pg_jsonb([]).to_a.must_be_kind_of(Array)
  end

  it "should support using JSONHashBase and JSONArrayBase as bound variables" do
    @db.bound_variable_arg(1, nil).must_equal 1
    @db.bound_variable_arg(Sequel.pg_json([1]), nil).must_equal '[1]'
    @db.bound_variable_arg(Sequel.pg_json('a'=>'b'), nil).must_equal '{"a":"b"}'
    @db.bound_variable_arg(Sequel.pg_jsonb([1]), nil).must_equal '[1]'
    @db.bound_variable_arg(Sequel.pg_jsonb('a'=>'b'), nil).must_equal '{"a":"b"}'
  end

  it "should support using json[] and jsonb[] types in bound variables" do
    @db.bound_variable_arg(Sequel.pg_array([Sequel.pg_json([{"a"=>1}]), Sequel.pg_json("b"=>[1, 2])]), nil).must_equal '{"[{\\"a\\":1}]","{\\"b\\":[1,2]}"}'
    @db.bound_variable_arg(Sequel.pg_array([Sequel.pg_jsonb([{"a"=>1}]), Sequel.pg_jsonb("b"=>[1, 2])]), nil).must_equal '{"[{\\"a\\":1}]","{\\"b\\":[1,2]}"}'
  end

  it "should support using wrapped JSON and JSONB primitives as bound variables" do
    @db.bound_variable_arg(Sequel.pg_json_wrap(1), nil).must_equal '1'
    @db.bound_variable_arg(Sequel.pg_json_wrap(2.5), nil).must_equal '2.5'
    @db.bound_variable_arg(Sequel.pg_json_wrap('a'), nil).must_equal '"a"'
    @db.bound_variable_arg(Sequel.pg_json_wrap(true), nil).must_equal 'true'
    @db.bound_variable_arg(Sequel.pg_json_wrap(false), nil).must_equal 'false'
    @db.bound_variable_arg(Sequel.pg_json_wrap(nil), nil).must_equal 'null'
  end

  it "should support using json[] and jsonb[] types in bound variables with ruby primitives" do
    @db.bound_variable_arg(Sequel.pg_array([1, 2.5, 'a', true, false, nil].map{|v| Sequel.pg_json_wrap(v)}), nil).must_equal '{"1","2.5","\"a\"","true","false","null"}'
  end

  it "Sequel.pg_json_wrap should wrap Ruby primitives in JSON wrappers" do
    Sequel.pg_json_wrap({}).class.must_equal Sequel::Postgres::JSONHash
    Sequel.pg_json_wrap({}).must_equal({})
    Sequel.pg_json_wrap([]).class.must_equal Sequel::Postgres::JSONArray
    Sequel.pg_json_wrap([]).must_equal []
    Sequel.pg_json_wrap('a').class.must_equal Sequel::Postgres::JSONString
    Sequel.pg_json_wrap('a').must_equal 'a'
    Sequel.pg_json_wrap(1).class.must_equal Sequel::Postgres::JSONInteger
    Sequel.pg_json_wrap(1).must_equal 1
    Sequel.pg_json_wrap(2.5).class.must_equal Sequel::Postgres::JSONFloat
    Sequel.pg_json_wrap(2.5).must_equal 2.5
    Sequel.pg_json_wrap(true).class.must_equal Sequel::Postgres::JSONTrue
    Sequel.pg_json_wrap(true).must_equal true
    Sequel.pg_json_wrap(false).class.must_equal Sequel::Postgres::JSONFalse
    Sequel.pg_json_wrap(false).must_equal false
    Sequel.pg_json_wrap(nil).class.must_equal Sequel::Postgres::JSONNull
    Sequel.pg_json_wrap(nil).must_be_nil

    c = Class.new(Hash).new
    Sequel.pg_json_wrap(c).class.must_equal Sequel::Postgres::JSONHash
    Sequel.pg_json_wrap(c).must_equal(c)

    c = Class.new(Array).new
    Sequel.pg_json_wrap(c).class.must_equal Sequel::Postgres::JSONArray
    Sequel.pg_json_wrap(c).must_equal c

    c = Class.new(String).new('a')
    Sequel.pg_json_wrap(c).class.must_equal Sequel::Postgres::JSONString
    Sequel.pg_json_wrap(c).must_equal c
  end

  it "Sequel.pg_json_wrap should fail when passed an unsupported object" do
    proc{Sequel.pg_json_wrap(Object.new)}.must_raise Sequel::Error
  end

  it "Sequel.pg_jsonb_wrap should wrap Ruby primitives in JSONB wrappers" do
    Sequel.pg_jsonb_wrap({}).class.must_equal Sequel::Postgres::JSONBHash
    Sequel.pg_jsonb_wrap({}).must_equal({})
    Sequel.pg_jsonb_wrap([]).class.must_equal Sequel::Postgres::JSONBArray
    Sequel.pg_jsonb_wrap([]).must_equal []
    Sequel.pg_jsonb_wrap('a').class.must_equal Sequel::Postgres::JSONBString
    Sequel.pg_jsonb_wrap('a').must_equal 'a'
    Sequel.pg_jsonb_wrap(1).class.must_equal Sequel::Postgres::JSONBInteger
    Sequel.pg_jsonb_wrap(1).must_equal 1
    Sequel.pg_jsonb_wrap(2.5).class.must_equal Sequel::Postgres::JSONBFloat
    Sequel.pg_jsonb_wrap(2.5).must_equal 2.5
    Sequel.pg_jsonb_wrap(true).class.must_equal Sequel::Postgres::JSONBTrue
    Sequel.pg_jsonb_wrap(true).must_equal true
    Sequel.pg_jsonb_wrap(false).class.must_equal Sequel::Postgres::JSONBFalse
    Sequel.pg_jsonb_wrap(false).must_equal false
    Sequel.pg_jsonb_wrap(nil).class.must_equal Sequel::Postgres::JSONBNull
    Sequel.pg_jsonb_wrap(nil).must_be_nil
  end

  it "Sequel.pg_jsonb_wrap should fail when passed an unsupported object" do
    proc{Sequel.pg_jsonb_wrap(Object.new)}.must_raise Sequel::Error
  end

  it "should not wrap JSON primitives in json and jsonb conversion_proc when not setting wrap_json_primitives" do
    [114, 3802].each do |oid|
      cp = @db.conversion_procs[oid]
      cp.call('1').class.must_equal(integer_class)
      cp.call('1').must_equal 1
      cp.call('2.5').class.must_equal Float
      cp.call('2.5').must_equal 2.5
      cp.call('"a"').class.must_equal String
      cp.call('"a"').must_equal 'a'
      cp.call('true').class.must_equal TrueClass
      cp.call('true').must_equal true
      cp.call('false').class.must_equal FalseClass
      cp.call('false').must_equal false
      cp.call('null').class.must_equal NilClass
      cp.call('null').must_be_nil
    end
  end

  it "should wrap JSON primitives in json conversion_proc when setting wrap_json_primitives" do
    cp = @db.conversion_procs[114]
    @db.wrap_json_primitives = true
    cp.call('1').class.must_equal Sequel::Postgres::JSONInteger
    cp.call('1').must_equal 1
    cp.call('2.5').class.must_equal Sequel::Postgres::JSONFloat
    cp.call('2.5').must_equal 2.5
    cp.call('"a"').class.must_equal Sequel::Postgres::JSONString
    cp.call('"a"').must_equal "a"
    cp.call('true').class.must_equal Sequel::Postgres::JSONTrue
    cp.call('true').must_equal true
    cp.call('false').class.must_equal Sequel::Postgres::JSONFalse
    cp.call('false').must_equal false
    cp.call('null').class.must_equal Sequel::Postgres::JSONNull
    cp.call('null').must_be_nil
  end

  it "should wrap JSON primitives in jsonb conversion_proc when setting wrap_json_primitives" do
    cp = @db.conversion_procs[3802]
    @db.wrap_json_primitives = true
    cp.call('1').class.must_equal Sequel::Postgres::JSONBInteger
    cp.call('1').must_equal 1
    cp.call('2.5').class.must_equal Sequel::Postgres::JSONBFloat
    cp.call('2.5').must_equal 2.5
    cp.call('"a"').class.must_equal Sequel::Postgres::JSONBString
    cp.call('"a"').must_equal "a"
    cp.call('true').class.must_equal Sequel::Postgres::JSONBTrue
    cp.call('true').must_equal true
    cp.call('false').class.must_equal Sequel::Postgres::JSONBFalse
    cp.call('false').must_equal false
    cp.call('null').class.must_equal Sequel::Postgres::JSONBNull
    cp.call('null').must_be_nil
  end

  it "should parse json type from the schema correctly" do
    @db.fetch = [{:name=>'id', :db_type=>'integer'}, {:name=>'i', :db_type=>'json'}]
    @db.schema(:items).map{|e| e[1][:type]}.must_equal [:integer, :json]
  end

  it "should parse json type from the schema correctly" do
    @db.fetch = [{:name=>'id', :db_type=>'integer'}, {:name=>'i', :db_type=>'jsonb'}]
    @db.schema(:items).map{|e| e[1][:type]}.must_equal [:integer, :jsonb]
  end

  it "should set :callable_default schema entries if default value is recognized" do
    @db.fetch = [{:name=>'id', :db_type=>'integer', :default=>'1'}, {:name=>'jh', :db_type=>'json', :default=>"'{}'::json"}, {:name=>'ja', :db_type=>'json', :default=>"'[]'::json"}, {:name=>'jbh', :db_type=>'jsonb', :default=>"'{}'::jsonb"}, {:name=>'jba', :db_type=>'jsonb', :default=>"'[]'::jsonb"}]
    s = @db.schema(:items)
    s[0][1][:callable_default].must_be_nil
    v = s[1][1][:callable_default].call
    Sequel::Postgres::JSONHash.===(v).must_equal true
    @db.literal(v).must_equal "'{}'::json"
    v['a'] = 'b'
    @db.literal(v).must_equal "'{\"a\":\"b\"}'::json"

    v = s[2][1][:callable_default].call
    Sequel::Postgres::JSONArray.===(v).must_equal true
    @db.literal(v).must_equal "'[]'::json"
    v << 1
    @db.literal(v).must_equal "'[1]'::json"

    v = s[3][1][:callable_default].call
    Sequel::Postgres::JSONBHash.===(v).must_equal true
    @db.literal(v).must_equal "'{}'::jsonb"
    v['a'] = 'b'
    @db.literal(v).must_equal "'{\"a\":\"b\"}'::jsonb"

    v = s[4][1][:callable_default].call
    Sequel::Postgres::JSONBArray.===(v).must_equal true
    @db.literal(v).must_equal "'[]'::jsonb"
    v << 1
    @db.literal(v).must_equal "'[1]'::jsonb"
  end

  it "should support typecasting for the json type" do
    h = Sequel.pg_json(1=>2)
    a = Sequel.pg_json([1])
    @db.typecast_value(:json, h).object_id.must_equal(h.object_id)
    @db.typecast_value(:json, h.to_hash).must_equal h
    @db.typecast_value(:json, h.to_hash).class.must_equal(@hc)
    @db.typecast_value(:json, Sequel.pg_jsonb(h)).must_equal h
    @db.typecast_value(:json, Sequel.pg_jsonb(h)).class.must_equal(@hc)
    @db.typecast_value(:json, a).object_id.must_equal(a.object_id)
    @db.typecast_value(:json, a.to_a).must_equal a
    @db.typecast_value(:json, a.to_a).class.must_equal(@ac)
    @db.typecast_value(:json, Sequel.pg_jsonb(a)).must_equal a
    @db.typecast_value(:json, Sequel.pg_jsonb(a)).class.must_equal(@ac)
    @db.typecast_value(:json, '[]').must_equal Sequel.pg_json([])
    @db.typecast_value(:json, '[]').class.must_equal(@ac)
    @db.typecast_value(:json, '{"a": "b"}').must_equal Sequel.pg_json("a"=>"b")
    @db.typecast_value(:json, '{"a": "b"}').class.must_equal(@hc)
    @db.typecast_value(:json, 1).class.must_equal Sequel::Postgres::JSONInteger
    @db.typecast_value(:json, 1).must_equal 1
    @db.typecast_value(:json, 2.5).class.must_equal Sequel::Postgres::JSONFloat
    @db.typecast_value(:json, 2.5).must_equal 2.5
    @db.typecast_value(:json, true).class.must_equal Sequel::Postgres::JSONTrue
    @db.typecast_value(:json, true).must_equal true
    @db.typecast_value(:json, false).class.must_equal Sequel::Postgres::JSONFalse
    @db.typecast_value(:json, false).must_equal false
    @db.typecast_value(:json, nil).class.must_equal NilClass
    @db.typecast_value(:json, nil).must_be_nil
    proc{@db.typecast_value(:json, 'a')}.must_raise(Sequel::InvalidValue)
    proc{@db.typecast_value(:json, Object.new)}.must_raise(Sequel::InvalidValue)

    @db.typecast_json_strings = true
    @db.typecast_value(:json, '[]').class.must_equal(Sequel::Postgres::JSONString)
    @db.typecast_value(:json, '[]').must_equal '[]'
  end

  it "should support typecasting for the jsonb type" do
    h = Sequel.pg_jsonb(1=>2)
    a = Sequel.pg_jsonb([1])
    @db.typecast_value(:jsonb, h).object_id.must_equal(h.object_id)
    @db.typecast_value(:jsonb, h.to_hash).must_equal h
    @db.typecast_value(:jsonb, h.to_hash).class.must_equal(@bhc)
    @db.typecast_value(:jsonb, Sequel.pg_json(h)).must_equal h
    @db.typecast_value(:jsonb, Sequel.pg_json(h)).class.must_equal(@bhc)
    @db.typecast_value(:jsonb, a).object_id.must_equal(a.object_id)
    @db.typecast_value(:jsonb, a.to_a).must_equal a
    @db.typecast_value(:jsonb, a.to_a).class.must_equal(@bac)
    @db.typecast_value(:jsonb, Sequel.pg_json(a)).must_equal a
    @db.typecast_value(:jsonb, Sequel.pg_json(a)).class.must_equal(@bac)
    @db.typecast_value(:jsonb, '[]').must_equal Sequel.pg_jsonb([])
    @db.typecast_value(:jsonb, '[]').class.must_equal(@bac)
    @db.typecast_value(:jsonb, '{"a": "b"}').must_equal Sequel.pg_jsonb("a"=>"b")
    @db.typecast_value(:jsonb, '{"a": "b"}').class.must_equal(@bhc)
    @db.typecast_value(:jsonb, 1).class.must_equal Sequel::Postgres::JSONBInteger
    @db.typecast_value(:jsonb, 1).must_equal 1
    @db.typecast_value(:jsonb, 2.5).class.must_equal Sequel::Postgres::JSONBFloat
    @db.typecast_value(:jsonb, 2.5).must_equal 2.5
    @db.typecast_value(:jsonb, true).class.must_equal Sequel::Postgres::JSONBTrue
    @db.typecast_value(:jsonb, true).must_equal true
    @db.typecast_value(:jsonb, false).class.must_equal Sequel::Postgres::JSONBFalse
    @db.typecast_value(:jsonb, false).must_equal false
    @db.typecast_value(:jsonb, nil).class.must_equal NilClass
    @db.typecast_value(:jsonb, nil).must_be_nil
    proc{@db.typecast_value(:jsonb, 'a')}.must_raise(Sequel::InvalidValue)
    proc{@db.typecast_value(:jsonb, Object.new)}.must_raise(Sequel::InvalidValue)

    @db.typecast_json_strings = true
    @db.typecast_value(:jsonb, '[]').class.must_equal(Sequel::Postgres::JSONBString)
    @db.typecast_value(:jsonb, '[]').must_equal '[]'
  end

  it "should return correct results for Database#schema_type_class" do
    @db.schema_type_class(:json).must_equal [Sequel::Postgres::JSONObject]
    @db.schema_type_class(:jsonb).must_equal [Sequel::Postgres::JSONBObject]
    @db.schema_type_class(:integer).must_equal Integer
  end
end
