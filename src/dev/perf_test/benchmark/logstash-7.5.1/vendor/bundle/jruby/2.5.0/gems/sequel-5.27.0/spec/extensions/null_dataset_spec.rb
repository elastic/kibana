require_relative "spec_helper"

describe "null_dataset extension" do
  before do
    @db = Sequel::mock(:fetch=>{:id=>1}, :autoid=>1, :numrows=>1, :columns=>[:id]).extension(:null_dataset)
    @ds = @db[:table].nullify
    @i = 0
    @pr = proc{|*a| @i += 1}
  end
  after do
    @db.sqls.must_equal [] unless @skip_check
  end

  it "should make each be a noop" do
    @ds.each(&@pr).must_be_same_as(@ds)
    @i.must_equal 0
  end

  it "should make fetch_rows be a noop" do
    @ds.fetch_rows("SELECT 1", &@pr).must_be_nil
    @i.must_equal 0
  end

  it "nullify should be a cached dataset" do
    ds = @db[:table]
    ds.nullify.object_id.must_equal(ds.nullify.object_id)
  end

  it "should make insert be a noop" do
    @ds.insert(1).must_be_nil
  end

  it "should make update be a noop" do
    @ds.update(:a=>1).must_equal 0
  end

  it "should make delete be a noop" do
    @ds.delete.must_equal 0
  end

  it "should make truncate be a noop" do
    @ds.truncate.must_be_nil
  end

  it "should make execute_* be a noop" do
    @ds.send(:execute_ddl,'FOO').must_be_nil
    @ds.send(:execute_insert,'FOO').must_be_nil
    @ds.send(:execute_dui,'FOO').must_be_nil
    @ds.send(:execute,'FOO').must_be_nil
  end

  it "should have working columns" do
    @skip_check = true
    2.times do
      @ds.columns.must_equal [:id]
    end
    @db.sqls.must_equal ['SELECT * FROM table LIMIT 1']
  end

  it "should have count return 0" do
    @ds.count.must_equal 0
  end

  it "should have empty return true" do
    @ds.empty?.must_equal true
  end

  it "should make import a noop" do
    @ds.import([:id], [[1], [2], [3]]).must_be_nil
  end

  it "should have nullify method returned modified receiver" do
    @skip_check = true
    ds = @db[:table]
    ds.nullify.wont_be_same_as(ds)
    ds.each(&@pr)
    @db.sqls.must_equal ['SELECT * FROM table']
    @i.must_equal 1
  end

  it "should work with method chaining" do
    @ds.where(:a=>1).select(:b).each(&@pr)
    @i.must_equal 0
  end
end
