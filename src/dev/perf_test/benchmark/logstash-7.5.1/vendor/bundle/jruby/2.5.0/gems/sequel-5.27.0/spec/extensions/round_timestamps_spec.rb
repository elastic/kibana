require_relative "spec_helper"

describe "Sequel::Dataset::RoundTimestamps" do
  before do
    @dataset = Sequel.mock.dataset.extension(:round_timestamps)
  end

  it "should round times properly for databases supporting microsecond precision" do
    @dataset.literal(Sequel::SQLTime.create(1, 2, 3, 499999.5)).must_equal "'01:02:03.500000'"
    @dataset.literal(Time.local(2010, 1, 2, 3, 4, 5.4999995)).must_equal "'2010-01-02 03:04:05.500000'"
    @dataset.literal(DateTime.new(2010, 1, 2, 3, 4, Rational(54999995, 10000000))).must_equal "'2010-01-02 03:04:05.500000'"

    @dataset.literal(Sequel::SQLTime.create(1, 2, 3, 499999.4)).must_equal "'01:02:03.499999'"
    @dataset.literal(Time.local(2010, 1, 2, 3, 4, 5.4999994)).must_equal "'2010-01-02 03:04:05.499999'"
    @dataset.literal(DateTime.new(2010, 1, 2, 3, 4, Rational(54999994, 10000000))).must_equal "'2010-01-02 03:04:05.499999'"
  end
  
  it "should round times properly for databases supporting millisecond precision" do
    @dataset = @dataset.with_extend{def timestamp_precision; 3 end}
    @dataset.literal(Sequel::SQLTime.create(1, 2, 3, 499500)).must_equal "'01:02:03.500'"
    @dataset.literal(Time.local(2010, 1, 2, 3, 4, 5.4995)).must_equal "'2010-01-02 03:04:05.500'"
    @dataset.literal(DateTime.new(2010, 1, 2, 3, 4, Rational(54995, 10000))).must_equal "'2010-01-02 03:04:05.500'"

    @dataset.literal(Sequel::SQLTime.create(1, 2, 3, 499499)).must_equal "'01:02:03.499'"
    @dataset.literal(Time.local(2010, 1, 2, 3, 4, 5.4994)).must_equal "'2010-01-02 03:04:05.499'"
    @dataset.literal(DateTime.new(2010, 1, 2, 3, 4, Rational(54994, 10000))).must_equal "'2010-01-02 03:04:05.499'"
  end
  
  it "should round times properly for databases supporting second precision" do
    @dataset = @dataset.with_extend{def supports_timestamp_usecs?; false end}
    @dataset.literal(Sequel::SQLTime.create(1, 2, 3, 500000)).must_equal "'01:02:04'"
    @dataset.literal(Time.local(2010, 1, 2, 3, 4, 5.5)).must_equal "'2010-01-02 03:04:06'"
    @dataset.literal(DateTime.new(2010, 1, 2, 3, 4, Rational(55, 10))).must_equal "'2010-01-02 03:04:06'"

    @dataset.literal(Sequel::SQLTime.create(1, 2, 3, 499999)).must_equal "'01:02:03'"
    @dataset.literal(Time.local(2010, 1, 2, 3, 4, 5.4999999)).must_equal "'2010-01-02 03:04:05'"
    @dataset.literal(DateTime.new(2010, 1, 2, 3, 4, Rational(54999999, 10000000))).must_equal "'2010-01-02 03:04:05'"
  end
end
