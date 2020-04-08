require_relative "spec_helper"

describe "freeze_datasets extension" do
  before do
    @db = Sequel.mock.extension(:freeze_datasets)
  end

  it "should freeze datasets by default" do
    @db.dataset.frozen?.must_equal true
    @db.fetch('SQL').frozen?.must_equal true
    @db.from(:table).frozen?.must_equal true
    @db[:table].frozen?.must_equal true
  end

  it "should have dataset#dup return frozen dataset" do
    @db.dataset.dup.frozen?.must_equal true
  end

  it "should cache Database#from calls with single symbol tables" do
    @db.from(:foo).must_be_same_as @db.from(:foo)
    @db.from(Sequel[:foo]).wont_be_same_as @db.from(Sequel[:foo])
  end

  it "should clear Database#from cache when modifying the schema" do
    ds = @db.from(:foo)
    ds.columns(:foo, :bar)
    @db[:foo].columns.must_equal [:foo, :bar]
    @db.create_table!(:foo){Integer :x}
    @db[:foo].columns.wont_equal [:foo, :bar]
  end
end
