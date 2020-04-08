require_relative "spec_helper"

describe "pg_array extension" do
  before(:all) do
    Sequel.extension :pg_array
  end

  before do
    @db = Sequel.connect('mock://postgres')
    @db.extend_datasets(Module.new do
      def supports_timestamp_timezones?; false end
      def supports_timestamp_usecs?; false; end
      def quote_identifiers?; false end
    end)
    @db.extension(:pg_array)
    @m = Sequel::Postgres
    @converter = @db.conversion_procs
    @db.sqls
  end

  it "should parse single dimensional text arrays" do
    c = @converter[1009]
    c.call("{a}").to_a.first.must_be_kind_of(String)
    c.call("{}").to_a.must_equal []
    c.call('{""}').to_a.must_equal [""]
    c.call('{"",""}').to_a.must_equal ["",""]
    c.call('{"","",""}').to_a.must_equal ["","",""]
    c.call("{a}").to_a.must_equal ['a']
    c.call('{"a b"}').to_a.must_equal ['a b']
    c.call('{a,b}').to_a.must_equal ['a', 'b']
  end

  it "should preserve encoding when parsing text arrays" do
    c = @converter[1009]
    c.call("{a,\u00E4}".encode('ISO-8859-1')).map(&:encoding).must_equal [Encoding::ISO_8859_1, Encoding::ISO_8859_1]
  end

  it "should parse multi-dimensional text arrays" do
    c = @converter[1009]
    c.call("{{}}").to_a.must_equal [[]]
    c.call("{{a},{b}}").to_a.must_equal [['a'], ['b']]
    c.call('{{"a b"},{c}}').to_a.must_equal [['a b'], ['c']]
    c.call('{{{a},{b}},{{c},{d}}}').to_a.must_equal [[['a'], ['b']], [['c'], ['d']]]
    c.call('{{{a,e},{b,f}},{{c,g},{d,h}}}').to_a.must_equal [[['a', 'e'], ['b', 'f']], [['c', 'g'], ['d', 'h']]]
  end

  it "should parse text arrays with embedded deliminaters" do
    c = @converter[1009]
    c.call('{{"{},","\\",\\,\\\\\\"\\""}}').to_a.must_equal [['{},', '",,\\""']]
  end

  it "should parse single dimensional integer arrays" do
    c = @converter[1007]
    c.call("{1}").to_a.first.must_be_kind_of(Integer)
    c.call("{}").to_a.must_equal []
    c.call("{1}").to_a.must_equal [1]
    c.call('{2,3}').to_a.must_equal [2, 3]
    c.call('{3,4,5}').to_a.must_equal [3, 4, 5]
  end

  it "should parse multiple dimensional integer arrays" do
    c = @converter[1007]
    c.call("{{}}").to_a.must_equal [[]]
    c.call("{{1}}").to_a.must_equal [[1]]
    c.call('{{2},{3}}').to_a.must_equal [[2], [3]]
    c.call('{{{1,2},{3,4}},{{5,6},{7,8}}}').to_a.must_equal [[[1, 2], [3, 4]], [[5, 6], [7, 8]]]
  end

  it "should parse single dimensional float arrays" do
    c = @converter[1022]
    c.call("{}").to_a.must_equal []
    c.call("{1.5}").to_a.must_equal [1.5]
    c.call('{2.5,3.5}').to_a.must_equal [2.5, 3.5]
    c.call('{3.5,4.5,5.5}').to_a.must_equal [3.5, 4.5, 5.5]
  end

  it "should parse multiple dimensional float arrays" do
    c = @converter[1022]
    c.call("{{}}").to_a.must_equal [[]]
    c.call("{{1.5}}").to_a.must_equal [[1.5]]
    c.call('{{2.5},{3.5}}').to_a.must_equal [[2.5], [3.5]]
    c.call('{{{1.5,2.5},{3.5,4.5}},{{5.5,6.5},{7.5,8.5}}}').to_a.must_equal [[[1.5, 2.5], [3.5, 4.5]], [[5.5, 6.5], [7.5, 8.5]]]
  end

  it "should parse integers in float arrays as floats" do
    c = @converter[1022]
    c.call("{1}").to_a.first.must_be_kind_of(Float)
    c.call("{1}").to_a.must_equal [1.0]
    c.call('{{{1,2},{3,4}},{{5,6},{7,8}}}').to_a.must_equal [[[1.0, 2.0], [3.0, 4.0]], [[5.0, 6.0], [7.0, 8.0]]]
  end

  it "should parse single dimensional decimal arrays" do
    c = @converter[1231]
    c.call("{}").to_a.must_equal []
    c.call("{1.5}").to_a.must_equal [BigDecimal('1.5')]
    c.call('{2.5,3.5}').to_a.must_equal [BigDecimal('2.5'), BigDecimal('3.5')]
    c.call('{3.5,4.5,5.5}').to_a.must_equal [BigDecimal('3.5'), BigDecimal('4.5'), BigDecimal('5.5')]
  end

  it "should parse multiple dimensional decimal arrays" do
    c = @converter[1231]
    c.call("{{}}").to_a.must_equal [[]]
    c.call("{{1.5}}").to_a.must_equal [[BigDecimal('1.5')]]
    c.call('{{2.5},{3.5}}').to_a.must_equal [[BigDecimal('2.5')], [BigDecimal('3.5')]]
    c.call('{{{1.5,2.5},{3.5,4.5}},{{5.5,6.5},{7.5,8.5}}}').to_a.must_equal [[[BigDecimal('1.5'), BigDecimal('2.5')], [BigDecimal('3.5'), BigDecimal('4.5')]], [[BigDecimal('5.5'), BigDecimal('6.5')], [BigDecimal('7.5'), BigDecimal('8.5')]]]
  end

  it "should parse decimal values with arbitrary precision" do
    c = @converter[1231]
    c.call("{1.000000000000000000005}").to_a.must_equal [BigDecimal('1.000000000000000000005')]
    c.call("{{1.000000000000000000005,2.000000000000000000005},{3.000000000000000000005,4.000000000000000000005}}").to_a.must_equal [[BigDecimal('1.000000000000000000005'), BigDecimal('2.000000000000000000005')], [BigDecimal('3.000000000000000000005'), BigDecimal('4.000000000000000000005')]]
  end

  it "should parse integers in decimal arrays as BigDecimals" do
    c = @converter[1231]
    c.call("{1}").to_a.first.must_be_kind_of(BigDecimal)
    c.call("{1}").to_a.must_equal [BigDecimal('1')]
    c.call('{{{1,2},{3,4}},{{5,6},{7,8}}}').to_a.must_equal [[[BigDecimal('1'), BigDecimal('2')], [BigDecimal('3'), BigDecimal('4')]], [[BigDecimal('5'), BigDecimal('6')], [BigDecimal('7'), BigDecimal('8')]]]
  end

  it "should parse arrays with NULL values" do
    @converter.values_at(1007, 1009, 1022, 1231).each do |c|
      c.call("{NULL}").must_equal [nil]
      c.call("{NULL,NULL}").must_equal [nil,nil]
      c.call("{{NULL,NULL},{NULL,NULL}}").must_equal [[nil,nil],[nil,nil]]
    end
  end

  it 'should parse arrays with "NULL" values' do
    c = @converter[1009]
    c.call('{NULL,"NULL",NULL}').to_a.must_equal [nil, "NULL", nil]
    c.call('{NULLA,"NULL",NULL}').to_a.must_equal ["NULLA", "NULL", nil]
  end

  it "should raise errors when for certain recognized invalid arrays" do
    c = @converter[1009]
    proc{c.call('')}.must_raise(Sequel::Error)
    proc{c.call('}')}.must_raise(Sequel::Error)
    proc{c.call('{{}')}.must_raise(Sequel::Error)
    proc{c.call('{}}')}.must_raise(Sequel::Error)
    proc{c.call('{a""}')}.must_raise(Sequel::Error)
    proc{c.call('{a{}}')}.must_raise(Sequel::Error)
    proc{c.call('{""a}')}.must_raise(Sequel::Error)
  end

  it "should literalize arrays without types correctly" do
    @db.literal(@m::PGArray.new([])).must_equal 'ARRAY[]'
    @db.literal(@m::PGArray.new([1])).must_equal 'ARRAY[1]'
    @db.literal(@m::PGArray.new([nil])).must_equal 'ARRAY[NULL]'
    @db.literal(@m::PGArray.new([nil, 1])).must_equal 'ARRAY[NULL,1]'
    @db.literal(@m::PGArray.new([1.0, 2.5])).must_equal 'ARRAY[1.0,2.5]'
    @db.literal(@m::PGArray.new([BigDecimal('1'), BigDecimal('2.000000000000000000005')])).must_equal 'ARRAY[1.0,2.000000000000000000005]'
    @db.literal(@m::PGArray.new([nil, "NULL"])).must_equal "ARRAY[NULL,'NULL']"
    @db.literal(@m::PGArray.new([nil, "{},[]'\""])).must_equal "ARRAY[NULL,'{},[]''\"']"
  end

  it "should literalize multidimensional arrays correctly" do
    @db.literal(@m::PGArray.new([[]])).must_equal 'ARRAY[[]]'
    @db.literal(@m::PGArray.new([[1, 2]])).must_equal 'ARRAY[[1,2]]'
    @db.literal(@m::PGArray.new([[3], [5]])).must_equal 'ARRAY[[3],[5]]'
    @db.literal(@m::PGArray.new([[[1.0]], [[2.5]]])).must_equal 'ARRAY[[[1.0]],[[2.5]]]'
    @db.literal(@m::PGArray.new([[[["NULL"]]]])).must_equal "ARRAY[[[['NULL']]]]"
    @db.literal(@m::PGArray.new([["a", "b"], ["{},[]'\"", nil]])).must_equal "ARRAY[['a','b'],['{},[]''\"',NULL]]"
  end

  it "should literalize with types correctly" do
    @db.literal(@m::PGArray.new([], :int4)).must_equal "'{}'::int4[]"
    @db.literal(@m::PGArray.new([1], :int4)).must_equal 'ARRAY[1]::int4[]'
    @db.literal(@m::PGArray.new([nil], :text)).must_equal 'ARRAY[NULL]::text[]'
    @db.literal(@m::PGArray.new([nil, 1], :int8)).must_equal 'ARRAY[NULL,1]::int8[]'
    @db.literal(@m::PGArray.new([1.0, 2.5], :real)).must_equal 'ARRAY[1.0,2.5]::real[]'
    @db.literal(@m::PGArray.new([BigDecimal('1'), BigDecimal('2.000000000000000000005')], :decimal)).must_equal 'ARRAY[1.0,2.000000000000000000005]::decimal[]'
    @db.literal(@m::PGArray.new([nil, "NULL"], :varchar)).must_equal "ARRAY[NULL,'NULL']::varchar[]"
    @db.literal(@m::PGArray.new([nil, "{},[]'\""], :"varchar(255)")).must_equal "ARRAY[NULL,'{},[]''\"']::varchar(255)[]"
  end

  it "should have Sequel.pg_array method for easy PGArray creation" do
    @db.literal(Sequel.pg_array([1])).must_equal 'ARRAY[1]'
    @db.literal(Sequel.pg_array([1, 2], :int4)).must_equal 'ARRAY[1,2]::int4[]'
    @db.literal(Sequel.pg_array([[[1], [2]], [[3], [4]]], :real)).must_equal 'ARRAY[[[1],[2]],[[3],[4]]]::real[]'
  end

  it "should have Sequel.pg_array return existing PGArrays as-is" do
    a = Sequel.pg_array([1])
    Sequel.pg_array(a).object_id.must_equal(a.object_id)
  end

  it "should have Sequel.pg_array create a new PGArrays if type of existing does not match" do
    a = Sequel.pg_array([1], :int4)
    b = Sequel.pg_array(a, :int8)
    a.must_equal b
    a.wont_be_same_as(b)
    a.array_type.must_equal :int4
    b.array_type.must_equal :int8
  end

  it "should support using arrays as bound variables" do
    @db.bound_variable_arg(1, nil).must_equal 1
    @db.bound_variable_arg(Sequel.pg_array([1,2]), nil).must_equal '{1,2}'
    @db.bound_variable_arg([1,2], nil).must_equal '{1,2}'
    @db.bound_variable_arg([[1,2]], nil).must_equal '{{1,2}}'
    @db.bound_variable_arg([1.0,2.0], nil).must_equal '{1.0,2.0}'
    @db.bound_variable_arg([Sequel.lit('a'), Sequel.blob("a\0'\"")], nil).must_equal '{a,"a\\\\000\\\\047\\""}'
    @db.bound_variable_arg(["\\ \"", 'NULL', nil], nil).must_equal '{"\\\\ \\"","NULL",NULL}'
  end

  it "should parse array types from the schema correctly" do
    @db.fetch = [{:name=>'id', :db_type=>'integer'}, {:name=>'i', :db_type=>'integer[]'}, {:name=>'f', :db_type=>'real[]'}, {:name=>'d', :db_type=>'numeric[]'}, {:name=>'t', :db_type=>'text[]'}]
    @db.schema(:items).map{|e| e[1][:type]}.must_equal [:integer, :integer_array, :real_array, :decimal_array, :string_array]
  end

  it "should set :callable_default schema entries if default value is recognized" do
    @db.fetch = [{:name=>'id', :db_type=>'integer', :default=>'1'}, {:name=>'t', :db_type=>'text[]', :default=>"'{}'::text[]"}]
    s = @db.schema(:items)
    s[0][1][:callable_default].must_be_nil
    v = s[1][1][:callable_default].call
    Sequel::Postgres::PGArray.===(v).must_equal true
    @db.literal(v).must_equal "'{}'::text[]"
    v << 'a'
    @db.literal(v).must_equal "ARRAY['a']::text[]"
  end

  it "should support typecasting of the various array types" do
    {
      :integer=>{:class=>Integer, :convert=>['1', 1, '1']},
      :float=>{:db_type=>'double precision',  :class=>Float, :convert=>['1.1', 1.1, '1.1']},
      :decimal=>{:db_type=>'numeric', :class=>BigDecimal, :convert=>['1.00000000000000000000000001', BigDecimal('1.00000000000000000000000001'), '1.00000000000000000000000001']},
      :string=>{:db_type=>'text', :class=>String, :convert=>[1, '1', "'1'"]},
      :bigint=>{:class=>Integer, :convert=>['1', 1, '1']},
      :boolean=>{:class=>TrueClass, :convert=>['t', true, 'true']},
      :blob=>{:db_type=>'bytea', :class=>Sequel::SQL::Blob, :convert=>['1', '1', "'1'"]},
      :date=>{:class=>Date, :convert=>['2011-10-12', Date.new(2011, 10, 12), "'2011-10-12'"]},
      :time=>{:db_type=>'time without time zone', :class=>Sequel::SQLTime, :convert=>['01:02:03', Sequel::SQLTime.create(1, 2, 3), "'01:02:03'"]},
      :datetime=>{:db_type=>'timestamp without time zone', :class=>Time, :convert=>['2011-10-12 01:02:03', Time.local(2011, 10, 12, 1, 2, 3), "'2011-10-12 01:02:03'"]},
      :time_timezone=>{:db_type=>'time with time zone', :class=>Sequel::SQLTime, :convert=>['01:02:03', Sequel::SQLTime.create(1, 2, 3), "'01:02:03'"]},
      :datetime_timezone=>{:db_type=>'timestamp with time zone', :class=>Time, :convert=>['2011-10-12 01:02:03', Time.local(2011, 10, 12, 1, 2, 3), "'2011-10-12 01:02:03'"]},
    }.each do |type, h|
      meth = :"#{type}_array"
      db_type = h[:db_type]||type
      klass = h[:class]
      array_in, value, output = h[:convert]

      [[array_in]].each do |input|
        v = @db.typecast_value(meth, input)
        v.must_equal [value]
        v.first.must_be_kind_of(klass)
        v.array_type.wont_equal nil
        @db.typecast_value(meth, Sequel.pg_array([value])).must_equal v
        @db.typecast_value(meth, v).object_id.must_equal(v.object_id)
      end

      [[[array_in]]].each do |input|
        v = @db.typecast_value(meth, input)
        v.must_equal [[value]]
        v.first.first.must_be_kind_of(klass)
        v.array_type.wont_equal nil
        @db.typecast_value(meth, Sequel.pg_array([[value]])).must_equal v
        @db.typecast_value(meth, v).object_id.must_equal(v.object_id)
      end

      @db.literal(@db.typecast_value(meth, [array_in])).must_equal "ARRAY[#{output}]::#{db_type}[]"
      @db.literal(@db.typecast_value(meth, [])).must_equal "'{}'::#{db_type}[]"
    end
    proc{@db.typecast_value(:integer_array, {})}.must_raise(Sequel::InvalidValue)
  end

  it "should support SQL::AliasMethods" do
    @db.select(Sequel.pg_array([1], :integer).as(:col1)).sql.must_equal 'SELECT ARRAY[1]::integer[] AS col1'
  end

  it "should support registering custom array types" do
    @db.register_array_type('foo')
    @db.typecast_value(:foo_array, []).class.must_equal(Sequel::Postgres::PGArray)
    @db.fetch = [{:name=>'id', :db_type=>'foo[]'}]
    @db.schema(:items).map{|e| e[1][:type]}.must_equal [:foo_array]
  end

  it "should support registering custom types with :type_symbol option" do
    @db.register_array_type('foo', :type_symbol=>:bar)
    @db.typecast_value(:bar_array, []).class.must_equal(Sequel::Postgres::PGArray)
    @db.fetch = [{:name=>'id', :db_type=>'foo[]'}]
    @db.schema(:items).map{|e| e[1][:type]}.must_equal [:bar_array]
  end

  it "should support using a block as a custom conversion proc given as block" do
    @db.register_array_type('foo', :oid=>1234){|s| (s*2).to_i}
    @db.conversion_procs[1234].call('{1}').must_equal [11]
  end

  it "should support using a block as a custom conversion proc given as :converter option" do
    @db.register_array_type('foo', :oid=>1234, :converter=>proc{|s| (s*2).to_i})
    @db.conversion_procs[1234].call('{1}').must_equal [11]
  end

  it "should support using an existing scaler conversion proc via the :scalar_oid option" do
    @db.register_array_type('foo', :oid=>1234, :scalar_oid=>16)
    @db.conversion_procs[1234].call('{t}').must_equal [true]
  end

  it "should not raise an error if using :scalar_oid option with unexisting scalar conversion proc" do
    @db.register_array_type('foo', :oid=>1234, :scalar_oid=>0)
    @db.conversion_procs[1234].call('{t}').must_equal ["t"]
  end

  it "should raise an error if using :converter option and a block argument" do
    proc{@db.register_array_type('foo', :converter=>proc{}){}}.must_raise(Sequel::Error)
  end

  it "should raise an error if using :scalar_oid option and a block argument" do
    proc{@db.register_array_type('foo', :scalar_oid=>16){}}.must_raise(Sequel::Error)
  end

  it "should support registering custom types with :oid option" do
    @db.register_array_type('foo', :oid=>1)
    @db.conversion_procs[1].call('{1}').class.must_equal(Sequel::Postgres::PGArray)
  end

  it "should support registering converters with blocks" do
    @db.register_array_type('foo', :oid=>4){|s| s.to_i * 2}
    @db.conversion_procs[4].call('{{1,2},{3,4}}').must_equal [[2, 4], [6, 8]]
  end

  it "should support registering custom types with :array_type option" do
    @db.register_array_type('foo', :oid=>3, :array_type=>:blah)
    @db.literal(@db.conversion_procs[3].call('{}')).must_equal "'{}'::blah[]"
  end

  it "should not support registering custom array types on a per-Database basis for frozen databases" do
    @db.freeze
    proc{@db.register_array_type('banana', :oid=>7865){|s| s}}.must_raise RuntimeError, TypeError
  end

  it "should support registering custom array types on a per-Database basis" do
    @db.register_array_type('banana', :oid=>7865){|s| s}
    @db.typecast_value(:banana_array, []).class.must_equal(Sequel::Postgres::PGArray)
    @db.fetch = [{:name=>'id', :db_type=>'banana[]'}]
    @db.schema(:items).map{|e| e[1][:type]}.must_equal [:banana_array]
    @db.conversion_procs.must_include(7865)
    @db.respond_to?(:typecast_value_banana_array, true).must_equal true

    db = Sequel.connect('mock://postgres', :quote_identifiers=>false)
    db.extend_datasets(Module.new{def supports_timestamp_timezones?; false; end; def supports_timestamp_usecs?; false; end})
    db.extension(:pg_array)
    db.fetch = [{:name=>'id', :db_type=>'banana[]'}]
    db.schema(:items).map{|e| e[1][:type]}.must_equal [nil]
    db.conversion_procs.wont_include(7865)
    db.respond_to?(:typecast_value_banana_array, true).must_equal false
  end

  it "should automatically look up the array and scalar oids when registering per-Database types" do
    @db.fetch = [[{:oid=>21, :typarray=>7866}], [{:name=>'id', :db_type=>'banana[]'}]]
    @db.register_array_type('banana', :scalar_typecast=>:integer)
    @db.sqls.must_equal ["SELECT typarray, oid FROM pg_type WHERE (typname = 'banana') LIMIT 1"]
    @db.schema(:items).map{|e| e[1][:type]}.must_equal [:banana_array]
    @db.conversion_procs[7866].call("{1,2}").must_equal [1,2]
    @db.typecast_value(:banana_array, %w'1 2').must_equal [1,2]
  end

  it "should not automatically look up oids if given both scalar and array oids" do
    @db.register_array_type('banana', :oid=>7866, :scalar_oid=>21, :scalar_typecast=>:integer)
    @db.sqls.must_equal []
    @db.conversion_procs[7866].call("{1,2}").must_equal [1,2]
    @db.typecast_value(:banana_array, %w'1 2').must_equal [1,2]
  end

  it "should not automatically look up oids if given array oid and block" do
    @db.register_array_type('banana', :oid=>7866, :scalar_typecast=>:integer){|s| s.to_i}
    @db.sqls.must_equal []
    @db.conversion_procs[7866].call("{1,2}").must_equal [1,2]
    @db.typecast_value(:banana_array, %w'1 2').must_equal [1,2]
  end

  it "should set appropriate timestamp conversion procs" do
    @db.conversion_procs[1185].call('{"2011-10-20 11:12:13"}').must_equal [Time.local(2011, 10, 20, 11, 12, 13)]
    @db.conversion_procs[1115].call('{"2011-10-20 11:12:13"}').must_equal [Time.local(2011, 10, 20, 11, 12, 13)]
  end

  it "should set appropriate timestamp conversion procs when adding conversion procs" do
    @db.fetch = [[{:oid=>2222}], [{:oid=>2222, :typarray=>2223}]]
    @db.add_named_conversion_proc(:foo){|v| v*2}
    procs = @db.conversion_procs
    procs[1185].call('{"2011-10-20 11:12:13"}').must_equal [Time.local(2011, 10, 20, 11, 12, 13)]
    procs[1115].call('{"2011-10-20 11:12:13"}').must_equal [Time.local(2011, 10, 20, 11, 12, 13)]
    procs[2222].call('1').must_equal '11'
    procs[2223].call('{"2"}').must_equal ['22']
  end

  it "should return correct results for Database#schema_type_class" do
    @db.register_array_type('banana', :oid=>7866, :scalar_typecast=>:integer){|s| s.to_i}
    @db.schema_type_class(:banana_array).must_equal Sequel::Postgres::PGArray
    @db.schema_type_class(:integer).must_equal Integer
  end

  it "should convert ruby arrays to pg arrays as :default option values" do
    @db.create_table('a'){column :b, 'c[]', :default=>[]; Integer :d}
    @db.sqls.must_equal ['CREATE TABLE a (b c[] DEFAULT (ARRAY[]::c[]), d integer)']
  end
end
