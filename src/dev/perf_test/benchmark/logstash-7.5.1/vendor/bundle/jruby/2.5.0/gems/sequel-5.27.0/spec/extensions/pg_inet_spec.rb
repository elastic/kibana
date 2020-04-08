require_relative "spec_helper"

describe "pg_inet extension" do
  ipv6_broken = (IPAddr.new('::1'); false) rescue true
  before do
    @db = Sequel.connect('mock://postgres')
    @db.extend_datasets{def quote_identifiers?; false end}
    @db.extension(:pg_array, :pg_inet)
  end

  it "should literalize IPAddr v4 instances to strings correctly" do
    @db.literal(IPAddr.new('127.0.0.1')).must_equal "'127.0.0.1/32'"
    @db.literal(IPAddr.new('127.0.0.0/8')).must_equal "'127.0.0.0/8'"
  end

  it "should literalize IPAddr v6 instances to strings correctly" do
    @db.literal(IPAddr.new('2001:4f8:3:ba::/64')).must_equal "'2001:4f8:3:ba::/64'"
    @db.literal(IPAddr.new('2001:4f8:3:ba:2e0:81ff:fe22:d1f1')).must_equal "'2001:4f8:3:ba:2e0:81ff:fe22:d1f1/128'"
  end unless ipv6_broken

  it "should set up conversion procs correctly" do
    cp = @db.conversion_procs
    cp[869].call("127.0.0.1").must_equal IPAddr.new('127.0.0.1')
    cp[650].call("127.0.0.1").must_equal IPAddr.new('127.0.0.1')
  end

  it "should set up conversion procs for arrays correctly" do
    cp = @db.conversion_procs
    cp[1041].call("{127.0.0.1}").must_equal [IPAddr.new('127.0.0.1')]
    cp[651].call("{127.0.0.1}").must_equal [IPAddr.new('127.0.0.1')]
    cp[1040].call("{127.0.0.1}").must_equal ['127.0.0.1']
  end

  it "should not affect literalization of custom objects" do
    o = Object.new
    def o.sql_literal(ds) 'v' end
    @db.literal(o).must_equal 'v'
  end

  it "should support using IPAddr as bound variables" do
    @db.bound_variable_arg(1, nil).must_equal 1
    @db.bound_variable_arg(IPAddr.new('127.0.0.1'), nil).must_equal '127.0.0.1/32'
  end

  it "should support using IPAddr instances in array types in bound variables" do
    @db.bound_variable_arg(Sequel.pg_array([IPAddr.new('127.0.0.1')]), nil).must_equal '{"127.0.0.1/32"}'
  end

  it "should parse inet/cidr type from the schema correctly" do
    @db.fetch = [{:name=>'id', :db_type=>'integer'}, {:name=>'i', :db_type=>'inet'}, {:name=>'c', :db_type=>'cidr'}]
    @db.schema(:items).map{|e| e[1][:type]}.must_equal [:integer, :ipaddr, :ipaddr]
  end

  it "should set :ruby_default schema entries if default value is recognized" do
    @db.fetch = [{:name=>'id', :db_type=>'integer', :default=>'1'}, {:name=>'t', :db_type=>'inet', :default=>"'127.0.0.1'::inet"}]
    s = @db.schema(:items)
    s[1][1][:ruby_default].must_equal IPAddr.new('127.0.0.1')
  end

  it "should support typecasting for the ipaddr type" do
    ip = IPAddr.new('127.0.0.1')
    @db.typecast_value(:ipaddr, ip).must_be_same_as(ip)
    @db.typecast_value(:ipaddr, ip.to_s).must_equal ip
    proc{@db.typecast_value(:ipaddr, '')}.must_raise(Sequel::InvalidValue)
    proc{@db.typecast_value(:ipaddr, 1)}.must_raise(Sequel::InvalidValue)
  end

  it "should return correct results for Database#schema_type_class" do
    @db.schema_type_class(:ipaddr).must_equal IPAddr
    @db.schema_type_class(:integer).must_equal Integer
  end
end
