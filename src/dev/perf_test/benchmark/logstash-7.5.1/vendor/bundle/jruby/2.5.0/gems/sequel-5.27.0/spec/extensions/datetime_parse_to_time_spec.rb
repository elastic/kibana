require_relative "spec_helper"

describe "datetime_parse_to_time extension" do
  before(:all) do
    Sequel.extension :datetime_parse_to_time
  end
  after(:all) do
    # Can't undo the adding of the module to Sequel, so removing the
    # method in the module is the only way to fix it.
    Sequel::DateTimeParseToTime.send(:remove_method, :convert_input_timestamp)
  end

  before do
    @db = Sequel::Database.new
    @dataset = @db.dataset.with_extend do
      def supports_timestamp_timezones?; true end
      def supports_timestamp_usecs?; false end
    end
    @utc_time = Time.utc(2010, 1, 2, 3, 4, 5)
    @local_time = Time.local(2010, 1, 2, 3, 4, 5)
    @offset = sprintf("%+03i%02i", *(@local_time.utc_offset/60).divmod(60))
    @dt_offset = @local_time.utc_offset/Rational(86400, 1)
    @utc_datetime = DateTime.new(2010, 1, 2, 3, 4, 5)
    @local_datetime = DateTime.new(2010, 1, 2, 3, 4, 5, @dt_offset)
  end
  after do
    Sequel.default_timezone = nil
    Sequel.datetime_class = Time
  end
  
  it "should handle conversions during invalid localtimes" do
    # This only checks of a couple of times that may be invalid.
    # You can run with TZ=Europe/Berlin or TZ=US/Pacific
    Sequel.database_timezone = :utc
    Sequel.database_to_application_timestamp("2017-03-26 02:30:00").getutc.hour.must_equal 2
    Sequel.database_to_application_timestamp("2017-03-12 02:30:00").getutc.hour.must_equal 2
  end

  it "should handle an database timezone of :utc when literalizing values" do
    Sequel.database_timezone = :utc
    @dataset.literal(Time.utc(2010, 1, 2, 3, 4, 5)).must_equal "'2010-01-02 03:04:05+0000'"
    @dataset.literal(DateTime.new(2010, 1, 2, 3, 4, 5)).must_equal "'2010-01-02 03:04:05+0000'"
  end
  
  it "should handle an database timezone of :local when literalizing values" do
    Sequel.database_timezone = :local
    @dataset.literal(Time.local(2010, 1, 2, 3, 4, 5)).must_equal "'2010-01-02 03:04:05#{@offset}'"
    @dataset.literal(DateTime.new(2010, 1, 2, 3, 4, 5, @dt_offset)).must_equal "'2010-01-02 03:04:05#{@offset}'"
  end
  
  it "should have Database#timezone override Sequel.database_timezone" do
    Sequel.database_timezone = :local
    @db.timezone = :utc
    @dataset.literal(Time.utc(2010, 1, 2, 3, 4, 5)).must_equal "'2010-01-02 03:04:05+0000'"
    @dataset.literal(DateTime.new(2010, 1, 2, 3, 4, 5)).must_equal "'2010-01-02 03:04:05+0000'"

    Sequel.database_timezone = :utc
    @db.timezone = :local
    @dataset.literal(Time.local(2010, 1, 2, 3, 4, 5)).must_equal "'2010-01-02 03:04:05#{@offset}'"
    @dataset.literal(DateTime.new(2010, 1, 2, 3, 4, 5, @dt_offset)).must_equal "'2010-01-02 03:04:05#{@offset}'"
  end
  
  it "should handle converting database timestamps into application timestamps" do
    Sequel.database_timezone = :utc
    Sequel.application_timezone = :local
    t = Time.now.utc
    Sequel.database_to_application_timestamp(t).to_s.must_equal t.getlocal.to_s
    Sequel.database_to_application_timestamp(t.to_s).to_s.must_equal t.getlocal.to_s
    Sequel.database_to_application_timestamp(t.strftime('%Y-%m-%d %H:%M:%S')).to_s.must_equal t.getlocal.to_s
    
    Sequel.datetime_class = DateTime
    dt = DateTime.now
    dt2 = dt.new_offset(0)
    Sequel.database_to_application_timestamp(dt2).to_s.must_equal dt.to_s
    Sequel.database_to_application_timestamp(dt2.to_s).to_s.must_equal dt.to_s
    Sequel.database_to_application_timestamp(dt2.strftime('%Y-%m-%d %H:%M:%S')).to_s.must_equal dt.to_s
    
    Sequel.datetime_class = Time
    Sequel.database_timezone = :local
    Sequel.application_timezone = :utc
    Sequel.database_to_application_timestamp(t.getlocal).to_s.must_equal t.to_s
    Sequel.database_to_application_timestamp(t.getlocal.to_s).to_s.must_equal t.to_s
    Sequel.database_to_application_timestamp(t.getlocal.strftime('%Y-%m-%d %H:%M:%S')).to_s.must_equal t.to_s
    
    Sequel.datetime_class = DateTime
    Sequel.database_to_application_timestamp(dt).to_s.must_equal dt2.to_s
    Sequel.database_to_application_timestamp(dt.to_s).to_s.must_equal dt2.to_s
    Sequel.database_to_application_timestamp(dt.strftime('%Y-%m-%d %H:%M:%S')).to_s.must_equal dt2.to_s
  end
  
  it "should handle typecasting timestamp columns" do
    Sequel.typecast_timezone = :utc
    Sequel.application_timezone = :local
    t = Time.now.utc
    @db.typecast_value(:datetime, t).to_s.must_equal t.getlocal.to_s
    @db.typecast_value(:datetime, t.to_s).to_s.must_equal t.getlocal.to_s
    @db.typecast_value(:datetime, t.strftime('%Y-%m-%d %H:%M:%S')).to_s.must_equal t.getlocal.to_s
    
    Sequel.datetime_class = DateTime
    dt = DateTime.now
    dt2 = dt.new_offset(0)
    @db.typecast_value(:datetime, dt2).to_s.must_equal dt.to_s
    @db.typecast_value(:datetime, dt2.to_s).to_s.must_equal dt.to_s
    @db.typecast_value(:datetime, dt2.strftime('%Y-%m-%d %H:%M:%S')).to_s.must_equal dt.to_s
    
    Sequel.datetime_class = Time
    Sequel.typecast_timezone = :local
    Sequel.application_timezone = :utc
    @db.typecast_value(:datetime, t.getlocal).to_s.must_equal t.to_s
    @db.typecast_value(:datetime, t.getlocal.to_s).to_s.must_equal t.to_s
    @db.typecast_value(:datetime, t.getlocal.strftime('%Y-%m-%d %H:%M:%S')).to_s.must_equal t.to_s
    
    Sequel.datetime_class = DateTime
    @db.typecast_value(:datetime, dt).to_s.must_equal dt2.to_s
    @db.typecast_value(:datetime, dt.to_s).to_s.must_equal dt2.to_s
    @db.typecast_value(:datetime, dt.strftime('%Y-%m-%d %H:%M:%S')).to_s.must_equal dt2.to_s
  end
  
  it "should handle converting database timestamp columns from an array of values" do
    Sequel.database_timezone = :utc
    Sequel.application_timezone = :local
    t = Time.now.utc
    Sequel.database_to_application_timestamp([t.year, t.mon, t.day, t.hour, t.min, t.sec]).to_s.must_equal t.getlocal.to_s
    
    Sequel.datetime_class = DateTime
    dt = DateTime.now
    dt2 = dt.new_offset(0)
    Sequel.database_to_application_timestamp([dt2.year, dt2.mon, dt2.day, dt2.hour, dt2.min, dt2.sec]).to_s.must_equal dt.to_s
    
    Sequel.datetime_class = Time
    Sequel.database_timezone = :local
    Sequel.application_timezone = :utc
    t = t.getlocal
    Sequel.database_to_application_timestamp([t.year, t.mon, t.day, t.hour, t.min, t.sec]).to_s.must_equal t.getutc.to_s
    
    Sequel.datetime_class = DateTime
    Sequel.database_to_application_timestamp([dt.year, dt.mon, dt.day, dt.hour, dt.min, dt.sec]).to_s.must_equal dt2.to_s
  end
  
  it "should raise an InvalidValue error when an error occurs while converting a timestamp" do
    proc{Sequel.database_to_application_timestamp([0, 0, 0, 0, 0, 0])}.must_raise(Sequel::InvalidValue)
  end
  
  it "should raise an error when attempting to typecast to a timestamp from an unsupported type" do
    proc{Sequel.database_to_application_timestamp(Object.new)}.must_raise(Sequel::InvalidValue)
  end

  it "should raise an InvalidValue error when the DateTime class is used and when a bad application timezone is used when attempting to convert timestamps" do
    Sequel.application_timezone = :blah
    Sequel.datetime_class = DateTime
    proc{Sequel.database_to_application_timestamp('2009-06-01 10:20:30')}.must_raise(Sequel::InvalidValue)
  end
  
  it "should raise an InvalidValue error when the DateTime class is used and when a bad database timezone is used when attempting to convert timestamps" do
    Sequel.database_timezone = :blah
    Sequel.datetime_class = DateTime
    proc{Sequel.database_to_application_timestamp('2009-06-01 10:20:30')}.must_raise(Sequel::InvalidValue)
  end

  it "should have Sequel.default_timezone= should set all other timezones" do
    Sequel.database_timezone.must_be_nil
    Sequel.application_timezone.must_be_nil
    Sequel.typecast_timezone.must_be_nil
    Sequel.default_timezone = :utc
    Sequel.database_timezone.must_equal :utc
    Sequel.application_timezone.must_equal :utc
    Sequel.typecast_timezone.must_equal :utc
  end
end
