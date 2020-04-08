require_relative "spec_helper"

describe "Dataset::PlaceholderLiteralizer" do
  before do
    @c = Sequel::Dataset::PlaceholderLiteralizer
    @db = Sequel.mock
    @ds = @db[:items]
    @h = {:id=>1}
    @ds.db.fetch = @h
  end
  
  it "should handle calls with no placeholders" do
    loader = @c.loader(@ds){|pl, ds| ds.where(:a=>1)}
    loader.first.must_equal @h
    @db.sqls.must_equal ["SELECT * FROM items WHERE (a = 1)"]
  end
  
  it "should handle calls with a single placeholder" do
    loader = @c.loader(@ds){|pl, ds| ds.where(:a=>pl.arg)}
    loader.first(1).must_equal @h
    loader.first(2).must_equal @h
    @db.sqls.must_equal ["SELECT * FROM items WHERE (a = 1)", "SELECT * FROM items WHERE (a = 2)"]
  end
  
  it "should handle calls with multiple placeholders" do
    loader = @c.loader(@ds){|pl, ds| ds.where(:a=>pl.arg).where(:b=>Sequel.+(pl.arg, 1)).where(pl.arg)}
    loader.first(1, :c, :id=>1).must_equal @h
    loader.first(2, :d, :id=>2).must_equal @h
    @db.sqls.must_equal ["SELECT * FROM items WHERE ((a = 1) AND (b = (c + 1)) AND (id = 1))", "SELECT * FROM items WHERE ((a = 2) AND (b = (d + 1)) AND (id = 2))"]
  end
  
  it "should handle calls with placeholders and delayed arguments" do
    h = :h
    s = :s
    d = @ds.having(Sequel.delay{h}).select(Sequel.delay{s})
    loader = @c.loader(d){|pl, ds| ds.where(:a=>pl.arg).where(:b=>Sequel.+(pl.arg, 1)).where(pl.arg)}
    loader.first(1, :c, :id=>1).must_equal @h
    h = :h2
    s = :s2
    loader.first(2, :d, :id=>2).must_equal @h
    @db.sqls.must_equal ["SELECT s FROM items WHERE ((a = 1) AND (b = (c + 1)) AND (id = 1)) HAVING h", "SELECT s2 FROM items WHERE ((a = 2) AND (b = (d + 1)) AND (id = 2)) HAVING h2"]
  end
  
  it "should handle calls with placeholders and delayed arguments that take dataset argument" do
    d = @ds.select(Sequel.delay{|ds| ds.first_source})
    loader = @c.loader(d){|pl, ds| ds.where(:a=>pl.arg).where(:b=>Sequel.+(pl.arg, 1)).where(pl.arg)}
    loader.first(1, :c, :id=>1).must_equal @h
    loader.first(2, :d, :id=>2).must_equal @h
    @db.sqls.must_equal ["SELECT items FROM items WHERE ((a = 1) AND (b = (c + 1)) AND (id = 1))", "SELECT items FROM items WHERE ((a = 2) AND (b = (d + 1)) AND (id = 2))"]
  end
  
  it "should handle calls with a placeholders used as filter arguments" do
    loader = @c.loader(@ds){|pl, ds| ds.where(pl.arg)}
    loader.first(:id=>1).must_equal @h
    loader.first(Sequel.expr{a(b)}).must_equal @h
    @db.sqls.must_equal ["SELECT * FROM items WHERE (id = 1)", "SELECT * FROM items WHERE a(b)"]
  end
  
  it "should handle calls with a literal strings used as filter arguments" do
    loader = @c.loader(@ds){|pl, ds| ds.where(pl.arg)}
    loader.first(Sequel.lit("a = 1")).must_equal @h
    @db.sqls.must_equal ["SELECT * FROM items WHERE (a = 1)"]
  end
  
  it "should handle calls with a placeholders used as right hand side of condition specifiers" do
    loader = @c.loader(@ds){|pl, ds| ds.where(:a=>pl.arg)}
    loader.first(1).must_equal @h
    loader.first([1, 2]).must_equal @h
    loader.first(nil).must_equal @h
    @db.sqls.must_equal ["SELECT * FROM items WHERE (a = 1)", "SELECT * FROM items WHERE (a IN (1, 2))", "SELECT * FROM items WHERE (a IS NULL)"]
  end
  
  it "should handle calls with a placeholder used multiple times" do
    loader = @c.loader(@ds){|pl, ds| a = pl.arg; ds.where(:a=>a).where(:b=>a)}
    loader.first(1).must_equal @h
    loader.first(2).must_equal @h
    @db.sqls.must_equal ["SELECT * FROM items WHERE ((a = 1) AND (b = 1))", "SELECT * FROM items WHERE ((a = 2) AND (b = 2))"]
  end
  
  it "should handle calls with a placeholder used multiple times in different capacities" do
    loader = @c.loader(@ds){|pl, ds| a = pl.arg; ds.select(a).where(:b=>a)}
    loader.first("a").must_equal @h
    loader.first(["a = ?", 2]).must_equal @h
    @db.sqls.must_equal ["SELECT 'a' FROM items WHERE (b = 'a')", "SELECT ('a = ?', 2) FROM items WHERE (b IN ('a = ?', 2))"]
  end
  
  it "should handle calls with manually specified argument positions" do
    loader = @c.loader(@ds){|pl, ds| ds.where(:a=>pl.arg(1)).where(:b=>pl.arg(0))}
    loader.first(1, 2).must_equal @h
    loader.first(2, 1).must_equal @h
    @db.sqls.must_equal ["SELECT * FROM items WHERE ((a = 2) AND (b = 1))", "SELECT * FROM items WHERE ((a = 1) AND (b = 2))"]
  end
  
  it "should handle dataset with row procs" do
    @ds = @ds.with_row_proc(proc{|r| {:foo=>r[:id]+1}})
    loader = @c.loader(@ds){|pl, ds| ds.where(:a=>pl.arg)}
    loader.first(1).must_equal(:foo=>2)
    @db.sqls.must_equal ["SELECT * FROM items WHERE (a = 1)"]
  end
  
  it "should return all rows for #all" do
    loader = @c.loader(@ds){|pl, ds| ds.where(:a=>pl.arg)}
    loader.all(1).must_equal [@h]
    @db.sqls.must_equal ["SELECT * FROM items WHERE (a = 1)"]
  end
  
  it "should iterate over block for #all" do
    a = []
    loader = @c.loader(@ds){|pl, ds| ds.where(:a=>pl.arg)}
    loader.all(1){|r| a << r}.must_equal [@h]
    a.must_equal [@h]
    @db.sqls.must_equal ["SELECT * FROM items WHERE (a = 1)"]
  end
  
  it "should iterate over block for #each" do
    a = []
    loader = @c.loader(@ds){|pl, ds| ds.where(:a=>pl.arg)}
    loader.each(1){|r| a << r}
    a.must_equal [@h]
    @db.sqls.must_equal ["SELECT * FROM items WHERE (a = 1)"]
  end
  
  it "should return first value for #get" do
    loader = @c.loader(@ds){|pl, ds| ds.where(:a=>pl.arg)}
    loader.get(2).must_equal 1
    @db.sqls.must_equal ["SELECT * FROM items WHERE (a = 2)"]
  end

  it "should support modifying dataset used on per-call basis with #run" do
    loader = @c.loader(@ds){|pl, ds| ds.where(:a=>pl.arg)}
    loader.with_dataset do |ds|
      ds.with_row_proc(lambda{|row| [row]})
    end.all(1).must_equal [[@h]]
    @db.sqls.must_equal ["SELECT * FROM items WHERE (a = 1)"]
  end
  
  it "should literalize args as NULL if :placeholder_literal_null is set" do
    loader = @c.loader(@ds){|pl, ds| ds.where(pl.arg=>:a).clone(:placeholder_literal_null=>true)}
    loader.sql(1).must_equal "SELECT * FROM items WHERE (NULL = a)"
  end
  
  it "should raise an error if called with an incorrect number of arguments" do
    loader = @c.loader(@ds){|pl, ds| ds.where(:a=>pl.arg)}
    proc{loader.first}.must_raise(Sequel::Error)
    proc{loader.first(1, 2)}.must_raise(Sequel::Error)
  end

  it "should raise an error if called with an incorrect number of arguments when manually providing argument positions" do
    loader = @c.loader(@ds){|pl, ds| ds.where(:a=>pl.arg(1))}
    proc{loader.first}.must_raise(Sequel::Error)
    proc{loader.first(1)}.must_raise(Sequel::Error)
    proc{loader.first(1, 2, 3)}.must_raise(Sequel::Error)
  end

  it "should raise an error if argument literalized into a different string than returned by query" do
    o = Object.new
    def o.wrap(v)
      @v = v
      self
    end
    def o.sql_literal(ds)
      ds.literal(@v)
    end
    proc{@c.loader(@ds){|pl, ds| ds.where(o.wrap(pl.arg))}}.must_raise(Sequel::Error)
  end
end
