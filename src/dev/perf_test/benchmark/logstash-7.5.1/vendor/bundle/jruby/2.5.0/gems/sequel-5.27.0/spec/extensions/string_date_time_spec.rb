require_relative "spec_helper"

Sequel.extension :string_date_time

describe "String#to_time" do
  it "should convert the string into a Time object" do
    "2007-07-11".to_time.must_equal Time.parse("2007-07-11")
    "06:30".to_time.must_equal Time.parse("06:30")
  end
  
  it "should raise InvalidValue for an invalid time" do
    proc {'0000-00-00'.to_time}.must_raise(Sequel::InvalidValue)
  end
end

describe "String#to_date" do
  after do
    Sequel.convert_two_digit_years = true
  end

  it "should convert the string into a Date object" do
    "2007-07-11".to_date.must_equal Date.parse("2007-07-11")
  end
  
  it "should convert 2 digit years by default" do
    "July 11, 07".to_date.must_equal Date.parse("2007-07-11")
  end

  it "should not convert 2 digit years if set not to" do
    Sequel.convert_two_digit_years = false
    "July 11, 07".to_date.must_equal Date.parse("0007-07-11")
  end

  it "should raise InvalidValue for an invalid date" do
    proc {'0000-00-00'.to_date}.must_raise(Sequel::InvalidValue)
  end
end

describe "String#to_datetime" do
  after do
    Sequel.convert_two_digit_years = true
  end

  it "should convert the string into a DateTime object" do
    "2007-07-11 10:11:12a".to_datetime.must_equal DateTime.parse("2007-07-11 10:11:12a")
  end
  
  it "should convert 2 digit years by default" do
    "July 11, 07 10:11:12a".to_datetime.must_equal DateTime.parse("2007-07-11 10:11:12a")
  end

  it "should not convert 2 digit years if set not to" do
    Sequel.convert_two_digit_years = false
    "July 11, 07 10:11:12a".to_datetime.must_equal DateTime.parse("0007-07-11 10:11:12a")
  end

  it "should raise InvalidValue for an invalid date" do
    proc {'0000-00-00'.to_datetime}.must_raise(Sequel::InvalidValue)
  end
end

describe "String#to_sequel_time" do
  after do
    Sequel.datetime_class = Time
    Sequel.convert_two_digit_years = true
  end

  it "should convert the string into a Time object by default" do
    "2007-07-11 10:11:12a".to_sequel_time.class.must_equal Time
    "2007-07-11 10:11:12a".to_sequel_time.must_equal Time.parse("2007-07-11 10:11:12a")
  end
  
  it "should convert the string into a DateTime object if that is set" do
    Sequel.datetime_class = DateTime
    "2007-07-11 10:11:12a".to_sequel_time.class.must_equal DateTime
    "2007-07-11 10:11:12a".to_sequel_time.must_equal DateTime.parse("2007-07-11 10:11:12a")
  end
  
  it "should convert 2 digit years by default if using DateTime class" do
    Sequel.datetime_class = DateTime
    "July 11, 07 10:11:12a".to_sequel_time.must_equal DateTime.parse("2007-07-11 10:11:12a")
  end

  it "should not convert 2 digit years if set not to when using DateTime class" do
    Sequel.datetime_class = DateTime
    Sequel.convert_two_digit_years = false
    "July 11, 07 10:11:12a".to_sequel_time.must_equal DateTime.parse("0007-07-11 10:11:12a")
  end

  it "should raise InvalidValue for an invalid time" do
    proc {'0000-00-00'.to_sequel_time}.must_raise(Sequel::InvalidValue)
    Sequel.datetime_class = DateTime
    proc {'0000-00-00'.to_sequel_time}.must_raise(Sequel::InvalidValue)
  end
end
