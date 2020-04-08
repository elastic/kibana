require_relative "spec_helper"

describe "accessed_columns plugin" do
  before do
    @db = Sequel.mock(:fetch=>{:name=>'a', :b=>'c'}, :numrows=>1)
    @c = Class.new(Sequel::Model(@db[:test]))
    @c.columns :name, :b
    @c.plugin :accessed_columns
    @o = @c.new
  end

  it "should record columns accessed" do
    @o.accessed_columns.must_equal []
    @o.name
    @o.accessed_columns.must_equal [:name]
    @o.name
    @o.accessed_columns.must_equal [:name]
    @o.b
    @o.accessed_columns.sort_by{|s| s.to_s}.must_equal [:b, :name]
  end

  it "should clear accessed columns when refreshing" do
    @o.name
    @o.refresh
    @o.accessed_columns.must_equal []
  end

  it "should clear accessed columns when saving" do
    @o.name
    @o.save
    @o.accessed_columns.must_equal []
  end

  it "should work when duping and cloning instances" do
    @o.name
    o = @o.dup
    @o.accessed_columns.must_equal [:name]
    @o.b
    @o.accessed_columns.sort_by{|s| s.to_s}.must_equal [:b, :name]
    o.accessed_columns.must_equal [:name]
    o2 = o.clone
    o2.refresh
    o.accessed_columns.must_equal [:name]
    o2.accessed_columns.must_equal []
  end

  it "should not raise exceptions when object is frozen" do
    @o.freeze
    @o.name
  end
end
