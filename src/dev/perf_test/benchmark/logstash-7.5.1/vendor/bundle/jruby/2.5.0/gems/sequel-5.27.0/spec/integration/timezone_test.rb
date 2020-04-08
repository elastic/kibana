require_relative "spec_helper"

describe "Sequel timezone support" do
  def _test_timezone(timezone=Sequel.application_timezone)
    Sequel.datetime_class = Time
    # Tests should cover both DST and non-DST times.
    [Time.now, Time.local(2010,1,1,12), Time.local(2010,6,1,12)].each do |t|
      @db[:t].insert(t)
      t2 = @db[:t].single_value
      t2 = @db.to_application_timestamp(t2.to_s) unless t2.is_a?(Time)
      (t2 - t).must_be_close_to 0, 2
      t2.utc_offset.must_equal 0 if timezone == :utc
      t2.utc_offset.must_equal t.getlocal.utc_offset if timezone == :local
      @db[:t].delete
    end

    Sequel.datetime_class = DateTime
    local_dst_offset = Time.local(2010, 6).utc_offset/86400.0
    local_std_offset = Time.local(2010, 1).utc_offset/86400.0
    [DateTime.now, DateTime.civil(2010,1,1,12,0,0,local_std_offset), DateTime.civil(2010,6,1,12,0,0,local_dst_offset)].each do |dt|
      @db[:t].insert(dt)
      dt2 = @db[:t].single_value
      dt2 = @db.to_application_timestamp(dt2.to_s) unless dt2.is_a?(DateTime)
      (dt2 - dt).must_be_close_to 0, 0.00002
      dt2.offset.must_equal 0 if timezone == :utc
      dt2.offset.must_equal dt.offset if timezone == :local
      @db[:t].delete
    end
  end

  before do
    @db = DB
    @db.create_table!(:t){DateTime :t}
  end
  after do
    @db.timezone = nil
    Sequel.default_timezone = nil
    Sequel.datetime_class = Time
    @db.drop_table(:t)
  end

  cspecify "should support using UTC for database storage and local time for the application", [:tinytds], [:oracle] do
    Sequel.database_timezone = :utc
    Sequel.application_timezone = :local
    _test_timezone
    Sequel.database_timezone = nil
    @db.timezone = :utc
    _test_timezone
  end

  cspecify "should support using local time for database storage and UTC for the application", [:tinytds], [:oracle] do
    Sequel.database_timezone = :local
    Sequel.application_timezone = :utc
    _test_timezone
    Sequel.database_timezone = nil
    @db.timezone = :local
    _test_timezone
  end

  cspecify "should support using UTC for both database storage and for application", [:oracle] do
    Sequel.default_timezone = :utc
    _test_timezone
    Sequel.database_timezone = :local
    @db.timezone = :utc
    _test_timezone
  end

  cspecify "should support using local time for both database storage and for application", [:oracle] do
    Sequel.default_timezone = :local
    _test_timezone
    Sequel.database_timezone = :utc
    @db.timezone = :local
    _test_timezone
  end

  it "should allow overriding the database_timezone on a per-database basis" do
    Sequel.database_timezone = :utc
    @db.timezone = :local
    t = Time.now
    @db[:t].insert(t)
    s = @db[:t].get(Sequel.cast(:t, String))
    if o = Date._parse(s)[:offset]
      o.must_equal t.utc_offset
    end
  end
end unless DB.frozen?
