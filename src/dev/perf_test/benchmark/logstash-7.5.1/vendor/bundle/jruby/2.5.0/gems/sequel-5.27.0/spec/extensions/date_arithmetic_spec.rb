require_relative "spec_helper"

asd = begin
  require 'active_support/duration'
  true
rescue LoadError
  warn "Skipping some tests of date_arithmetic extension: can't load active_support/duration"
  false
end

Sequel.extension :date_arithmetic

describe "date_arithmetic extension" do
  dbf = lambda do |db_type|
    db = Sequel.connect("mock://#{db_type}")
    db.extension :date_arithmetic
    db
  end

  before do
    @h0 = {:days=>0}
    @h1 = {:days=>1, :years=>nil, :hours=>0}
    @h2 = {:years=>1, :months=>1, :days=>1, :hours=>1, :minutes=>1, :seconds=>1}
  end

  it "should have Sequel.date_add with an interval hash return an appropriate Sequel::SQL::DateAdd expression" do
    da = Sequel.date_add(:a, :days=>1)
    da.must_be_kind_of(Sequel::SQL::DateAdd)
    da.expr.must_equal :a
    da.interval.must_equal(:days=>1)
    Sequel.date_add(:a, :years=>1, :months=>2, :days=>3, :hours=>1, :minutes=>1, :seconds=>1).interval.must_equal(:years=>1, :months=>2, :days=>3, :hours=>1, :minutes=>1, :seconds=>1)
  end

  it "should have Sequel.date_sub with an interval hash return an appropriate Sequel::SQL::DateAdd expression" do
    da = Sequel.date_sub(:a, :days=>1)
    da.must_be_kind_of(Sequel::SQL::DateAdd)
    da.expr.must_equal :a
    da.interval.must_equal(:days=>-1)
    Sequel.date_sub(:a, :years=>1, :months=>2, :days=>3, :hours=>1, :minutes=>1, :seconds=>1).interval.must_equal(:years=>-1, :months=>-2, :days=>-3, :hours=>-1, :minutes=>-1, :seconds=>-1)
  end

  it "should have Sequel.date_* with an interval hash handle nil values" do
    Sequel.date_sub(:a, :days=>1, :hours=>nil).interval.must_equal(:days=>-1)
  end

  it "should raise an error if given string values in an interval hash" do
    lambda{Sequel.date_add(:a, :days=>'1')}.must_raise(Sequel::InvalidValue)
  end

  if asd
    it "should have Sequel.date_add with an ActiveSupport::Duration return an appropriate Sequel::SQL::DateAdd expression" do
      da = Sequel.date_add(:a, ActiveSupport::Duration.new(1, [[:days, 1]]))
      da.must_be_kind_of(Sequel::SQL::DateAdd)
      da.expr.must_equal :a
      da.interval.must_equal(:days=>1)
      Sequel.date_add(:a, ActiveSupport::Duration.new(1, [[:years, 1], [:months, 1], [:days, 1], [:minutes, 61], [:seconds, 1]])).interval.must_equal(:years=>1, :months=>1, :days=>1, :minutes=>61, :seconds=>1)
    end

    it "should have Sequel.date_sub with an ActiveSupport::Duration return an appropriate Sequel::SQL::DateAdd expression" do
      da = Sequel.date_sub(:a, ActiveSupport::Duration.new(1, [[:days, 1]]))
      da.must_be_kind_of(Sequel::SQL::DateAdd)
      da.expr.must_equal :a
      da.interval.must_equal(:days=>-1)
      Sequel.date_sub(:a, ActiveSupport::Duration.new(1, [[:years, 1], [:months, 1], [:days, 1], [:minutes, 61], [:seconds, 1]])).interval.must_equal(:years=>-1, :months=>-1, :days=>-1, :minutes=>-61, :seconds=>-1)
    end
  end

  it "should use existing method" do
    db = Sequel.mock
    db.extend_datasets do
      def date_add_sql_append(sql, da)
        interval = String.new
        each_valid_interval_unit(da.interval, Sequel::SQL::DateAdd::DatasetMethods::DEF_DURATION_UNITS) do |value, sql_unit|
          interval << "#{value} #{sql_unit} "
        end
        literal_append(sql, Sequel.function(:da, da.expr, interval))
      end
    end
    db.extension :date_arithmetic
    db.literal(Sequel.date_add(:a, @h0)).must_equal "da(a, '')"
    db.literal(Sequel.date_add(:a, @h1)).must_equal "da(a, '1 days ')"
    db.literal(Sequel.date_add(:a, @h2)).must_equal "da(a, '1 years 1 months 1 days 1 hours 1 minutes 1 seconds ')"
  end

  it "should correctly literalize on Postgres" do
    db = dbf.call(:postgres).dataset.with_quote_identifiers(false)
    db.literal(Sequel.date_add(:a, @h0)).must_equal "CAST(a AS timestamp)"
    db.literal(Sequel.date_add(:a, @h1)).must_equal "(CAST(a AS timestamp) + CAST('1 days ' AS interval))"
    db.literal(Sequel.date_add(:a, @h2)).must_equal "(CAST(a AS timestamp) + CAST('1 years 1 months 1 days 1 hours 1 minutes 1 seconds ' AS interval))"

    db.literal(Sequel.date_add(:a, @h0, :cast=>:timestamptz)).must_equal "CAST(a AS timestamptz)"
    db.literal(Sequel.date_sub(:a, @h0, :cast=>:timestamptz)).must_equal "CAST(a AS timestamptz)"
    db.literal(Sequel.date_add(:a, @h2, :cast=>:timestamptz)).must_equal "(CAST(a AS timestamptz) + CAST('1 years 1 months 1 days 1 hours 1 minutes 1 seconds ' AS interval))"
  end

  it "should correctly literalize on SQLite" do
    db = dbf.call(:sqlite).dataset.with_quote_identifiers(false)
    db.literal(Sequel.date_add(:a, @h0)).must_equal "datetime(a)"
    db.literal(Sequel.date_add(:a, @h1)).must_equal "datetime(a, '1 days')"
    db.literal(Sequel.date_add(:a, @h2)).must_equal "datetime(a, '1 years', '1 months', '1 days', '1 hours', '1 minutes', '1 seconds')"
  end

  it "should correctly literalize on MySQL" do
    db = dbf.call(:mysql).dataset.with_quote_identifiers(false)
    db.literal(Sequel.date_add(:a, @h0)).must_equal "CAST(a AS DATETIME)"
    db.literal(Sequel.date_add(:a, @h1)).must_equal "DATE_ADD(a, INTERVAL 1 DAY)"
    db.literal(Sequel.date_add(:a, @h2)).must_equal "DATE_ADD(DATE_ADD(DATE_ADD(DATE_ADD(DATE_ADD(DATE_ADD(a, INTERVAL 1 YEAR), INTERVAL 1 MONTH), INTERVAL 1 DAY), INTERVAL 1 HOUR), INTERVAL 1 MINUTE), INTERVAL 1 SECOND)"
    db.literal(Sequel.date_add(:a, @h0, :cast=>:timestamp)).must_equal "CAST(a AS timestamp)"
  end

  it "should correctly literalize on HSQLDB" do
    db = Sequel.mock
    def db.database_type; :hsqldb end
    db.extension :date_arithmetic
    db.literal(Sequel.date_add(:a, @h0)).must_equal "CAST(CAST(a AS timestamp) AS timestamp)"
    db.literal(Sequel.date_add(:a, @h1)).must_equal "DATE_ADD(CAST(a AS timestamp), INTERVAL 1 DAY)"
    db.literal(Sequel.date_add(:a, @h2)).must_equal "DATE_ADD(DATE_ADD(DATE_ADD(DATE_ADD(DATE_ADD(DATE_ADD(CAST(a AS timestamp), INTERVAL 1 YEAR), INTERVAL 1 MONTH), INTERVAL 1 DAY), INTERVAL 1 HOUR), INTERVAL 1 MINUTE), INTERVAL 1 SECOND)"

    db.literal(Sequel.date_add(:a, @h0, :cast=>:datetime)).must_equal "CAST(CAST(a AS datetime) AS datetime)"
    db.literal(Sequel.date_add(:a, @h2, :cast=>:datetime)).must_equal "DATE_ADD(DATE_ADD(DATE_ADD(DATE_ADD(DATE_ADD(DATE_ADD(CAST(a AS datetime), INTERVAL 1 YEAR), INTERVAL 1 MONTH), INTERVAL 1 DAY), INTERVAL 1 HOUR), INTERVAL 1 MINUTE), INTERVAL 1 SECOND)"
  end

  it "should correctly literalize on MSSQL" do
    db = dbf.call(:mssql).dataset.with_quote_identifiers(false)
    db.literal(Sequel.date_add(:A, @h0)).must_equal "CAST(A AS datetime)"
    db.literal(Sequel.date_add(:A, @h1)).must_equal "DATEADD(day, 1, A)"
    db.literal(Sequel.date_add(:A, @h2)).must_equal "DATEADD(second, 1, DATEADD(minute, 1, DATEADD(hour, 1, DATEADD(day, 1, DATEADD(month, 1, DATEADD(year, 1, A))))))"
    db.literal(Sequel.date_add(:A, @h0, :cast=>:timestamp)).must_equal "CAST(A AS timestamp)"
  end

  it "should correctly literalize on H2" do
    db = Sequel.mock
    def db.database_type; :h2 end
    db.extension :date_arithmetic
    db.literal(Sequel.date_add(:a, @h0)).must_equal "CAST(a AS timestamp)"
    db.literal(Sequel.date_add(:a, @h1)).must_equal "DATEADD('day', 1, a)"
    db.literal(Sequel.date_add(:a, @h2)).must_equal "DATEADD('second', 1, DATEADD('minute', 1, DATEADD('hour', 1, DATEADD('day', 1, DATEADD('month', 1, DATEADD('year', 1, a))))))"
    db.literal(Sequel.date_add(:a, @h0, :cast=>:datetime)).must_equal "CAST(a AS datetime)"
  end

  it "should correctly literalize on access" do
    db = dbf.call(:access).dataset.with_quote_identifiers(false)
    db.literal(Sequel.date_add(:a, @h0)).must_equal "CDate(a)"
    db.literal(Sequel.date_add(:a, @h1)).must_equal "DATEADD('d', 1, a)"
    db.literal(Sequel.date_add(:a, @h2)).must_equal "DATEADD('s', 1, DATEADD('n', 1, DATEADD('h', 1, DATEADD('d', 1, DATEADD('m', 1, DATEADD('yyyy', 1, a))))))"
  end

  it "should correctly literalize on Derby" do
    db = Sequel.mock
    def db.database_type; :derby end
    db.extension :date_arithmetic
    db.literal(Sequel.date_add(:a, @h0)).must_equal "CAST(a AS timestamp)"
    db.literal(Sequel.date_add(:a, @h1)).must_equal "{fn timestampadd(SQL_TSI_DAY, 1, timestamp(a))}"
    db.literal(Sequel.date_add(:a, @h2)).must_equal "{fn timestampadd(SQL_TSI_SECOND, 1, timestamp({fn timestampadd(SQL_TSI_MINUTE, 1, timestamp({fn timestampadd(SQL_TSI_HOUR, 1, timestamp({fn timestampadd(SQL_TSI_DAY, 1, timestamp({fn timestampadd(SQL_TSI_MONTH, 1, timestamp({fn timestampadd(SQL_TSI_YEAR, 1, timestamp(a))}))}))}))}))}))}"
    db.literal(Sequel.date_add(Date.civil(2012, 11, 12), @h1)).must_equal "{fn timestampadd(SQL_TSI_DAY, 1, timestamp((CAST('2012-11-12' AS varchar(255)) || ' 00:00:00')))}"
    db.literal(Sequel.date_add(:a, @h0, :cast=>:datetime)).must_equal "CAST(a AS datetime)"
  end

  it "should correctly literalize on Oracle" do
    db = dbf.call(:oracle).dataset.with_quote_identifiers(false)
    db.literal(Sequel.date_add(:A, @h0)).must_equal "CAST(A AS timestamp)"
    db.literal(Sequel.date_add(:A, @h1)).must_equal "(A + INTERVAL '1' DAY)"
    db.literal(Sequel.date_add(:A, @h2)).must_equal "(A + INTERVAL '1' YEAR + INTERVAL '1' MONTH + INTERVAL '1' DAY + INTERVAL '1' HOUR + INTERVAL '1' MINUTE + INTERVAL '1' SECOND)"
    db.literal(Sequel.date_add(:A, @h0, :cast=>:datetime)).must_equal "CAST(A AS datetime)"
  end

  it "should correctly literalize on DB2" do
    db = dbf.call(:db2)
    db.literal(Sequel.date_add(:A, @h0)).must_equal "CAST(A AS timestamp)"
    db.literal(Sequel.date_add(:A, @h1)).must_equal "(CAST(A AS timestamp) + 1 days)"
    db.literal(Sequel.date_add(:A, @h0)).must_equal "CAST(A AS timestamp)"
    db.literal(Sequel.date_add(:A, @h1, :cast=>:datetime)).must_equal "(CAST(A AS datetime) + 1 days)"
    db.literal(Sequel.date_add(:A, @h2, :cast=>:datetime)).must_equal "(CAST(A AS datetime) + 1 years + 1 months + 1 days + 1 hours + 1 minutes + 1 seconds)"
  end

  it "should raise error if literalizing on an unsupported database" do
    db = Sequel.mock
    db.extension :date_arithmetic
    lambda{db.literal(Sequel.date_add(:a, @h0))}.must_raise(Sequel::Error)
  end
end
