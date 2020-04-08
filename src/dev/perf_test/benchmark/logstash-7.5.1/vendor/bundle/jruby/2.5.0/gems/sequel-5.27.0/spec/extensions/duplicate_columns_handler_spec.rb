require_relative "spec_helper"

mod = shared_description do
  it "should take action depending on :on_duplicate_columns if 2 or more columns have the same name" do
    check(nil, @cols)
    @warned.must_be_nil

    check(:ignore, @cols)
    @warned.must_be_nil

    check(:warn, @cols)
    @warned.must_include("One or more duplicate columns present in #{@cols.inspect}")

    proc{check(:raise, @cols)}.must_raise(Sequel::DuplicateColumnError)

    cols = nil
    check(proc{|cs| cols = cs; nil}, @cols)
    @warned.must_be_nil
    cols.must_equal @cols

    cols = nil
    check(proc{|cs| cols = cs; :ignore}, @cols)
    @warned.must_be_nil
    cols.must_equal @cols

    cols = nil
    proc{check(proc{|cs| cols = cs; :raise}, @cols)}.must_raise(Sequel::DuplicateColumnError)
    cols.must_equal @cols

    cols = nil
    check(proc{|cs| cols = cs; :warn}, @cols)
    @warned.must_include("One or more duplicate columns present in #{@cols.inspect}")
    cols.must_equal @cols

    check(:raise, nil)
    @warned.must_be_nil
  end

  it "should not raise error or warning if no columns have the same name" do
    [nil, :ignore, :raise, :warn, proc{|cs| :raise}].each do |handler|
      check(handler, @cols.uniq)
      @warned.must_be_nil
    end
  end
end

describe "Sequel::DuplicateColumnsHandler Database configuration" do
  before do
    @db = Sequel.mock
    @db.extension(:duplicate_columns_handler)
    @cols = [:id, :name, :id]
    @warned = nil
    set_warned = @set_warned = proc{|m| @warned = m}
    @ds = @db[:things].with_extend{define_method(:warn){|message| set_warned.call(message)}}
  end

  def check(handler, cols)
    @db.opts[:on_duplicate_columns] = handler
    @set_warned.call(nil)
    @ds.send(:columns=, cols)
  end

  include mod
end

describe "Sequel::DuplicateColumnsHandler Dataset configuration" do
  before do
    @cols = [:id, :name, :id]
    @warned = nil
    set_warned = @set_warned = proc{|m| @warned = m}
    @ds = Sequel.mock[:things].extension(:duplicate_columns_handler).with_extend{define_method(:warn){|message| set_warned.call(message)}}
  end

  def check(handler, cols)
    @set_warned.call(nil)
    @ds.on_duplicate_columns(handler).send(:columns=, cols)
  end

  include mod

  it "should use handlers passed as blocks to on_duplicate_columns" do
    proc{@ds.on_duplicate_columns{:raise}.send(:columns=, @cols)}.must_raise(Sequel::DuplicateColumnError)
  end

  it "should raise an error if not providing either an argument or block to on_duplicate_columns" do
    proc{@ds.on_duplicate_columns}.must_raise(Sequel::Error)
  end

  it "should raise an error if providing both an argument and block to on_duplicate_columns" do
    proc{@ds.on_duplicate_columns(:raise){:raise}}.must_raise(Sequel::Error)
  end

  it "should warn by defaul if there is no database or dataset handler" do
    @ds.send(:columns=, @cols)
    @warned.must_include("One or more duplicate columns present in #{@cols.inspect}")
  end

  it "should fallback to database setting if there is no dataset-level handler" do
    @ds.db.opts[:on_duplicate_columns] = :raise
    proc{@ds.send(:columns=, @cols)}.must_raise(Sequel::DuplicateColumnError)
    check(:ignore, @cols)
    @warned.must_be_nil
  end
end
