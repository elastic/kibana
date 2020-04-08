require_relative "spec_helper"

describe "column_conflicts plugin" do
  before do
    @db = Sequel.mock
    @c = Class.new(Sequel::Model(@db[:test]))
    @c.columns :model, :use_transactions, :foo
    @c.plugin :column_conflicts
    @o = @c.load(:model=>1, :use_transactions=>2, :foo=>4)
  end

  it "should have mass assignment work correctly" do
    @o.set_fields({:use_transactions=>3}, [:use_transactions])
    @o.get_column_value(:use_transactions).must_equal 3
  end

  it "should handle both symbols and strings" do
    @o.get_column_value(:model).must_equal 1
    @o.get_column_value("model").must_equal 1
    @o.set_column_value(:use_transactions=, 3)
    @o.get_column_value(:use_transactions).must_equal 3
    @o.set_column_value(:use_transactions=, 4)
    @o.get_column_value(:use_transactions).must_equal 4
  end

  it "should work correctly if there are no conflicts" do
    @o.get_column_value(:foo).must_equal 4
    @o.set_column_value(:model=, 2).must_equal 2
  end

  it "should allow manual setting of conflicted columns" do
    @c.send(:define_method, :foo){raise}
    @c.get_column_conflict!(:foo)
    @o.get_column_value(:foo).must_equal 4

    @c.send(:define_method, :model=){raise}
    @c.set_column_conflict!(:model)
    @o.set_column_value(:model=, 2).must_equal 2
    @o.get_column_value(:model).must_equal 2
  end

  it "should not erase existing column conflicts when loading the plugin" do
    @c.send(:define_method, :foo){raise}
    @c.send(:define_method, :model=){raise}
    @c.get_column_conflict!(:foo)
    @c.set_column_conflict!(:model)
    @c.plugin :column_conflicts
    @o.get_column_value(:foo).must_equal 4
    @o.set_column_value(:model=, 2).must_equal 2
    @o.get_column_value(:model).must_equal 2
  end

  it "should work correctly in subclasses" do
    @o = Class.new(@c).load(:model=>1, :use_transactions=>2)
    @o.get_column_value(:model).must_equal 1
    @o.get_column_value("model").must_equal 1
    @o.set_column_value(:use_transactions=, 3)
    @o.get_column_value(:use_transactions).must_equal 3
    @o.set_column_value(:use_transactions=, 4)
    @o.get_column_value(:use_transactions).must_equal 4
  end

  it "should work correctly for dataset changes" do
    @c.dataset = @db[:test].with_extend{def columns; [:object_id] end}
    o = @c.load(:object_id=>3)
    o.get_column_value(:object_id).must_equal 3
    o.object_id.wont_equal 3
  end

  it "should freeze column conflict information when freezing model class" do
    @c.freeze
    @c.get_column_conflicts.frozen?.must_equal true
    @c.set_column_conflicts.frozen?.must_equal true
  end
end
