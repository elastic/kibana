require_relative "spec_helper"

describe "Model attribute setters" do
  before do
    @c = Class.new(Sequel::Model(:items)) do
      columns :id, :x, :y, :"x y"
    end
    @o = @c.new
    DB.reset
  end

  it "refresh should return self" do
    @o = @c[1]
    def @o._refresh(*) [] end
    @o.refresh.must_equal @o
  end

  it "should mark the column value as changed" do
    @o.changed_columns.must_equal []

    @o.x = 2
    @o.changed_columns.must_equal [:x]

    @o.y = 3
    @o.changed_columns.must_equal [:x, :y]

    @o.changed_columns.clear

    @o[:x] = 2
    @o.changed_columns.must_equal [:x]

    @o[:y] = 3
    @o.changed_columns.must_equal [:x, :y]
  end

  it "should handle columns that can't be called like normal ruby methods" do
    @o.send(:"x y=", 3)
    @o.changed_columns.must_equal [:"x y"]
    @o.values.must_equal(:"x y"=>3)
    @o.send(:"x y").must_equal 3
  end
end

describe "Model attribute getters/setters" do
  before do
    a = @a = []
    @c = Class.new(Sequel::Model(:items)) do
      columns :id, :x, :"x y", :require_modification

      [:x, :"x y"].each do |c|
        define_method(c) do
          a << c
          super()
        end
        define_method(:"#{c}=") do |v|
          a << :"#{c}=" << v
          super(v)
        end
      end
    end
    DB.reset
  end

  it "should not override existing methods" do
    @o = @c.new
    @o.values.merge!(:x=>4, :"x y"=>5, :require_modification=>6)
    @o.x.must_equal 4
    @o.x = 1
    @o.send(:"x y").must_equal 5
    @o.send(:"x y=", 2)
    @o.require_modification.must_equal true
    @o.require_modification = 3
    @o.values.must_equal(:x=>1, :"x y"=>2, :require_modification=>6)
    @a.must_equal [:x, :x=, 1, :"x y", :"x y=", 2]
  end

  it "should not override existing methods in subclasses" do
    @c = Class.new(@c)
    @c.columns(:id, :x, :y, :"x y", :require_modification)
    @o = @c.new
    @o.values.merge!(:x=>4, :"x y"=>5, :require_modification=>6)
    @o.x.must_equal 4
    @o.x = 1
    @o.send(:"x y").must_equal 5
    @o.send(:"x y=", 2)
    @o.require_modification.must_equal true
    @o.require_modification = 3
    @o.values.must_equal(:x=>1, :"x y"=>2, :require_modification=>6)
    @a.must_equal [:x, :x=, 1, :"x y", :"x y=", 2]
  end
end

describe "Model.def_column_alias" do
  before do
    @o = Class.new(Sequel::Model(:items)) do
      columns :id
      def_column_alias(:id2, :id)
    end.load(:id=>1)
    DB.reset
  end

  it "should create an getter alias for the column" do
    @o.id2.must_equal 1
  end

  it "should create an setter alias for the column" do
    @o.id2 = 2
    @o.id2.must_equal 2
    @o.values.must_equal(:id => 2)
  end
end

describe Sequel::Model, "dataset" do
  before do
    @a = Class.new(Sequel::Model(:items))
    @b = Class.new(Sequel::Model)
    class ::Elephant < Sequel::Model(:ele1); end
    class ::Maggot < Sequel::Model; end
    class ::ShoeSize < Sequel::Model; end
    class ::BootSize < ShoeSize; end
  end
  after do
    [:Elephant, :Maggot, :ShoeSize, :BootSize].each{|x| Object.send(:remove_const, x)}
  end
  
  it "should default to the plural of the class name" do
    Maggot.dataset.sql.must_equal 'SELECT * FROM maggots'
    ShoeSize.dataset.sql.must_equal 'SELECT * FROM shoe_sizes'
  end
  
  it "should return the dataset for the superclass if available" do
    BootSize.dataset.sql.must_equal 'SELECT * FROM shoe_sizes'
  end
  
  it "should return the correct dataset if set explicitly" do
    Elephant.dataset.sql.must_equal 'SELECT * FROM ele1'
    @a.dataset.sql.must_equal 'SELECT * FROM items'
  end
  
  it "should raise if no dataset is explicitly set and the class is anonymous" do
    proc {@b.dataset}.must_raise(Sequel::Error)
  end
  
  it "should not override dataset explicitly set when subclassing" do
    sc = Class.new(::Elephant) do
      set_dataset :foo
    end
    sc.table_name.must_equal :foo
  end
end
  
describe Sequel::Model, "has_dataset?" do
  it "should return whether the model has a dataset" do
    c = Class.new(Sequel::Model)
    c.has_dataset?.must_equal false
    c.dataset = c.db[:table]
    c.has_dataset?.must_equal true
  end
end

describe Sequel::Model, "implicit table names" do
  after do
    Object.send(:remove_const, :BlahBlah)
  end
  it "should disregard namespaces for the table name" do
    module ::BlahBlah
      class MwaHaHa < Sequel::Model
      end
    end
    BlahBlah::MwaHaHa.dataset.sql.must_equal 'SELECT * FROM mwa_ha_has'
  end

  it "should automatically set datasets when anonymous class of Sequel::Model is used as superclass" do
    class BlahBlah < Class.new(Sequel::Model); end
    BlahBlah.dataset.sql.must_equal 'SELECT * FROM blah_blahs'
  end
end

describe Sequel::Model, ".dataset_module" do
  before do
    @c = Class.new(Sequel::Model(:items))
  end
  
  it "should extend the dataset with the module if the model has a dataset" do
    @c.dataset_module{def return_3() 3 end}
    @c.dataset.return_3.must_equal 3
  end

  it "should also extend the instance_dataset with the module if the model has a dataset" do
    @c.dataset_module{def return_3() 3 end}
    @c.instance_dataset.return_3.must_equal 3
  end

  it "should add methods defined in the module to the class" do
    @c.dataset_module{def return_3() 3 end}
    @c.return_3.must_equal 3
  end

  it "should add methods defined in the module outside the block to the class" do
    @c.dataset_module.module_eval{def return_3() 3 end}
    @c.return_3.must_equal 3
  end

  it "should add methods that can't be called with normal method syntax as class methods" do
    @c.dataset_module.module_eval{define_method(:'return 3'){3}}
    @c.send(:'return 3').must_equal 3
  end

  it "should not add private or protected methods defined in the module to the class" do
    @c.dataset_module{private; def return_3() 3 end}
    @c.dataset_module{protected; def return_4() 4 end}
    @c.respond_to?(:return_3).must_equal false
    @c.respond_to?(:return_4).must_equal false
  end

  it "should cache calls and readd methods if set_dataset is used" do
    @c.dataset_module{def return_3() 3 end}
    @c.set_dataset :items
    @c.return_3.must_equal 3
    @c.dataset.return_3.must_equal 3
  end

  it "should readd methods to subclasses, if set_dataset is used in a subclass" do
    @c.dataset_module{def return_3() 3 end}
    c = Class.new(@c)
    c.set_dataset :items
    c.return_3.must_equal 3
    c.dataset.return_3.must_equal 3
  end

  it "should only have a single dataset_module per class" do
    @c.dataset_module{def return_3() 3 end}
    @c.dataset_module{def return_3() 3 + (begin; super; rescue NoMethodError; 1; end) end}
    @c.return_3.must_equal 4
  end

  it "should not have subclasses share the dataset_module" do
    @c.dataset_module{def return_3() 3 end}
    c = Class.new(@c)
    c.dataset_module{def return_3() 3 + (begin; super; rescue NoMethodError; 1; end) end}
    c.return_3.must_equal 6
  end

  it "should accept a module object and extend the dataset with it" do
    @c.dataset_module Module.new{def return_3() 3 end}
    @c.dataset.return_3.must_equal 3
  end

  it "should be able to call dataset_module with a module multiple times" do
    @c.dataset_module Module.new{def return_3() 3 end}
    @c.dataset_module Module.new{def return_4() 4 end}
    @c.dataset.return_3.must_equal 3
    @c.dataset.return_4.must_equal 4
  end

  it "should be able mix dataset_module calls with and without arguments" do
    @c.dataset_module{def return_3() 3 end}
    @c.dataset_module Module.new{def return_4() 4 end}
    @c.dataset.return_3.must_equal 3
    @c.dataset.return_4.must_equal 4
  end

  it "should have modules provided to dataset_module extend subclass datasets" do
    @c.dataset_module{def return_3() 3 end}
    @c.dataset_module Module.new{def return_4() 4 end}
    c = Class.new(@c)
    c.set_dataset :a
    c.dataset.return_3.must_equal 3
    c.dataset.return_4.must_equal 4
  end

  it "should return the dataset module if given a block" do
    Object.new.extend(@c.dataset_module{def return_3() 3 end}).return_3.must_equal 3
  end

  it "should return the argument if given one" do
    Object.new.extend(@c.dataset_module Module.new{def return_3() 3 end}).return_3.must_equal 3
  end

  it "should have dataset_module support a subset method" do
    @c.dataset_module{subset :released, :released}
    @c.released.sql.must_equal 'SELECT * FROM items WHERE released'
    @c.where(:foo).released.sql.must_equal 'SELECT * FROM items WHERE (foo AND released)'
  end

  it "should have dataset_module support a where method" do
    @c.dataset_module{where :released, :released}
    @c.released.sql.must_equal 'SELECT * FROM items WHERE released'
    @c.where(:foo).released.sql.must_equal 'SELECT * FROM items WHERE (foo AND released)'
  end

  if Sequel::Model.dataset_module_class == Sequel::Model::DatasetModule
    it "should have dataset_module not support an eager method" do
      proc{@c.dataset_module{eager :foo}}.must_raise NoMethodError
    end
  end

  it "should have dataset_module support a having method" do
    @c.dataset_module{having(:released){released}}
    @c.released.sql.must_equal 'SELECT * FROM items HAVING released'
    @c.where(:foo).released.sql.must_equal 'SELECT * FROM items WHERE foo HAVING released'
  end

  it "should have dataset_module support an exclude method" do
    @c.dataset_module{exclude :released, :released}
    @c.released.sql.must_equal 'SELECT * FROM items WHERE NOT released'
    @c.where(:foo).released.sql.must_equal 'SELECT * FROM items WHERE (foo AND NOT released)'
  end

  it "should have dataset_module support an exclude_having method" do
    @c.dataset_module{exclude_having :released, :released}
    @c.released.sql.must_equal 'SELECT * FROM items HAVING NOT released'
    @c.where(:foo).released.sql.must_equal 'SELECT * FROM items WHERE foo HAVING NOT released'
  end

  it "should have dataset_module support a distinct method" do
    @c.dataset = @c.dataset.with_extend{def supports_distinct_on?; true end}
    @c.dataset_module{distinct :foo, :baz}
    @c.foo.sql.must_equal 'SELECT DISTINCT ON (baz) * FROM items'
    @c.where(:bar).foo.sql.must_equal 'SELECT DISTINCT ON (baz) * FROM items WHERE bar'
  end

  it "should have dataset_module support a grep method" do
    @c.dataset_module{grep :foo, :baz, 'quux%'}
    @c.foo.sql.must_equal 'SELECT * FROM items WHERE ((baz LIKE \'quux%\' ESCAPE \'\\\'))'
    @c.where(:bar).foo.sql.must_equal 'SELECT * FROM items WHERE (bar AND ((baz LIKE \'quux%\' ESCAPE \'\\\')))'
  end

  it "should have dataset_module support a group method" do
    @c.dataset_module{group :foo, :baz}
    @c.foo.sql.must_equal 'SELECT * FROM items GROUP BY baz'
    @c.where(:bar).foo.sql.must_equal 'SELECT * FROM items WHERE bar GROUP BY baz'
  end

  it "should have dataset_module support a group_and_count method" do
    @c.dataset_module{group_and_count :foo, :baz}
    @c.foo.sql.must_equal 'SELECT baz, count(*) AS count FROM items GROUP BY baz'
    @c.where(:bar).foo.sql.must_equal 'SELECT baz, count(*) AS count FROM items WHERE bar GROUP BY baz'
  end

  it "should have dataset_module support a group_append method" do
    @c.dataset_module{group_append :foo, :baz}
    @c.foo.sql.must_equal 'SELECT * FROM items GROUP BY baz'
    @c.group(:bar).foo.sql.must_equal 'SELECT * FROM items GROUP BY bar, baz'
  end

  it "should have dataset_module support a limit method" do
    @c.dataset_module{limit :foo, 1}
    @c.foo.sql.must_equal 'SELECT * FROM items LIMIT 1'
    @c.where(:bar).foo.sql.must_equal 'SELECT * FROM items WHERE bar LIMIT 1'
  end

  it "should have dataset_module support a offset method" do
    @c.dataset_module{offset :foo, 1}
    @c.foo.sql.must_equal 'SELECT * FROM items OFFSET 1'
    @c.where(:bar).foo.sql.must_equal 'SELECT * FROM items WHERE bar OFFSET 1'
  end

  it "should have dataset_module support a order method" do
    @c.dataset_module{order(:foo){:baz}}
    @c.foo.sql.must_equal 'SELECT * FROM items ORDER BY baz'
    @c.where(:bar).foo.sql.must_equal 'SELECT * FROM items WHERE bar ORDER BY baz'
  end

  it "should have dataset_module support a order_append method" do
    @c.dataset_module{order_append :foo, :baz}
    @c.foo.sql.must_equal 'SELECT * FROM items ORDER BY baz'
    @c.order(:bar).foo.sql.must_equal 'SELECT * FROM items ORDER BY bar, baz'
  end

  it "should have dataset_module support a order_prepend method" do
    @c.dataset_module{order_prepend :foo, :baz}
    @c.foo.sql.must_equal 'SELECT * FROM items ORDER BY baz'
    @c.order(:bar).foo.sql.must_equal 'SELECT * FROM items ORDER BY baz, bar'
  end

  it "should have dataset_module support a reverse method" do
    @c.dataset_module{reverse(:foo){:baz}}
    @c.foo.sql.must_equal 'SELECT * FROM items ORDER BY baz DESC'
    @c.where(:bar).foo.sql.must_equal 'SELECT * FROM items WHERE bar ORDER BY baz DESC'
  end

  it "should have dataset_module support a select method" do
    @c.dataset_module{select :foo, :baz}
    @c.foo.sql.must_equal 'SELECT baz FROM items'
    @c.where(:bar).foo.sql.must_equal 'SELECT baz FROM items WHERE bar'
  end

  it "should have dataset_module support a select_all method" do
    @c.dataset_module{select_all :foo, :baz}
    @c.foo.sql.must_equal 'SELECT baz.* FROM items'
    @c.where(:bar).foo.sql.must_equal 'SELECT baz.* FROM items WHERE bar'
  end

  it "should have dataset_module support a select_append method" do
    @c.dataset_module{select_append :foo, :baz}
    @c.foo.sql.must_equal 'SELECT *, baz FROM items'
    @c.where(:bar).foo.sql.must_equal 'SELECT *, baz FROM items WHERE bar'
  end

  it "should have dataset_module support a select_group method" do
    @c.dataset_module{select_group :foo, :baz}
    @c.foo.sql.must_equal 'SELECT baz FROM items GROUP BY baz'
    @c.where(:bar).foo.sql.must_equal 'SELECT baz FROM items WHERE bar GROUP BY baz'
  end

  it "should have dataset_module support a server method" do
    @c.dataset_module{server :foo, :baz}
    @c.foo.opts[:server].must_equal :baz
    @c.where(:bar).foo.opts[:server].must_equal :baz
  end

  it "should raise error if called with both an argument and a block" do
    proc{@c.dataset_module(Module.new{def return_3() 3 end}){}}.must_raise(Sequel::Error)
  end
end

describe "A model class with implicit table name" do
  before do
    class ::Donkey < Sequel::Model
    end
  end
  after do
    Object.send(:remove_const, :Donkey)
  end
  
  it "should have a dataset associated with the model class" do
    Donkey.dataset.model.must_equal Donkey
  end
end

describe "A model inheriting from a model" do
  before do
    class ::Feline < Sequel::Model; end
    class ::Leopard < Feline; end
  end
  after do
    Object.send(:remove_const, :Leopard)
    Object.send(:remove_const, :Feline)
  end
  
  it "should have a dataset associated with itself" do
    Feline.dataset.model.must_equal Feline
    Leopard.dataset.model.must_equal Leopard
  end
end

describe "A model inheriting from a custom base that sets @dataset" do
  before do
    ::Feline = Class.new(Sequel::Model)
    def Feline.inherited(subclass)
      subclass.instance_variable_set(:@dataset, nil)
      superclass.inherited(subclass)
    end
    class ::Leopard < Feline; end
  end
  after do
    Object.send(:remove_const, :Leopard)
    Object.send(:remove_const, :Feline)
  end

  it "should not infer the dataset of the subclass" do
    proc{Leopard.dataset}.must_raise(Sequel::Error)
  end
end

describe "Model.primary_key" do
  before do
    @c = Class.new(Sequel::Model)
  end
  
  it "should default to id" do
    @c.primary_key.must_equal :id
  end

  it "should be overridden by set_primary_key" do
    @c.set_primary_key :cid
    @c.primary_key.must_equal :cid

    @c.set_primary_key([:id1, :id2])
    @c.primary_key.must_equal [:id1, :id2]
  end
  
  it "should use nil for no primary key" do
    @c.no_primary_key
    @c.primary_key.must_be_nil
  end
end

describe "Model.primary_key_hash" do
  before do
    @c = Class.new(Sequel::Model)
  end
  
  it "should handle a single primary key" do
    @c.primary_key_hash(1).must_equal(:id=>1)
  end

  it "should handle a composite primary key" do
    @c.set_primary_key([:id1, :id2])
    @c.primary_key_hash([1, 2]).must_equal(:id1=>1, :id2=>2)
  end

  it "should raise an error for no primary key" do
    @c.no_primary_key
    proc{@c.primary_key_hash(1)}.must_raise(Sequel::Error)
  end
end

describe "Model.qualified_primary_key_hash" do
  before do
    @c = Class.new(Sequel::Model(:items))
  end
  
  it "should handle a single primary key" do
    @c.qualified_primary_key_hash(1).must_equal(Sequel.qualify(:items, :id)=>1)
  end

  it "should handle a composite primary key" do
    @c.set_primary_key([:id1, :id2])
    @c.qualified_primary_key_hash([1, 2]).must_equal(Sequel.qualify(:items, :id1)=>1, Sequel.qualify(:items, :id2)=>2)
  end

  it "should raise an error for no primary key" do
    @c.no_primary_key
    proc{@c.qualified_primary_key_hash(1)}.must_raise(Sequel::Error)
  end

  it "should allow specifying a different qualifier" do
    @c.qualified_primary_key_hash(1, :apple).must_equal(Sequel.qualify(:apple, :id)=>1)
    @c.set_primary_key([:id1, :id2])
    @c.qualified_primary_key_hash([1, 2], :bear).must_equal(Sequel.qualify(:bear, :id1)=>1, Sequel.qualify(:bear, :id2)=>2)
  end
end

describe "Model.db" do
  before do
    @db = Sequel.mock
    @databases = Sequel::DATABASES.dup
    @model_db = Sequel::Model.db
    Sequel::Model.db = nil
    Sequel::DATABASES.clear
  end
  after do
    Sequel::Model.instance_variable_get(:@db).must_be_nil
    Sequel::DATABASES.replace(@databases)
    Sequel::Model.db = @model_db
  end

  it "should be required when creating named model classes" do
    begin
      proc{class ModelTest < Sequel::Model; end}.must_raise(Sequel::Error)
    ensure
      Object.send(:remove_const, :ModelTest)
    end
  end

  it "should be required when creating anonymous model classes without a database" do
    proc{Sequel::Model(:foo)}.must_raise(Sequel::Error)
  end

  it "should not be required when creating anonymous model classes with a database" do
    Sequel::Model(@db).db.must_equal @db
    Sequel::Model(@db[:foo]).db.must_equal @db
  end

  it "should work correctly when subclassing anonymous model classes with a database" do
    begin
      Class.new(Sequel::Model(@db)).db.must_equal @db
      Class.new(Sequel::Model(@db[:foo])).db.must_equal @db
      class ModelTest < Sequel::Model(@db)
        db.must_equal @db
      end
      class ModelTest2 < Sequel::Model(@db[:foo])
        db.must_equal @db
      end
      ModelTest.instance_variable_set(:@db, nil)
      ModelTest.db.must_equal @db
    ensure
      Object.send(:remove_const, :ModelTest)
      Object.send(:remove_const, :ModelTest2)
    end
  end
end

describe "Model.db=" do
  before do
    @db1 = Sequel.mock
    @db2 = Sequel.mock
    @m = Class.new(Sequel::Model(@db1))
  end
  
  it "should change database for model" do
    @m.db = @db2
    @m.db.must_equal @db2
  end

  it "should raise Error for model with existing dataset" do
    @m.dataset = :table
    proc{@m.db = @db2}.must_raise Sequel::Error
  end

  it "should use the database for subclasses" do
    Class.new(@m).db.must_equal @db1
  end
end

describe Sequel::Model, ".(un)?restrict_primary_key\\??" do
  before do
    @c = Class.new(Sequel::Model(:blahblah)) do
      set_primary_key :id
      columns :x, :y, :z, :id
    end
    @c.strict_param_setting = false
  end
  
  it "should restrict updates to primary key by default" do
    i = @c.new(:x => 1, :y => 2, :id => 3)
    i.values.must_equal(:x => 1, :y => 2)
    i.set(:x => 4, :y => 5, :id => 6)
    i.values.must_equal(:x => 4, :y => 5)
  end

  it "should allow updates to primary key if unrestrict_primary_key is used" do
    @c.unrestrict_primary_key
    i = @c.new(:x => 1, :y => 2, :id => 3)
    i.values.must_equal(:x => 1, :y => 2, :id=>3)
    i.set(:x => 4, :y => 5, :id => 6)
    i.values.must_equal(:x => 4, :y => 5, :id=>6)
  end

  it "should have restrict_primary_key? return true or false depending" do
    @c.restrict_primary_key?.must_equal true
    @c.unrestrict_primary_key
    @c.restrict_primary_key?.must_equal false
    c1 = Class.new(@c)
    c1.restrict_primary_key?.must_equal false
    @c.restrict_primary_key
    @c.restrict_primary_key?.must_equal true
    c1.restrict_primary_key?.must_equal false
    c2 = Class.new(@c)
    c2.restrict_primary_key?.must_equal true
  end
end

describe Sequel::Model, ".strict_param_setting" do
  before do
    @c = Class.new(Sequel::Model(:blahblah)) do
      columns :x, :y, :z, :id
    end
  end
  
  it "should be enabled by default" do
    @c.strict_param_setting.must_equal true
  end

  it "should raise an error if a missing/restricted column/method is accessed" do
    proc{@c.new(:a=>1)}.must_raise(Sequel::MassAssignmentRestriction)
    proc{@c.create(:a=>1)}.must_raise(Sequel::MassAssignmentRestriction)
    c = @c.new
    proc{c.set(:a=>1)}.must_raise(Sequel::MassAssignmentRestriction)
    proc{c.update(:a=>1)}.must_raise(Sequel::MassAssignmentRestriction)
  end

  it "should be disabled by strict_param_setting = false" do
    @c.strict_param_setting = false
    @c.strict_param_setting.must_equal false
    @c.new(:a=>1)
  end
end

describe Sequel::Model, ".require_modification" do
  before do
    @ds1 = DB[:items].with_extend{def provides_accurate_rows_matched?; false end}
    @ds2 = DB[:items].with_extend{def provides_accurate_rows_matched?; true end}
  end
  after do
    Sequel::Model.require_modification = nil
  end

  it "should depend on whether the dataset provides an accurate number of rows matched by default" do
    Class.new(Sequel::Model).set_dataset(@ds1).require_modification.must_equal false
    Class.new(Sequel::Model).set_dataset(@ds2).require_modification.must_equal true
  end

  it "should obey global setting regardless of dataset support if set" do
    Sequel::Model.require_modification = true
    Class.new(Sequel::Model).set_dataset(@ds1).require_modification.must_equal true
    Class.new(Sequel::Model).set_dataset(@ds2).require_modification.must_equal true
    
    Sequel::Model.require_modification = false
    Class.new(Sequel::Model).set_dataset(@ds1).require_modification.must_equal false
    Class.new(Sequel::Model).set_dataset(@ds1).require_modification.must_equal false
  end
end

describe Sequel::Model, ".[] optimization" do
  before do
    @db = Sequel.mock
    def @db.schema(*) [[:id, {:primary_key=>true}]] end
    def @db.supports_schema_parsing?() true end
    @c = Class.new(Sequel::Model(@db))
    @ds = @db.dataset.with_quote_identifiers(true)
  end

  it "should set simple_pk to the literalized primary key column name if a single primary key" do
    @c.set_primary_key :id
    @c.simple_pk.must_equal 'id'
    @c.set_primary_key :b
    @c.simple_pk.must_equal 'b'
    @c.set_primary_key Sequel.identifier(:b__a)
    @c.simple_pk.must_equal 'b__a'
  end

  it "should have simple_pk be blank if compound or no primary key" do
    @c.no_primary_key
    @c.simple_pk.must_be_nil
    @c.set_primary_key [:b, :a]
    @c.simple_pk.must_be_nil
  end

  it "should have simple table set if passed a Symbol to set_dataset" do
    @c.set_dataset :a
    @c.simple_table.must_equal 'a'
    @c.set_dataset :b
    @c.simple_table.must_equal 'b'
  end

  it "should have simple_table set if passed a simple select all dataset to set_dataset" do
    @c.set_dataset @ds.from(:a)
    @c.simple_table.must_equal '"a"'
    @c.set_dataset @ds.from(:b)
    @c.simple_table.must_equal '"b"'
    @c.set_dataset @ds.from(Sequel[:b][:a])
    @c.simple_table.must_equal '"b"."a"'
  end

  with_symbol_splitting "should have simple_table set using qualified symbol" do
    @c.set_dataset :b__a
    @c.simple_table.must_equal 'b.a'
    @c.set_dataset @ds.from(:b__a)
    @c.simple_table.must_equal '"b"."a"'
  end

  it "should have simple_table = nil if passed a non-simple select all dataset to set_dataset" do
    @c.set_dataset @c.db[:a].filter(:active)
    @c.simple_table.must_be_nil
  end

  it "should have simple_table inherit superclass's setting" do
    Class.new(@c).simple_table.must_be_nil
    @c.set_dataset :a
    Class.new(@c).simple_table.must_equal 'a'
  end

  it "should use Dataset#with_sql if simple_table and simple_pk are true" do
    @c.set_dataset @db[:a].with_fetch(:id=>1)
    @c[1].must_equal @c.load(:id=>1)
    @db.sqls.must_equal ['SELECT * FROM a WHERE id = 1']
  end

  it "should not use Dataset#with_sql if either simple_table or simple_pk is nil" do
    @c.set_dataset @db[:a].where(:active).with_fetch(:id=>1)
    @c[1].must_equal @c.load(:id=>1)
    @db.sqls.must_equal ['SELECT * FROM a WHERE (active AND (id = 1)) LIMIT 1']
  end
end

describe "Model datasets #with_pk with #with_pk!" do
  before do
    @c = Class.new(Sequel::Model(:a))
    @ds = @c.dataset = @c.dataset.with_fetch(:id=>1)
    DB.reset
  end

  it "should be callable on the model class with optimized SQL" do
    @c.with_pk(1).must_equal @c.load(:id=>1)
    DB.sqls.must_equal ["SELECT * FROM a WHERE id = 1"]
    @c.with_pk!(1).must_equal @c.load(:id=>1)
    DB.sqls.must_equal ["SELECT * FROM a WHERE id = 1"]
  end

  it "should return the first record where the primary key matches" do
    @ds.with_pk(1).must_equal @c.load(:id=>1)
    DB.sqls.must_equal ["SELECT * FROM a WHERE (a.id = 1) LIMIT 1"]
    @ds.with_pk!(1).must_equal @c.load(:id=>1)
    DB.sqls.must_equal ["SELECT * FROM a WHERE (a.id = 1) LIMIT 1"]
  end

  it "should work when called repeatedly on a frozen dataset" do
    @ds.freeze
    5.times do
      @ds.with_pk(1).must_equal @c.load(:id=>1)
      DB.sqls.must_equal ["SELECT * FROM a WHERE (a.id = 1) LIMIT 1"]
    end
  end

  it "should handle existing filters" do
    @ds.filter(:a=>2).with_pk(1)
    DB.sqls.must_equal ["SELECT * FROM a WHERE ((a = 2) AND (a.id = 1)) LIMIT 1"]
    @ds.filter(:a=>2).with_pk!(1)
    DB.sqls.must_equal ["SELECT * FROM a WHERE ((a = 2) AND (a.id = 1)) LIMIT 1"]
  end

  it "should work with string values" do
    @ds.with_pk("foo")
    DB.sqls.must_equal ["SELECT * FROM a WHERE (a.id = 'foo') LIMIT 1"]
    @ds.with_pk!("foo")
    DB.sqls.must_equal ["SELECT * FROM a WHERE (a.id = 'foo') LIMIT 1"]
  end

  it "should handle an array for composite primary keys" do
    @c.set_primary_key [:id1, :id2]
    @ds.with_pk([1, 2])
    DB.sqls.must_equal ["SELECT * FROM a WHERE ((a.id1 = 1) AND (a.id2 = 2)) LIMIT 1"]

    @ds.with_pk!([1, 2])
    DB.sqls.must_equal ["SELECT * FROM a WHERE ((a.id1 = 1) AND (a.id2 = 2)) LIMIT 1"]
  end

  it "should work with composite primary keys when called repeatedly on a frozen dataset with" do
    @c.set_primary_key [:id1, :id2]
    @ds.freeze
    5.times do
      @ds.with_pk([1,2])
      DB.sqls.must_equal ["SELECT * FROM a WHERE ((a.id1 = 1) AND (a.id2 = 2)) LIMIT 1"]
    end
  end

  it "should have with_pk return nil and with_pk! raise if no rows match" do
    @ds = @ds.with_fetch([])
    @ds.with_pk(1).must_be_nil
    DB.sqls.must_equal ["SELECT * FROM a WHERE (a.id = 1) LIMIT 1"]
    proc{@ds.with_pk!(1)}.must_raise(Sequel::NoMatchingRow)
    DB.sqls.must_equal ["SELECT * FROM a WHERE (a.id = 1) LIMIT 1"]
  end

  it "should have with_pk return nil and with_pk! raise if no rows match when calling the class method" do
    @c.dataset = @c.dataset.with_fetch([])
    @c.with_pk(1).must_be_nil
    DB.sqls.must_equal ["SELECT * FROM a WHERE id = 1"]
    proc{@c.with_pk!(1)}.must_raise(Sequel::NoMatchingRow)
    DB.sqls.must_equal ["SELECT * FROM a WHERE id = 1"]
  end

  it "should have #[] consider an integer as a primary key lookup" do
    @ds[1].must_equal @c.load(:id=>1)
    DB.sqls.must_equal ["SELECT * FROM a WHERE (a.id = 1) LIMIT 1"]
  end

  it "should not have #[] consider a literal string as a primary key lookup" do
    @ds[Sequel.lit('foo')].must_equal @c.load(:id=>1)
    DB.sqls.must_equal ["SELECT * FROM a WHERE (foo) LIMIT 1"]
  end

  it "should raise Error if called on a dataset with no primary key" do
    @c.no_primary_key
    @ds.freeze
    5.times do
      proc{@ds.with_pk(1)}.must_raise Sequel::Error
    end
  end
end

describe "Model::include" do
  it "shouldn't change the signature of Module::include" do
    mod1 = Module.new
    mod2 = Module.new
    including_class = Class.new(Sequel::Model(:items)) do
      include(mod1, mod2)
    end
    including_class.included_modules.must_include(mod1)
    including_class.included_modules.must_include(mod2)
  end
end
