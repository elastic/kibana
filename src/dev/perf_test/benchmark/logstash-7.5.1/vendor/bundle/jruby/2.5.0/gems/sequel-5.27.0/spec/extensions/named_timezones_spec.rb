require_relative "spec_helper"

begin
  require 'tzinfo'
rescue LoadError
  warn "Skipping test of named_timezones extension: can't load tzinfo"
else
Sequel.extension :thread_local_timezones
Sequel.extension :named_timezones
Sequel.datetime_class = Time

describe "Sequel named_timezones extension with DateTime class" do
  before do
    @tz_in = TZInfo::Timezone.get('America/Los_Angeles')
    @tz_out = TZInfo::Timezone.get('America/New_York')
    @db = Sequel.mock
    @dt = DateTime.civil(2009,6,1,10,20,30,0)
    Sequel.application_timezone = 'America/Los_Angeles'
    Sequel.database_timezone = 'America/New_York'
    Sequel.datetime_class = DateTime
  end
  after do
    Sequel.tzinfo_disambiguator = nil
    Sequel.default_timezone = nil
    Sequel.datetime_class = Time
  end
  
  it "should convert string arguments to *_timezone= to TZInfo::Timezone instances" do
    Sequel.application_timezone.must_equal @tz_in
    Sequel.database_timezone.must_equal @tz_out
  end
    
  it "should convert string arguments for Database#timezone= to TZInfo::Timezone instances for database-specific timezones" do
    @db.extension :named_timezones
    @db.timezone = 'America/Los_Angeles'
    @db.timezone.must_equal @tz_in
  end
    
  it "should accept TZInfo::Timezone instances in *_timezone=" do
    Sequel.application_timezone = @tz_in
    Sequel.database_timezone = @tz_out
    Sequel.application_timezone.must_equal @tz_in
    Sequel.database_timezone.must_equal @tz_out
  end
    
  it "should convert datetimes going into the database to named database_timezone" do
    ds = @db[:a].with_extend do
      def supports_timestamp_timezones?; true; end
      def supports_timestamp_usecs?; false; end
    end
    ds.insert([@dt, DateTime.civil(2009,6,1,3,20,30,-7/24.0), DateTime.civil(2009,6,1,6,20,30,-1/6.0)])
    @db.sqls.must_equal ["INSERT INTO a VALUES ('2009-06-01 06:20:30-0400', '2009-06-01 06:20:30-0400', '2009-06-01 06:20:30-0400')"]
  end
  
  it "should convert datetimes coming out of the database from database_timezone to application_timezone" do
    dt = Sequel.database_to_application_timestamp('2009-06-01 06:20:30-0400')
    dt.must_be_instance_of DateTime
    dt.must_equal @dt
    dt.offset.must_equal(-7/24.0)
    
    dt = Sequel.database_to_application_timestamp('2009-06-01 10:20:30+0000')
    dt.must_be_instance_of DateTime
    dt.must_equal @dt
    dt.offset.must_equal(-7/24.0)
  end
    
  it "should raise an error for ambiguous timezones by default" do
    proc{Sequel.database_to_application_timestamp('2004-10-31T01:30:00')}.must_raise(Sequel::InvalidValue)
  end

  it "should support tzinfo_disambiguator= to handle ambiguous timezones automatically" do
    Sequel.tzinfo_disambiguator = proc{|datetime, periods| periods.first}
    dt = Sequel.database_to_application_timestamp('2004-10-31T01:30:00')
    dt.must_equal DateTime.parse('2004-10-30T22:30:00-07:00')
    dt.offset.must_equal(-7/24.0)
  end

  it "should assume datetimes coming out of the database that don't have an offset as coming from database_timezone" do
    dt = Sequel.database_to_application_timestamp('2009-06-01 06:20:30')
    dt.must_be_instance_of DateTime
    dt.must_equal @dt
    dt.offset.must_equal(-7/24.0)
    
    dt = Sequel.database_to_application_timestamp('2009-06-01 10:20:30')
    dt.must_be_instance_of DateTime
    dt.must_equal(@dt + 1/6.0)
    dt.offset.must_equal(-7/24.0)
  end
  
  it "should work with the thread_local_timezones extension" do
    q, q1, q2 = Queue.new, Queue.new, Queue.new
    tz1, tz2 = nil, nil
    t1 = Thread.new do
      Sequel.thread_application_timezone = 'America/New_York'
      q2.push nil
      q.pop
      tz1 = Sequel.application_timezone
    end
    t2 = Thread.new do
      Sequel.thread_application_timezone = 'America/Los_Angeles'
      q2.push nil
      q1.pop
      tz2 = Sequel.application_timezone
    end
    q2.pop
    q2.pop
    q.push nil
    q1.push nil
    t1.join
    t2.join
    tz1.must_equal @tz_out
    tz2.must_equal @tz_in
  end
end

describe "Sequel named_timezones extension with Time class" do
  before do
    @tz_in = TZInfo::Timezone.get('America/Los_Angeles')
    @tz_out = TZInfo::Timezone.get('America/New_York')
    @db = Sequel.mock
    Sequel.application_timezone = 'America/Los_Angeles'
    Sequel.database_timezone = 'America/New_York'
  end
  after do
    Sequel.tzinfo_disambiguator = nil
    Sequel.default_timezone = nil
    Sequel.datetime_class = Time
  end
  
  it "should convert string arguments to *_timezone= to TZInfo::Timezone instances" do
    Sequel.application_timezone.must_equal @tz_in
    Sequel.database_timezone.must_equal @tz_out
  end
    
  it "should convert string arguments for Database#timezone= to TZInfo::Timezone instances for database-specific timezones" do
    @db.extension :named_timezones
    @db.timezone = 'America/Los_Angeles'
    @db.timezone.must_equal @tz_in
  end
    
  it "should accept TZInfo::Timezone instances in *_timezone=" do
    Sequel.application_timezone = @tz_in
    Sequel.database_timezone = @tz_out
    Sequel.application_timezone.must_equal @tz_in
    Sequel.database_timezone.must_equal @tz_out
  end
    
  it "should convert datetimes going into the database to named database_timezone" do
    ds = @db[:a].with_extend do
      def supports_timestamp_timezones?; true; end
      def supports_timestamp_usecs?; false; end
    end
    ds.insert([Time.new(2009,6,1,3,20,30, RUBY_VERSION >= '2.6' ? @tz_in : -25200), Time.new(2009,6,1,3,20,30,-25200), Time.new(2009,6,1,6,20,30,-14400)])
    @db.sqls.must_equal ["INSERT INTO a VALUES ('2009-06-01 06:20:30-0400', '2009-06-01 06:20:30-0400', '2009-06-01 06:20:30-0400')"]
  end
  
  it "should convert datetimes coming out of the database from database_timezone to application_timezone" do
    dt = Sequel.database_to_application_timestamp('2009-06-01 06:20:30-0400')
    dt.must_be_instance_of Time
    dt.must_equal Time.new(2009,6,1,3,20,30,-25200)
    dt.utc_offset.must_equal -25200
    
    dt = Sequel.database_to_application_timestamp('2009-06-01 10:20:30+0000')
    dt.must_be_instance_of Time
    dt.must_equal Time.new(2009,6,1,3,20,30,-25200)
    dt.utc_offset.must_equal -25200
  end
    
  it "should raise an error for ambiguous timezones by default" do
    proc{Sequel.database_to_application_timestamp('2004-10-31T01:30:00')}.must_raise(Sequel::InvalidValue)
  end

  it "should support tzinfo_disambiguator= to handle ambiguous timezones automatically" do
    Sequel.tzinfo_disambiguator = proc{|datetime, periods| periods.first}
    Sequel.database_to_application_timestamp('2004-10-31T01:30:00').must_equal Time.new(2004, 10, 30, 22, 30, 0, -25200)
    dt = Sequel.database_to_application_timestamp('2004-10-31T01:30:00')
    dt.must_equal Time.new(2004, 10, 30, 22, 30, 0, -25200)
    dt.utc_offset.must_equal -25200
  end

  it "should assume datetimes coming out of the database that don't have an offset as coming from database_timezone" do
    dt = Sequel.database_to_application_timestamp('2009-06-01 06:20:30')
    dt.must_be_instance_of Time
    dt.must_equal Time.new(2009,6,1,3,20,30, -25200)
    dt.utc_offset.must_equal -25200
    
    dt = Sequel.database_to_application_timestamp('2009-06-01 10:20:30')
    dt.must_be_instance_of Time
    dt.must_equal Time.new(2009,6,1,7,20,30, -25200)
    dt.utc_offset.must_equal -25200
  end
  
  it "should work with the thread_local_timezones extension" do
    q, q1, q2 = Queue.new, Queue.new, Queue.new
    tz1, tz2 = nil, nil
    t1 = Thread.new do
      Sequel.thread_application_timezone = 'America/New_York'
      q2.push nil
      q.pop
      tz1 = Sequel.application_timezone
    end
    t2 = Thread.new do
      Sequel.thread_application_timezone = 'America/Los_Angeles'
      q2.push nil
      q1.pop
      tz2 = Sequel.application_timezone
    end
    q2.pop
    q2.pop
    q.push nil
    q1.push nil
    t1.join
    t2.join
    tz1.must_equal @tz_out
    tz2.must_equal @tz_in
  end
end
end
