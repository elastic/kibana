require_relative "spec_helper"

describe "pg_extended_date_support extension" do
  before do
    @db = Sequel.mock(:host=>'postgres', :fetch=>{:v=>1}).extension(:pg_extended_date_support)
    @db.extend_datasets{def quote_identifiers?; false end}
  end
  after do
    Sequel.datetime_class = Time
    Sequel.default_timezone = nil
  end

  it "should convert infinite timestamps and dates as configured" do
    cp = @db.conversion_procs
    d = lambda{|v| cp[1082].call(v)}
    t = lambda{|v| cp[1114].call(v)}
    pi = 'infinity'
    ni = '-infinity'
    today = Date.today
    now = Time.now

    d.(today.to_s).must_equal today
    t.(now.strftime("%Y-%m-%d %H:%M:%S.%N")).must_equal now
    proc{@db.typecast_value(:date, pi)}.must_raise Sequel::InvalidValue
    proc{@db.typecast_value(:datetime, pi)}.must_raise Sequel::InvalidValue

    [:nil, 'nil'].each do |v|
      @db.convert_infinite_timestamps = v
      d.(pi).must_be_nil
      t.(pi).must_be_nil
      d.(ni).must_be_nil
      t.(ni).must_be_nil
      @db.typecast_value(:date, pi).must_equal pi
      @db.typecast_value(:datetime, pi).must_equal pi
      @db.typecast_value(:date, ni).must_equal ni
      @db.typecast_value(:datetime, ni).must_equal ni
    end

    d.(today.to_s).must_equal today
    t.(now.strftime("%Y-%m-%d %H:%M:%S.%N")).must_equal now
    @db.typecast_value(:date, today.to_s).must_equal today
    @db.typecast_value(:datetime, now.strftime("%Y-%m-%d %H:%M:%S.%N")).must_equal now

    [:string, 'string'].each do |v|
      @db.convert_infinite_timestamps = v
      d.(pi).must_equal pi
      t.(pi).must_equal pi
      d.(ni).must_equal ni
      t.(ni).must_equal ni
    end

    [:date, 'date'].each do |v|
      @db.convert_infinite_timestamps = v
      d.(pi).must_equal Date::Infinity.new
      t.(pi).must_equal Date::Infinity.new
      d.(ni).must_equal(-Date::Infinity.new)
      t.(ni).must_equal(-Date::Infinity.new)
    end

    [:float, 'float', 't', true].each do |v|
      @db.convert_infinite_timestamps = v
      d.(pi).must_equal 1.0/0.0
      t.(pi).must_equal 1.0/0.0
      d.(ni).must_equal(-1.0/0.0)
      t.(ni).must_equal(-1.0/0.0)
    end

    ['f', false].each do |v|
      @db.convert_infinite_timestamps = v
      proc{d.(pi)}.must_raise ArgumentError, Sequel::InvalidValue
      proc{t.(pi)}.must_raise ArgumentError, Sequel::InvalidValue
      proc{d.(ni)}.must_raise ArgumentError, Sequel::InvalidValue
      proc{t.(ni)}.must_raise ArgumentError, Sequel::InvalidValue
    end
  end

  it "should handle parsing BC dates" do
    @db.conversion_procs[1082].call("1092-10-20 BC").must_equal Date.new(-1091, 10, 20)
  end

  it "should handle parsing BC timestamps as Time values" do
    @db.conversion_procs[1114].call("1200-02-15 14:13:20-00:00 BC").must_equal Time.at(-100000000000).utc
    @db.conversion_procs[1114].call("1200-02-15 14:13:20-00:00:00 BC").must_equal Time.at(-100000000000).utc
    Sequel.default_timezone = :utc
    @db.conversion_procs[1114].call("1200-02-15 14:13:20 BC").must_equal Time.at(-100000000000).utc
    Sequel.default_timezone = nil
  end

  it "should handle parsing BC timestamps as DateTime values" do
    Sequel.datetime_class = DateTime
    @db.conversion_procs[1114].call("1200-02-15 14:13:20-00:00 BC").must_equal DateTime.new(-1199, 2, 15, 14, 13, 20)
    @db.conversion_procs[1114].call("1200-02-15 14:13:20-00:00:00 BC").must_equal DateTime.new(-1199, 2, 15, 14, 13, 20)
    Sequel.default_timezone = :utc
    @db.conversion_procs[1114].call("1200-02-15 14:13:20 BC").must_equal DateTime.new(-1199, 2, 15, 14, 13, 20)
  end

  it "should handle parsing AD timestamps with offset seconds" do
    @db.conversion_procs[1114].call("1200-02-15 14:13:20-00:00:00").must_equal DateTime.new(1200, 2, 15, 14, 13, 20).to_time
    Sequel.datetime_class = DateTime
    @db.conversion_procs[1114].call("1200-02-15 14:13:20-00:00:00").must_equal DateTime.new(1200, 2, 15, 14, 13, 20)
  end

  it "should format Date::Infinity values" do
    @db.literal(Date::Infinity.new).must_equal "'infinity'"
    @db.literal(-Date::Infinity.new).must_equal "'-infinity'"
  end

  it "should raise errors for literalizing random Objects" do
    proc{@db.literal(Object.new)}.must_raise Sequel::Error
  end

  it "should format BC dates" do
    @db.literal(Date.new(-1091, 10, 20)).must_equal "'1092-10-20 BC'"
    @db.literal(Date.new(1092, 10, 20)).must_equal "'1092-10-20'"
  end

  it "should format BC datetimes" do
    @db.literal(DateTime.new(-1199, 2, 15, 14, 13, 20)).must_equal "'1200-02-15 14:13:20.000000000+0000 BC'"
    @db.literal(DateTime.new(1200, 2, 15, 14, 13, 20)).must_equal "'1200-02-15 14:13:20.000000+0000'"
  end

  it "should format BC times" do
    @db.literal(Time.at(-100000000000).utc).must_equal "'1200-02-15 14:13:20.000000000+0000 BC'"
    @db.literal(Time.at(100000000000).utc).must_equal "'5138-11-16 09:46:40.000000+0000'"
  end
end
