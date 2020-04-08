require_relative "spec_helper"

begin
  require 'active_support/duration'
  begin
    require 'active_support/gem_version'
  rescue LoadError
  end
rescue LoadError
  warn "Skipping test of pg_interval plugin: can't load active_support/duration"
else
describe "pg_interval extension" do
  before do
    @db = Sequel.connect('mock://postgres')
    @db.extend_datasets{def quote_identifiers?; false end}
    @db.extension(:pg_array, :pg_interval)
  end

  it "should literalize ActiveSupport::Duration instances to strings correctly" do
    @db.literal(ActiveSupport::Duration.new(0, [])).must_equal "'0'::interval"
    @db.literal(ActiveSupport::Duration.new(0, [[:seconds, 0]])).must_equal "'0'::interval"
    @db.literal(ActiveSupport::Duration.new(0, [[:seconds, 10], [:minutes, 20], [:days, 3], [:months, 4], [:years, 6]])).must_equal "'6 years 4 months 3 days 20 minutes 10 seconds '::interval"
    @db.literal(ActiveSupport::Duration.new(0, [[:seconds, 10], [:minutes, 20], [:hours, 8], [:days, 3], [:weeks, 2], [:months, 4], [:years, 6]])).must_equal "'6 years 4 months 2 weeks 3 days 8 hours 20 minutes 10 seconds '::interval"
    @db.literal(ActiveSupport::Duration.new(0, [[:seconds, -10.000001], [:minutes, -20], [:days, -3], [:months, -4], [:years, -6]])).must_equal "'-6 years -4 months -3 days -20 minutes -10.000001 seconds '::interval"
  end

  it "should literalize ActiveSupport::Duration instances with repeated parts correctly" do
    if defined?(ActiveSupport::VERSION::STRING) && ActiveSupport::VERSION::STRING >= '5.1'
      @db.literal(ActiveSupport::Duration.new(0, [[:seconds, 2], [:seconds, 1]])).must_equal "'1 seconds '::interval"
      @db.literal(ActiveSupport::Duration.new(0, [[:seconds, 2], [:seconds, 1], [:days, 1], [:days, 4]])).must_equal "'4 days 1 seconds '::interval"
    else
      @db.literal(ActiveSupport::Duration.new(0, [[:seconds, 2], [:seconds, 1]])).must_equal "'3 seconds '::interval"
      @db.literal(ActiveSupport::Duration.new(0, [[:seconds, 2], [:seconds, 1], [:days, 1], [:days, 4]])).must_equal "'5 days 3 seconds '::interval"
    end
  end

  it "should set up conversion procs correctly" do
    cp = @db.conversion_procs
    cp[1186].call("1 sec").must_equal ActiveSupport::Duration.new(1, [[:seconds, 1]])
  end

  it "should set up conversion procs for arrays correctly" do
    cp = @db.conversion_procs
    cp[1187].call("{1 sec}").must_equal [ActiveSupport::Duration.new(1, [[:seconds, 1]])]
  end

  it "should not affect literalization of custom objects" do
    o = Object.new
    def o.sql_literal(ds) 'v' end
    @db.literal(o).must_equal 'v'
  end

  it "should support using ActiveSupport::Duration instances as bound variables" do
    @db.bound_variable_arg(1, nil).must_equal 1
    @db.bound_variable_arg(ActiveSupport::Duration.new(0, [[:seconds, 0]]), nil).must_equal '0'
    @db.bound_variable_arg(ActiveSupport::Duration.new(0, [[:seconds, -10.000001], [:minutes, -20], [:days, -3], [:months, -4], [:years, -6]]), nil).must_equal '-6 years -4 months -3 days -20 minutes -10.000001 seconds '
  end

  it "should support using ActiveSupport::Duration instances in array types in bound variables" do
    @db.bound_variable_arg(Sequel.pg_array([ActiveSupport::Duration.new(0, [[:seconds, 0]])]), nil).must_equal '{"0"}'
    @db.bound_variable_arg(Sequel.pg_array([ActiveSupport::Duration.new(0, [[:seconds, -10.000001], [:minutes, -20], [:days, -3], [:months, -4], [:years, -6]])]), nil).must_equal '{"-6 years -4 months -3 days -20 minutes -10.000001 seconds "}'
  end

  it "should parse interval type from the schema correctly" do
    @db.fetch = [{:name=>'id', :db_type=>'integer'}, {:name=>'i', :db_type=>'interval'}]
    @db.schema(:items).map{|e| e[1][:type]}.must_equal [:integer, :interval]
  end

  it "should set :ruby_default schema entries if default value is recognized" do
    @db.fetch = [{:name=>'id', :db_type=>'integer', :default=>'1'}, {:name=>'t', :db_type=>'interval', :default=>"'3 days'::interval"}]
    s = @db.schema(:items)
    s[1][1][:ruby_default].must_equal ActiveSupport::Duration.new(3*86400, :days=>3)
  end

  it "should support typecasting for the interval type" do
    d = ActiveSupport::Duration.new(31557600 + 2*86400*30 + 3*86400*7 + 4*86400 + 5*3600 + 6*60 + 7, [[:years, 1], [:months, 2], [:days, 25], [:seconds, 18367]])
    @db.typecast_value(:interval, d).object_id.must_equal d.object_id

    @db.typecast_value(:interval, "1 year 2 mons 25 days 05:06:07").is_a?(ActiveSupport::Duration).must_equal true
    @db.typecast_value(:interval, "1 year 2 mons 25 days 05:06:07").must_equal d
    @db.typecast_value(:interval, "1 year 2 mons 25 days 05:06:07").parts.sort_by{|k,v| k.to_s}.must_equal d.parts.sort_by{|k,v| k.to_s}
    @db.typecast_value(:interval, "1 year 2 mons 25 days 05:06:07.0").parts.sort_by{|k,v| k.to_s}.must_equal d.parts.sort_by{|k,v| k.to_s}

    @db.typecast_value(:interval, "1 year 2 mons 25 days 5 hours 6 mins 7 secs").is_a?(ActiveSupport::Duration).must_equal true
    @db.typecast_value(:interval, "1 year 2 mons 25 days 5 hours 6 mins 7 secs").must_equal d
    @db.typecast_value(:interval, "1 year 2 mons 25 days 5 hours 6 mins 7 secs").parts.sort_by{|k,v| k.to_s}.must_equal d.parts.sort_by{|k,v| k.to_s}
    @db.typecast_value(:interval, "1 year 2 mons 25 days 5 hours 6 mins 7.0 secs").parts.sort_by{|k,v| k.to_s}.must_equal d.parts.sort_by{|k,v| k.to_s}

    d2 = ActiveSupport::Duration.new(1, [[:seconds, 1]])
    @db.typecast_value(:interval, 1).is_a?(ActiveSupport::Duration).must_equal true
    @db.typecast_value(:interval, 1).must_equal d2
    @db.typecast_value(:interval, 1).parts.sort_by{|k,v| k.to_s}.must_equal d2.parts.sort_by{|k,v| k.to_s}

    proc{@db.typecast_value(:interval, 'foo')}.must_raise(Sequel::InvalidValue)
    proc{@db.typecast_value(:interval, Object.new)}.must_raise(Sequel::InvalidValue)
  end

  it "should return correct results for Database#schema_type_class" do
    @db.schema_type_class(:interval).must_equal ActiveSupport::Duration
    @db.schema_type_class(:integer).must_equal Integer
  end
end
end
