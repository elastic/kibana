require_relative "spec_helper"

describe Sequel::Model, ".def_dataset_method" do
  before do
    @c = Class.new(Sequel::Model(:items))
    @c.plugin :def_dataset_method
  end
  
  it "should add a method to the dataset and model if called with a block argument" do
    @c.def_dataset_method(:return_3){3}
    @c.return_3.must_equal 3
    @c.dataset.return_3.must_equal 3
  end

  it "should handle weird method names" do
    @c.def_dataset_method(:"return 3"){3}
    @c.send(:"return 3").must_equal 3
    @c.dataset.send(:"return 3").must_equal 3
  end

  it "should not add a model method if the model already responds to the method" do
    @c.instance_eval do
      def foo
        1
      end

      private

      def bar
        2
      end

      def_dataset_method(:foo){3}
      def_dataset_method(:bar){4}
    end
    @c.foo.must_equal 1
    @c.dataset.foo.must_equal 3
    @c.send(:bar).must_equal 2
    @c.dataset.bar.must_equal 4
  end

  it "should add all passed methods to the model if called without a block argument" do
    @c.def_dataset_method(:return_3, :return_4)
    proc{@c.return_3}.must_raise(NoMethodError)
    proc{@c.return_4}.must_raise(NoMethodError)
    @c.dataset = @c.dataset.with_extend do
      def return_3; 3; end
      def return_4; 4; end
    end
    @c.return_3.must_equal 3
    @c.return_4.must_equal 4
  end

  it "should cache calls and readd methods if set_dataset is used" do
    @c.def_dataset_method(:return_3){3}
    @c.set_dataset :items
    @c.return_3.must_equal 3
    @c.dataset.return_3.must_equal 3
  end

  it "should readd methods to subclasses, if set_dataset is used in a subclass" do
    @c.def_dataset_method(:return_3){3}
    c = Class.new(@c)
    c.set_dataset :items
    c.return_3.must_equal 3
    c.dataset.return_3.must_equal 3
  end
end

describe Sequel::Model, ".subset" do
  before do
    @c = Class.new(Sequel::Model(:items))
    @c.plugin :def_dataset_method
    DB.reset
  end

  it "should create a filter on the underlying dataset" do
    proc {@c.new_only}.must_raise(NoMethodError)
    
    @c.subset(:new_only){age < 'new'}
    
    @c.new_only.sql.must_equal "SELECT * FROM items WHERE (age < 'new')"
    @c.dataset.new_only.sql.must_equal "SELECT * FROM items WHERE (age < 'new')"
    
    @c.subset(:pricey){price > 100}
    
    @c.pricey.sql.must_equal "SELECT * FROM items WHERE (price > 100)"
    @c.dataset.pricey.sql.must_equal "SELECT * FROM items WHERE (price > 100)"
    
    @c.pricey.new_only.sql.must_equal "SELECT * FROM items WHERE ((price > 100) AND (age < 'new'))"
    @c.new_only.pricey.sql.must_equal "SELECT * FROM items WHERE ((age < 'new') AND (price > 100))"
  end

  it "should not override existing model methods" do
    def @c.active() true end
    @c.subset(:active, :active)
    @c.active.must_equal true
  end
end

