require_relative "spec_helper"

describe "Sequel::Plugins::StringStripper" do
  before do
    @db = Sequel.mock
    @c = Class.new(Sequel::Model(@db[:test]))
    @c.columns :name, :b
    @c.db_schema[:b][:type] = :blob
    @c.plugin :string_stripper
    @o = @c.new
  end

  it "should strip all input strings" do
    @o.name = ' name '
    @o.name.must_equal 'name'
  end

  it "should not affect other types" do
    @o.name = 1
    @o.name.must_equal 1
    @o.name = Date.today
    @o.name.must_equal Date.today
  end

  it "should not strip strings for blob arguments" do
    v = Sequel.blob(' name ')
    @o.name = v
    @o.name.must_be_same_as(v)
  end

  it "should not strip strings for blob columns" do
    @o.b = ' name '
    @o.b.must_be_kind_of(Sequel::SQL::Blob)
    @o.b.must_equal Sequel.blob(' name ')
  end

  it "should allow skipping of columns using Model.skip_string_stripping" do
    @c.skip_string_stripping?(:name).must_equal false
    @c.skip_string_stripping :name
    @c.skip_string_stripping?(:name).must_equal true
    v = ' name '
    @o.name = v
    @o.name.must_be_same_as(v)
  end

  it "should work correctly in subclasses" do
    o = Class.new(@c).new
    o.name = ' name '
    o.name.must_equal 'name'
    o.b = ' name '
    o.b.must_be_kind_of(Sequel::SQL::Blob)
    o.b.must_equal Sequel.blob(' name ')
  end

  it "should work correctly for dataset changes" do
    c = Class.new(Sequel::Model(@db[:test]))
    c.plugin :string_stripper
    def @db.supports_schema_parsing?() true end
    def @db.schema(*) [[:name, {}], [:b, {:type=>:blob}]] end
    c.set_dataset(@db[:test2])
    o = c.new
    o.name = ' name '
    o.name.must_equal 'name'
    o.b = ' name '
    o.b.must_be_kind_of(Sequel::SQL::Blob)
    o.b.must_equal Sequel.blob(' name ')
  end
end
