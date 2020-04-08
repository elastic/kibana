require_relative "spec_helper"

describe "pg_range extension" do
  before(:all) do
    Sequel.extension :pg_array, :pg_range
  end

  before do
    @db = Sequel.connect('mock://postgres')
    @R = Sequel::Postgres::PGRange
    @db.extend_datasets do
      def supports_timestamp_timezones?; false end
      def supports_timestamp_usecs?; false end
      def quote_identifiers?; false end
    end
    @db.extension(:pg_array, :pg_range)
  end

  endless_range_support = RUBY_VERSION >= '2.6'
  startless_range_support = RUBY_VERSION >= '2.7'

  it "should set up conversion procs correctly" do
    cp = @db.conversion_procs
    cp[3904].call("[1,2]").must_equal @R.new(1,2, :exclude_begin=>false, :exclude_end=>false, :db_type=>'int4range')
    cp[3906].call("[1,2]").must_equal @R.new(1,2, :exclude_begin=>false, :exclude_end=>false, :db_type=>'numrange')
    cp[3908].call("[2011-01-02 10:20:30,2011-02-03 10:20:30)").must_equal @R.new(Time.local(2011, 1, 2, 10, 20, 30),Time.local(2011, 2, 3, 10, 20, 30), :exclude_begin=>false, :exclude_end=>true, :db_type=>'tsrange')
    cp[3910].call("[2011-01-02 10:20:30,2011-02-03 10:20:30)").must_equal @R.new(Time.local(2011, 1, 2, 10, 20, 30),Time.local(2011, 2, 3, 10, 20, 30), :exclude_begin=>false, :exclude_end=>true, :db_type=>'tstzrange')
    cp[3912].call("[2011-01-02,2011-02-03)").must_equal  @R.new(Date.new(2011, 1, 2),Date.new(2011, 2, 3), :exclude_begin=>false, :exclude_end=>true, :db_type=>'daterange')
    cp[3926].call("[1,2]").must_equal @R.new(1,2, :exclude_begin=>false, :exclude_end=>false, :db_type=>'int8range')
  end

  it "should set up conversion procs for arrays correctly" do
    cp = @db.conversion_procs
    cp[3905].call("{\"[1,2]\"}").must_equal [@R.new(1,2, :exclude_begin=>false, :exclude_end=>false, :db_type=>'int4range')]
    cp[3907].call("{\"[1,2]\"}").must_equal [@R.new(1,2, :exclude_begin=>false, :exclude_end=>false, :db_type=>'numrange')]
    cp[3909].call("{\"[2011-01-02 10:20:30,2011-02-03 10:20:30)\"}").must_equal [@R.new(Time.local(2011, 1, 2, 10, 20, 30),Time.local(2011, 2, 3, 10, 20, 30), :exclude_begin=>false, :exclude_end=>true, :db_type=>'tsrange')]
    cp[3911].call("{\"[2011-01-02 10:20:30,2011-02-03 10:20:30)\"}").must_equal [@R.new(Time.local(2011, 1, 2, 10, 20, 30),Time.local(2011, 2, 3, 10, 20, 30), :exclude_begin=>false, :exclude_end=>true, :db_type=>'tstzrange')]
    cp[3913].call("{\"[2011-01-02,2011-02-03)\"}").must_equal [@R.new(Date.new(2011, 1, 2),Date.new(2011, 2, 3), :exclude_begin=>false, :exclude_end=>true, :db_type=>'daterange')]
    cp[3927].call("{\"[1,2]\"}").must_equal [@R.new(1,2, :exclude_begin=>false, :exclude_end=>false, :db_type=>'int8range')]
  end

  it "should literalize Range instances to strings correctly" do
    @db.literal(Date.new(2011, 1, 2)...Date.new(2011, 3, 2)).must_equal "'[2011-01-02,2011-03-02)'"
    @db.literal(Time.local(2011, 1, 2, 10, 20, 30)...Time.local(2011, 2, 3, 10, 20, 30)).must_equal "'[2011-01-02 10:20:30,2011-02-03 10:20:30)'"
    @db.literal(DateTime.new(2011, 1, 2, 10, 20, 30)...DateTime.new(2011, 2, 3, 10, 20, 30)).must_equal "'[2011-01-02 10:20:30,2011-02-03 10:20:30)'"
    @db.literal(DateTime.new(2011, 1, 2, 10, 20, 30)...DateTime.new(2011, 2, 3, 10, 20, 30)).must_equal "'[2011-01-02 10:20:30,2011-02-03 10:20:30)'"
    @db.literal(1..2).must_equal "'[1,2]'"
    @db.literal(1.0..2.0).must_equal "'[1.0,2.0]'"
    @db.literal(BigDecimal('1.0')..BigDecimal('2.0')).must_equal "'[1.0,2.0]'"
    @db.literal(Sequel.lit('a')..Sequel.lit('z')).must_equal "'[a,z]'"
    @db.literal(''..'()[]",\\2').must_equal "'[\"\",\\(\\)\\[\\]\\\"\\,\\\\2]'"
  end

  it "should literalize endless Range instances to strings correctly" do
    @db.literal(eval('1..')).must_equal "'[1,]'"
    @db.literal(eval('1...')).must_equal "'[1,)'"
  end if endless_range_support

  it "should literalize startless Range instances to strings correctly" do
    @db.literal(eval('..1')).must_equal "'[,1]'"
    @db.literal(eval('...1')).must_equal "'[,1)'"
  end if startless_range_support

  it "should literalize startless, endless Range instances to strings correctly" do
    @db.literal(eval('nil..nil')).must_equal "'[,]'"
    @db.literal(eval('nil...nil')).must_equal "'[,)'"
  end if startless_range_support

  it "should literalize PGRange instances to strings correctly" do
    @db.literal(@R.new(1, 2)).must_equal "'[1,2]'"
    @db.literal(@R.new(true, false)).must_equal "'[true,false]'"
    @db.literal(@R.new(1, 2, :exclude_begin=>true)).must_equal "'(1,2]'"
    @db.literal(@R.new(1, 2, :exclude_end=>true)).must_equal "'[1,2)'"
    @db.literal(@R.new(nil, 2)).must_equal "'[,2]'"
    @db.literal(@R.new(1, nil)).must_equal "'[1,]'"
    @db.literal(@R.new(1, 2, :db_type=>'int8range')).must_equal "int8range(1,2,'[]')"
    @db.literal(@R.new(nil, nil, :empty=>true)).must_equal "'empty'"
    @db.literal(@R.new(nil, nil, :empty=>true, :db_type=>'int8range')).must_equal "'empty'::int8range"
    @db.literal(@R.new("", 2)).must_equal "'[\"\",2]'"
  end

  it "should not affect literalization of custom objects" do
    o = Object.new
    def o.sql_literal(ds) 'v' end
    @db.literal(o).must_equal 'v'
  end

  it "should support using Range instances as bound variables" do
    @db.bound_variable_arg(1..2, nil).must_equal "[1,2]"
  end

  it "should support using endless Range instances as bound variables" do
    @db.bound_variable_arg(eval('1..'), nil).must_equal "[1,]"
    @db.bound_variable_arg(eval('1...'), nil).must_equal "[1,)"
  end if endless_range_support

  it "should support using startless Range instances as bound variables" do
    @db.bound_variable_arg(eval('..1'), nil).must_equal "[,1]"
    @db.bound_variable_arg(eval('...1'), nil).must_equal "[,1)"
  end if startless_range_support

  it "should support using startless, endless Range instances as bound variables" do
    @db.bound_variable_arg(eval('nil..nil'), nil).must_equal "[,]"
    @db.bound_variable_arg(eval('nil...nil'), nil).must_equal "[,)"
  end if startless_range_support

  it "should support using PGRange instances as bound variables" do
    @db.bound_variable_arg(@R.new(1, 2), nil).must_equal "[1,2]"
  end

  it "should support using arrays of Range instances as bound variables" do
    @db.bound_variable_arg([1..2,2...3], nil).must_equal '{"[1,2]","[2,3)"}'
  end

  it "should support using arrays of endless Range instances as bound variables" do
    @db.bound_variable_arg([eval('1..'), eval('2..')], nil).must_equal '{"[1,]","[2,]"}'
  end if endless_range_support

  it "should support using PGRange instances as bound variables" do
    @db.bound_variable_arg([@R.new(1, 2),@R.new(2, 3)], nil).must_equal '{"[1,2]","[2,3]"}'
  end

  it "should parse range types from the schema correctly" do
    @db.fetch = [{:name=>'id', :db_type=>'integer'}, {:name=>'i4', :db_type=>'int4range'}, {:name=>'i8', :db_type=>'int8range'}, {:name=>'n', :db_type=>'numrange'}, {:name=>'d', :db_type=>'daterange'}, {:name=>'ts', :db_type=>'tsrange'}, {:name=>'tz', :db_type=>'tstzrange'}]
    @db.schema(:items).map{|e| e[1][:type]}.must_equal [:integer, :int4range, :int8range, :numrange, :daterange, :tsrange, :tstzrange]
  end

  it "should parse arrays of range types from the schema correctly" do
    @db.fetch = [{:name=>'id', :db_type=>'integer'}, {:name=>'i4', :db_type=>'int4range[]'}, {:name=>'i8', :db_type=>'int8range[]'}, {:name=>'n', :db_type=>'numrange[]'}, {:name=>'d', :db_type=>'daterange[]'}, {:name=>'ts', :db_type=>'tsrange[]'}, {:name=>'tz', :db_type=>'tstzrange[]'}]
    @db.schema(:items).map{|e| e[1][:type]}.must_equal [:integer, :int4range_array, :int8range_array, :numrange_array, :daterange_array, :tsrange_array, :tstzrange_array]
  end

  it "should set :ruby_default schema entries if default value is recognized" do
    @db.fetch = [{:name=>'id', :db_type=>'integer', :default=>'1'}, {:oid=>3904, :name=>'t', :db_type=>'int4range', :default=>"'[1,5)'::int4range"}]
    s = @db.schema(:items)
    s[1][1][:ruby_default].must_equal Sequel::Postgres::PGRange.new(1, 5, :exclude_end=>true, :db_type=>'int4range')
  end

  it "should work correctly in hashes" do
    h = Hash.new(1)
    h[@R.new(1, 2)] = 2
    h[@R.new(nil, nil, :empty => true)] = 3
    h[@R.new(1, 2)].must_equal 2
    h[@R.new(1, 3)].must_equal 1
    h[@R.new(2, 2)].must_equal 1
    h[@R.new(1, 2, :exclude_begin => true)].must_equal 1
    h[@R.new(1, 2, :exclude_end => true)].must_equal 1
    h[@R.new(1, 2, :db_type => :int)].must_equal 1
    h[@R.new(nil, nil, :empty => true)].must_equal 3
    h[@R.new(nil, nil, :empty => true, :db_type => :int)].must_equal 1
  end

  describe "database typecasting" do
    before do
      @o = @R.new(1, 2, :db_type=>'int4range')
      @o2 = @R.new(1, 2, :db_type=>'int8range')
      @eo = @R.new(nil, nil, :empty=>true, :db_type=>'int4range')
      @eo2 = @R.new(nil, nil, :empty=>true, :db_type=>'int8range')
    end
    
    it "should handle multiple range types" do
      %w'int4 int8 num date ts tstz'.each do |i|
        @db.typecast_value(:"#{i}range", @R.new(1, 2, :db_type=>"#{i}range")).must_equal @R.new(1, 2, :db_type=>"#{i}range")
      end
    end

    it "should handle multiple array range types" do
      %w'int4 int8 num date ts tstz'.each do |i|
        @db.typecast_value(:"#{i}range_array", [@R.new(1, 2, :db_type=>"#{i}range")]).class.must_equal(Sequel::Postgres::PGArray)
        @db.typecast_value(:"#{i}range_array", [@R.new(1, 2, :db_type=>"#{i}range")]).must_equal [@R.new(1, 2, :db_type=>"#{i}range")]
      end
    end

    it "should return PGRange value as is if they have the same subtype" do
      @db.typecast_value(:int4range, @o).must_be_same_as(@o)
    end

    it "should return new PGRange value as is if they have a different subtype" do
      @db.typecast_value(:int8range, @o).wont_be_same_as(@o)
      @db.typecast_value(:int8range, @o).must_equal @o2
    end

    it "should return new PGRange value as is if they have a different subtype and value is empty" do
      @db.typecast_value(:int8range, @eo).must_equal @eo2
    end

    it "should return new PGRange value if given a Range" do
      @db.typecast_value(:int4range, 1..2).must_equal @o
      @db.typecast_value(:int4range, 1..2).wont_equal @o2
      @db.typecast_value(:int8range, 1..2).must_equal @o2
    end

    it "should parse a string argument as the PostgreSQL output format" do
      @db.typecast_value(:int4range, '[1,2]').must_equal @o
    end

    it "should raise errors for unparsable formats" do
      proc{@db.typecast_value(:int8range, 'foo')}.must_raise(Sequel::InvalidValue)
    end

    it "should raise errors for unhandled values" do
      proc{@db.typecast_value(:int4range, 1)}.must_raise(Sequel::InvalidValue)
    end
  end

  it "should support registering custom range types" do
    @db.register_range_type('foorange')
    @db.typecast_value(:foorange, 1..2).must_be_kind_of(@R)
    @db.fetch = [{:name=>'id', :db_type=>'foorange'}]
    @db.schema(:items).map{|e| e[1][:type]}.must_equal [:foorange]
  end

  it "should support using a block as a custom conversion proc given as block" do
    @db.register_range_type('foo2range'){|s| (s*2).to_i}
    @db.typecast_value(:foo2range, '[1,2]').must_be :==, (11..22)
  end

  it "should support using a block as a custom conversion proc given as :converter option" do
    @db.register_range_type('foo3range', :converter=>proc{|s| (s*2).to_i})
    @db.typecast_value(:foo3range, '[1,2]').must_be :==, (11..22)
  end

  it "should support using an existing scaler conversion proc via the :subtype_oid option" do
    @db.register_range_type('foo4range', :subtype_oid=>16)
    @db.typecast_value(:foo4range, '[t,f]').must_equal @R.new(true, false, :db_type=>'foo4range')
  end

  it "should raise an error if using :subtype_oid option with unexisting scalar conversion proc" do
    proc{@db.register_range_type('fooirange', :subtype_oid=>0)}.must_raise(Sequel::Error)
  end

  it "should raise an error if using :converter option and a block argument" do
    proc{@db.register_range_type('fooirange', :converter=>proc{}){}}.must_raise(Sequel::Error)
  end

  it "should raise an error if using :subtype_oid option and a block argument" do
    proc{@db.register_range_type('fooirange', :subtype_oid=>16){}}.must_raise(Sequel::Error)
  end

  it "should support registering custom types with :oid option" do
    @db.register_range_type('foo5range', :oid=>331)
    @db.conversion_procs[331].call('[1,3)').must_be_kind_of(@R)
  end

  it "should not support registering custom range types on a per-Database basis for frozen databases" do
    @db.freeze
    proc{@db.register_range_type('banana', :oid=>7865){|s| s}}.must_raise RuntimeError, TypeError
  end

  it "should support registering custom range types on a per-Database basis" do
    @db.register_range_type('banana', :oid=>7865){|s| s}
    @db.typecast_value(:banana, '[1,2]').class.must_equal(Sequel::Postgres::PGRange)
    @db.fetch = [{:name=>'id', :db_type=>'banana'}]
    @db.schema(:items).map{|e| e[1][:type]}.must_equal [:banana]
    @db.conversion_procs.must_include(7865)
    @db.respond_to?(:typecast_value_banana, true).must_equal true

    db = Sequel.connect('mock://postgres', :quote_identifiers=>false)
    db.extend_datasets(Module.new{def supports_timestamp_timezones?; false; end; def supports_timestamp_usecs?; false; end})
    db.extension(:pg_range)
    db.fetch = [{:name=>'id', :db_type=>'banana'}]
    db.schema(:items).map{|e| e[1][:type]}.must_equal [nil]
    db.conversion_procs.wont_include(7865)
    db.respond_to?(:typecast_value_banana, true).must_equal false
  end

  it "should automatically look up the range and subtype oids when registering per-Database types" do
    @db.fetch = [[{:rngsubtype=>21, :rngtypid=>7866}], [{:name=>'id', :db_type=>'banana'}]]
    @db.register_range_type('banana', :subtype_typecast=>:integer)
    @db.sqls.must_equal ["SELECT rngtypid, rngsubtype FROM pg_range INNER JOIN pg_type ON (pg_type.oid = pg_range.rngtypid) WHERE (typname = 'banana') LIMIT 1"]
    @db.schema(:items).map{|e| e[1][:type]}.must_equal [:banana]
    @db.conversion_procs[7866].call("[1,3)").must_be :==, (1...3)
    @db.typecast_value(:banana, '[1,2]').must_be :==, (1..2)
  end

  it "should not automatically look up oids if given both subtype and range oids" do
    @db.register_range_type('banana', :oid=>7866, :subtype_oid=>21)
    @db.sqls.must_equal []
    @db.conversion_procs[7866].call("[1,3)").must_be :==, (1...3)
    @db.typecast_value(:banana, '[1,2]').must_be :==, (1..2)
  end

  it "should not automatically look up oids if given range oid and block" do
    @db.register_range_type('banana', :oid=>7866){|s| s.to_i}
    @db.sqls.must_equal []
    @db.conversion_procs[7866].call("[1,3)").must_be :==, (1...3)
    @db.typecast_value(:banana, '[1,2]').must_be :==, (1..2)
  end

  it "should return correct results for Database#schema_type_class" do
    @db.schema_type_class(:int4range).must_equal Sequel::Postgres::PGRange
    @db.schema_type_class(:integer).must_equal Integer
  end

  describe "parser" do
    before do
      @p = @R::Parser.new('int4range', proc(&:to_i))
      @sp = @R::Parser.new(nil)
    end

    it "should have db_type method to return the database type string" do
      @p.db_type.must_equal 'int4range'
    end

    it "should have converter method which returns a callable used for conversion" do
      @p.converter.call('1').must_equal 1
    end

    it "should have call parse input string argument into PGRange instance" do
      @p.call('[1,2]').must_equal @R.new(1, 2, :db_type=>'int4range')
    end

    it "should handle empty ranges" do
      @p.call('empty').must_equal @R.new(nil, nil, :empty=>true, :db_type=>'int4range')
    end

    it "should handle exclusive beginnings and endings" do
      @p.call('(1,3]').must_equal @R.new(1, 3, :exclude_begin=>true, :db_type=>'int4range')
      @p.call('[1,3)').must_equal @R.new(1, 3, :exclude_end=>true, :db_type=>'int4range')
      @p.call('(1,3)').must_equal @R.new(1, 3, :exclude_begin=>true, :exclude_end=>true, :db_type=>'int4range')
    end

    it "should handle unbounded beginnings and endings" do
      @p.call('[,2]').must_equal @R.new(nil, 2, :db_type=>'int4range')
      @p.call('[1,]').must_equal @R.new(1, nil, :db_type=>'int4range')
      @p.call('[,]').must_equal @R.new(nil, nil, :db_type=>'int4range')
    end

    it "should unescape quoted beginnings and endings" do
      @sp.call('["\\\\ \\"","\\" \\\\"]').must_equal @R.new("\\ \"", "\" \\")
    end

    it "should treat empty quoted string not as unbounded" do
      @sp.call('["","z"]').must_equal @R.new("", "z")
      @sp.call('["a",""]').must_equal @R.new("a", "")
      @sp.call('["",""]').must_equal @R.new("", "")
    end
  end

  describe "a PGRange instance" do
    before do
      @r1 = @R.new(1, 2)
      @r2 = @R.new(3, nil, :exclude_begin=>true, :db_type=>'int4range')
      @r3 = @R.new(nil, 4, :exclude_end=>true, :db_type=>'int8range')
    end

    it "should have #begin return the beginning of the range" do
      @r1.begin.must_equal 1
      @r2.begin.must_equal 3
      @r3.begin.must_be_nil
    end

    it "should have #end return the end of the range" do
      @r1.end.must_equal 2
      @r2.end.must_be_nil
      @r3.end.must_equal 4
    end

    it "should have #db_type return the range's database type" do
      @r1.db_type.must_be_nil
      @r2.db_type.must_equal 'int4range'
      @r3.db_type.must_equal 'int8range'
    end

    it "should be able to be created by Sequel.pg_range" do
      Sequel.pg_range(1..2).must_equal @r1
    end

    it "should have Sequel.pg_range be able to take a database type" do
      Sequel.pg_range(1..2, :int4range).must_equal @R.new(1, 2, :db_type=>:int4range)
    end

    it "should have Sequel.pg_range return a PGRange as is" do
      a = Sequel.pg_range(1..2)
      Sequel.pg_range(a).must_be_same_as(a)
    end

    it "should have Sequel.pg_range return a new PGRange if the database type differs" do
      a = Sequel.pg_range(1..2, :int4range)
      b = Sequel.pg_range(a, :int8range)
      a.to_range.must_equal b.to_range
      a.wont_be_same_as(b)
      a.db_type.must_equal :int4range
      b.db_type.must_equal :int8range
    end

    it "should have #initialize raise if requesting an empty range with beginning or ending" do
      proc{@R.new(1, nil, :empty=>true)}.must_raise(Sequel::Error)
      proc{@R.new(nil, 2, :empty=>true)}.must_raise(Sequel::Error)
      proc{@R.new(nil, nil, :empty=>true, :exclude_begin=>true)}.must_raise(Sequel::Error)
      proc{@R.new(nil, nil, :empty=>true, :exclude_end=>true)}.must_raise(Sequel::Error)
    end

    it "should quack like a range" do
      @r1.cover?(1.5).must_equal true
      @r1.cover?(2.5).must_equal false
      @r1.first(1).must_equal [1]
      @r1.last(1).must_equal [2]
      @r1.to_a.must_equal [1, 2]
      @r1.first.must_equal 1
      @r1.last.must_equal 2
      a = []
      @r1.step{|x| a << x}
      a.must_equal [1, 2]
    end

    it "should have cover? handle empty, unbounded, and exclusive beginning ranges" do
      @R.empty.cover?(1).must_equal false

      r = @R.new(1, nil)
      r.cover?(0).must_equal false
      r.cover?(1).must_equal true
      r.cover?(2).must_equal true
      r.cover?(3).must_equal true

      r = @R.new(nil, 2)
      r.cover?(0).must_equal true
      r.cover?(1).must_equal true
      r.cover?(2).must_equal true
      r.cover?(3).must_equal false

      r = @R.new(1, 2, :exclude_begin=>true)
      r.cover?(0).must_equal false
      r.cover?(1).must_equal false
      r.cover?(2).must_equal true
      r.cover?(3).must_equal false

      r = @R.new(1, 2, :exclude_end=>true)
      r.cover?(0).must_equal false
      r.cover?(1).must_equal true
      r.cover?(2).must_equal false
      r.cover?(3).must_equal false
    end

    it "should only consider PGRanges equal if they have the same db_type" do
      @R.new(1, 2, :db_type=>'int4range').must_equal @R.new(1, 2, :db_type=>'int4range')
      @R.new(1, 2, :db_type=>'int8range').wont_equal @R.new(1, 2, :db_type=>'int4range')
    end

    it "should only consider empty PGRanges equal with other empty PGRanges" do
      @R.new(nil, nil, :empty=>true).must_equal @R.new(nil, nil, :empty=>true)
      @R.new(nil, nil, :empty=>true).wont_equal @R.new(nil, nil)
      @R.new(nil, nil).wont_equal @R.new(nil, nil, :empty=>true)
    end

    it "should only consider PGRanges equal if they have the same bounds" do
      @R.new(1, 2).must_equal @R.new(1, 2)
      @R.new(1, 2).wont_equal @R.new(1, 3)
    end

    it "should only consider PGRanges equal if they have the same bound exclusions" do
      @R.new(1, 2, :exclude_begin=>true).must_equal @R.new(1, 2, :exclude_begin=>true)
      @R.new(1, 2, :exclude_end=>true).must_equal @R.new(1, 2, :exclude_end=>true)
      @R.new(1, 2, :exclude_begin=>true).wont_equal @R.new(1, 2, :exclude_end=>true)
      @R.new(1, 2, :exclude_end=>true).wont_equal @R.new(1, 2, :exclude_begin=>true)
    end

    it "should consider PGRanges equal with a Range they represent" do
      @R.new(1, 2).must_be :==, (1..2)
      @R.new(1, 2, :exclude_end=>true).must_be :==, (1...2)
      @R.new(1, 3).wont_be :==, (1..2)
      @R.new(1, 2, :exclude_end=>true).wont_be :==, (1..2)
    end

    it "should not consider a PGRange equal with a Range if it can't be expressed as a range" do
      @R.new(nil, nil).wont_be :==, (1..2)
      if startless_range_support
        @R.new(nil, nil, :exclude_begin=>true).wont_be :==, eval('nil..nil')
      end
    end

    it "should consider PGRanges equal with a endless Range they represent" do
      @R.new(1, nil).must_be :==, eval('1..')
      @R.new(1, nil, :exclude_end=>true).must_be :==, eval('1...')
      @R.new(1, nil).wont_be :==, eval('1...')
      @R.new(1, nil, :exclude_end=>true).wont_be :==, eval('1..')
      @R.new(1, nil).wont_be :==, eval('2..')
      @R.new(1, nil, :exclude_end=>true).wont_be :==, eval('2...')
    end if endless_range_support

    it "should consider PGRanges equal with a startless Range they represent" do
      @R.new(nil, 1).must_be :==, eval('..1')
      @R.new(nil, 1, :exclude_end=>true).must_be :==, eval('...1')
      @R.new(nil, 1).wont_be :==, eval('...1')
      @R.new(nil, 1, :exclude_end=>true).wont_be :==, eval('..1')
      @R.new(nil, 1).wont_be :==, eval('..2')
      @R.new(nil, 1, :exclude_end=>true).wont_be :==, eval('...2')
    end if startless_range_support

    it "should consider PGRanges equal with a startless, endless Range they represent" do
      @R.new(nil, nil).must_be :==, eval('nil..nil')
      @R.new(nil, nil, :exclude_end=>true).must_be :==, eval('nil...nil')
      @R.new(nil, nil).wont_be :==, eval('nil...nil')
      @R.new(nil, nil, :exclude_end=>true).wont_be :==, eval('nil..nil')
      @R.new(nil, nil).wont_be :==, eval('nil..1')
      @R.new(nil, nil).wont_be :==, eval('1..nil')
      @R.new(1, nil).wont_be :==, eval('nil..nil')
    end if startless_range_support

    it "should not consider a PGRange equal to other objects" do
      @R.new(nil, nil).wont_equal 1
    end

    it "should have #=== be true if given an equal PGRange" do
      @R.new(1, 2).must_be :===, @R.new(1, 2)
      @R.new(1, 2).wont_be :===, @R.new(1, 3)
    end

    it "should have #=== be true if it would be true for the Range represented by the PGRange" do
      @R.new(1, 2).must_be :===, 1.5
      @R.new(1, 2).wont_be :===, 2.5
    end

    it "should have #=== be false if the PGRange cannot be represented by a Range" do
      @R.new(1, 2, :exclude_begin=>true).wont_be :===, 1.5
    end

    it "should have #empty? indicate whether the range is empty" do
      @R.empty.must_be :empty?
      @R.new(1, 2).wont_be :empty?
    end

    it "should have #exclude_begin? and #exclude_end indicate whether the beginning or ending of the range is excluded" do
      @r1.exclude_begin?.must_equal false
      @r1.exclude_end?.must_equal false
      @r2.exclude_begin?.must_equal true
      @r2.exclude_end?.must_equal false
      @r3.exclude_begin?.must_equal false
      @r3.exclude_end?.must_equal true
    end

    it "should have #to_range raise an exception if the PGRange cannot be represented by a Range" do
      proc{@R.new(0, 1, :exclude_begin=>true).to_range}.must_raise(Sequel::Error)
      proc{@R.empty.to_range}.must_raise(Sequel::Error)
    end

    it "should have #to_range return the represented range" do
      @r1.to_range.must_be :==, (1..2)
    end

    it "should have #to_range return the represented range for endless ranges" do
      @R.new(1, nil).to_range.must_be :==, eval('1..')
    end if endless_range_support

    it "should have #to_range raise an exception for endless ranges" do
      proc{@R.new(1, nil).to_range}.must_raise(Sequel::Error)
    end unless endless_range_support

    it "should have #to_range return the represented range for startless ranges" do
      @R.new(nil, 1).to_range.must_be :==, eval('..1')
    end if startless_range_support

    it "should have #to_range raise an exception for startless ranges" do
      proc{@R.new(nil, 1).to_range}.must_raise(Sequel::Error)
    end unless startless_range_support

    it "should have #to_range return the represented range for startless, endless ranges" do
      @R.new(nil, nil).to_range.must_be :==, eval('nil..nil')
    end if startless_range_support

    it "should have #to_range raise an exception for startless, endless ranges" do
      proc{@R.new(nil, nil).to_range}.must_raise(Sequel::Error)
    end unless startless_range_support

    it "should have #to_range cache the returned value" do
      @r1.to_range.must_be_same_as(@r1.to_range)
    end

    it "should have #unbounded_begin? and #unbounded_end indicate whether the beginning or ending of the range is unbounded" do
      @r1.unbounded_begin?.must_equal false
      @r1.unbounded_end?.must_equal false
      @r2.unbounded_begin?.must_equal false
      @r2.unbounded_end?.must_equal true
      @r3.unbounded_begin?.must_equal true
      @r3.unbounded_end?.must_equal false
    end

    it "should have #valid_ruby_range? return true if the PGRange can be represented as a Range" do
      @r1.valid_ruby_range?.must_equal true
      @R.new(1, 2, :exclude_end=>true).valid_ruby_range?.must_equal true
    end

    it "should have #valid_ruby_range? return false if the PGRange cannot be represented as a Range" do
      @R.new(0, 1, :exclude_begin=>true).valid_ruby_range?.must_equal false
      @R.empty.valid_ruby_range?.must_equal false
    end

   it "should have #valid_ruby_range return #{endless_range_support} for endless ranges" do
      @R.new(1, nil).valid_ruby_range?.must_equal(endless_range_support)
    end

   it "should have #valid_ruby_range return #{startless_range_support} for endless ranges" do
      @R.new(nil, 1).valid_ruby_range?.must_equal(startless_range_support)
    end

   it "should have #valid_ruby_range return #{startless_range_support} for startless, endless ranges" do
      @R.new(nil, nil).valid_ruby_range?.must_equal(startless_range_support)
    end
  end
end
