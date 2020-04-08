require_relative "spec_helper"

describe "Sequel::Plugins::ColumnsUpdated" do
  before do
    @c = Class.new(Sequel::Model(DB[:items].with_autoid(13)))
    @c.columns :id, :x, :y
    @c.plugin :columns_updated
  end
  
  it "should make hash used for updating available in columns_updated until after hooks finish running" do
    res = nil
    @c.send(:define_method, :after_save){res = columns_updated}
    o = @c.new(:x => 1, :y => nil)
    o[:x] = 2
    o.save
    res.must_be_nil
    o.after_save
    res.must_be_nil

    o = @c.load(:id => 23,:x => 1, :y => nil)
    o[:x] = 2
    o.save
    res.must_equal(:x=>2, :y=>nil)
    o.after_save
    res.must_be_nil

    o = @c.load(:id => 23,:x => 2, :y => nil)
    o[:x] = 2
    o[:y] = 22
    o.save(:columns=>:x)
    res.must_equal(:x=>2)
    o.after_save
    res.must_be_nil
  end
end
