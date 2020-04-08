require_relative "spec_helper"

describe "Sequel::Model()" do
  before do
    @db = Sequel::Model.db
  end

  it "should return a model subclass with the given dataset if given a dataset" do
    ds = @db[:blah]
    c = Sequel::Model(ds)
    c.superclass.must_equal Sequel::Model
    c.dataset.row_proc.must_equal c
  end

  it "should return a model subclass with a dataset with the default database and given table name if given a Symbol" do
    c = Sequel::Model(:blah)
    c.superclass.must_equal Sequel::Model
    c.db.must_equal @db
    c.table_name.must_equal :blah
  end

  it "should return a model subclass with a dataset with the default database and given table name if given a LiteralString" do
    c = Sequel::Model(Sequel.lit('blah'))
    c.superclass.must_equal Sequel::Model
    c.db.must_equal @db
    c.table_name.must_equal Sequel.lit('blah')
  end

  it "should return a model subclass with a dataset with the default database and given table name if given an SQL::Identifier" do
    c = Sequel::Model(Sequel.identifier(:blah))
    c.superclass.must_equal Sequel::Model
    c.db.must_equal @db
    c.table_name.must_equal Sequel.identifier(:blah)
  end

  it "should return a model subclass with a dataset with the default database and given table name if given an SQL::QualifiedIdentifier" do
    c = Sequel::Model(Sequel.qualify(:boo, :blah))
    c.superclass.must_equal Sequel::Model
    c.db.must_equal @db
    c.table_name.must_equal Sequel.qualify(:boo, :blah)
  end

  it "should return a model subclass with a dataset with the default database and given table name if given an SQL::AliasedExpression" do
    c = Sequel::Model(Sequel.as(:blah, :boo))
    c.superclass.must_equal Sequel::Model
    c.db.must_equal @db
    c.table_name.must_equal :boo
  end

  it "should return a model subclass with the given dataset if given a dataset using an SQL::Identifier" do
    ds = @db[Sequel.identifier(:blah)]
    c = Sequel::Model(ds)
    c.superclass.must_equal Sequel::Model
    c.dataset.row_proc.must_equal c
  end

  it "should be callable on Sequel::Model" do
    ds = @db[:blah]
    c = Sequel::Model::Model(ds)
    c.superclass.must_equal Sequel::Model
    c.dataset.row_proc.must_equal c
  end

  it "should be callable on subclasses of Sequel::Model" do
    ds = @db[:blah]
    c = Class.new(Sequel::Model)
    sc = c::Model(ds)
    sc.superclass.must_equal c
    sc.dataset.row_proc.must_equal sc
  end

  it "should be callable on other modules if def_Model is used" do
    m = Module.new
    Sequel::Model.def_Model(m)
    ds = @db[:blah]
    c = m::Model(ds)
    c.superclass.must_equal Sequel::Model
    c.dataset.row_proc.must_equal c
  end

  it "should be callable using model subclasses on other modules if def_Model is used" do
    m = Module.new
    c = Class.new(Sequel::Model)
    c.def_Model(m)
    ds = @db[:blah]
    sc = m::Model(ds)
    sc.superclass.must_equal c
    sc.dataset.row_proc.must_equal sc
  end

  it "should return a model subclass associated to the given database if given a database" do
    db = Sequel.mock
    c = Sequel::Model(db)
    c.superclass.must_equal Sequel::Model
    c.db.must_equal db
    proc{c.dataset}.must_raise(Sequel::Error)
    class SmBlahTest < c
    end
    SmBlahTest.db.must_equal db
    SmBlahTest.table_name.must_equal :sm_blah_tests
  end

  describe "reloading" do
    before do
      Sequel::Model.cache_anonymous_models = true
    end
    after do
      Sequel::Model.cache_anonymous_models = false
      Object.send(:remove_const, :Album) if defined?(::Album)
    end

    it "should work without raising an exception with a symbol" do
      class ::Album < Sequel::Model(:table); end
      class ::Album < Sequel::Model(:table); end
    end

    it "should work without raising an exception with an SQL::Identifier " do
      class ::Album < Sequel::Model(Sequel.identifier(:table)); end
      class ::Album < Sequel::Model(Sequel.identifier(:table)); end
    end

    it "should work without raising an exception with an SQL::QualifiedIdentifier " do
      class ::Album < Sequel::Model(Sequel.qualify(:schema, :table)); end
      class ::Album < Sequel::Model(Sequel.qualify(:schema, :table)); end
    end

    it "should work without raising an exception with an SQL::AliasedExpression" do
      class ::Album < Sequel::Model(Sequel.as(:table, :alias)); end
      class ::Album < Sequel::Model(Sequel.as(:table, :alias)); end
    end

    it "should work without raising an exception with an LiteralString" do
      class ::Album < Sequel::Model(Sequel.lit('table')); end
      class ::Album < Sequel::Model(Sequel.lit('table')); end
    end

    it "should work without raising an exception with a database" do
      class ::Album < Sequel::Model(@db); end
      class ::Album < Sequel::Model(@db); end
    end

    it "should work without raising an exception with a dataset" do
      class ::Album < Sequel::Model(@db[:table]); end
      class ::Album < Sequel::Model(@db[:table]); end
    end

    it "should work without raising an exception with a dataset with an SQL::Identifier" do
      class ::Album < Sequel::Model(@db[Sequel.identifier(:table)]); end
      class ::Album < Sequel::Model(@db[Sequel.identifier(:table)]); end
    end

    it "should raise an exception if anonymous model caching is disabled" do
      Sequel::Model.cache_anonymous_models = false
      proc do
        class ::Album < Sequel::Model(@db[Sequel.identifier(:table)]); end
        class ::Album < Sequel::Model(@db[Sequel.identifier(:table)]); end
      end.must_raise TypeError
    end

    it "should use separate anonymous cache for subclasses" do
      c = Class.new(Sequel::Model)
      c.cache_anonymous_models.must_equal true
      class ::Album < c::Model(:table); end
      class ::Album < c::Model(:table); end

      c1 = c::Model(:t1)
      c1.must_equal c::Model(:t1)
      c1.wont_equal Sequel::Model(:t1)

      c.cache_anonymous_models = false
      Sequel::Model.cache_anonymous_models.must_equal true
      c1.wont_equal c::Model(:t1)
    end
  end
end

describe "Sequel::Model.freeze" do
  it "should freeze the model class and not allow any changes" do
    model = Class.new(Sequel::Model(:items))
    model.freeze

    model.frozen?.must_equal true
    model.dataset.frozen?.must_equal true
    model.db_schema.frozen?.must_equal true
    model.db_schema[:id].frozen?.must_equal true
    model.columns.frozen?.must_equal true
    model.setter_methods.frozen?.must_equal true
    model.send(:overridable_methods_module).frozen?.must_equal true
    model.default_set_fields_options.frozen?.must_equal true

    proc{model.dataset_module{}}.must_raise RuntimeError
  end

  it "should work if the model is already frozen" do
    model = Class.new(Sequel::Model(:items))
    model.freeze.freeze
  end

  it "should freeze a model class without a dataset without breaking" do
    model = Class.new(Sequel::Model)
    model.freeze
    model.frozen?.must_equal true
    proc{model.dataset}.must_raise Sequel::Error
    model.db_schema.must_be_nil
    model.columns.must_be_nil
    model.setter_methods.must_equal []
    model.send(:overridable_methods_module).frozen?.must_equal true
    model.default_set_fields_options.frozen?.must_equal true

    proc{model.dataset_module{}}.must_raise RuntimeError
  end

  it "should allow subclasses of frozen model classes to work correctly" do
    model = Class.new(Sequel::Model(:items))
    model.freeze
    model = Class.new(model)
    model.dataset = :items2

    model.dataset_module{}
    model.plugin Module.new

    model.frozen?.must_equal false
    model.db_schema.frozen?.must_equal false
    model.db_schema[:id].frozen?.must_equal false
    model.setter_methods.frozen?.must_equal false
    model.dataset_module{}.frozen?.must_equal false
    model.send(:overridable_methods_module).frozen?.must_equal false
    model.default_set_fields_options.frozen?.must_equal false
  end
end

describe Sequel::Model do
  it "should have class method aliased as model" do
    model_a = Class.new(Sequel::Model(:items))
    model_a.new.model.must_be_same_as model_a
  end

  it "should be associated with a dataset" do
    model_a = Class.new(Sequel::Model) { set_dataset DB[:as] }

    model_a.dataset.must_be_kind_of(Sequel::Mock::Dataset)
    model_a.dataset.opts[:from].must_equal [:as]

    model_b = Class.new(Sequel::Model) { set_dataset DB[:bs] }

    model_b.dataset.must_be_kind_of(Sequel::Mock::Dataset)
    model_b.dataset.opts[:from].must_equal [:bs]

    model_a.dataset.opts[:from].must_equal [:as]
  end
end

describe Sequel::Model do
  before do
    @model = Class.new(Sequel::Model(:items))
    DB.reset
  end

  it "should not allow dup/clone" do
    proc{@model.dup}.must_raise NoMethodError
    proc{@model.clone}.must_raise NoMethodError
  end

  it "has table_name return name of table" do
    @model.table_name.must_equal :items
  end

  it "defaults to primary key of id" do
    @model.primary_key.must_equal :id
  end

  it "allow primary key change" do
    @model.set_primary_key :ssn
    @model.primary_key.must_equal :ssn
  end

  it "allows dataset change" do
    @model.set_dataset(DB[:foo])
    @model.table_name.must_equal :foo
  end

  it "allows frozen dataset" do
    @model.set_dataset(DB[:foo].freeze)
    @model.table_name.must_equal :foo
    @model.dataset.sql.must_equal 'SELECT * FROM foo'
  end


  it "table_name should respect table aliases" do
    @model.set_dataset(Sequel[:foo].as(:x))
    @model.table_name.must_equal :x
  end
  
  with_symbol_splitting "table_name should respect table alias symbols" do
    @model.set_dataset(:foo___x)
    @model.table_name.must_equal :x
  end
  
  it "set_dataset should raise an error unless given a Symbol or Dataset" do
    proc{@model.set_dataset(Object.new)}.must_raise(Sequel::Error)
  end

  it "set_dataset should use a subquery for joined datasets" do
    @model.set_dataset(DB.from(:foo, :bar))
    @model.dataset.sql.must_equal 'SELECT * FROM (SELECT * FROM foo, bar) AS foo'
    @model.set_dataset(DB[:foo].cross_join(:bar))
    @model.dataset.sql.must_equal 'SELECT * FROM (SELECT * FROM foo CROSS JOIN bar) AS foo'
  end

  it "set_dataset should add the destroy method to the dataset that destroys each object" do
    ds = DB[:foo]
    ds.wont_respond_to(:destroy)
    ds = @model.set_dataset(ds).dataset
    ds.must_respond_to(:destroy)
    DB.sqls
    ds.with_fetch([{:id=>1}, {:id=>2}]).destroy.must_equal 2
    DB.sqls.must_equal ["SELECT * FROM foo", "DELETE FROM foo WHERE id = 1", "DELETE FROM foo WHERE id = 2"]
  end

  it "set_dataset should add the destroy method that respects sharding with transactions" do
    db = Sequel.mock(:servers=>{:s1=>{}})
    ds = db[:foo].server(:s1)
    @model.use_transactions = true
    ds = @model.set_dataset(ds).dataset
    db.sqls
    ds.destroy.must_equal 0
    db.sqls.must_equal ["BEGIN -- s1", "SELECT * FROM foo -- s1", "COMMIT -- s1"]
  end

  it "should raise an error on set_dataset if there is an error connecting to the database" do
    def @model.columns() raise Sequel::DatabaseConnectionError end
    proc{@model.set_dataset(Sequel::Database.new[:foo].join(:blah).from_self)}.must_raise Sequel::DatabaseConnectionError
  end

  it "should not raise an error if there is a problem getting the columns for a dataset" do
    def @model.columns() raise Sequel::Error end
    @model.set_dataset(DB[:foo].join(:blah).from_self)
  end

  it "doesn't raise an error on set_dataset if there is an error raised getting the schema" do
    db = Sequel.mock
    def db.schema(*) raise Sequel::Error; end
    @model.set_dataset(db[:foo])
  end

  it "reload_db_schema? should be false by default" do
    c = Class.new
    c.extend Sequel::Model::ClassMethods
    c.send(:reload_db_schema?).must_equal false
  end

  it "doesn't raise an error on inherited if there is an error setting the dataset" do
    db = Sequel.mock
    def db.schema(*) raise Sequel::Error; end
    @model.dataset = db[:foo]
    Class.new(@model)
  end

  it "uses a savepoint if inside a transaction when getting the columns" do
    db = Sequel.mock
    def db.supports_savepoints?; true end
    Sequel::Model(db[:table])
    db.sqls.must_equal ["SELECT * FROM table LIMIT 1"]
    db.transaction{Sequel::Model(db[:table])}
    db.sqls.must_equal ["BEGIN", "SAVEPOINT autopoint_1", "SELECT * FROM table LIMIT 1", "RELEASE SAVEPOINT autopoint_1", "COMMIT"]
  end

  it "should raise if bad inherited instance variable value is used" do
    def @model.inherited_instance_variables() super.merge(:@a=>:foo) end
    @model.instance_eval{@a=1}
    proc{Class.new(@model)}.must_raise(Sequel::Error)
  end

  it "copy inherited instance variables into subclass if set" do
    def @model.inherited_instance_variables() super.merge(:@a=>nil, :@b=>:dup, :@c=>:hash_dup, :@d=>proc{|v| v * 2}) end
    @model.instance_eval{@a=1; @b=[2]; @c={3=>[4]}; @d=10}
    m = Class.new(@model)
    @model.instance_eval{@a=5; @b << 6; @c[3] << 7; @c[8] = [9]; @d=40}
    m.instance_eval do
      @a.must_equal 1
      @b.must_equal [2]
      @c.must_equal(3=>[4])
      @d.must_equal 20
    end
  end
end

describe Sequel::Model do
  before do
    @model = Class.new(Sequel::Model)
    DB.reset
  end

  it "allows set_dataset to accept a Symbol" do
    @model.set_dataset(:foo)
    @model.table_name.must_equal :foo
  end

  it "allows set_dataset to accept a LiteralString" do
    @model.set_dataset(Sequel.lit('foo'))
    @model.table_name.must_equal Sequel.lit('foo')
  end

  it "allows set_dataset to acceptan SQL::Identifier" do
    @model.set_dataset(Sequel.identifier(:foo))
    @model.table_name.must_equal Sequel.identifier(:foo)
  end

  it "allows set_dataset to acceptan SQL::QualifiedIdentifier" do
    @model.set_dataset(Sequel.qualify(:bar, :foo))
    @model.table_name.must_equal Sequel.qualify(:bar, :foo)
  end

  it "allows set_dataset to acceptan SQL::AliasedExpression" do
    @model.set_dataset(Sequel.as(:foo, :bar))
    @model.table_name.must_equal :bar
  end
end

describe Sequel::Model, ".require_valid_table = true" do
  before do
    @db = Sequel.mock
    @db.columns = proc do |sql|
      raise Sequel::Error if sql =~ /foos/
      [:id]
    end
    def @db.supports_schema_parsing?; true end
    def @db.schema(t, *) t.first_source == :foos ? (raise Sequel::Error) : [[:id, {}]] end
    Sequel::Model.db = @db
    Sequel::Model.require_valid_table = true
  end
  after do
    Sequel::Model.require_valid_table = false
    Sequel::Model.db = DB
    if Object.const_defined?(:Bar)
      Object.send(:remove_const, :Bar)
    end
    if Object.const_defined?(:Foo)
      Object.send(:remove_const, :Foo)
    end
  end

  it "should raise an exception when creating a model with an invalid implicit table" do
    proc{class ::Foo < Sequel::Model; end}.must_raise Sequel::Error
  end

  it "should not raise an exception when creating a model with a valid implicit table" do
    class ::Bar < Sequel::Model; end
    Bar.columns.must_equal [:id]
  end

  it "should raise an exception when creating a model with an invalid explicit table" do
    proc{Sequel::Model(@db[:foos])}.must_raise Sequel::Error
  end

  it "should not raise an exception when creating a model with a valid explicit table" do
    c = Sequel::Model(@db[:bars])
    c.columns.must_equal [:id]
  end

  it "should raise an exception when calling set_dataset with an invalid table" do
    c = Class.new(Sequel::Model)
    proc{c.set_dataset @db[:foos]}.must_raise Sequel::Error
  end

  it "should not raise an exception when calling set_dataset with an valid table" do
    c = Class.new(Sequel::Model)
    c.set_dataset @db[:bars]
    c.columns.must_equal [:id]
  end

  it "should assume nil value is the same as false" do
    c = Class.new(Sequel::Model)
    c.require_valid_table = nil
    ds = @db.dataset.with_extend{def columns; raise Sequel::Error; end}
    c.set_dataset(ds)
  end
end

describe Sequel::Model, "constructors" do
  before do
    @m = Class.new(Sequel::Model)
    @m.columns :a, :b
  end

  it "should accept a hash" do
    m = @m.new(:a => 1, :b => 2)
    m.values.must_equal(:a => 1, :b => 2)
    m.must_be :new?
  end
  
  it "should accept a block and yield itself to the block" do
    block_called = false
    m = @m.new {|i| block_called = true; i.must_be_kind_of(@m); i.values[:a] = 1}
    
    block_called.must_equal true
    m.values[:a].must_equal 1
  end
  
  it "should have dataset row_proc create an existing object" do
    @m.dataset = Sequel.mock.dataset
    o = @m.dataset.row_proc.call(:a=>1)
    o.must_be_kind_of(@m)
    o.values.must_equal(:a=>1)
    o.new?.must_equal false
  end
  
  it "should have .call create an existing object" do
    o = @m.call(:a=>1)
    o.must_be_kind_of(@m)
    o.values.must_equal(:a=>1)
    o.new?.must_equal false
  end
  
  it "should have .load create an existing object" do
    o = @m.load(:a=>1)
    o.must_be_kind_of(@m)
    o.values.must_equal(:a=>1)
    o.new?.must_equal false
  end
end

describe Sequel::Model, "new" do
  before do
    @m = Class.new(Sequel::Model) do
      set_dataset DB[:items]
      columns :x, :id
    end
  end

  it "should be marked as new?" do
    o = @m.new
    o.must_be :new?
  end

  it "should not be marked as new? once it is saved" do
    o = @m.new(:x => 1)
    o.must_be :new?
    o.save
    o.wont_be :new?
  end

  it "should use the last inserted id as primary key if not in values" do
    @m.dataset = @m.dataset.with_fetch(:x => 1, :id => 1234).with_autoid(1234)

    o = @m.new(:x => 1)
    o.save
    o.id.must_equal 1234

    o = @m.load(:x => 1, :id => 333)
    o.save
    o.id.must_equal 333
  end
end

describe Sequel::Model, ".find" do
  before do
    @c = Class.new(Sequel::Model(:items))
    @c.dataset = @c.dataset.with_fetch(:name => 'sharon', :id => 1)
    DB.reset
  end
  
  it "should return the first record matching the given filter" do
    @c.find(:name => 'sharon').must_be_kind_of(@c)
    DB.sqls.must_equal ["SELECT * FROM items WHERE (name = 'sharon') LIMIT 1"]

    @c.find(Sequel.expr(:name).like('abc%')).must_be_kind_of(@c)
    DB.sqls.must_equal ["SELECT * FROM items WHERE (name LIKE 'abc%' ESCAPE '\\') LIMIT 1"]
  end
  
  it "should accept filter blocks" do
    @c.find{id > 1}.must_be_kind_of(@c)
    DB.sqls.must_equal ["SELECT * FROM items WHERE (id > 1) LIMIT 1"]

    @c.find{(x > 1) & (y < 2)}.must_be_kind_of(@c)
    DB.sqls.must_equal ["SELECT * FROM items WHERE ((x > 1) AND (y < 2)) LIMIT 1"]
  end
end

describe Sequel::Model, ".fetch" do
  before do
    DB.reset
    @c = Class.new(Sequel::Model(:items))
  end
  
  it "should return instances of Model" do
    @c.fetch("SELECT * FROM items").first.must_be_kind_of(@c)
  end

  it "should return true for .empty? and not raise an error on empty selection" do
    @c.dataset = @c.dataset.with_extend do
      def fetch_rows(sql)
        yield({:count => 0})
      end
    end
    @c.fetch("SELECT * FROM items WHERE FALSE").empty?
  end
end

describe Sequel::Model, ".find_or_create" do
  before do
    @db = Sequel.mock
    @c = Class.new(Sequel::Model(@db[:items])) do
      set_primary_key :id
      columns :x
    end
    @db.sqls
  end

  it "should find the record" do
    @db.fetch = [{:x=>1, :id=>1}]
    @db.autoid = 1
    @c.find_or_create(:x => 1).must_equal @c.load(:x=>1, :id=>1)
    @db.sqls.must_equal ["SELECT * FROM items WHERE (x = 1) LIMIT 1"]
  end
  
  it "should create the record if not found" do
    @db.fetch = [[], {:x=>1, :id=>1}]
    @db.autoid = 1
    @c.find_or_create(:x => 1).must_equal @c.load(:x=>1, :id=>1)
    @db.sqls.must_equal ["SELECT * FROM items WHERE (x = 1) LIMIT 1",
      "INSERT INTO items (x) VALUES (1)",
      "SELECT * FROM items WHERE id = 1"]
  end

  it "should pass the new record to be created to the block if no record is found" do
    @db.fetch = [[], {:x=>1, :id=>1}]
    @db.autoid = 1
    @c.find_or_create(:x => 1){|x| x[:y] = 2}.must_equal @c.load(:x=>1, :id=>1)
    @db.sqls.must_equal ["SELECT * FROM items WHERE (x = 1) LIMIT 1",
      "INSERT INTO items (x, y) VALUES (1, 2)",
      "SELECT * FROM items WHERE id = 1"]
  end
end

describe Sequel::Model, ".all" do
  it "should return all records in the dataset" do
    c = Class.new(Sequel::Model(:items))
    c.all.must_equal [c.load(:x=>1, :id=>1)]
  end
end

describe Sequel::Model, "A model class without a primary key" do
  before do
    @c = Class.new(Sequel::Model(:items)) do
      columns :x
      no_primary_key
    end
    DB.reset
  end

  it "should be able to insert records without selecting them back" do
    i = nil
    i = @c.create(:x => 1)
    i.class.wont_be_nil
    i.values.to_hash.must_equal(:x => 1)

    DB.sqls.must_equal ['INSERT INTO items (x) VALUES (1)']
  end

  it "should raise when deleting" do
    proc{@c.load(:x=>1).delete}.must_raise Sequel::Error
  end

  it "should raise when updating" do
    proc{@c.load(:x=>1).update(:x=>2)}.must_raise Sequel::Error
  end

  it "should insert a record when saving" do
    o = @c.new(:x => 2)
    o.must_be :new?
    o.save
    DB.sqls.must_equal ['INSERT INTO items (x) VALUES (2)']
  end
end

describe Sequel::Model, "attribute accessors" do
  before do
    db = Sequel.mock
    def db.supports_schema_parsing?() true end
    def db.schema(*)
      [[:x, {:type=>:integer}], [:z, {:type=>:integer}]]
    end
    @dataset = db[:items].columns(:x, :z)
    @c = Class.new(Sequel::Model)
    DB.reset
  end

  it "should be created on set_dataset" do
    a = [:x, :z, :x= ,:z=]
    (a - @c.instance_methods).must_equal a
    @c.set_dataset(@dataset)
    (a - @c.instance_methods).must_equal []
    o = @c.new
    (a - o.methods).must_equal []

    o.x.must_be_nil
    o.x = 34
    o.x.must_equal 34
  end

  it "should be only accept one argument for the write accessor" do
    @c.set_dataset(@dataset)
    o = @c.new

    o.x = 34
    o.x.must_equal 34
    proc{o.send(:x=)}.must_raise ArgumentError
    proc{o.send(:x=, 3, 4)}.must_raise ArgumentError
  end

  it "should have a working typecasting setter even if the column is not selected" do
    @c.set_dataset(@dataset.select(:z).columns(:z))
    o = @c.new

    o.x = '34'
    o.x.must_equal 34
  end

  it "should typecast if the new value is the same as the existing but has a different class" do
    @c.set_dataset(@dataset.select(:z).columns(:z))
    o = @c.new

    o.x = 34
    o.x = 34.0
    o.x.must_equal 34.0
    o.x = 34
    o.x.must_equal 34
  end
end

describe Sequel::Model, ".[]" do
  before do
    @c = Class.new(Sequel::Model(:items))
    @c.dataset = @c.dataset.with_fetch(:name => 'sharon', :id => 1)
    DB.reset
  end

  it "should return the first record for the given pk" do
    @c[1].must_equal @c.load(:name => 'sharon', :id => 1)
    DB.sqls.must_equal ["SELECT * FROM items WHERE id = 1"]
    @c[9999].must_equal @c.load(:name => 'sharon', :id => 1)
    DB.sqls.must_equal ["SELECT * FROM items WHERE id = 9999"]
  end

  it "should have #[] return nil if no rows match" do
    @c.dataset = @c.dataset.with_fetch([])
    @c[1].must_be_nil
    DB.sqls.must_equal ["SELECT * FROM items WHERE id = 1"]
  end

  it "should work correctly for custom primary key" do
    @c.set_primary_key :name
    @c['sharon'].must_equal @c.load(:name => 'sharon', :id => 1)
    DB.sqls.must_equal ["SELECT * FROM items WHERE name = 'sharon'"]
  end

  it "should handle a dataset that uses a subquery" do
    @c.dataset = @c.dataset.cross_join(:a).from_self(:alias=>:b)
    @c[1].must_equal @c.load(:name => 'sharon', :id => 1)
    DB.sqls.must_equal ["SELECT * FROM (SELECT * FROM items CROSS JOIN a) AS b WHERE (id = 1) LIMIT 1"]
  end

  it "should work correctly for composite primary key specified as array" do
    @c.set_primary_key [:node_id, :kind]
    @c[3921, 201].must_be_kind_of(@c)
    DB.sqls.must_equal ['SELECT * FROM items WHERE ((node_id = 3921) AND (kind = 201)) LIMIT 1']
  end
end

describe "Model#inspect" do
  it "should include the class name and the values" do
    Sequel::Model.load(:x => 333).inspect.must_equal '#<Sequel::Model @values={:x=>333}>'
  end
end

describe "Model.db_schema" do
  before do
    @c = Class.new(Sequel::Model(:items)) do
      def self.columns; orig_columns; end
    end
    @db = Sequel.mock
    def @db.supports_schema_parsing?() true end
    @dataset = @db[:items]
  end
  
  it "should not call database's schema if it isn't supported" do
    def @db.supports_schema_parsing?() false end
    def @db.schema(table, opts = {})
      raise Sequel::Error
    end
    @dataset = @dataset.with_extend do
      def columns
        [:x, :y]
      end
    end

    @c.dataset = @dataset
    @c.db_schema.must_equal(:x=>{}, :y=>{})
    @c.columns.must_equal [:x, :y]

    @c.instance_eval{@db_schema = nil}
    @c.db_schema.must_equal(:x=>{}, :y=>{})
    @c.columns.must_equal [:x, :y]
  end

  it "should use the database's schema and set the columns and dataset columns" do
    def @db.schema(table, opts = {})
      [[:x, {:type=>:integer}], [:y, {:type=>:string}]]
    end
    @c.dataset = @dataset
    @c.db_schema.must_equal(:x=>{:type=>:integer}, :y=>{:type=>:string})
    @c.columns.must_equal [:x, :y]
    @c.dataset.columns.must_equal [:x, :y]
  end

  it "should not restrict the schema for datasets with a :select option" do
    def @c.columns; [:x, :z]; end
    def @db.schema(table, opts = {})
      [[:x, {:type=>:integer}], [:y, {:type=>:string}]]
    end
    @c.dataset = @dataset.select(:x, :y___z)
    @c.db_schema.must_equal(:x=>{:type=>:integer}, :z=>{}, :y=>{:type=>:string})
  end

  it "should not raise error if setting dataset where getting schema and columns raises an error and require_valid_table is false" do
    @c.require_valid_table = false
    def @db.schema(table, opts={})
      raise Sequel::Error
    end
    @c.dataset = @dataset.join(:x, :id).from_self.columns(:id, :x)
    @c.db_schema.must_equal(:x=>{}, :id=>{})
  end
  
  it "should raise error if setting dataset where getting schema and columns raises an error and require_valid_table is true" do
    @c.require_valid_table = true
    def @db.schema(table, opts={})
      raise Sequel::Error
    end
    @c.dataset = @dataset.join(:x, :id).from_self.columns(:id, :x)
    @c.db_schema.must_equal(:x=>{}, :id=>{})
  end
  
  it "should use dataset columns if getting schema raises an error and require_valid_table is false" do
    @c.require_valid_table = false
    def @db.schema(table, opts={})
      raise Sequel::Error
    end
    @c.dataset = @dataset.join(:x, :id).from_self.columns(:id, :x)
    @c.db_schema.must_equal(:x=>{}, :id=>{})
  end
  
  it "should use dataset columns if getting schema raises an error and require_valid_table is true" do
    @c.require_valid_table = true
    def @db.schema(table, opts={})
      raise Sequel::Error
    end
    @c.dataset = @dataset.join(:x, :id).from_self.columns(:id, :x)
    @c.db_schema.must_equal(:x=>{}, :id=>{})
  end
  
  it "should automatically set a singular primary key based on the schema" do
    ds = @dataset
    d = ds.db
    def d.schema(table, *opts) [[:x, {:primary_key=>true}]] end
    @c.primary_key.must_equal :id
    @c.dataset = ds
    @c.db_schema.must_equal(:x=>{:primary_key=>true})
    @c.primary_key.must_equal :x
  end
  
  it "should automatically set a singular primary key even if there are specific columns selected" do
    ds = @dataset.select(:a, :b, :x)
    d = ds.db
    def d.schema(table, *opts) [[:a, {:primary_key=>false}], [:b, {:primary_key=>false}], [:x, {:primary_key=>true}]] end
    @c.primary_key.must_equal :id
    @c.dataset = ds
    @c.db_schema.must_equal(:a=>{:primary_key=>false}, :b=>{:primary_key=>false}, :x=>{:primary_key=>true})
    @c.primary_key.must_equal :x
  end
  
  it "should automatically set the composite primary key based on the schema" do
    ds = @dataset
    d = ds.db
    def d.schema(table, *opts) [[:x, {:primary_key=>true}], [:y, {:primary_key=>true}]] end
    @c.primary_key.must_equal :id
    @c.dataset = ds
    @c.db_schema.must_equal(:x=>{:primary_key=>true}, :y=>{:primary_key=>true})
    @c.primary_key.must_equal [:x, :y]
  end

  it "should set an immutable composite primary key based on the schema" do
    ds = @dataset
    d = ds.db
    def d.schema(table, *opts) [[:x, {:primary_key=>true}], [:y, {:primary_key=>true}]] end
    @c.dataset = ds
    @c.primary_key.must_equal [:x, :y]
    proc{@c.primary_key.pop}.must_raise
  end
  
  it "should automatically set no primary key based on the schema" do
    ds = @dataset
    d = ds.db
    def d.schema(table, *opts) [[:x, {:primary_key=>false}], [:y, {:primary_key=>false}]] end
    @c.primary_key.must_equal :id
    @c.dataset = ds
    @c.db_schema.must_equal(:x=>{:primary_key=>false}, :y=>{:primary_key=>false})
    @c.primary_key.must_be_nil
  end
  
  it "should automatically set primary key for dataset selecting table.*" do
    ds = @dataset.select_all(:items)
    d = ds.db
    def d.schema(table, *opts) [[:x, {:primary_key=>true}]] end
    @c.primary_key.must_equal :id
    @c.dataset = ds
    @c.db_schema.must_equal(:x=>{:primary_key=>true})
    @c.primary_key.must_equal :x
  end
  
  it "should not modify the primary key unless all column schema hashes have a :primary_key entry" do
    ds = @dataset
    d = ds.db
    def d.schema(table, *opts) [[:x, {:primary_key=>false}], [:y, {}]] end
    @c.primary_key.must_equal :id
    @c.dataset = ds
    @c.db_schema.must_equal(:x=>{:primary_key=>false}, :y=>{})
    @c.primary_key.must_equal :id
  end
end

describe "Model#use_transactions" do
  before do
    @c = Class.new(Sequel::Model(:items))
  end

  it "should return class value by default" do
    @c.use_transactions = true
    @c.new.use_transactions.must_equal true
    @c.use_transactions = false
    @c.new.use_transactions.must_equal false
  end

  it "should return set value if manually set" do
    instance = @c.new
    instance.use_transactions = false
    instance.use_transactions.must_equal false
    @c.use_transactions = true
    instance.use_transactions.must_equal false
    
    instance.use_transactions = true
    instance.use_transactions.must_equal true
    @c.use_transactions = false
    instance.use_transactions.must_equal true
  end
end
