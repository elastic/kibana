require_relative "spec_helper"

describe Sequel::Model, ".finder" do
  before do
    @h = {:id=>1}
    @db = Sequel.mock(:fetch=>@h)
    @c = Class.new(Sequel::Model(@db[:items]))
    @c.instance_eval do
      def foo(a, b)
        where(:bar=>a).order(b)
      end
    end
    @c.plugin :finder
    @o = @c.load(@h)
    @db.sqls
  end

  it "should create a method that calls the method given and returns the first instance" do
    @c.finder :foo
    @c.first_foo(1, 2).must_equal @o
    @c.first_foo(3, 4).must_equal @o
    @db.sqls.must_equal ["SELECT * FROM items WHERE (bar = 1) ORDER BY 2 LIMIT 1", "SELECT * FROM items WHERE (bar = 3) ORDER BY 4 LIMIT 1"]
  end

  it "should work correctly when subclassing" do
    @c.finder(:foo)
    @sc = Class.new(@c)
    @sc.set_dataset :foos
    @db.sqls
    @sc.first_foo(1, 2).must_equal @sc.load(@h)
    @sc.first_foo(3, 4).must_equal @sc.load(@h)
    @db.sqls.must_equal ["SELECT * FROM foos WHERE (bar = 1) ORDER BY 2 LIMIT 1", "SELECT * FROM foos WHERE (bar = 3) ORDER BY 4 LIMIT 1"]
  end

  it "should work correctly when dataset is modified" do
    @c.finder(:foo)
    @c.first_foo(1, 2).must_equal @o
    @c.set_dataset :foos
    @c.first_foo(3, 4).must_equal @o
    @db.sqls.must_equal ["SELECT * FROM items WHERE (bar = 1) ORDER BY 2 LIMIT 1", "SELECT * FROM foos LIMIT 1", "SELECT * FROM foos WHERE (bar = 3) ORDER BY 4 LIMIT 1"]
  end

  it "should create a method based on the given block if no method symbol provided" do
    @c.finder(:name=>:first_foo){|pl, ds| ds.where(pl.arg).limit(1)}
    @c.first_foo(:id=>1).must_equal @o
    @db.sqls.must_equal ["SELECT * FROM items WHERE (id = 1) LIMIT 1"]
  end

  it "should raise an error if both a block and method symbol given" do
    proc{@c.finder(:foo, :name=>:first_foo){|pl, ds| ds.where(pl.arg)}}.must_raise(Sequel::Error)
  end

  it "should raise an error if two option hashes are provided" do
    proc{@c.finder({:name2=>:foo}, :name=>:first_foo){|pl, ds| ds.where(pl.arg)}}.must_raise(Sequel::Error)
  end

  it "should support :type option" do
    @c.finder :foo, :type=>:all
    @c.finder :foo, :type=>:each
    @c.finder :foo, :type=>:get

    a = []
    @c.all_foo(1, 2){|r| a << r}.must_equal [@o]
    a.must_equal [@o]
   
    a = []
    @c.each_foo(3, 4){|r| a << r}
    a.must_equal [@o]

    @c.get_foo(5, 6).must_equal 1

    @db.sqls.must_equal ["SELECT * FROM items WHERE (bar = 1) ORDER BY 2", "SELECT * FROM items WHERE (bar = 3) ORDER BY 4", "SELECT * FROM items WHERE (bar = 5) ORDER BY 6 LIMIT 1"]
  end

  it "should support :name option" do
    @c.finder :foo, :name=>:find_foo
    @c.find_foo(1, 2).must_equal @o
    @c.find_foo(3, 4).must_equal @o
    @db.sqls.must_equal ["SELECT * FROM items WHERE (bar = 1) ORDER BY 2 LIMIT 1", "SELECT * FROM items WHERE (bar = 3) ORDER BY 4 LIMIT 1"]
  end

  it "should support :arity option" do
    def @c.foobar(*b)
      ds = dataset
      b.each_with_index do |a, i|
        ds = ds.where(i=>a)
      end
      ds
    end
    @c.finder :foobar, :arity=>1, :name=>:find_foobar_1
    @c.finder :foobar, :arity=>2, :name=>:find_foobar_2
    @c.find_foobar_1(:a)
    @c.find_foobar_2(:a, :b)
    @db.sqls.must_equal ["SELECT * FROM items WHERE (0 = a) LIMIT 1", "SELECT * FROM items WHERE ((0 = a) AND (1 = b)) LIMIT 1"]
  end

  it "should support :mod option" do
    m = Module.new
    @c.finder :foo, :mod=>m
    proc{@c.first_foo}.must_raise NoMethodError
    @c.extend m
    @c.first_foo(1, 2).must_equal @o
    @c.first_foo(3, 4).must_equal @o
    @db.sqls.must_equal ["SELECT * FROM items WHERE (bar = 1) ORDER BY 2 LIMIT 1", "SELECT * FROM items WHERE (bar = 3) ORDER BY 4 LIMIT 1"]
  end

  it "should raise error when calling with the wrong arity" do
    @c.finder :foo
    proc{@c.first_foo(1)}.must_raise Sequel::Error
    proc{@c.first_foo(1,2,3)}.must_raise Sequel::Error
  end
end

describe Sequel::Model, ".prepared_finder" do
  before do
    @h = {:id=>1}
    @db = Sequel.mock(:fetch=>@h)
    @db.extend_datasets do
      def select_sql
        sql = super
        sql << ' -- prepared' if is_a?(Sequel::Dataset::PreparedStatementMethods) && !opts[:sql]
        sql
      end
    end
    @c = Class.new(Sequel::Model(@db[:items]))
    @c.instance_eval do
      def foo(a, b)
        where(:bar=>a).order(b)
      end
    end
    @c.plugin :finder
    @o = @c.load(@h)
    @db.sqls
  end

  it "should create a method that calls the method given and returns the first instance" do
    @c.prepared_finder :foo
    @c.first_foo(1, 2).must_equal @o
    @c.first_foo(3, 4).must_equal @o
    @db.sqls.must_equal ["SELECT * FROM items WHERE (bar = 1) ORDER BY 2 LIMIT 1 -- prepared", "SELECT * FROM items WHERE (bar = 3) ORDER BY 4 LIMIT 1 -- prepared"]
  end

  it "should work correctly when subclassing" do
    @c.prepared_finder(:foo)
    @sc = Class.new(@c)
    @sc.set_dataset :foos
    @db.sqls
    @sc.first_foo(1, 2).must_equal @sc.load(@h)
    @sc.first_foo(3, 4).must_equal @sc.load(@h)
    @db.sqls.must_equal ["SELECT * FROM foos WHERE (bar = 1) ORDER BY 2 LIMIT 1 -- prepared", "SELECT * FROM foos WHERE (bar = 3) ORDER BY 4 LIMIT 1 -- prepared"]
  end

  it "should work correctly when dataset is modified" do
    @c.prepared_finder(:foo)
    @c.first_foo(1, 2).must_equal @o
    @c.set_dataset :foos
    @c.first_foo(3, 4).must_equal @o
    @db.sqls.must_equal ["SELECT * FROM items WHERE (bar = 1) ORDER BY 2 LIMIT 1 -- prepared", "SELECT * FROM foos LIMIT 1", "SELECT * FROM foos WHERE (bar = 3) ORDER BY 4 LIMIT 1 -- prepared"]
  end

  it "should create a method based on the given block if no method symbol provided" do
    @c.prepared_finder(:name=>:first_foo){|a1| where(:id=>a1).limit(1)}
    @c.first_foo(1).must_equal @o
    @db.sqls.must_equal ["SELECT * FROM items WHERE (id = 1) LIMIT 1 -- prepared"]
  end

  it "should raise an error if both a block and method symbol given" do
    proc{@c.prepared_finder(:foo, :name=>:first_foo){|pl, ds| ds.where(pl.arg)}}.must_raise(Sequel::Error)
  end

  it "should raise an error if two option hashes are provided" do
    proc{@c.prepared_finder({:name2=>:foo}, :name=>:first_foo){|pl, ds| ds.where(pl.arg)}}.must_raise(Sequel::Error)
  end

  it "should support :type option" do
    @c.prepared_finder :foo, :type=>:all
    @c.prepared_finder :foo, :type=>:each

    a = []
    @c.all_foo(1, 2){|r| a << r}.must_equal [@o]
    a.must_equal [@o]
   
    a = []
    @c.each_foo(3, 4){|r| a << r}
    a.must_equal [@o]

    @db.sqls.must_equal ["SELECT * FROM items WHERE (bar = 1) ORDER BY 2 -- prepared", "SELECT * FROM items WHERE (bar = 3) ORDER BY 4 -- prepared"]
  end

  it "should support :name option" do
    @c.prepared_finder :foo, :name=>:find_foo
    @c.find_foo(1, 2).must_equal @o
    @c.find_foo(3, 4).must_equal @o
    @db.sqls.must_equal ["SELECT * FROM items WHERE (bar = 1) ORDER BY 2 LIMIT 1 -- prepared", "SELECT * FROM items WHERE (bar = 3) ORDER BY 4 LIMIT 1 -- prepared"]
  end

  it "should support :arity option" do
    def @c.foobar(*b)
      ds = dataset
      b.each_with_index do |a, i|
        ds = ds.where(i=>a)
      end
      ds
    end
    @c.prepared_finder :foobar, :arity=>1, :name=>:find_foobar_1
    @c.prepared_finder :foobar, :arity=>2, :name=>:find_foobar_2
    @c.find_foobar_1(:a)
    @c.find_foobar_2(:a, :b)
    @db.sqls.must_equal ["SELECT * FROM items WHERE (0 = a) LIMIT 1 -- prepared", "SELECT * FROM items WHERE ((0 = a) AND (1 = b)) LIMIT 1 -- prepared"]
  end

  it "should support :mod option" do
    m = Module.new
    @c.prepared_finder :foo, :mod=>m
    proc{@c.first_foo}.must_raise NoMethodError
    @c.extend m
    @c.first_foo(1, 2).must_equal @o
    @c.first_foo(3, 4).must_equal @o
    @db.sqls.must_equal ["SELECT * FROM items WHERE (bar = 1) ORDER BY 2 LIMIT 1 -- prepared", "SELECT * FROM items WHERE (bar = 3) ORDER BY 4 LIMIT 1 -- prepared"]
  end

  it "should handle models with names" do
    def @c.name; 'foobar' end
    @c.prepared_finder :foo
    @c.first_foo(1, 2).must_equal @o
    @db.sqls.must_equal ["SELECT * FROM items WHERE (bar = 1) ORDER BY 2 LIMIT 1 -- prepared"]
  end
end

describe "Sequel::Model.freeze" do
  it "should freeze the model class and not allow any changes" do
    model = Class.new(Sequel::Model(:items))
    model.plugin :finder
    model.finder(:name=>:f_by_name){|pl, ds| ds.where(:name=>pl.arg).limit(1)}
    model.freeze
    model.f_by_name('a').must_equal model.call(:id=>1, :x=>1)
    proc{model.finder(:name=>:first_by_name){|pl, ds| ds.where(:name=>pl.arg).limit(1)}}.must_raise RuntimeError, TypeError
  end

  it "should freeze a model class without a dataset without breaking" do
    model = Class.new(Sequel::Model)
    model.plugin :finder
    model.freeze
    proc{model.finder(:name=>:first_by_name){|pl, ds| ds.where(:name=>pl.arg).limit(1)}}.must_raise RuntimeError, TypeError
  end

  it "should allow subclasses of frozen model classes to work correctly" do
    model = Class.new(Sequel::Model(:items))
    model.plugin :finder
    model.freeze
    model = Class.new(model)
    model.dataset = :items2

    model.dataset_module{}
    model.plugin Module.new
    model.finder(:name=>:first_by_name){|pl, ds| ds.where(:name=>pl.arg).limit(1)}
    model.first_by_name('a').values.must_equal(:id=>1, :x=>1)
  end
end

