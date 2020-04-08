require_relative "spec_helper"

describe "LooserTypecasting Extension" do
  before do
    @db = Sequel.mock
    def @db.supports_schema_parsing?() true end
    def @db.schema(*args)
      [[:id, {}], [:z, {:type=>:float}], [:b, {:type=>:integer}], [:d, {:type=>:decimal}], [:s, {:type=>:string}]]
    end 
    @c = Class.new(Sequel::Model(@db[:items]))
    @db.extension(:looser_typecasting)
    @c.instance_eval do
      @columns = [:id, :b, :z, :d, :s] 
      def columns; @columns; end 
    end
  end

  it "should not raise errors for invalid strings in integer columns" do
    @c.new(:b=>'a').b.must_equal 0
    @c.new(:b=>'a').b.must_be_kind_of(Integer)
  end

  it "should not raise errors for invalid strings in float columns" do
    @c.new(:z=>'a').z.must_equal 0.0
    @c.new(:z=>'a').z.must_be_kind_of(Float)
  end

  it "should not raise errors for hash or array input to string columns" do
    @c.new(:s=>'a').s.must_equal 'a'
    @c.new(:s=>[]).s.must_be_kind_of(String)
    @c.new(:s=>{}).s.must_be_kind_of(String)
  end

  it "should not raise errors for invalid strings in decimal columns" do
    @c.new(:d=>'a').d.must_equal 0.0
    @c.new(:d=>'a').d.must_be_kind_of(BigDecimal)
  end

  it "should not affect conversions of other types in decimal columns" do
    @c.new(:d=>1).d.must_equal 1
    @c.new(:d=>1).d.must_be_kind_of(BigDecimal)
  end
end
