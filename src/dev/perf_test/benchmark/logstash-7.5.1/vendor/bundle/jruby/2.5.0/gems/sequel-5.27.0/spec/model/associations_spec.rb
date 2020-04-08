require_relative "spec_helper"

describe Sequel::Model, "associate" do
  it "should use explicit class if given a class, symbol, or string" do
    begin
      klass = Class.new(Sequel::Model(:nodes))
      class ::ParParent < Sequel::Model; end
      
      klass.associate :many_to_one, :par_parent0, :class=>ParParent
      klass.associate :one_to_many, :par_parent1s, :class=>'ParParent'
      klass.associate :many_to_many, :par_parent2s, :class=>:ParParent
      
      klass.association_reflection(:"par_parent0").associated_class.must_equal ParParent
      klass.association_reflection(:"par_parent1s").associated_class.must_equal ParParent
      klass.association_reflection(:"par_parent2s").associated_class.must_equal ParParent
    ensure
      Object.send(:remove_const, :ParParent)
    end
  end

  it "should default to associating to other models in the same scope" do
    begin
      class ::AssociationModuleTest
        class Album < Sequel::Model
          many_to_one :artist
          many_to_many :tags
        end
        class Artist< Sequel::Model
          one_to_many :albums
        end
        class Tag < Sequel::Model
          many_to_many :albums
        end
      end
      
      ::AssociationModuleTest::Album.association_reflection(:artist).associated_class.must_equal ::AssociationModuleTest::Artist
      ::AssociationModuleTest::Album.association_reflection(:tags).associated_class.must_equal ::AssociationModuleTest::Tag
      ::AssociationModuleTest::Artist.association_reflection(:albums).associated_class.must_equal ::AssociationModuleTest::Album
      ::AssociationModuleTest::Tag.association_reflection(:albums).associated_class.must_equal ::AssociationModuleTest::Album
    ensure
      Object.send(:remove_const, :AssociationModuleTest)
    end
  end

  it "should add a model_object and association_reflection accessors to the dataset, and return it with the current model object" do
    klass = Class.new(Sequel::Model(:nodes)) do
      columns :id, :a_id
    end
    mod = Module.new do
      def blah
       filter{|o| o.__send__(association_reflection[:key]) > model_object.id*2}
      end
    end

    klass.associate :many_to_one, :a, :class=>klass
    klass.associate :one_to_many, :bs, :key=>:b_id, :class=>klass, :extend=>mod
    klass.associate :many_to_many, :cs, :class=>klass
    
    node = klass.load(:id=>1)
    node.a_dataset.model_object.must_equal node
    node.bs_dataset.model_object.must_equal node
    node.cs_dataset.model_object.must_equal node

    node.a_dataset.association_reflection.must_equal klass.association_reflection(:a)
    node.bs_dataset.association_reflection.must_equal klass.association_reflection(:bs)
    node.cs_dataset.association_reflection.must_equal klass.association_reflection(:cs)

    node.bs_dataset.blah.sql.must_equal 'SELECT * FROM nodes WHERE ((nodes.b_id = 1) AND (b_id > 2))'
  end

  it "should allow extending the dataset with :extend option" do
    klass = Class.new(Sequel::Model(:nodes)) do
      columns :id, :a_id
    end
    mod = Module.new do
      def blah
       1
      end
    end
    mod2 = Module.new do
      def blar
       2
      end
    end
    
    klass.associate :many_to_one, :a, :class=>klass, :extend=>mod
    klass.associate :one_to_many, :bs, :class=>klass, :extend=>[mod]
    klass.associate :many_to_many, :cs, :class=>klass, :extend=>[mod, mod2]
    
    node = klass.load(:id=>1)
    node.a_dataset.blah.must_equal 1
    node.bs_dataset.blah.must_equal 1
    node.cs_dataset.blah.must_equal 1
    node.cs_dataset.blar.must_equal 2
  end

  it "should clone an existing association with the :clone option" do
    begin
      class ::ParParent < Sequel::Model; end
      klass = Class.new(Sequel::Model(:nodes))
      
      klass.many_to_one(:par_parent, :order=>:a){|ds| 1}
      klass.one_to_many(:par_parent1s, :class=>'ParParent', :limit=>12){|ds| 4}
      klass.many_to_many(:par_parent2s, :class=>:ParParent, :uniq=>true){|ds| 2}

      klass.many_to_one :par, :clone=>:par_parent, :select=>:b
      klass.one_to_many :par1s, :clone=>:par_parent1s, :order=>:b, :limit=>10, :block=>nil
      klass.many_to_many(:par2s, :clone=>:par_parent2s, :order=>:c){|ds| 3}
      klass.many_to_one :par3, :clone=>:par
      
      klass.association_reflection(:par).associated_class.must_equal ParParent
      klass.association_reflection(:par1s).associated_class.must_equal ParParent
      klass.association_reflection(:par2s).associated_class.must_equal ParParent
      
      klass.association_reflection(:par)[:order].must_equal :a
      klass.association_reflection(:par).select.must_equal :b
      klass.association_reflection(:par)[:block].call.must_equal 1
      klass.association_reflection(:par)[:eager_block].call.must_equal 1
      klass.association_reflection(:par1s)[:limit].must_equal 10
      klass.association_reflection(:par1s)[:order].must_equal :b
      klass.association_reflection(:par1s)[:block].must_be_nil
      klass.association_reflection(:par2s)[:after_load].length.must_equal 1
      klass.association_reflection(:par2s)[:order].must_equal :c
      klass.association_reflection(:par2s)[:block].call.must_equal 3

      klass.association_reflection(:par3)[:block].call.must_equal 1
      klass.association_reflection(:par3)[:eager_block].call.must_equal 1
    ensure
      Object.send(:remove_const, :ParParent)
    end
  end

  it "should raise an error if attempting to clone an association of differing type" do
    c = Class.new(Sequel::Model(:c))
    c.many_to_one :c
    proc{c.one_to_many :cs, :clone=>:c}.must_raise(Sequel::Error)
  end

  it "should allow overriding the :instance_specific option" do
    c = Class.new(Sequel::Model(:c))
    c.many_to_one :c, :instance_specific=>true
    c.association_reflection(:c)[:instance_specific].must_equal true
    c.many_to_one :c, :instance_specific=>false do |ds| ds end
    c.association_reflection(:c)[:instance_specific].must_equal false
  end

  it "should allow cloning of one_to_many to one_to_one associations and vice-versa" do
    c = Class.new(Sequel::Model(:c))
    c.one_to_one :c
    c.one_to_many :cs, :clone=>:c
    c.one_to_one :c2, :clone=>:cs
  end

  it "should allow cloning of many_to_many to one_through_one associations and vice-versa" do
    c = Class.new(Sequel::Model(:c))
    c.many_to_many :c
    c.one_through_one :cs, :clone=>:c
    c.many_to_many :c2, :clone=>:cs
  end

  it "should clear associations cache when refreshing object manually" do
    c = Class.new(Sequel::Model(:c))
    c.many_to_one :c
    o = c.new
    o.associations[:c] = 1
    o.refresh
    o.associations.must_equal({})
  end

  it "should not clear associations cache when refreshing object after save" do
    c = Class.new(Sequel::Model(:c))
    c.many_to_one :c
    o = c.new
    o.associations[:c] = 1
    o.save
    o.associations.must_equal(:c=>1)
  end

  it "should not clear associations cache when saving with insert_select" do
    ds = Sequel::Model.db[:c].with_extend do
      def supports_insert_select?; true end
      def insert_select(*) {:id=>1} end
    end
    c = Class.new(Sequel::Model(ds))
    c.many_to_one :c
    o = c.new
    o.associations[:c] = 1
    o.save
    o.associations.must_equal(:c=>1)
  end

  it "should not autoreload associations when the current foreign key value is nil" do
    c = Class.new(Sequel::Model(Sequel::Model.db[:c]))
    c.many_to_one :c
    o = c.new
    o.associations[:c] = 1
    o[:c_id] = 2
    o.associations[:c].must_equal 1

    o = c.load({})
    o.associations[:c] = 1
    o[:c_id] = 2
    o.associations[:c].must_equal 1
  end

  it "should autoreload associations when the current foreign key is nil and the current associated value is nil" do
    c = Class.new(Sequel::Model(Sequel::Model.db[:c]))
    c.many_to_one :c
    o = c.new
    o.associations[:c] = nil
    o[:c_id] = 2
    o.associations.must_be_empty

    o = c.load({})
    o.associations[:c] = nil
    o[:c_id] = 2
    o.associations.must_be_empty
  end

  it "should handle autoreloading for multiple associations when the current foreign key is nil" do
    c = Class.new(Sequel::Model(Sequel::Model.db[:c]))
    c.many_to_one :c
    c.many_to_one :d, :key=>:c_id
    o = c.new
    o.associations[:c] = nil
    o.associations[:d] = 1
    o[:c_id] = nil
    o.associations.must_equal(:c=>nil, :d=>1)

    o[:c_id] = 2
    o.associations.must_equal(:d=>1)

    o[:c_id] = 2
    o.associations.must_equal(:d=>1)

    o[:c_id] = nil
    o.associations.must_be_empty

    o = c.load({:c_id=>nil})
    o.associations[:c] = nil
    o.associations[:d] = 1
    o[:c_id] = nil
    o.associations.must_equal(:c=>nil, :d=>1)

    o[:c_id] = 2
    o.associations.must_equal(:d=>1)

    o[:c_id] = 2
    o.associations.must_equal(:d=>1)

    o[:c_id] = nil
    o.associations.must_be_empty
  end
end

describe Sequel::Model, "many_to_one" do
  before do
    @c2 = Class.new(Sequel::Model(:nodes)) do
      unrestrict_primary_key
      columns :id, :parent_id, :par_parent_id, :blah
    end
    @dataset = @c2.dataset
    DB.reset
  end

  it "should raise an error if associated class does not have a primary key, and :primary_key is not specified" do
    @c2.no_primary_key
    @c2.many_to_one :parent, :class => @c2
    d = @c2.new(:id => 1, :parent_id => 234)
    proc{d.parent}.must_raise(Sequel::Error)
    DB.sqls.must_equal []
  end
  
  it "should raise an error if associated class does not have a primary key, and :primary_key is not specified, with an association block" do
    @c2.no_primary_key
    @c2.many_to_one :parent, :class => @c2 do |ds| ds end
    d = @c2.new(:id => 1, :parent_id => 234)
    proc{d.parent}.must_raise(Sequel::Error)
    DB.sqls.must_equal []
  end
  
  it "should use implicit key if omitted" do
    @c2.many_to_one :parent, :class => @c2

    d = @c2.new(:id => 1, :parent_id => 234)
    p = d.parent
    p.class.must_equal @c2
    p.values.must_equal(:x => 1, :id => 1)

    DB.sqls.must_equal ["SELECT * FROM nodes WHERE id = 234"]
  end
  
  it "should allow association with the same name as the key if :key_column is given" do
    @c2.def_column_alias(:parent_id_id, :parent_id)
    @c2.many_to_one :parent_id, :key_column=>:parent_id, :class => @c2
    d = @c2.load(:id => 1, :parent_id => 234)
    d.parent_id_dataset.sql.must_equal "SELECT * FROM nodes WHERE (nodes.id = 234) LIMIT 1"
    d.parent_id.must_equal @c2.load(:x => 1, :id => 1)
    d.parent_id_id.must_equal 234
    d[:parent_id].must_equal 234
    DB.sqls.must_equal ["SELECT * FROM nodes WHERE id = 234"]

    d.parent_id_id = 3
    d.parent_id_id.must_equal 3
    d[:parent_id].must_equal 3
  end
  
  it "should use implicit class if omitted" do
    begin
      class ::ParParent < Sequel::Model; end
      @c2.many_to_one :par_parent
      @c2.new(:id => 1, :par_parent_id => 234).par_parent.class.must_equal ParParent
      DB.sqls.must_equal ["SELECT * FROM par_parents WHERE id = 234"]
    ensure
      Object.send(:remove_const, :ParParent)
    end
  end

  it "should use class inside module if given as a string" do
    begin
      module ::Par 
        class Parent < Sequel::Model; end
      end
      @c2.many_to_one :par_parent, :class=>"Par::Parent"
      @c2.new(:id => 1, :par_parent_id => 234).par_parent.class.must_equal Par::Parent
      DB.sqls.must_equal ["SELECT * FROM parents WHERE id = 234"]
    ensure
      Object.send(:remove_const, :Par)
    end
  end

  it "should use explicit key if given" do
    @c2.many_to_one :parent, :class => @c2, :key => :blah

    d = @c2.new(:id => 1, :blah => 567)
    p = d.parent
    p.class.must_equal @c2
    p.values.must_equal(:x => 1, :id => 1)

    DB.sqls.must_equal ["SELECT * FROM nodes WHERE id = 567"]
  end

  it "should respect :qualify => false option" do
    @c2.many_to_one :parent, :class => @c2, :key => :blah, :qualify=>false
    @c2.new(:id => 1, :blah => 567).parent
    DB.sqls.must_equal ["SELECT * FROM nodes WHERE id = 567"]
  end
  
  it "should use :primary_key option if given" do
    @c2.many_to_one :parent, :class => @c2, :key => :blah, :primary_key => :pk
    @c2.new(:id => 1, :blah => 567).parent
    DB.sqls.must_equal ["SELECT * FROM nodes WHERE (nodes.pk = 567) LIMIT 1"]
  end
  
  it "should support composite keys" do
    @c2.many_to_one :parent, :class => @c2, :key=>[:id, :parent_id], :primary_key=>[:parent_id, :id]
    @c2.new(:id => 1, :parent_id => 234).parent
    DB.sqls.must_equal ["SELECT * FROM nodes WHERE ((nodes.parent_id = 1) AND (nodes.id = 234)) LIMIT 1"]
  end
  
  it "should not issue query if not all keys have values" do
    @c2.many_to_one :parent, :class => @c2, :key=>[:id, :parent_id], :primary_key=>[:parent_id, :id]
    @c2.new(:id => 1, :parent_id => nil).parent.must_be_nil
    DB.sqls.must_equal []
  end
  
  it "should raise an Error unless same number of composite keys used" do
    proc{@c2.many_to_one :parent, :class => @c2, :primary_key=>[:parent_id, :id]}.must_raise(Sequel::Error)
    proc{@c2.many_to_one :parent, :class => @c2, :key=>[:id, :parent_id], :primary_key=>:id}.must_raise(Sequel::Error)
    proc{@c2.many_to_one :parent, :class => @c2, :key=>:id, :primary_key=>[:parent_id, :id]}.must_raise(Sequel::Error)
    proc{@c2.many_to_one :parent, :class => @c2, :key=>[:id, :parent_id, :blah], :primary_key=>[:parent_id, :id]}.must_raise(Sequel::Error)
  end

  it "should use :select option if given" do
    @c2.many_to_one :parent, :class => @c2, :key => :blah, :select=>[:id, :name]
    @c2.new(:id => 1, :blah => 567).parent
    DB.sqls.must_equal ["SELECT id, name FROM nodes WHERE (nodes.id = 567) LIMIT 1"]
  end

  it "should use :conditions option if given" do
    @c2.many_to_one :parent, :class => @c2, :key => :blah, :conditions=>{:a=>32}
    @c2.new(:id => 1, :blah => 567).parent
    DB.sqls.must_equal ["SELECT * FROM nodes WHERE ((a = 32) AND (nodes.id = 567)) LIMIT 1"]

    @c2.many_to_one :parent, :class => @c2, :key => :blah, :conditions=>:a
    @c2.new(:id => 1, :blah => 567).parent
    DB.sqls.must_equal ["SELECT * FROM nodes WHERE (a AND (nodes.id = 567)) LIMIT 1"]
  end

  it "should support :order, :limit (only for offset), and :dataset options, as well as a block" do
    @c2.many_to_one :child_20, :class => @c2, :key=>:id, :dataset=>proc{model.filter(:parent_id=>pk)}, :limit=>[10,20], :order=>:name do |ds|
      ds.filter{x > 1}
    end
    @c2.load(:id => 100).child_20
    DB.sqls.must_equal ["SELECT * FROM nodes WHERE ((parent_id = 100) AND (x > 1)) ORDER BY name LIMIT 1 OFFSET 20"]
  end

  it "should return nil if key value is nil" do
    @c2.many_to_one :parent, :class => @c2
    @c2.new(:id => 1).parent.must_be_nil
    DB.sqls.must_equal []
  end

  it "should cache negative lookup" do
    @c2.many_to_one :parent, :class => @c2
    @c2.dataset = @c2.dataset.with_fetch([])
    d = @c2.new(:id => 1, :parent_id=>555)
    DB.sqls.must_equal []
    d.parent.must_be_nil
    DB.sqls.must_equal ['SELECT * FROM nodes WHERE id = 555']
    d.parent.must_be_nil
    DB.sqls.must_equal []
  end

  it "should define a setter method" do
    @c2.many_to_one :parent, :class => @c2

    d = @c2.new(:id => 1)
    d.parent = @c2.new(:id => 4321)
    d.values.must_equal(:id => 1, :parent_id => 4321)

    d.parent = nil
    d.values.must_equal(:id => 1, :parent_id => nil)

    e = @c2.new(:id => 6677)
    d.parent = e
    d.values.must_equal(:id => 1, :parent_id => 6677)
  end
  
  it "should have the setter method respect the :primary_key option" do
    @c2.many_to_one :parent, :class => @c2, :primary_key=>:blah

    d = @c2.new(:id => 1)
    d.parent = @c2.new(:id => 4321, :blah=>444)
    d.values.must_equal(:id => 1, :parent_id => 444)

    d.parent = nil
    d.values.must_equal(:id => 1, :parent_id => nil)

    e = @c2.new(:id => 6677, :blah=>8)
    d.parent = e
    d.values.must_equal(:id => 1, :parent_id => 8)
  end
  
  it "should have the setter method respect composite keys" do
    @c2.many_to_one :parent, :class => @c2, :key=>[:id, :parent_id], :primary_key=>[:parent_id, :id]

    d = @c2.new(:id => 1, :parent_id=> 234)
    d.parent = @c2.new(:id => 4, :parent_id=>52)
    d.values.must_equal(:id => 52, :parent_id => 4)

    d.parent = nil
    d.values.must_equal(:id => nil, :parent_id => nil)

    e = @c2.new(:id => 6677, :parent_id=>8)
    d.parent = e
    d.values.must_equal(:id => 8, :parent_id => 6677)
  end
  
  it "should not persist changes until saved" do
    @c2.many_to_one :parent, :class => @c2

    d = @c2.load(:id => 1)
    DB.reset
    d.parent = @c2.new(:id => 345)
    DB.sqls.must_equal []
    d.save_changes
    DB.sqls.must_equal ['UPDATE nodes SET parent_id = 345 WHERE (id = 1)']
  end

  it "should populate cache when accessed" do
    @c2.many_to_one :parent, :class => @c2

    d = @c2.load(:id => 1)
    d.parent_id = 234
    d.associations[:parent].must_be_nil
    @c2.dataset = @c2.dataset.with_fetch(:id=>234)
    e = d.parent 
    DB.sqls.must_equal ["SELECT * FROM nodes WHERE id = 234"]
    d.associations[:parent].must_equal e
  end

  it "should populate cache when assigned" do
    @c2.many_to_one :parent, :class => @c2

    d = @c2.create(:id => 1)
    DB.reset
    d.associations[:parent].must_be_nil
    d.parent = @c2.new(:id => 234)
    e = d.parent 
    d.associations[:parent].must_equal e
    DB.sqls.must_equal []
  end

  it "should use cache if available" do
    @c2.many_to_one :parent, :class => @c2

    d = @c2.create(:id => 1, :parent_id => 234)
    DB.reset
    d.associations[:parent] = 42
    d.parent.must_equal 42
    DB.sqls.must_equal []
  end

  it "should not use cache if asked to reload" do
    @c2.many_to_one :parent, :class => @c2

    d = @c2.create(:id => 1)
    DB.reset
    d.parent_id = 234
    d.associations[:parent] = 42
    d.parent(:reload=>true).wont_equal 42 
    DB.sqls.must_equal ["SELECT * FROM nodes WHERE id = 234"]
  end
  
  it "should use a callback if given one as the argument" do
    @c2.many_to_one :parent, :class => @c2

    d = @c2.create(:id => 1)
    DB.reset
    d.parent_id = 234
    d.associations[:parent] = 42
    d.parent{|ds| ds.where{name > 'M'}}.wont_equal 42 
    DB.sqls.must_equal ["SELECT * FROM nodes WHERE ((nodes.id = 234) AND (name > 'M')) LIMIT 1"]
  end
  
  it "should use a block given to the association method as a callback" do
    @c2.many_to_one :parent, :class => @c2

    d = @c2.create(:id => 1)
    DB.reset
    d.parent_id = 234
    d.associations[:parent] = 42
    d.parent{|ds| ds.filter{name > 'M'}}.wont_equal 42 
    DB.sqls.must_equal ["SELECT * FROM nodes WHERE ((nodes.id = 234) AND (name > 'M')) LIMIT 1"]
  end
  
  it "should have the setter add to the reciprocal one_to_many cached association array if it exists" do
    @c2.many_to_one :parent, :class => @c2
    @c2.one_to_many :children, :class => @c2, :key=>:parent_id
    @c2.dataset = @c2.dataset.with_fetch([])

    d = @c2.new(:id => 1)
    e = @c2.new(:id => 2)
    DB.sqls.must_equal []
    d.parent = e
    e.children.wont_include(d)
    DB.sqls.must_equal ['SELECT * FROM nodes WHERE (nodes.parent_id = 2)']

    d = @c2.new(:id => 1)
    e = @c2.new(:id => 2)
    e.children.wont_include(d)
    DB.sqls.must_equal ['SELECT * FROM nodes WHERE (nodes.parent_id = 2)']
    d.parent = e
    e.children.must_include(d)
    DB.sqls.must_equal []
  end

  it "should have setter deal with a one_to_one reciprocal" do
    @c2.many_to_one :parent, :class => @c2, :key=>:parent_id
    @c2.one_to_one :child, :class => @c2, :key=>:parent_id

    d = @c2.new(:id => 1)
    e = @c2.new(:id => 2)
    e.associations[:child] = nil
    d.parent = e
    e.child.must_equal d
    d.parent = nil
    e.child.must_be_nil
    d.parent = e
    e.child.must_equal d

    f = @c2.new(:id => 3)
    d.parent = nil
    e.child.must_be_nil
    e.associations[:child] = f
    d.parent = e
    e.child.must_equal d
  end

  it "should have the setter remove the object from the previous associated object's reciprocal one_to_many cached association array if it exists" do
    @c2.many_to_one :parent, :class => @c2
    @c2.one_to_many :children, :class => @c2, :key=>:parent_id
    @c2.dataset = @c2.dataset.with_fetch([])

    d = @c2.new(:id => 1)
    e = @c2.new(:id => 2)
    f = @c2.new(:id => 3)
    e.children.wont_include(d)
    f.children.wont_include(d)
    DB.reset
    d.parent = e
    e.children.must_include(d)
    d.parent = f
    f.children.must_include(d)
    e.children.wont_include(d)
    d.parent = nil
    f.children.wont_include(d)
    DB.sqls.must_equal []
  end

  it "should have the setter not modify the reciprocal if set to same value as current" do
    @c2.many_to_one :parent, :class => @c2
    @c2.one_to_many :children, :class => @c2, :key=>:parent_id

    c1 = @c2.load(:id => 1, :parent_id=>nil)
    c2 = @c2.load(:id => 2, :parent_id=>1)
    c3 = @c2.load(:id => 3, :parent_id=>1)
    c1.associations[:children] = [c2, c3]
    c2.associations[:parent] = c1
    c2.parent = c1
    c1.children.must_equal [c2, c3]
    DB.sqls.must_equal []
  end

  it "should get all matching records and only return the first if :key option is set to nil" do
    @c2.dataset = @c2.dataset.with_fetch([{:id=>1, :parent_id=>0, :par_parent_id=>3, :blah=>4, :children_id=>2, :children_parent_id=>1, :children_par_parent_id=>5, :children_blah=>6}, {}])
    @c2.dataset.columns(:id, :parent_id, :par_parent_id, :blah)
    @c2.one_to_many :children, :class => @c2, :key=>:parent_id
    @c2.many_to_one :first_grand_parent, :class => @c2, :key=>nil, :eager_graph=>:children, :dataset=>proc{model.filter(:children_id=>parent_id)}
    p = @c2.new(:parent_id=>2)
    fgp = p.first_grand_parent
    DB.sqls.must_equal ["SELECT nodes.id, nodes.parent_id, nodes.par_parent_id, nodes.blah, children.id AS children_id, children.parent_id AS children_parent_id, children.par_parent_id AS children_par_parent_id, children.blah AS children_blah FROM nodes LEFT OUTER JOIN nodes AS children ON (children.parent_id = nodes.id) WHERE (children_id = 2)"]
    fgp.values.must_equal(:id=>1, :parent_id=>0, :par_parent_id=>3, :blah=>4)
    fgp.children.first.values.must_equal(:id=>2, :parent_id=>1, :par_parent_id=>5, :blah=>6)
  end

  it "should not create the setter method if :read_only option is used" do
    @c2.many_to_one :parent, :class => @c2, :read_only=>true
    @c2.instance_methods.must_include(:parent)
    @c2.instance_methods.wont_include(:parent=)
  end

  it "should not add associations methods directly to class" do
    @c2.many_to_one :parent, :class => @c2
    @c2.instance_methods.must_include(:parent)
    @c2.instance_methods.must_include(:parent=)
    @c2.instance_methods(false).wont_include(:parent)
    @c2.instance_methods(false).wont_include(:parent=)
  end

  it "should add associations methods to the :methods_module option" do
    m = Module.new
    @c2.many_to_one :parent, :class => @c2, :methods_module=>m
    m.instance_methods.must_include(:parent)
    m.instance_methods.must_include(:parent=)
    @c2.instance_methods.wont_include(:parent)
    @c2.instance_methods.wont_include(:parent=)
  end

  it "should add associations methods directly to class if :methods_module is the class itself" do
    @c2.many_to_one :parent, :class => @c2, :methods_module=>@c2
    @c2.instance_methods(false).must_include(:parent)
    @c2.instance_methods(false).must_include(:parent=)
  end

  it "should raise an error if trying to set a model object that doesn't have a valid primary key" do
    @c2.many_to_one :parent, :class => @c2
    p = @c2.new
    c = @c2.load(:id=>123)
    proc{c.parent = p}.must_raise(Sequel::Error)
  end

  it "should make the change to the foreign_key value inside a _association= method" do
    @c2.many_to_one :parent, :class => @c2
    @c2.private_instance_methods.must_include(:_parent=)
    p = @c2.new
    c = @c2.load(:id=>123)
    def p._parent=(x)
      @x = x
    end
    def p.parent_id=; raise; end
    p.parent = c
    p.instance_variable_get(:@x).must_equal c
  end

  it "should have the :setter option define the _association= method" do
    @c2.many_to_one :parent, :class => @c2, :setter=>proc{|x| @x = x}
    p = @c2.new
    c = @c2.load(:id=>123)
    def p.parent_id=; raise; end
    p.parent = c
    p.instance_variable_get(:@x).must_equal c
  end

  it "should support (before|after)_set callbacks" do
    h = []
    @c2.many_to_one :parent, :class => @c2, :before_set=>[proc{|x,y| h << x.pk; h << (y ? -y.pk : :y)}, :blah], :after_set=>proc{h << 3}
    @c2.class_eval do
      self::Foo = h
      def []=(a, v)
        a == :parent_id ? (model::Foo << (v ? 4 : 5)) : super
      end
      def blah(x)
        model::Foo << (x ? x.pk : :x)
      end
      def blahr(x)
        model::Foo << 6
      end
    end
    p = @c2.load(:id=>10)
    c = @c2.load(:id=>123)
    h.must_equal []
    p.parent = c
    h.must_equal [10, -123, 123, 4, 3]
    p.parent = nil
    h.must_equal [10, -123, 123, 4, 3, 10, :y, :x, 5, 3]
  end

  it "should support after_load association callback" do
    h = []
    @c2.many_to_one :parent, :class => @c2, :after_load=>[proc{|x,y| h << [x.pk, y.pk]}, :al]
    @c2.class_eval do
      self::Foo = h
      def al(v)
        model::Foo << v.pk
      end
      set_dataset dataset.with_fetch(:id=>20)
    end
    p = @c2.load(:id=>10, :parent_id=>20)
    parent = p.parent
    h.must_equal [[10, 20], 20]
    parent.pk.must_equal 20
  end

  it "should support after_load association callback that changes the cached object" do
    @c2.many_to_one :parent, :class => @c2, :after_load=>:al
    @c2.class_eval do
      def al(v)
        associations[:parent] = :foo
      end
    end
    p = @c2.load(:id=>10, :parent_id=>20)
    p.parent.must_equal :foo
    p.associations[:parent].must_equal :foo
  end

  it "should raise error and not call internal add or remove method if before callback calls cancel_action, even if raise_on_save_failure is false" do
    p = @c2.new
    c = @c2.load(:id=>123)
    p.raise_on_save_failure = false
    @c2.many_to_one :parent, :class => @c2, :before_set=>:bs
    def p.bs(x) cancel_action end
    def p._parent=; raise; end
    proc{p.parent = c}.must_raise(Sequel::HookFailed)
    
    p.parent.must_be_nil
    p.associations[:parent] = c
    p.parent.must_equal c
    proc{p.parent = nil}.must_raise(Sequel::HookFailed)
  end

  it "should raise an error if a callback is not a proc or symbol" do
    @c2.many_to_one :parent, :class => @c2, :before_set=>Object.new
    proc{@c2.new.parent = @c2.load(:id=>1)}.must_raise(Sequel::Error)
  end

  it "should have association dataset use false condition if any key is nil" do
    @c2.many_to_one :parent, :class => @c2
    @c2.load({}).parent_dataset.sql.must_equal "SELECT * FROM nodes WHERE 'f' LIMIT 1"
  end
end

describe Sequel::Model, "one_to_one" do
  before do
    @c1 = Class.new(Sequel::Model(:attributes)) do
      unrestrict_primary_key
      columns :id, :node_id, :y
    end

    @c2 = Class.new(Sequel::Model(:nodes)) do
      unrestrict_primary_key
      attr_accessor :xxx
      
      def self.name; 'Node'; end
      def self.to_s; 'Node'; end
      columns :id, :x, :parent_id, :par_parent_id, :blah, :node_id
    end
    @dataset = @c2.dataset
    @dataset = @dataset.with_fetch({})
    @c1.dataset = @c1.dataset.with_fetch({})
    DB.reset
  end
  
  it "should have the getter method return a single object" do
    @c2.one_to_one :attribute, :class => @c1
    att = @c2.new(:id => 1234).attribute
    DB.sqls.must_equal ['SELECT * FROM attributes WHERE (attributes.node_id = 1234) LIMIT 1']
    att.must_be_kind_of(@c1)
    att.values.must_equal({})
  end

  it "should not add a setter method if the :read_only option is true" do
    @c2.one_to_one :attribute, :class => @c1, :read_only=>true
    im = @c2.instance_methods
    im.must_include(:attribute)
    im.wont_include(:attribute=)
  end

  it "should add a setter method" do
    @c2.one_to_one :attribute, :class => @c1
    attrib = @c1.new(:id=>3)
    @c1.dataset = @c1.dataset.with_fetch(:id=>3)
    @c2.new(:id => 1234).attribute = attrib
    DB.sqls.must_equal ['UPDATE attributes SET node_id = NULL WHERE (node_id = 1234)',
      'INSERT INTO attributes (id, node_id) VALUES (3, 1234)',
      "SELECT * FROM attributes WHERE id = 3"]

    @c2.new(:id => 1234).attribute.must_equal attrib
    attrib = @c1.load(:id=>3)
    @c2.new(:id => 1234).attribute = attrib
    DB.sqls.must_equal ["SELECT * FROM attributes WHERE (attributes.node_id = 1234) LIMIT 1",
      'UPDATE attributes SET node_id = NULL WHERE ((node_id = 1234) AND (id != 3))',
      "UPDATE attributes SET node_id = 1234 WHERE (id = 3)"]
  end

  it "should use a transaction in the setter method" do
    @c2.one_to_one :attribute, :class => @c1
    @c2.use_transactions = true
    attrib = @c1.load(:id=>3)
    @c2.new(:id => 1234).attribute = attrib
    DB.sqls.must_equal ['BEGIN',
      'UPDATE attributes SET node_id = NULL WHERE ((node_id = 1234) AND (id != 3))',
      "UPDATE attributes SET node_id = 1234 WHERE (id = 3)",
      'COMMIT']
  end
    
  it "should have setter method respect association filters" do
    @c2.one_to_one :attribute, :class => @c1, :conditions=>{:a=>1} do |ds|
      ds.filter(:b=>2)
    end
    attrib = @c1.load(:id=>3)
    @c2.new(:id => 1234).attribute = attrib
    DB.sqls.must_equal ['UPDATE attributes SET node_id = NULL WHERE ((a = 1) AND (node_id = 1234) AND (b = 2) AND (id != 3))',
      "UPDATE attributes SET node_id = 1234 WHERE (id = 3)"]
  end

  it "should have the setter method respect the :primary_key option" do
    @c2.one_to_one :attribute, :class => @c1, :primary_key=>:xxx
    attrib = @c1.new(:id=>3)
    @c1.dataset = @c1.dataset.with_fetch(:id=>3)
    @c2.new(:id => 1234, :xxx=>5).attribute = attrib
    DB.sqls.must_equal ['UPDATE attributes SET node_id = NULL WHERE (node_id = 5)',
      'INSERT INTO attributes (id, node_id) VALUES (3, 5)',
      "SELECT * FROM attributes WHERE id = 3"]

    @c2.new(:id => 321, :xxx=>5).attribute.must_equal attrib
    attrib = @c1.load(:id=>3)
    @c2.new(:id => 621, :xxx=>5).attribute = attrib
    DB.sqls.must_equal ["SELECT * FROM attributes WHERE (attributes.node_id = 5) LIMIT 1",
      'UPDATE attributes SET node_id = NULL WHERE ((node_id = 5) AND (id != 3))',
      'UPDATE attributes SET node_id = 5 WHERE (id = 3)']
    end
    
  it "should have the setter method respect composite keys" do
    @c2.one_to_one :attribute, :class => @c1, :key=>[:node_id, :y], :primary_key=>[:id, :x]
    attrib = @c1.load(:id=>3, :y=>6)
    @c1.dataset = @c1.dataset.with_fetch(:id=>3, :y=>6)
    @c2.load(:id => 1234, :x=>5).attribute = attrib
    DB.sqls.must_equal ["UPDATE attributes SET node_id = NULL, y = NULL WHERE ((node_id = 1234) AND (y = 5) AND (id != 3))",
      "UPDATE attributes SET y = 5, node_id = 1234 WHERE (id = 3)"]
  end

  it "should have setter method handle associations to models with joined datasets" do
    db = Sequel.mock
    c = Class.new(Sequel::Model(db)) do
      set_dataset(db[:attributes].join(:foo, :attribute_id=>:id))
      def _insert_dataset
        db[:attributes]
      end
      def _update_dataset
        db[:attributes].where(pk_hash)
      end
      @instance_dataset = dataset.limit(1).naked.skip_limit_check
      unrestrict_primary_key
      columns :id, :node_id, :y
    end

    @c2.one_to_one :attribute, :class => c
    attrib = c.new(:id=>3)

    db.fetch = [[], {:id=>3}]
    @c2.load(:id => 1234).attribute = attrib
    DB.sqls.must_equal []
    db.sqls.must_equal [
      "SELECT * FROM (SELECT * FROM attributes INNER JOIN foo ON (foo.attribute_id = attributes.id)) AS attributes LIMIT 1",
      "SELECT * FROM (SELECT * FROM attributes INNER JOIN foo ON (foo.attribute_id = attributes.id)) AS attributes WHERE (node_id = 1234) LIMIT 1",
      "INSERT INTO attributes (id, node_id) VALUES (3, 1234)",
      "SELECT * FROM (SELECT * FROM attributes INNER JOIN foo ON (foo.attribute_id = attributes.id)) AS attributes WHERE (id = 3) LIMIT 1"]

    db.fetch = [[{:id=>4}], {:id=>3, :node_id=>1234}]
    db.numrows = 1
    @c2.load(:id => 1234).attribute = c.load(:id=>3)
    db.sqls.must_equal [
      "SELECT * FROM (SELECT * FROM attributes INNER JOIN foo ON (foo.attribute_id = attributes.id)) AS attributes WHERE (node_id = 1234) LIMIT 1",
      "UPDATE attributes SET node_id = NULL WHERE (id = 4)",
      "UPDATE attributes SET node_id = 1234 WHERE (id = 3)"]

    db.fetch = [[{:id=>4}], {:id=>3, :node_id=>1234}]
    @c2.load(:id => 1234).attribute = c.new(:id=>3)
    db.sqls.must_equal [
      "SELECT * FROM (SELECT * FROM attributes INNER JOIN foo ON (foo.attribute_id = attributes.id)) AS attributes WHERE (node_id = 1234) LIMIT 1",
      "UPDATE attributes SET node_id = NULL WHERE (id = 4)",
      "INSERT INTO attributes (id, node_id) VALUES (3, 1234)",
      "SELECT * FROM (SELECT * FROM attributes INNER JOIN foo ON (foo.attribute_id = attributes.id)) AS attributes WHERE (id = 3) LIMIT 1"]
  end

  it "should use implicit key if omitted" do
    @c2.dataset = @c2.dataset.with_fetch({})
    @c2.one_to_one :parent, :class => @c2

    d = @c2.new(:id => 234)
    p = d.parent
    p.class.must_equal @c2
    p.values.must_equal({})

    DB.sqls.must_equal ["SELECT * FROM nodes WHERE (nodes.node_id = 234) LIMIT 1"]
  end
  
  it "should use implicit class if omitted" do
    begin
      class ::ParParent < Sequel::Model; end
      @c2.one_to_one :par_parent
      @c2.new(:id => 234).par_parent.class.must_equal ParParent
      DB.sqls.must_equal ["SELECT * FROM par_parents WHERE (par_parents.node_id = 234) LIMIT 1"]
    ensure
      Object.send(:remove_const, :ParParent)
    end
  end

  it "should use class inside module if given as a string" do
    begin
      module ::Par 
        class Parent < Sequel::Model; end
      end
      @c2.one_to_one :par_parent, :class=>"Par::Parent"
      @c2.new(:id => 234).par_parent.class.must_equal Par::Parent
      DB.sqls.must_equal ["SELECT * FROM parents WHERE (parents.node_id = 234) LIMIT 1"]
    ensure
      Object.send(:remove_const, :Par)
    end
  end

  it "should use explicit key if given" do
    @c2.dataset = @c2.dataset.with_fetch({})
    @c2.one_to_one :parent, :class => @c2, :key => :blah

    d = @c2.new(:id => 234)
    p = d.parent
    p.class.must_equal @c2
    p.values.must_equal({})

    DB.sqls.must_equal ["SELECT * FROM nodes WHERE (nodes.blah = 234) LIMIT 1"]
  end

  it "should use :primary_key option if given" do
    @c2.one_to_one :parent, :class => @c2, :key => :pk, :primary_key => :blah
    @c2.new(:id => 1, :blah => 567).parent
    DB.sqls.must_equal ["SELECT * FROM nodes WHERE (nodes.pk = 567) LIMIT 1"]
  end
  
  it "should support composite keys" do
    @c2.one_to_one :parent, :class => @c2, :primary_key=>[:id, :parent_id], :key=>[:parent_id, :id]
    @c2.new(:id => 1, :parent_id => 234).parent
    DB.sqls.must_equal ["SELECT * FROM nodes WHERE ((nodes.parent_id = 1) AND (nodes.id = 234)) LIMIT 1"]
  end
  
  it "should not issue query if not all keys have values" do
    @c2.one_to_one :parent, :class => @c2, :key=>[:id, :parent_id], :primary_key=>[:parent_id, :id]
    @c2.new(:id => 1, :parent_id => nil).parent.must_be_nil
    DB.sqls.must_equal []
  end
  
  it "should raise an Error unless same number of composite keys used" do
    proc{@c2.one_to_one :parent, :class => @c2, :primary_key=>[:parent_id, :id]}.must_raise(Sequel::Error)
    proc{@c2.one_to_one :parent, :class => @c2, :key=>[:id, :parent_id], :primary_key=>:id}.must_raise(Sequel::Error)
    proc{@c2.one_to_one :parent, :class => @c2, :key=>:id, :primary_key=>[:parent_id, :id]}.must_raise(Sequel::Error)
    proc{@c2.one_to_one :parent, :class => @c2, :key=>[:id, :parent_id, :blah], :primary_key=>[:parent_id, :id]}.must_raise(Sequel::Error)
  end

  it "should use :select option if given" do
    @c2.one_to_one :parent, :class => @c2, :select=>[:id, :name]
    @c2.new(:id => 567).parent
    DB.sqls.must_equal ["SELECT id, name FROM nodes WHERE (nodes.node_id = 567) LIMIT 1"]
  end

  it "should use :conditions option if given" do
    @c2.one_to_one :parent, :class => @c2, :conditions=>{:a=>32}
    @c2.new(:id => 567).parent
    DB.sqls.must_equal ["SELECT * FROM nodes WHERE ((a = 32) AND (nodes.node_id = 567)) LIMIT 1"]

    @c2.one_to_one :parent, :class => @c2, :conditions=>:a
    @c2.new(:id => 567).parent
    DB.sqls.must_equal ["SELECT * FROM nodes WHERE (a AND (nodes.node_id = 567)) LIMIT 1"]
  end

  it "should support :order, :limit (only for offset), and :dataset options, as well as a block" do
    @c2.one_to_one :child_20, :class => @c2, :key=>:id, :dataset=>proc{model.filter(:parent_id=>pk)}, :limit=>[10,20], :order=>:name do |ds|
      ds.filter{x > 1}
    end
    @c2.load(:id => 100).child_20
    DB.sqls.must_equal ["SELECT * FROM nodes WHERE ((parent_id = 100) AND (x > 1)) ORDER BY name LIMIT 1 OFFSET 20"]
  end

  it "should support :dataset options with different types of arity" do
    @c2.one_to_one :child_20, :class => @c2, :key=>:id, :dataset=>proc{model.filter(:parent_id=>pk)}
    @c2.load(:id => 100).child_20
    DB.sqls.must_equal ["SELECT * FROM nodes WHERE (parent_id = 100) LIMIT 1"]

    @c2.one_to_one :child_20, :class => @c2, :key=>:id, :dataset=>proc{|_| model.filter(:parent_id=>pk)}
    @c2.load(:id => 100).child_20
    DB.sqls.must_equal ["SELECT * FROM nodes WHERE (parent_id = 100) LIMIT 1"]

    @c2.one_to_one :child_20, :class => @c2, :key=>:id, :dataset=>proc{|_, *| model.filter(:parent_id=>pk)}
    @c2.load(:id => 100).child_20
    DB.sqls.must_equal ["SELECT * FROM nodes WHERE (parent_id = 100) LIMIT 1"]

    @c2.one_to_one :child_20, :class => @c2, :key=>:id, :dataset=>proc{|*| model.filter(:parent_id=>pk)}
    @c2.load(:id => 100).child_20
    DB.sqls.must_equal ["SELECT * FROM nodes WHERE (parent_id = 100) LIMIT 1"]
  end

  deprecated "should support :dataset option that requires multiple arguments" do
    @c2.one_to_one :child_20, :class => @c2, :key=>:id, :dataset=>proc{|_, _| model.filter(:parent_id=>pk)}
    @c2.load(:id => 100).child_20
    DB.sqls.must_equal ["SELECT * FROM nodes WHERE (parent_id = 100) LIMIT 1"]
  end

  deprecated "should support association block requires no arguments" do
    @c2.one_to_one :child_20, :class => @c2, :key=>:id do model.filter(:parent_id=>pk) end
    @c2.load(:id => 100).child_20
    DB.sqls.must_equal ["SELECT * FROM nodes WHERE (parent_id = 100)"]
  end

  deprecated "should support association block requires multiple arguments" do
    @c2.one_to_one :child_20, :class => @c2, :key=>:id do |_, _| model.filter(:parent_id=>pk) end
    @c2.load(:id => 100).child_20
    DB.sqls.must_equal ["SELECT * FROM nodes WHERE (parent_id = 100)"]
  end

  it "should return nil if primary_key value is nil" do
    @c2.one_to_one :parent, :class => @c2, :primary_key=>:node_id

    @c2.new(:id => 1).parent.must_be_nil
    DB.sqls.must_equal []
  end

  it "should cache negative lookup" do
    @c2.one_to_one :parent, :class => @c2
    @c2.dataset = @c2.dataset.with_fetch([])
    d = @c2.new(:id => 555)
    DB.sqls.must_equal []
    d.parent.must_be_nil
    DB.sqls.must_equal ['SELECT * FROM nodes WHERE (nodes.node_id = 555) LIMIT 1']
    d.parent.must_be_nil
    DB.sqls.must_equal []
  end

  it "should have the setter method respect the :key option" do
    @c2.one_to_one :parent, :class => @c2, :key=>:blah
    d = @c2.new(:id => 3)
    e = @c2.new(:id => 4321, :blah=>444)
    @c2.dataset = @c2.dataset.with_fetch(:id => 4321, :blah => 3)
    d.parent = e
    e.values.must_equal(:id => 4321, :blah => 3)
    DB.sqls.must_equal ["UPDATE nodes SET blah = NULL WHERE (blah = 3)",
      "INSERT INTO nodes (id, blah) VALUES (4321, 3)",
      "SELECT * FROM nodes WHERE id = 4321"]
  end
  
  it "should persist changes to associated object when the setter is called" do
    @c2.one_to_one :parent, :class => @c2
    d = @c2.load(:id => 1)
    d.parent = @c2.load(:id => 3, :node_id=>345)
    DB.sqls.must_equal ["UPDATE nodes SET node_id = NULL WHERE ((node_id = 1) AND (id != 3))",
      "UPDATE nodes SET node_id = 1 WHERE (id = 3)"] 
  end

  it "should populate cache when accessed" do
    @c2.one_to_one :parent, :class => @c2

    d = @c2.load(:id => 1)
    d.associations[:parent].must_be_nil
    @c2.dataset = @c2.dataset.with_fetch(:id=>234)
    e = d.parent 
    DB.sqls.must_equal ["SELECT * FROM nodes WHERE (nodes.node_id = 1) LIMIT 1"]
    d.parent
    DB.sqls.must_equal []
    d.associations[:parent].must_equal e
  end

  it "should populate cache when assigned" do
    @c2.one_to_one :parent, :class => @c2

    d = @c2.load(:id => 1)
    d.associations[:parent].must_be_nil
    e = @c2.load(:id => 234)
    d.parent = e
    f = d.parent 
    d.associations[:parent].must_equal e
    e.must_equal f
  end

  it "should use cache if available" do
    @c2.one_to_one :parent, :class => @c2
    d = @c2.load(:id => 1, :parent_id => 234)
    d.associations[:parent] = 42
    d.parent.must_equal 42
    DB.sqls.must_equal []
  end

  it "should not use cache if asked to reload" do
    @c2.one_to_one :parent, :class => @c2
    d = @c2.load(:id => 1)
    d.associations[:parent] = [42]
    d.parent(:reload=>true).wont_equal 42 
    DB.sqls.must_equal ["SELECT * FROM nodes WHERE (nodes.node_id = 1) LIMIT 1"]
  end
  
  it "should have the setter set the reciprocal many_to_one cached association" do
    @c2.one_to_one :parent, :class => @c2, :key=>:parent_id
    @c2.many_to_one :child, :class => @c2, :key=>:parent_id
    
    d = @c2.load(:id => 1)
    e = @c2.load(:id => 2)
    d.parent = e
    e.child.must_equal d
    DB.sqls.must_equal ["UPDATE nodes SET parent_id = NULL WHERE ((parent_id = 1) AND (id != 2))",
      "UPDATE nodes SET parent_id = 1 WHERE (id = 2)"]
    d.parent = nil
    e.child.must_be_nil
    DB.sqls.must_equal ["UPDATE nodes SET parent_id = NULL WHERE (parent_id = 1)"]
  end

  it "should have the setter remove the object from the previous associated object's reciprocal many_to_one cached association array if it exists" do
    @c2.one_to_one :parent, :class => @c2, :key=>:parent_id
    @c2.many_to_one :child, :class => @c2, :key=>:parent_id
    @c2.dataset = @c2.dataset.with_fetch([])

    d = @c2.load(:id => 1)
    e = @c2.load(:id => 2)
    f = @c2.load(:id => 3)
    e.child.must_be_nil
    f.child.must_be_nil
    d.parent = e
    e.child.must_equal d
    d.parent = f
    f.child.must_equal d
    e.child.must_be_nil
    d.parent = nil
    f.child.must_be_nil
  end

  it "should have the setter not modify the reciprocal if set to same value as current" do
    @c2.one_to_one :parent, :class => @c2, :key=>:parent_id
    @c2.many_to_one :child, :class => @c2, :key=>:parent_id

    c1 = @c2.load(:id => 1, :parent_id=>nil)
    c2 = @c2.load(:id => 2, :parent_id=>1)
    c1.associations[:child] = c2
    c2.associations[:parent] = c1
    c2.parent = c1
    c1.child.must_equal c2
    DB.sqls.must_equal []
  end

  it "should have setter not unset reciprocal during save if reciprocal is the same as current" do
    @c2.many_to_one :parent, :class => @c2, :key=>:parent_id
    @c2.one_to_one :child, :class => @c2, :key=>:parent_id, :reciprocal=>:parent

    d = @c2.new(:id => 1)
    e = @c2.new(:id => 2)
    e2 = @c2.new(:id => 3)
    e3 = @c2.new(:id => 4)
    d.associations[:parent] = e
    e.associations[:child] = d
    e2.associations[:child] = d
    e3.associations[:child] = e
    assoc = nil
    d.define_singleton_method(:after_save) do
      super()
      assoc = associations
    end

    def e.set_associated_object_if_same?; true; end
    e.child = d
    assoc.must_equal(:parent=>e)

    def e2.set_associated_object_if_same?; true; end
    e2.child = e
    assoc.must_equal(:parent=>nil)

    d.associations.clear
    e3.child = d
    assoc.must_equal({})
  end

  it "should not add associations methods directly to class" do
    @c2.one_to_one :parent, :class => @c2
    @c2.instance_methods.must_include(:parent)
    @c2.instance_methods.must_include(:parent=)
    @c2.instance_methods(false).wont_include(:parent)
    @c2.instance_methods(false).wont_include(:parent=)
  end

  it "should raise an error if the current model object that doesn't have a valid primary key" do
    @c2.one_to_one :parent, :class => @c2
    p = @c2.new
    c = @c2.load(:id=>123)
    proc{p.parent = c}.must_raise(Sequel::Error)
  end

  it "should make the change to the foreign_key value inside a _association= method" do
    @c2.one_to_one :parent, :class => @c2
    @c2.private_instance_methods.must_include(:_parent=)
    c = @c2.new
    p = @c2.load(:id=>123)
    def p._parent=(x)
      @x = x
    end
    def p.parent_id=; raise; end
    p.parent = c
    p.instance_variable_get(:@x).must_equal c
  end

  it "should have a :setter option define the _association= method" do
    @c2.one_to_one :parent, :class => @c2, :setter=>proc{|x| @x = x}
    c = @c2.new
    p = @c2.load(:id=>123)
    def p.parent_id=; raise; end
    p.parent = c
    p.instance_variable_get(:@x).must_equal c
  end

  it "should support (before|after)_set callbacks" do
    h = []
    @c2.one_to_one :parent, :class => @c2, :before_set=>[proc{|x,y| h << x.pk; h << (y ? -y.pk : :y)}, :blah], :after_set=>proc{h << 3}
    @c2.class_eval do
      self::Foo = h
      def blah(x)
        model::Foo << (x ? x.pk : :x)
      end
      def blahr(x)
        model::Foo << 6
      end
    end
    p = @c2.load(:id=>10)
    c = @c2.load(:id=>123)
    h.must_equal []
    p.parent = c
    h.must_equal [10, -123, 123, 3]
    p.parent = nil
    h.must_equal [10, -123, 123, 3, 10, :y, :x, 3]
  end

  it "should support after_load association callback" do
    h = []
    @c2.one_to_one :parent, :class => @c2, :after_load=>[proc{|x,y| h << [x.pk, y.pk]}, :al]
    @c2.class_eval do
      self::Foo = h
      def al(v)
        model::Foo << v.pk
      end
      @dataset = @dataset.with_fetch(:id=>20)
    end
    p = @c2.load(:id=>10)
    parent = p.parent
    h.must_equal [[10, 20], 20]
    parent.pk.must_equal 20
  end

  it "should raise error and not call internal add or remove method if before callback calls cancel_action, even if raise_on_save_failure is false" do
    p = @c2.load(:id=>321)
    c = @c2.load(:id=>123)
    p.raise_on_save_failure = false
    @c2.one_to_one :parent, :class => @c2, :before_set=>:bs
    def p.bs(x) cancel_action end
    def p._parent=; raise; end
    proc{p.parent = c}.must_raise(Sequel::HookFailed)
    
    p.associations[:parent].must_be_nil
    p.associations[:parent] = c
    p.parent.must_equal c
    proc{p.parent = nil}.must_raise(Sequel::HookFailed)
  end

  it "should not validate the associated object in setter if the :validate=>false option is used" do
    @c2.one_to_one :parent, :class => @c2, :validate=>false
    n = @c2.new(:id => 1234)
    a = @c2.new(:id => 2345)
    def a.validate() errors.add(:id, 'foo') end
    (n.parent = a).must_equal a
  end

  it "should raise an error if a callback is not a proc or symbol" do
    @c2.one_to_one :parent, :class => @c2, :before_set=>Object.new
    proc{@c2.new.parent = @c2.load(:id=>1)}.must_raise(Sequel::Error)
  end

  it "should work_correctly when used with associate" do
    @c2.dataset = @c2.dataset.with_fetch({})
    @c2.associate :one_to_one, :parent, :class => @c2
    @c2.load(:id => 567).parent.must_equal @c2.load({})
    DB.sqls.must_equal ["SELECT * FROM nodes WHERE (nodes.node_id = 567) LIMIT 1"]
  end

  it "should have association dataset use false condition if any key is nil" do
    @c2.one_to_one :parent, :class => @c2, :primary_key=>:parent_id
    @c2.load(:id=>1).parent_dataset.sql.must_equal "SELECT * FROM nodes WHERE 'f' LIMIT 1"
  end
end

describe Sequel::Model, "one_to_many" do
  before do
    @c1 = Class.new(Sequel::Model(:attributes)) do
      unrestrict_primary_key
      columns :id, :node_id, :y, :z
    end

    @c2 = Class.new(Sequel::Model(:nodes)) do
      def _refresh(ds); end
      unrestrict_primary_key
      attr_accessor :xxx
      
      def self.name; 'Node'; end
      def self.to_s; 'Node'; end
      columns :id, :x
    end
    @dataset = @c2.dataset = @c2.dataset.with_fetch({})
    @c1.dataset = @c1.dataset.with_fetch(proc{|sql| sql =~ /SELECT 1/ ? {:a=>1} : {}})
    DB.reset
  end

  it "should raise an error if current class does not have a primary key, and :primary_key is not specified" do
    @c2.no_primary_key
    proc{@c2.one_to_many :attributes, :class => @c1}.must_raise(Sequel::Error)
    DB.sqls.must_equal []
  end
  
  it "should use implicit key if omitted" do
    @c2.one_to_many :attributes, :class => @c1 
    @c2.new(:id => 1234).attributes_dataset.sql.must_equal 'SELECT * FROM attributes WHERE (attributes.node_id = 1234)'
  end
  
  it "should use implicit class if omitted" do
    begin
      class ::HistoricalValue < Sequel::Model; end
      @c2.one_to_many :historical_values
      
      v = @c2.new(:id => 1234).historical_values_dataset
      v.must_be_kind_of(Sequel::Dataset)
      v.sql.must_equal 'SELECT * FROM historical_values WHERE (historical_values.node_id = 1234)'
      v.model.must_equal HistoricalValue
    ensure
      Object.send(:remove_const, :HistoricalValue)
    end
  end
  
  it "should use class inside a module if given as a string" do
    begin
      module ::Historical
        class Value < Sequel::Model; end
      end
      @c2.one_to_many :historical_values, :class=>'Historical::Value'
      
      v = @c2.new(:id => 1234).historical_values_dataset
      v.must_be_kind_of(Sequel::Dataset)
      v.sql.must_equal 'SELECT * FROM values WHERE (values.node_id = 1234)'
      v.model.must_equal Historical::Value
    ensure
      Object.send(:remove_const, :Historical)
    end
  end

  it "should use a callback if given one as a block" do
    @c2.one_to_many :attributes, :class => @c1, :key => :nodeid
    
    d = @c2.load(:id => 1234)
    d.associations[:attributes] = []
    d.attributes{|ds| ds.where{name > 'M'}}.wont_equal []
    DB.sqls.must_equal ["SELECT * FROM attributes WHERE ((attributes.nodeid = 1234) AND (name > 'M'))"]
  end
  
  it "should use explicit key if given" do
    @c2.one_to_many :attributes, :class => @c1, :key => :nodeid
    @c2.new(:id => 1234).attributes_dataset.sql.must_equal 'SELECT * FROM attributes WHERE (attributes.nodeid = 1234)'
  end
  
  it "should support_composite keys" do
    @c2.one_to_many :attributes, :class => @c1, :key =>[:node_id, :id], :primary_key=>[:id, :x]
    @c2.load(:id => 1234, :x=>234).attributes_dataset.sql.must_equal 'SELECT * FROM attributes WHERE ((attributes.node_id = 1234) AND (attributes.id = 234))'
  end
  
  it "should not issue query if not all keys have values" do
    @c2.one_to_many :attributes, :class => @c1, :key =>[:node_id, :id], :primary_key=>[:id, :x]
    @c2.load(:id => 1234, :x=>nil).attributes.must_equal []
    DB.sqls.must_equal []
  end
  
  it "should raise an Error unless same number of composite keys used" do
    proc{@c2.one_to_many :attributes, :class => @c1, :key=>[:node_id, :id]}.must_raise(Sequel::Error)
    proc{@c2.one_to_many :attributes, :class => @c1, :primary_key=>[:node_id, :id]}.must_raise(Sequel::Error)
    proc{@c2.one_to_many :attributes, :class => @c1, :key=>[:node_id, :id], :primary_key=>:id}.must_raise(Sequel::Error)
    proc{@c2.one_to_many :attributes, :class => @c1, :key=>:id, :primary_key=>[:node_id, :id]}.must_raise(Sequel::Error)
    proc{@c2.one_to_many :attributes, :class => @c1, :key=>[:node_id, :id, :x], :primary_key=>[:parent_id, :id]}.must_raise(Sequel::Error)
  end

  it "should define an add_ method that works on existing records" do
    @c2.one_to_many :attributes, :class => @c1
    
    n = @c2.load(:id => 1234)
    a = @c1.load(:id => 2345)
    a.must_equal n.add_attribute(a)
    a.values.must_equal(:node_id => 1234, :id => 2345)
    DB.sqls.must_equal ['UPDATE attributes SET node_id = 1234 WHERE (id = 2345)']
  end

  it "should define an add_ method that works on new records" do
    @c2.one_to_many :attributes, :class => @c1
    
    n = @c2.load(:id => 1234)
    a = @c1.new(:id => 234)
    @c1.dataset = @c1.dataset.with_fetch(:id=>234, :node_id=>1234)
    a.must_equal n.add_attribute(a)
    DB.sqls.must_equal ["INSERT INTO attributes (id, node_id) VALUES (234, 1234)",
      "SELECT * FROM attributes WHERE id = 234"]
    a.values.must_equal(:node_id => 1234, :id => 234)
  end

  it "should define a remove_ method that works on existing records" do
    @c2.one_to_many :attributes, :class => @c1
    
    n = @c2.load(:id => 1234)
    a = @c1.load(:id => 2345, :node_id => 1234)
    a.must_equal n.remove_attribute(a)
    a.values.must_equal(:node_id => nil, :id => 2345)
    DB.sqls.must_equal ["SELECT 1 AS one FROM attributes WHERE ((attributes.node_id = 1234) AND (id = 2345)) LIMIT 1", 'UPDATE attributes SET node_id = NULL WHERE (id = 2345)']
  end

  it "should have the remove_ method raise an error if the passed object is not already associated" do
    @c2.one_to_many :attributes, :class => @c1
    
    n = @c2.new(:id => 1234)
    a = @c1.load(:id => 2345, :node_id => 1234)
    @c1.dataset = @c1.dataset.with_fetch([])
    proc{n.remove_attribute(a)}.must_raise(Sequel::Error)
    DB.sqls.must_equal ["SELECT 1 AS one FROM attributes WHERE ((attributes.node_id = 1234) AND (id = 2345)) LIMIT 1"]
  end

  it "should accept a hash for the add_ method and create a new record" do
    @c2.one_to_many :attributes, :class => @c1
    n = @c2.new(:id => 1234)
    DB.reset
    @c1.dataset = @c1.dataset.with_fetch(:node_id => 1234, :id => 234)
    n.add_attribute(:id => 234).must_equal @c1.load(:node_id => 1234, :id => 234)
    DB.sqls.must_equal ["INSERT INTO attributes (id, node_id) VALUES (234, 1234)",
      "SELECT * FROM attributes WHERE id = 234"]
  end

  it "should accept a primary key for the add_ method" do
    @c2.one_to_many :attributes, :class => @c1
    n = @c2.new(:id => 1234)
    @c1.dataset = @c1.dataset.with_fetch(:node_id => nil, :id => 234)
    n.add_attribute(234).must_equal @c1.load(:node_id => 1234, :id => 234)
    DB.sqls.must_equal ["SELECT * FROM attributes WHERE id = 234", "UPDATE attributes SET node_id = 1234 WHERE (id = 234)"]
  end

  it "should raise an error if the primary key passed to the add_ method does not match an existing record" do
    @c2.one_to_many :attributes, :class => @c1
    n = @c2.new(:id => 1234)
    @c1.dataset = @c1.dataset.with_fetch([])
    proc{n.add_attribute(234)}.must_raise(Sequel::NoMatchingRow)
    DB.sqls.must_equal ["SELECT * FROM attributes WHERE id = 234"]
  end

  it "should raise an error in the add_ method if the passed associated object is not of the correct type" do
    @c2.one_to_many :attributes, :class => @c1
    proc{@c2.new(:id => 1234).add_attribute(@c2.new)}.must_raise(Sequel::Error)
  end

  it "should accept a primary key for the remove_ method and remove an existing record" do
    @c2.one_to_many :attributes, :class => @c1
    n = @c2.new(:id => 1234)
    @c1.dataset = @c1.dataset.with_fetch(:id=>234, :node_id=>1234)
    n.remove_attribute(234).must_equal @c1.load(:node_id => nil, :id => 234)
    DB.sqls.must_equal ['SELECT * FROM attributes WHERE ((attributes.node_id = 1234) AND (attributes.id = 234)) LIMIT 1',
      'UPDATE attributes SET node_id = NULL WHERE (id = 234)']
  end
  
  it "should raise an error in the remove_ method if the passed associated object is not of the correct type" do
    @c2.one_to_many :attributes, :class => @c1
    proc{@c2.new(:id => 1234).remove_attribute(@c2.new)}.must_raise(Sequel::Error)
  end

  it "should have add_ method respect the :primary_key option" do
    @c2.one_to_many :attributes, :class => @c1, :primary_key=>:xxx
    
    n = @c2.new(:id => 1234, :xxx=>5)
    a = @c1.load(:id => 2345)
    n.add_attribute(a).must_equal a
    DB.sqls.must_equal ['UPDATE attributes SET node_id = 5 WHERE (id = 2345)']
  end
  
  it "should have add_ method not add the same object to the cached association array if the object is already in the array" do
    @c2.one_to_many :attributes, :class => @c1
    
    n = @c2.new(:id => 1234)
    a = @c1.load(:id => 2345)
    n.associations[:attributes] = []
    a.must_equal n.add_attribute(a)
    a.must_equal n.add_attribute(a)
    a.values.must_equal(:node_id => 1234, :id => 2345)
    n.attributes.must_equal [a]
    DB.sqls.must_equal ['UPDATE attributes SET node_id = 1234 WHERE (id = 2345)'] * 2
  end

  it "should have add_ method respect composite keys" do
    @c2.one_to_many :attributes, :class => @c1, :key =>[:node_id, :y], :primary_key=>[:id, :x]
    
    n = @c2.load(:id => 1234, :x=>5)
    a = @c1.load(:id => 2345)
    n.add_attribute(a).must_equal a
    DB.sqls.must_equal ["UPDATE attributes SET node_id = 1234, y = 5 WHERE (id = 2345)"]
  end

  it "should have add_ method accept a composite key" do
    @c1.dataset = @c1.dataset.with_fetch(:id=>2345, :node_id=>1234, :z=>8, :y=>5)
    @c1.set_primary_key [:id, :z]
    @c2.one_to_many :attributes, :class => @c1, :key =>[:node_id, :y], :primary_key=>[:id, :x]
    
    n = @c2.load(:id => 1234, :x=>5)
    a = @c1.load(:id => 2345, :z => 8, :node_id => 1234, :y=>5)
    n.add_attribute([2345, 8]).must_equal a
    DB.sqls.must_equal ["SELECT * FROM attributes WHERE ((id = 2345) AND (z = 8)) LIMIT 1",
      "UPDATE attributes SET node_id = 1234, y = 5 WHERE ((id = 2345) AND (z = 8))"]
  end
  
  it "should have remove_ method respect composite keys" do
    @c2.one_to_many :attributes, :class => @c1, :key =>[:node_id, :y], :primary_key=>[:id, :x]
    
    n = @c2.load(:id => 1234, :x=>5)
    a = @c1.load(:id => 2345, :node_id=>1234, :y=>5)
    n.remove_attribute(a).must_equal a
    DB.sqls.must_equal ["SELECT 1 AS one FROM attributes WHERE ((attributes.node_id = 1234) AND (attributes.y = 5) AND (id = 2345)) LIMIT 1",
      "UPDATE attributes SET node_id = NULL, y = NULL WHERE (id = 2345)"]
  end
  
  it "should accept a array of composite primary key values for the remove_ method and remove an existing record" do
    @c1.dataset = @c1.dataset.with_fetch(:id=>234, :node_id=>123, :y=>5)
    @c1.set_primary_key [:id, :y]
    @c2.one_to_many :attributes, :class => @c1, :key=>:node_id, :primary_key=>:id
    n = @c2.new(:id => 123)
    n.remove_attribute([234, 5]).must_equal @c1.load(:node_id => nil, :y => 5, :id => 234)
    DB.sqls.must_equal ["SELECT * FROM attributes WHERE ((attributes.node_id = 123) AND (attributes.id = 234) AND (attributes.y = 5)) LIMIT 1",
      "UPDATE attributes SET node_id = NULL WHERE ((id = 234) AND (y = 5))"]
  end
  
  it "should raise an error in add_ and remove_ if the passed object returns false to save (is not valid)" do
    @c2.one_to_many :attributes, :class => @c1
    n = @c2.new(:id => 1234)
    a = @c1.new(:id => 2345)
    def a.validate() errors.add(:id, 'foo') end
    proc{n.add_attribute(a)}.must_raise(Sequel::ValidationFailed)
    proc{n.remove_attribute(a)}.must_raise(Sequel::ValidationFailed)
  end

  it "should not validate the associated object in add_ and remove_ if the :validate=>false option is used" do
    @c2.one_to_many :attributes, :class => @c1, :validate=>false
    n = @c2.new(:id => 1234)
    a = @c1.new(:id => 2345)
    def a.validate() errors.add(:id, 'foo') end
    n.add_attribute(a).must_equal a
    n.remove_attribute(a).must_equal a
  end

  it "should not raise exception in add_ and remove_ if the :raise_on_save_failure=>false option is used" do
    @c2.one_to_many :attributes, :class => @c1, :raise_on_save_failure=>false
    n = @c2.new(:id => 1234)
    a = @c1.new(:id => 2345)
    def a.validate() errors.add(:id, 'foo') end
    n.associations[:attributes] = []
    n.add_attribute(a).must_be_nil
    n.associations[:attributes].must_equal []
    n.remove_attribute(a).must_be_nil
    n.associations[:attributes].must_equal []
  end

  it "should raise an error if the model object doesn't have a valid primary key" do
    @c2.one_to_many :attributes, :class => @c1 
    a = @c2.new
    n = @c1.load(:id=>123)
    proc{a.attributes_dataset}.must_raise(Sequel::Error)
    proc{a.add_attribute(n)}.must_raise(Sequel::Error)
    proc{a.remove_attribute(n)}.must_raise(Sequel::Error)
    proc{a.remove_all_attributes}.must_raise(Sequel::Error)
  end
  
  it "should use :primary_key option if given" do
    @c1.one_to_many :nodes, :class => @c2, :primary_key => :node_id, :key=>:id
    @c1.load(:id => 1234, :node_id=>4321).nodes_dataset.sql.must_equal "SELECT * FROM nodes WHERE (nodes.id = 4321)"
  end

  it "should support a select option" do
    @c2.one_to_many :attributes, :class => @c1, :select => [:id, :name]
    @c2.new(:id => 1234).attributes_dataset.sql.must_equal "SELECT id, name FROM attributes WHERE (attributes.node_id = 1234)"
  end
  
  it "should support a conditions option" do
    @c2.one_to_many :attributes, :class => @c1, :conditions => {:a=>32}
    @c2.new(:id => 1234).attributes_dataset.sql.must_equal "SELECT * FROM attributes WHERE ((a = 32) AND (attributes.node_id = 1234))"
    @c2.one_to_many :attributes, :class => @c1, :conditions => Sequel.~(:a)
    @c2.new(:id => 1234).attributes_dataset.sql.must_equal "SELECT * FROM attributes WHERE (NOT a AND (attributes.node_id = 1234))"
  end
  
  it "should support an order option" do
    @c2.one_to_many :attributes, :class => @c1, :order => :kind
    @c2.new(:id => 1234).attributes_dataset.sql.must_equal "SELECT * FROM attributes WHERE (attributes.node_id = 1234) ORDER BY kind"
  end
  
  it "should support an array for the order option" do
    @c2.one_to_many :attributes, :class => @c1, :order => [:kind1, :kind2]
    @c2.new(:id => 1234).attributes_dataset.sql.must_equal "SELECT * FROM attributes WHERE (attributes.node_id = 1234) ORDER BY kind1, kind2"
  end
  
  it "should have a dataset method for the associated object dataset" do
    @c2.one_to_many :attributes, :class => @c1
    @c2.new(:id => 1234).attributes_dataset.sql.must_equal 'SELECT * FROM attributes WHERE (attributes.node_id = 1234)'
  end
  
  it "should accept a block" do
    @c2.one_to_many :attributes, :class => @c1 do |ds|
      ds.filter(:xxx => nil)
    end
    @c2.new(:id => 1234).attributes_dataset.sql.must_equal 'SELECT * FROM attributes WHERE ((attributes.node_id = 1234) AND (xxx IS NULL))'
  end
  
  it "should support :order option with block" do
    @c2.one_to_many :attributes, :class => @c1, :order => :kind do |ds|
      ds.filter(:xxx => nil)
    end
    @c2.new(:id => 1234).attributes_dataset.sql.must_equal 'SELECT * FROM attributes WHERE ((attributes.node_id = 1234) AND (xxx IS NULL)) ORDER BY kind'
  end
  
  it "should have the block argument affect the _dataset method" do
    @c2.one_to_many :attributes, :class => @c1 do |ds|
      ds.filter(:xxx => 456)
    end
    @c2.new(:id => 1234).attributes_dataset.sql.must_equal 'SELECT * FROM attributes WHERE ((attributes.node_id = 1234) AND (xxx = 456))'
  end
  
  it "should support a :dataset option that is used instead of the default" do
    c1 = @c1
    @c1.dataset = @c1.dataset.with_fetch({})
    @c2.one_to_many :all_other_attributes, :class => @c1, :dataset=>proc{c1.exclude(:nodeid=>pk)}, :order=>:a, :limit=>10 do |ds|
      ds.filter(:xxx => 5)
    end
    @c2.new(:id => 1234).all_other_attributes_dataset.sql.must_equal 'SELECT * FROM attributes WHERE ((nodeid != 1234) AND (xxx = 5)) ORDER BY a LIMIT 10'
    @c2.new(:id => 1234).all_other_attributes.must_equal [@c1.load({})]
    DB.sqls.must_equal ['SELECT * FROM attributes WHERE ((nodeid != 1234) AND (xxx = 5)) ORDER BY a LIMIT 10']
  end
  
  it "should support a :limit option" do
    @c2.one_to_many :attributes, :class => @c1 , :limit=>10
    @c2.new(:id => 1234).attributes_dataset.sql.must_equal 'SELECT * FROM attributes WHERE (attributes.node_id = 1234) LIMIT 10'
    @c2.one_to_many :attributes, :class => @c1 , :limit=>[10,10]
    @c2.new(:id => 1234).attributes_dataset.sql.must_equal 'SELECT * FROM attributes WHERE (attributes.node_id = 1234) LIMIT 10 OFFSET 10'
  end

  it "should have the :eager option affect the _dataset method" do
    @c2.one_to_many :attributes, :class => @c2 , :eager=>:attributes
    @c2.new(:id => 1234).attributes_dataset.opts[:eager].must_equal(:attributes=>nil)
  end
  
  it "should populate cache when accessed" do
    @c2.one_to_many :attributes, :class => @c1
    n = @c2.new(:id => 1234)
    n.associations.include?(:attributes).must_equal false
    atts = n.attributes
    atts.must_equal n.associations[:attributes]
    DB.sqls.must_equal ['SELECT * FROM attributes WHERE (attributes.node_id = 1234)']
  end

  it "should use cache if available" do
    @c2.one_to_many :attributes, :class => @c1
    n = @c2.new(:id => 1234)
    n.associations[:attributes] = 42
    n.attributes.must_equal 42
    DB.sqls.must_equal []
  end

  it "should not use cache if asked to reload" do
    @c2.one_to_many :attributes, :class => @c1
    n = @c2.new(:id => 1234)
    n.associations[:attributes] = 42
    n.attributes(:reload=>true).wont_equal 42
    DB.sqls.must_equal ['SELECT * FROM attributes WHERE (attributes.node_id = 1234)']
  end

  it "should add item to cache if it exists when calling add_" do
    @c2.one_to_many :attributes, :class => @c1
    n = @c2.new(:id => 1234)
    att = @c1.load(:id => 345)
    a = []
    n.associations[:attributes] = a
    n.add_attribute(att)
    a.must_equal [att]
  end

  it "should set object to item's reciprocal cache when calling add_" do
    @c2.one_to_many :attributes, :class => @c1
    @c1.many_to_one :node, :class => @c2

    n = @c2.new(:id => 1234)
    att = @c1.new(:id => 345)
    n.add_attribute(att)
    att.node.must_equal n
  end

  it "should remove item from cache if it exists when calling remove_" do
    @c2.one_to_many :attributes, :class => @c1

    n = @c2.load(:id => 1234)
    att = @c1.load(:id => 345)
    a = [att]
    n.associations[:attributes] = a
    n.remove_attribute(att)
    a.must_equal []
  end

  it "should remove item's reciprocal cache calling remove_" do
    @c2.one_to_many :attributes, :class => @c1
    @c1.many_to_one :node, :class => @c2

    n = @c2.new(:id => 1234)
    att = @c1.new(:id => 345)
    att.associations[:node] = n
    att.node.must_equal n
    n.remove_attribute(att)
    att.node.must_be_nil
  end

  it "should not create the add_, remove_, or remove_all_ methods if :read_only option is used" do
    @c2.one_to_many :attributes, :class => @c1, :read_only=>true
    im = @c2.instance_methods
    im.must_include(:attributes)
    im.must_include(:attributes_dataset)
    im.wont_include(:add_attribute)
    im.wont_include(:remove_attribute)
    im.wont_include(:remove_all_attributes)
  end

  it "should not add associations methods directly to class" do
    @c2.one_to_many :attributes, :class => @c1
    im = @c2.instance_methods
    im.must_include(:attributes)
    im.must_include(:attributes_dataset)
    im.must_include(:add_attribute)
    im.must_include(:remove_attribute)
    im.must_include(:remove_all_attributes)
    im2 = @c2.instance_methods(false)
    im2.wont_include(:attributes)
    im2.wont_include(:attributes_dataset)
    im2.wont_include(:add_attribute)
    im2.wont_include(:remove_attribute)
    im2.wont_include(:remove_all_attributes)
  end

  it "should populate the reciprocal many_to_one cache when loading the one_to_many association" do
    @c2.one_to_many :attributes, :class => @c1, :key => :node_id
    @c1.many_to_one :node, :class => @c2, :key => :node_id
    
    n = @c2.new(:id => 1234)
    atts = n.attributes
    DB.sqls.must_equal ['SELECT * FROM attributes WHERE (attributes.node_id = 1234)']
    atts.must_equal [@c1.load({})]
    atts.map{|a| a.node}.must_equal [n]
    DB.sqls.must_equal []
  end
  
  it "should use an explicit :reciprocal option if given" do
    @c2.one_to_many :attributes, :class => @c1, :key => :node_id, :reciprocal=>:wxyz
    
    n = @c2.new(:id => 1234)
    atts = n.attributes
    DB.sqls.must_equal ['SELECT * FROM attributes WHERE (attributes.node_id = 1234)']
    atts.must_equal [@c1.load({})]
    atts.map{|a| a.associations[:wxyz]}.must_equal [n]
    DB.sqls.must_equal []
  end
  
  it "should have an remove_all_ method that removes all associated objects" do
    @c2.one_to_many :attributes, :class => @c1
    @c2.new(:id => 1234).remove_all_attributes
    DB.sqls.must_equal ['UPDATE attributes SET node_id = NULL WHERE (node_id = 1234)']
  end

  it "should have remove_all method respect association filters" do
    @c2.one_to_many :attributes, :class => @c1, :conditions=>{:a=>1} do |ds|
      ds.filter(:b=>2)
    end
    @c2.new(:id => 1234).remove_all_attributes
    DB.sqls.must_equal ['UPDATE attributes SET node_id = NULL WHERE ((a = 1) AND (node_id = 1234) AND (b = 2))']
  end

  it "should have the remove_all_ method respect the :primary_key option" do
    @c2.one_to_many :attributes, :class => @c1, :primary_key=>:xxx
    @c2.new(:id => 1234, :xxx=>5).remove_all_attributes
    DB.sqls.must_equal ['UPDATE attributes SET node_id = NULL WHERE (node_id = 5)']
  end
  
  it "should have the remove_all_ method respect composite keys" do
    @c2.one_to_many :attributes, :class => @c1, :key=>[:node_id, :y], :primary_key=>[:id, :x]
    @c2.new(:id => 1234, :x=>5).remove_all_attributes
    DB.sqls.must_equal ["UPDATE attributes SET node_id = NULL, y = NULL WHERE ((node_id = 1234) AND (y = 5))"]
  end

  it "remove_all should set the cache to []" do
    @c2.one_to_many :attributes, :class => @c1
    node = @c2.new(:id => 1234)
    node.remove_all_attributes
    node.associations[:attributes].must_equal []
  end

  it "remove_all should return the array of previously associated items if the cache is populated" do
    @c2.one_to_many :attributes, :class => @c1
    attrib = @c1.new(:id=>3)
    node = @c2.new(:id => 1234)
    @c1.dataset = @c1.dataset.with_fetch([[], [{:id=>3, :node_id=>1234}]])
    node.attributes.must_equal []
    node.add_attribute(attrib)
    node.associations[:attributes].must_equal [attrib]
    node.remove_all_attributes.must_equal [attrib]
  end

  it "remove_all should return nil if the cache is not populated" do
    @c2.one_to_many :attributes, :class => @c1
    @c2.new(:id => 1234).remove_all_attributes.must_be_nil
  end

  it "remove_all should remove the current item from all reciprocal association caches if they are populated" do
    @c2.one_to_many :attributes, :class => @c1
    @c1.many_to_one :node, :class => @c2
    @c2.dataset = @c2.dataset.with_fetch([])
    @c1.dataset = @c1.dataset.with_fetch([[], [{:id=>3, :node_id=>1234}]])
    attrib = @c1.new(:id=>3)
    node = @c2.load(:id => 1234)
    node.attributes.must_equal []
    attrib.node.must_be_nil
    node.add_attribute(attrib)
    attrib.associations[:node].must_equal node 
    node.remove_all_attributes
    attrib.associations.fetch(:node, 2).must_be_nil
  end

  it "should call an _add_ method internally to add attributes" do
    @c2.one_to_many :attributes, :class => @c1
    @c2.private_instance_methods.must_include(:_add_attribute)
    p = @c2.load(:id=>10)
    c = @c1.load(:id=>123)
    def p._add_attribute(x)
      @x = x
    end
    def c._node_id=; raise; end
    p.add_attribute(c)
    p.instance_variable_get(:@x).must_equal c
  end

  it "should support an :adder option for defining the _add_ method" do
    @c2.one_to_many :attributes, :class => @c1, :adder=>proc{|x| @x = x}
    p = @c2.load(:id=>10)
    c = @c1.load(:id=>123)
    def c._node_id=; raise; end
    p.add_attribute(c)
    p.instance_variable_get(:@x).must_equal c
  end

  it "should allow additional arguments given to the add_ method and pass them onwards to the _add_ method" do
    @c2.one_to_many :attributes, :class => @c1
    p = @c2.load(:id=>10)
    c = @c1.load(:id=>123)
    def p._add_attribute(x,*y)
      @x = x
      @y = y
    end
    def c._node_id=; raise; end
    p.add_attribute(c,:foo,:bar=>:baz)
    p.instance_variable_get(:@x).must_equal c
    p.instance_variable_get(:@y).must_equal [:foo,{:bar=>:baz}]
  end

  it "should call a _remove_ method internally to remove attributes" do
    @c2.one_to_many :attributes, :class => @c1
    @c2.private_instance_methods.must_include(:_remove_attribute)
    p = @c2.load(:id=>10)
    c = @c1.load(:id=>123)
    def p._remove_attribute(x)
      @x = x
    end
    def c._node_id=; raise; end
    p.remove_attribute(c)
    p.instance_variable_get(:@x).must_equal c
  end

  it "should support a :remover option for defining the _remove_ method" do
    @c2.one_to_many :attributes, :class => @c1, :remover=>proc{|x| @x = x}
    p = @c2.load(:id=>10)
    c = @c1.load(:id=>123)
    def c._node_id=; raise; end
    p.remove_attribute(c)
    p.instance_variable_get(:@x).must_equal c
  end

  it "should allow additional arguments given to the remove_ method and pass them onwards to the _remove_ method" do
    @c2.one_to_many :attributes, :class => @c1, :reciprocal=>nil
    p = @c2.load(:id=>10)
    c = @c1.load(:id=>123)
    def p._remove_attribute(x,*y)
      @x = x
      @y = y
    end
    def c._node_id=; raise; end
    p.remove_attribute(c,:foo,:bar=>:baz)
    p.instance_variable_get(:@x).must_equal c
    p.instance_variable_get(:@y).must_equal [:foo,{:bar=>:baz}]
  end

  it "should allow additional arguments given to the remove_all_ method and pass them onwards to the _remove_all_ method" do
    @c2.one_to_many :attributes, :class => @c1
    p = @c2.load(:id=>10)
    c = @c1.load(:id=>123)
    def p._remove_all_attributes(*y)
      @y = y
    end
    def c._node_id=; raise; end
    p.remove_all_attributes(:foo,:bar=>:baz)
    p.instance_variable_get(:@y).must_equal [:foo,{:bar=>:baz}]
  end

  it "should call a _remove_all_ method internally to remove attributes" do
    @c2.one_to_many :attributes, :class => @c1
    @c2.private_instance_methods.must_include(:_remove_all_attributes)
    p = @c2.load(:id=>10)
    def p._remove_all_attributes
      @x = :foo
    end
    p.remove_all_attributes
    p.instance_variable_get(:@x).must_equal :foo
  end

  it "should support a :clearer option for defining the _remove_all_ method" do
    @c2.one_to_many :attributes, :class => @c1, :clearer=>proc{@x = :foo}
    p = @c2.load(:id=>10)
    p.remove_all_attributes
    p.instance_variable_get(:@x).must_equal :foo
  end

  it "should support (before|after)_(add|remove) callbacks" do
    h = []
    @c2.one_to_many :attributes, :class => @c1, :before_add=>[proc{|x,y| h << x.pk; h << -y.pk}, :blah], :after_add=>proc{h << 3}, :before_remove=>:blah, :after_remove=>[:blahr]
    @c2.class_eval do
      self::Foo = h
      def _add_attribute(v)
        model::Foo << 4
      end
      def _remove_attribute(v)
        model::Foo << 5
      end
      def blah(x)
        model::Foo << x.pk
      end
      def blahr(x)
        model::Foo << 6
      end
    end
    p = @c2.load(:id=>10)
    c = @c1.load(:id=>123)
    h.must_equal []
    p.add_attribute(c)
    h.must_equal [10, -123, 123, 4, 3]
    p.remove_attribute(c)
    h.must_equal [10, -123, 123, 4, 3, 123, 5, 6]
  end

  it "should support after_load association callback" do
    h = []
    @c2.one_to_many :attributes, :class => @c1, :after_load=>[proc{|x,y| h << [x.pk, y.collect{|z|z.pk}]}, :al]
    @c2.class_eval do
      self::Foo = h
      def al(v)
        v.each{|x| model::Foo << x.pk}
      end
    end
    @c1.dataset = @c1.dataset.with_fetch([{:id=>20}, {:id=>30}])
    p = @c2.load(:id=>10, :parent_id=>20)
    attributes = p.attributes
    h.must_equal [[10, [20, 30]], 20, 30]
    attributes.collect{|a| a.pk}.must_equal [20, 30]
  end

  it "should raise error and not call internal add or remove method if before callback calls cancel_action if raise_on_save_failure is true" do
    p = @c2.load(:id=>10)
    c = @c1.load(:id=>123)
    @c2.one_to_many :attributes, :class => @c1, :before_add=>:ba, :before_remove=>:br
    def p.ba(o); cancel_action; end
    def p._add_attribute; raise; end
    def p._remove_attribute; raise; end
    p.associations[:attributes] = []
    proc{p.add_attribute(c)}.must_raise(Sequel::HookFailed)
    p.attributes.must_equal []
    p.associations[:attributes] = [c]
    def p.br(o); cancel_action; end
    proc{p.remove_attribute(c)}.must_raise(Sequel::HookFailed)
    p.attributes.must_equal [c]
  end

  it "should return nil and not call internal add or remove method if before callback calls cancel_action if raise_on_save_failure is false" do
    p = @c2.load(:id=>10)
    c = @c1.load(:id=>123)
    p.raise_on_save_failure = false
    @c2.one_to_many :attributes, :class => @c1, :before_add=>:ba, :before_remove=>:br
    def p.ba(o); cancel_action; end
    def p._add_attribute; raise; end
    def p._remove_attribute; raise; end
    p.associations[:attributes] = []
    p.add_attribute(c).must_be_nil
    p.attributes.must_equal []
    p.associations[:attributes] = [c]
    def p.br(o); cancel_action; end
    p.remove_attribute(c).must_be_nil
    p.attributes.must_equal [c]
  end

  it "should have association dataset use false condition if any key is nil" do
    @c1.one_to_many :children, :class => @c1, :primary_key=>:node_id
    @c1.load(:id=>1).children_dataset.sql.must_equal "SELECT * FROM attributes WHERE 'f'"
  end
end

describe Sequel::Model, "many_to_many" do
  before do
    @c1 = Class.new(Sequel::Model(:attributes)) do
      unrestrict_primary_key
      attr_accessor :yyy
      def self.name; 'Attribute'; end
      def self.to_s; 'Attribute'; end
      columns :id, :y, :z
    end

    @c2 = Class.new(Sequel::Model(:nodes)) do
      unrestrict_primary_key
      attr_accessor :xxx
      
      def self.name; 'Node'; end
      def self.to_s; 'Node'; end
      columns :id, :x
    end
    @dataset = @c2.dataset
    @c1.dataset = @c1.dataset.with_autoid(1)

    [@c1, @c2].each{|c| c.dataset = c.dataset.with_fetch({})}
    DB.reset
  end

  it "should raise an error if current class does not have a primary key, and :left_primary_key is not specified" do
    @c2.no_primary_key
    proc{@c2.many_to_many :attributes, :class => @c1}.must_raise(Sequel::Error)
    DB.sqls.must_equal []
  end
  
  it "should raise an error if associated class does not have a primary key, and :right_primary_key is not specified" do
    @c1.no_primary_key
    @c2.many_to_many :attributes, :class => @c1
    d = @c2.new(:id => 1234)
    proc{d.attributes}.must_raise(Sequel::Error)
    DB.sqls.must_equal []
  end
  
  it "should use implicit key values and join table if omitted" do
    @c2.many_to_many :attributes, :class => @c1 
    @c2.new(:id => 1234).attributes_dataset.sql.must_equal 'SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE (attributes_nodes.node_id = 1234)'
  end
  
  it "should use implicit key values and join table if omitted" do
    @c2.one_through_one :attribute, :class => @c1 
    @c2.new(:id => 1234).attribute_dataset.sql.must_equal 'SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE (attributes_nodes.node_id = 1234) LIMIT 1'
  end
  
  it "should use implicit class if omitted" do
    begin
      class ::Tag < Sequel::Model; end
      @c2.many_to_many :tags
      @c2.new(:id => 1234).tags_dataset.sql.must_equal 'SELECT tags.* FROM tags INNER JOIN nodes_tags ON (nodes_tags.tag_id = tags.id) WHERE (nodes_tags.node_id = 1234)'
    ensure
      Object.send(:remove_const, :Tag)
    end
  end
  
  it "should use class inside module if given as a string" do
    begin
      module ::Historical
        class Tag < Sequel::Model; end
      end
      @c2.many_to_many :tags, :class=>'::Historical::Tag'
      @c2.new(:id => 1234).tags_dataset.sql.must_equal 'SELECT tags.* FROM tags INNER JOIN nodes_tags ON (nodes_tags.tag_id = tags.id) WHERE (nodes_tags.node_id = 1234)'
    ensure
      Object.send(:remove_const, :Historical)
    end
  end
  
  it "should not override a selection consisting completely of qualified columns using Sequel::SQL::QualifiedIdentifier" do
    @c1.dataset = @c1.dataset.select(Sequel.qualify(:attributes, :id), Sequel.qualify(:attributes, :b))
    @c2.many_to_many :attributes, :class => @c1
    @c2.new(:id => 1234).attributes_dataset.sql.must_equal 'SELECT attributes.id, attributes.b FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE (attributes_nodes.node_id = 1234)'
  end
  
  with_symbol_splitting "should not override a selection consisting completely of qualified columns using symbols" do
    @c1.dataset = @c1.dataset.select(:attributes__id, :attributes__b)
    @c2.many_to_many :attributes, :class => @c1
    @c2.new(:id => 1234).attributes_dataset.sql.must_equal 'SELECT attributes.id, attributes.b FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE (attributes_nodes.node_id = 1234)'
  end
  
  it "should not override a selection consisting completely of qualified columns using Sequel::SQL::AliasedExpression" do
    @c1.dataset = @c1.dataset.select(Sequel.qualify(:attributes, :id).as(:a), Sequel[:attributes][:b].as(:c))
    @c2.many_to_many :attributes, :class => @c1
    @c2.new(:id => 1234).attributes_dataset.sql.must_equal 'SELECT attributes.id AS a, attributes.b AS c FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE (attributes_nodes.node_id = 1234)'
  end
  
  with_symbol_splitting "should not override a selection consisting completely of qualified columns using Sequel::SQL::AliasedExpression with qualified symbol" do
    @c1.dataset = @c1.dataset.select(Sequel.qualify(:attributes, :id).as(:a), Sequel.as(:attributes__b, :c))
    @c2.many_to_many :attributes, :class => @c1
    @c2.new(:id => 1234).attributes_dataset.sql.must_equal 'SELECT attributes.id AS a, attributes.b AS c FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE (attributes_nodes.node_id = 1234)'
  end
  
  it "should override a selection consisting of non qualified columns" do
    @c1.dataset = @c1.dataset.select{foo(:bar)}
    @c2.many_to_many :attributes, :class => @c1
    @c2.new(:id => 1234).attributes_dataset.sql.must_equal 'SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE (attributes_nodes.node_id = 1234)'
  end
  
  it "should respect :predicate_key when lazily loading" do
    @c2.many_to_many :attributes, :class => @c1, :predicate_key=>Sequel.subscript(Sequel[:attributes_nodes][:node_id], 0)
    @c2.new(:id => 1234).attributes_dataset.sql.must_equal 'SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE (attributes_nodes.node_id[0] = 1234)'
  end
  
  it "should use explicit key values and join table if given" do
    @c2.many_to_many :attributes, :class => @c1, :left_key => :nodeid, :right_key => :attributeid, :join_table => :attribute2node
    @c2.new(:id => 1234).attributes_dataset.sql.must_equal 'SELECT attributes.* FROM attributes INNER JOIN attribute2node ON (attribute2node.attributeid = attributes.id) WHERE (attribute2node.nodeid = 1234)'
  end
  
  it "should support a conditions option" do
    @c2.many_to_many :attributes, :class => @c1, :conditions => {:a=>32}
    @c2.new(:id => 1234).attributes_dataset.sql.must_equal 'SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE ((a = 32) AND (attributes_nodes.node_id = 1234))'

    @c2.many_to_many :attributes, :class => @c1, :conditions => Sequel.lit('a = ?', 32)
    @c2.new(:id => 1234).attributes_dataset.sql.must_equal 'SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE ((a = 32) AND (attributes_nodes.node_id = 1234))'
    @c2.new(:id => 1234).attributes.must_equal [@c1.load({})]
  end
  
  it "should support an order option" do
    @c2.many_to_many :attributes, :class => @c1, :order => :blah
    @c2.new(:id => 1234).attributes_dataset.sql.must_equal 'SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE (attributes_nodes.node_id = 1234) ORDER BY blah'
  end
  
  it "should support an array for the order option" do
    @c2.many_to_many :attributes, :class => @c1, :order => [:blah1, :blah2]
    @c2.new(:id => 1234).attributes_dataset.sql.must_equal 'SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE (attributes_nodes.node_id = 1234) ORDER BY blah1, blah2'
  end
  
  it "should support :left_primary_key and :right_primary_key options" do
    @c2.many_to_many :attributes, :class => @c1, :left_primary_key=>:xxx, :right_primary_key=>:yyy
    @c2.new(:id => 1234, :xxx=>5).attributes_dataset.sql.must_equal 'SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.yyy) WHERE (attributes_nodes.node_id = 5)'
  end
  
  it "should support composite keys" do
    @c2.many_to_many :attributes, :class => @c1, :left_key=>[:l1, :l2], :right_key=>[:r1, :r2], :left_primary_key=>[:id, :x], :right_primary_key=>[:id, :y]
    @c2.load(:id => 1234, :x=>5).attributes_dataset.sql.must_equal 'SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON ((attributes_nodes.r1 = attributes.id) AND (attributes_nodes.r2 = attributes.y)) WHERE ((attributes_nodes.l1 = 1234) AND (attributes_nodes.l2 = 5))'
  end
  
  it "should not issue query if not all keys have values" do
    @c2.many_to_many :attributes, :class => @c1, :left_key=>[:l1, :l2], :right_key=>[:r1, :r2], :left_primary_key=>[:id, :x], :right_primary_key=>[:id, :y]
    @c2.load(:id => 1234, :x=>nil).attributes.must_equal []
    DB.sqls.must_equal []
  end
  
  it "should raise an Error unless same number of composite keys used" do
    proc{@c2.many_to_many :attributes, :class => @c1, :left_key=>[:node_id, :id]}.must_raise(Sequel::Error)
    proc{@c2.many_to_many :attributes, :class => @c1, :left_primary_key=>[:node_id, :id]}.must_raise(Sequel::Error)
    proc{@c2.many_to_many :attributes, :class => @c1, :left_key=>[:node_id, :id], :left_primary_key=>:id}.must_raise(Sequel::Error)
    proc{@c2.many_to_many :attributes, :class => @c1, :left_key=>:id, :left_primary_key=>[:node_id, :id]}.must_raise(Sequel::Error)
    proc{@c2.many_to_many :attributes, :class => @c1, :left_key=>[:node_id, :id, :x], :left_primary_key=>[:parent_id, :id]}.must_raise(Sequel::Error)
    
    proc{@c2.many_to_many :attributes, :class => @c1, :right_primary_key=>[:node_id, :id]}.must_raise(Sequel::Error)
    proc{@c2.many_to_many :attributes, :class => @c1, :right_key=>[:node_id, :id], :right_primary_key=>:id}.must_raise(Sequel::Error)
    proc{@c2.many_to_many :attributes, :class => @c1, :right_key=>:id, :left_primary_key=>[:node_id, :id]}.must_raise(Sequel::Error)
    proc{@c2.many_to_many :attributes, :class => @c1, :right_key=>[:node_id, :id, :x], :right_primary_key=>[:parent_id, :id]}.must_raise(Sequel::Error)
  end
  
  it "should support a select option" do
    @c2.many_to_many :attributes, :class => @c1, :select => :blah

    @c2.new(:id => 1234).attributes_dataset.sql.must_equal 'SELECT blah FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE (attributes_nodes.node_id = 1234)'
  end
  
  it "should support an array for the select option" do
    @c2.many_to_many :attributes, :class => @c1, :select => [Sequel::SQL::ColumnAll.new(:attributes), Sequel[:attribute_nodes][:blah2]]

    @c2.new(:id => 1234).attributes_dataset.sql.must_equal 'SELECT attributes.*, attribute_nodes.blah2 FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE (attributes_nodes.node_id = 1234)'
  end
  
  it "should accept a block" do
    @c2.many_to_many :attributes, :class => @c1 do |ds|
      ds.filter(:xxx => @xxx)
    end

    n = @c2.new(:id => 1234)
    n.xxx = 555
    n.attributes_dataset.sql.must_equal 'SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE ((attributes_nodes.node_id = 1234) AND (xxx = 555))'
  end

  it "should allow the :order option while accepting a block" do
    @c2.many_to_many :attributes, :class => @c1, :order=>[:blah1, :blah2] do |ds|
      ds.filter(:xxx => @xxx)
    end

    n = @c2.new(:id => 1234)
    n.xxx = 555
    n.attributes_dataset.sql.must_equal 'SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE ((attributes_nodes.node_id = 1234) AND (xxx = 555)) ORDER BY blah1, blah2'
  end

  it "should support a :dataset option that is used instead of the default" do
    c1 = @c1
    @c2.many_to_many :attributes, :class => @c1, :dataset=>proc{c1.join_table(:natural, :an).filter(Sequel[:an][:nodeid]=>pk)}, :order=> :a, :limit=>10, :select=>nil do |ds|
      ds.filter(:xxx => @xxx)
    end

    n = @c2.new(:id => 1234)
    n.xxx = 555
    n.attributes_dataset.sql.must_equal 'SELECT * FROM attributes NATURAL JOIN an WHERE ((an.nodeid = 1234) AND (xxx = 555)) ORDER BY a LIMIT 10'
    n.attributes.must_equal [@c1.load({})]
    DB.sqls.must_equal ['SELECT * FROM attributes NATURAL JOIN an WHERE ((an.nodeid = 1234) AND (xxx = 555)) ORDER BY a LIMIT 10']
  end

  it "should support a :dataset option that accepts the reflection as an argument" do
    @c2.many_to_many :attributes, :class => @c1, :dataset=>lambda{|opts| opts.associated_class.natural_join(:an).filter(Sequel[:an][:nodeid]=>pk)}, :order=> :a, :limit=>10, :select=>nil do |ds|
      ds.filter(:xxx => @xxx)
    end

    n = @c2.new(:id => 1234)
    n.xxx = 555
    n.attributes_dataset.sql.must_equal 'SELECT * FROM attributes NATURAL JOIN an WHERE ((an.nodeid = 1234) AND (xxx = 555)) ORDER BY a LIMIT 10'
    n.attributes.must_equal [@c1.load({})]
    DB.sqls.must_equal ['SELECT * FROM attributes NATURAL JOIN an WHERE ((an.nodeid = 1234) AND (xxx = 555)) ORDER BY a LIMIT 10']
  end

  it "should support a :limit option" do
    @c2.many_to_many :attributes, :class => @c1 , :limit=>10
    @c2.new(:id => 1234).attributes_dataset.sql.must_equal 'SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE (attributes_nodes.node_id = 1234) LIMIT 10'
    @c2.many_to_many :attributes, :class => @c1 , :limit=>[10, 10]
    @c2.new(:id => 1234).attributes_dataset.sql.must_equal 'SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE (attributes_nodes.node_id = 1234) LIMIT 10 OFFSET 10'
  end

  it "should have the :eager option affect the _dataset method" do
    @c2.many_to_many :attributes, :class => @c2 , :eager=>:attributes
    @c2.new(:id => 1234).attributes_dataset.opts[:eager].must_equal(:attributes=>nil)
  end
  
  it "should handle an aliased join table" do
    @c2.many_to_many :attributes, :class => @c1, :join_table => Sequel[:attribute2node].as(:attributes_nodes)
    n = @c2.load(:id => 1234)
    a = @c1.load(:id => 2345)
    n.attributes_dataset.sql.must_equal "SELECT attributes.* FROM attributes INNER JOIN attribute2node AS attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE (attributes_nodes.node_id = 1234)"
    a.must_equal n.add_attribute(a)
    a.must_equal n.remove_attribute(a)
    n.remove_all_attributes
    DB.sqls.must_equal ["INSERT INTO attribute2node (node_id, attribute_id) VALUES (1234, 2345)",
      "DELETE FROM attribute2node WHERE ((node_id = 1234) AND (attribute_id = 2345))",
      "DELETE FROM attribute2node WHERE (node_id = 1234)"]
  end
  
  with_symbol_splitting "should handle an aliased symbol join table" do
    @c2.many_to_many :attributes, :class => @c1, :join_table => :attribute2node___attributes_nodes
    n = @c2.load(:id => 1234)
    a = @c1.load(:id => 2345)
    n.attributes_dataset.sql.must_equal "SELECT attributes.* FROM attributes INNER JOIN attribute2node AS attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE (attributes_nodes.node_id = 1234)"
    a.must_equal n.add_attribute(a)
    a.must_equal n.remove_attribute(a)
    n.remove_all_attributes
    DB.sqls.must_equal ["INSERT INTO attribute2node (node_id, attribute_id) VALUES (1234, 2345)",
      "DELETE FROM attribute2node WHERE ((node_id = 1234) AND (attribute_id = 2345))",
      "DELETE FROM attribute2node WHERE (node_id = 1234)"]
  end
  
  it "should define an add_ method that works on existing records" do
    @c2.many_to_many :attributes, :class => @c1
    
    n = @c2.load(:id => 1234)
    a = @c1.load(:id => 2345)
    n.add_attribute(a).must_equal a
    DB.sqls.must_equal ["INSERT INTO attributes_nodes (node_id, attribute_id) VALUES (1234, 2345)"]
  end

  it "should define an add_ method that works with a primary key" do
    @c2.many_to_many :attributes, :class => @c1
    
    n = @c2.load(:id => 1234)
    a = @c1.load(:id => 2345)
    @c1.dataset = @c1.dataset.with_fetch(:id=>2345)
    n.add_attribute(2345).must_equal a
    DB.sqls.must_equal ["SELECT * FROM attributes WHERE id = 2345",
      "INSERT INTO attributes_nodes (node_id, attribute_id) VALUES (1234, 2345)"]
  end

  it "should raise an error if the primary key passed to the add_ method does not match an existing record" do
    @c2.many_to_many :attributes, :class => @c1
    
    n = @c2.load(:id => 1234)
    @c1.dataset = @c1.dataset.with_fetch([])
    proc{n.add_attribute(2345)}.must_raise(Sequel::NoMatchingRow)
    DB.sqls.must_equal ["SELECT * FROM attributes WHERE id = 2345"]
  end

  it "should allow passing a hash to the add_ method which creates a new record" do
    @c2.many_to_many :attributes, :class => @c1
    
    n = @c2.load(:id => 1234)
    @c1.dataset = @c1.dataset.with_fetch(:id=>1)
    n.add_attribute(:id => 1).must_equal @c1.load(:id => 1)
    DB.sqls.must_equal ['INSERT INTO attributes (id) VALUES (1)',
      "SELECT * FROM attributes WHERE id = 1",
      "INSERT INTO attributes_nodes (node_id, attribute_id) VALUES (1234, 1)"]
  end

  it "should define a remove_ method that works on existing records" do
    @c2.many_to_many :attributes, :class => @c1
    
    n = @c2.new(:id => 1234)
    a = @c1.new(:id => 2345)
    n.remove_attribute(a).must_equal a
    DB.sqls.must_equal ['DELETE FROM attributes_nodes WHERE ((node_id = 1234) AND (attribute_id = 2345))']
  end

  it "should raise an error in the add_ method if the passed associated object is not of the correct type" do
    @c2.many_to_many :attributes, :class => @c1
    proc{@c2.new(:id => 1234).add_attribute(@c2.new)}.must_raise(Sequel::Error)
  end

  it "should accept a primary key for the remove_ method and remove an existing record" do
    @c2.many_to_many :attributes, :class => @c1
    n = @c2.new(:id => 1234)
    @c1.dataset = @c1.dataset.with_fetch(:id=>234)
    n.remove_attribute(234).must_equal @c1.load(:id => 234)
    DB.sqls.must_equal ["SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE ((attributes_nodes.node_id = 1234) AND (attributes.id = 234)) LIMIT 1",
      "DELETE FROM attributes_nodes WHERE ((node_id = 1234) AND (attribute_id = 234))"]
  end
    
  it "should raise an error in the remove_ method if the passed associated object is not of the correct type" do
    @c2.many_to_many :attributes, :class => @c1
    proc{@c2.new(:id => 1234).remove_attribute(@c2.new)}.must_raise(Sequel::Error)
  end

  it "should have the add_ method respect the :left_primary_key and :right_primary_key options" do
    @c2.many_to_many :attributes, :class => @c1, :left_primary_key=>:xxx, :right_primary_key=>:yyy
    
    n = @c2.load(:id => 1234).set(:xxx=>5)
    a = @c1.load(:id => 2345).set(:yyy=>8)
    n.add_attribute(a).must_equal a
    DB.sqls.must_equal ["INSERT INTO attributes_nodes (node_id, attribute_id) VALUES (5, 8)"]
  end
  
  it "should have add_ method not add the same object to the cached association array if the object is already in the array" do
    @c2.many_to_many :attributes, :class => @c1
    
    n = @c2.load(:id => 1234).set(:xxx=>5)
    a = @c1.load(:id => 2345).set(:yyy=>8)
    n.associations[:attributes] = []
    a.must_equal n.add_attribute(a)
    a.must_equal n.add_attribute(a)
    n.attributes.must_equal [a]
  end
  
  it "should have the add_ method respect composite keys" do
    @c2.many_to_many :attributes, :class => @c1, :left_key=>[:l1, :l2], :right_key=>[:r1, :r2], :left_primary_key=>[:id, :x], :right_primary_key=>[:id, :z]
    n = @c2.load(:id => 1234, :x=>5)
    a = @c1.load(:id => 2345, :z=>8)
    a.must_equal n.add_attribute(a)
    sqls = DB.sqls
    m = /INSERT INTO attributes_nodes \((\w+), (\w+), (\w+), (\w+)\) VALUES \((\d+), (\d+), (\d+), (\d+)\)/.match(sqls.pop)
    sqls.must_equal []
    m.wont_equal nil
    map = {'l1'=>1234, 'l2'=>5, 'r1'=>2345, 'r2'=>8}
    %w[l1 l2 r1 r2].each do |x|
      v = false
      4.times do |i| i += 1
        if m[i] == x
          m[i+4].must_equal map[x].to_s
          v = true
        end
      end
      v.must_equal true
    end
  end
  
  it "should have the add_ method respect composite keys" do
    @c2.many_to_many :attributes, :class => @c1, :left_key=>[:l1, :l2], :right_key=>[:r1, :r2], :left_primary_key=>[:id, :x], :right_primary_key=>[:id, :z]
    @c1.dataset = @c1.dataset.with_fetch(:id=>2345, :z=>8)
    @c1.set_primary_key [:id, :z]
    n = @c2.load(:id => 1234, :x=>5)
    a = @c1.load(:id => 2345, :z=>8)
    n.add_attribute([2345, 8]).must_equal a
    DB.sqls.must_equal ["SELECT * FROM attributes WHERE ((id = 2345) AND (z = 8)) LIMIT 1",
      "INSERT INTO attributes_nodes (l1, l2, r1, r2) VALUES (1234, 5, 2345, 8)"]
  end

  it "should have the remove_ method respect the :left_primary_key and :right_primary_key options" do
    @c2.many_to_many :attributes, :class => @c1, :left_primary_key=>:xxx, :right_primary_key=>:yyy
    
    n = @c2.new(:id => 1234, :xxx=>5)
    a = @c1.new(:id => 2345, :yyy=>8)
    n.remove_attribute(a).must_equal a
    DB.sqls.must_equal ['DELETE FROM attributes_nodes WHERE ((node_id = 5) AND (attribute_id = 8))']
  end
  
  it "should have the remove_ method respect composite keys" do
    @c2.many_to_many :attributes, :class => @c1, :left_key=>[:l1, :l2], :right_key=>[:r1, :r2], :left_primary_key=>[:id, :x], :right_primary_key=>[:id, :z]
    n = @c2.load(:id => 1234, :x=>5)
    a = @c1.load(:id => 2345, :z=>8)
    a.must_equal n.remove_attribute(a)
    DB.sqls.must_equal ["DELETE FROM attributes_nodes WHERE ((l1 = 1234) AND (l2 = 5) AND (r1 = 2345) AND (r2 = 8))"]
  end

  it "should accept a array of composite primary key values for the remove_ method and remove an existing record" do
    @c1.dataset = @c1.dataset.with_fetch(:id=>234, :y=>8)
    @c1.set_primary_key [:id, :y]
    @c2.many_to_many :attributes, :class => @c1
    n = @c2.new(:id => 1234)
    @c1.load(:id => 234, :y=>8).must_equal n.remove_attribute([234, 8])
    DB.sqls.must_equal ["SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE ((attributes_nodes.node_id = 1234) AND (attributes.id = 234) AND (attributes.y = 8)) LIMIT 1",
      "DELETE FROM attributes_nodes WHERE ((node_id = 1234) AND (attribute_id = 234))"]
  end
    
  it "should raise an error if the model object doesn't have a valid primary key" do
    @c2.many_to_many :attributes, :class => @c1 
    a = @c2.new
    n = @c1.load(:id=>123)
    proc{a.attributes_dataset}.must_raise(Sequel::Error)
    proc{a.add_attribute(n)}.must_raise(Sequel::Error)
    proc{a.remove_attribute(n)}.must_raise(Sequel::Error)
    proc{a.remove_all_attributes}.must_raise(Sequel::Error)
  end
  
  it "should save the associated object first in add_ if passed a new model object" do
    @c2.many_to_many :attributes, :class => @c1 
    n = @c1.new
    a = @c2.load(:id=>123)
    n.new?.must_equal true
    @c1.dataset = @c1.dataset.with_fetch(:id=>1)
    a.add_attribute(n)
    n.new?.must_equal false
  end

  it "should raise a ValidationFailed in add_ if the associated object is new and invalid" do
    @c2.many_to_many :attributes, :class => @c1 
    n = @c1.new
    a = @c2.load(:id=>123)
    def n.validate() errors.add(:id, 'foo') end
    proc{a.add_attribute(n)}.must_raise(Sequel::ValidationFailed)
  end

  it "should raise an Error in add_ if the associated object is new and invalid and raise_on_save_failure is false" do
    @c2.many_to_many :attributes, :class => @c1 
    n = @c1.new
    n.raise_on_save_failure = false
    a = @c2.load(:id=>123)
    def n.validate() errors.add(:id, 'foo') end
    proc{a.add_attribute(n)}.must_raise(Sequel::Error)
  end

  it "should not attempt to validate the associated object in add_ if the :validate=>false option is used" do
    @c2.many_to_many :attributes, :class => @c1, :validate=>false
    n = @c1.new
    a = @c2.load(:id=>123)
    def n.validate() errors.add(:id, 'foo') end
    @c1.dataset = @c1.dataset.with_fetch(:id=>1)
    a.add_attribute(n)
    n.new?.must_equal false
  end

  it "should raise an error if trying to remove a model object that doesn't have a valid primary key" do
    @c2.many_to_many :attributes, :class => @c1 
    n = @c1.new
    a = @c2.load(:id=>123)
    proc{a.remove_attribute(n)}.must_raise(Sequel::Error)
  end

  it "should provide an array with all members of the association" do
    @c2.many_to_many :attributes, :class => @c1
    
    @c2.new(:id => 1234).attributes.must_equal [@c1.load({})]
    DB.sqls.must_equal ['SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE (attributes_nodes.node_id = 1234)']
  end

  it "should populate cache when accessed" do
    @c2.many_to_many :attributes, :class => @c1

    n = @c2.new(:id => 1234)
    n.associations.include?(:attributes).must_equal false
    atts = n.attributes
    atts.must_equal n.associations[:attributes]
  end

  it "should use cache if available" do
    @c2.many_to_many :attributes, :class => @c1

    n = @c2.new(:id => 1234)
    n.associations[:attributes] = 42
    n.attributes.must_equal 42
    DB.sqls.must_equal []
  end

  it "should not use cache if asked to reload" do
    @c2.many_to_many :attributes, :class => @c1

    n = @c2.new(:id => 1234)
    n.associations[:attributes] = 42
    n.attributes(:reload=>true).wont_equal 42
    DB.sqls.must_equal ["SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE (attributes_nodes.node_id = 1234)"]
  end

  it "should add item to cache if it exists when calling add_" do
    @c2.many_to_many :attributes, :class => @c1

    n = @c2.new(:id => 1234)
    att = @c1.load(:id => 345)
    a = []
    n.associations[:attributes] = a
    n.add_attribute(att)
    a.must_equal [att]
  end

  it "should add item to reciprocal's cache if it exists when calling add_" do
    @c2.many_to_many :attributes, :class => @c1
    @c1.many_to_many :nodes, :class => @c2

    n = @c2.new(:id => 1234)
    att = @c1.load(:id => 345)
    att.associations[:nodes] = []
    n.add_attribute(att)
    att.nodes.must_equal [n]
  end

  it "should remove item from cache if it exists when calling remove_" do
    @c2.many_to_many :attributes, :class => @c1

    n = @c2.new(:id => 1234)
    att = @c1.load(:id => 345)
    a = [att]
    n.associations[:attributes] = a
    n.remove_attribute(att)
    a.must_equal []
  end

  it "should remove item from reciprocal's if it exists when calling remove_" do
    @c2.many_to_many :attributes, :class => @c1
    @c1.many_to_many :nodes, :class => @c2

    n = @c2.new(:id => 1234)
    att = @c1.new(:id => 345)
    att.associations[:nodes] = [n]
    n.remove_attribute(att)
    att.nodes.must_equal []
  end

  it "should not create the add_, remove_, or remove_all_ methods if :read_only option is used" do
    @c2.many_to_many :attributes, :class => @c1, :read_only=>true
    im = @c2.instance_methods
    im.must_include(:attributes)
    im.must_include(:attributes_dataset)
    im.wont_include(:add_attribute)
    im.wont_include(:remove_attribute)
    im.wont_include(:remove_all_attributes)
  end

  it "should not add associations methods directly to class" do
    @c2.many_to_many :attributes, :class => @c1
    im = @c2.instance_methods
    im.must_include(:attributes)
    im.must_include(:attributes_dataset)
    im.must_include(:add_attribute)
    im.must_include(:remove_attribute)
    im.must_include(:remove_all_attributes)
    im2 = @c2.instance_methods(false)
    im2.wont_include(:attributes)
    im2.wont_include(:attributes_dataset)
    im2.wont_include(:add_attribute)
    im2.wont_include(:remove_attribute)
    im2.wont_include(:remove_all_attributes)
  end

  it "should have an remove_all_ method that removes all associations" do
    @c2.many_to_many :attributes, :class => @c1
    @c2.new(:id => 1234).remove_all_attributes
    DB.sqls.must_equal ['DELETE FROM attributes_nodes WHERE (node_id = 1234)']
  end

  it "should have the remove_all_ method respect the :left_primary_key option" do
    @c2.many_to_many :attributes, :class => @c1, :left_primary_key=>:xxx
    @c2.new(:id => 1234, :xxx=>5).remove_all_attributes
    DB.sqls.must_equal ['DELETE FROM attributes_nodes WHERE (node_id = 5)']
  end
  
  it "should have the remove_all_ method respect composite keys" do
    @c2.many_to_many :attributes, :class => @c1, :left_primary_key=>[:id, :x], :left_key=>[:l1, :l2]
    @c2.load(:id => 1234, :x=>5).remove_all_attributes
    DB.sqls.must_equal ['DELETE FROM attributes_nodes WHERE ((l1 = 1234) AND (l2 = 5))']
  end

  it "remove_all should set the cached instance variable to []" do
    @c2.many_to_many :attributes, :class => @c1
    node = @c2.new(:id => 1234)
    node.remove_all_attributes
    node.associations[:attributes].must_equal []
  end

  it "remove_all should return the array of previously associated items if the cached instance variable exists" do
    @c2.many_to_many :attributes, :class => @c1
    attrib = @c1.load(:id=>3)
    node = @c2.load(:id => 1234)
    @c1.dataset = @c1.dataset.with_fetch([])
    node.attributes.must_equal []
    node.add_attribute(attrib)
    node.associations[:attributes].must_equal [attrib]
    node.remove_all_attributes.must_equal [attrib]
  end

  it "remove_all should return nil if the cached instance variable does not exist" do
    @c2.many_to_many :attributes, :class => @c1
    @c2.new(:id => 1234).remove_all_attributes.must_be_nil
  end

  it "remove_all should remove the current item from all reciprocal instance varaibles if it cached instance variable exists" do
    @c2.many_to_many :attributes, :class => @c1
    @c1.many_to_many :nodes, :class => @c2
    @c1.dataset = @c1.dataset.with_fetch([])
    @c2.dataset = @c2.dataset.with_fetch([])
    attrib = @c1.load(:id=>3)
    node = @c2.new(:id => 1234)
    node.attributes.must_equal []
    attrib.nodes.must_equal []
    node.add_attribute(attrib)
    attrib.associations[:nodes].must_equal [node]
    node.remove_all_attributes
    attrib.associations[:nodes].must_equal []
  end

  it "add, remove, and remove_all methods should respect :join_table_block option" do
    @c2.many_to_many :attributes, :class => @c1, :join_table_block=>proc{|ds| ds.filter(:x=>123)}
    o = @c2.load(:id => 1234)
    o.add_attribute(@c1.load(:id=>44))
    o.remove_attribute(@c1.load(:id=>45))
    o.remove_all_attributes
    sqls = DB.sqls
    sqls.shift =~ /INSERT INTO attributes_nodes \((node_id|attribute_id), (node_id|attribute_id)\) VALUES \((1234|44), (1234|44)\)/
    sqls.must_equal ["DELETE FROM attributes_nodes WHERE ((x = 123) AND (node_id = 1234) AND (attribute_id = 45))",
      "DELETE FROM attributes_nodes WHERE ((x = 123) AND (node_id = 1234))"]
  end

  it "should call an _add_ method internally to add attributes" do
    @c2.many_to_many :attributes, :class => @c1
    @c2.private_instance_methods.must_include(:_add_attribute)
    p = @c2.load(:id=>10)
    c = @c1.load(:id=>123)
    def p._add_attribute(x)
      @x = x
    end
    p.add_attribute(c)
    p.instance_variable_get(:@x).must_equal c
    DB.sqls.must_equal []
  end

  it "should support an :adder option for defining the _add_ method" do
    @c2.many_to_many :attributes, :class => @c1, :adder=>proc{|x| @x = x}
    p = @c2.load(:id=>10)
    c = @c1.load(:id=>123)
    p.add_attribute(c)
    p.instance_variable_get(:@x).must_equal c
    DB.sqls.must_equal []
  end

  it "should allow additional arguments given to the add_ method and pass them onwards to the _add_ method" do
    @c2.many_to_many :attributes, :class => @c1
    p = @c2.load(:id=>10)
    c = @c1.load(:id=>123)
    def p._add_attribute(x,*y)
      @x = x
      @y = y
    end
    p.add_attribute(c,:foo,:bar=>:baz)
    p.instance_variable_get(:@x).must_equal c
    p.instance_variable_get(:@y).must_equal [:foo,{:bar=>:baz}]
  end

  it "should call a _remove_ method internally to remove attributes" do
    @c2.many_to_many :attributes, :class => @c1
    @c2.private_instance_methods.must_include(:_remove_attribute)
    p = @c2.load(:id=>10)
    c = @c1.load(:id=>123)
    def p._remove_attribute(x)
      @x = x
    end
    p.remove_attribute(c)
    p.instance_variable_get(:@x).must_equal c
    DB.sqls.must_equal []
  end

  it "should support a :remover option for defining the _remove_ method" do
    @c2.many_to_many :attributes, :class => @c1, :remover=>proc{|x| @x = x}
    p = @c2.load(:id=>10)
    c = @c1.load(:id=>123)
    p.remove_attribute(c)
    p.instance_variable_get(:@x).must_equal c
    DB.sqls.must_equal []
  end

  it "should allow additional arguments given to the remove_ method and pass them onwards to the _remove_ method" do
    @c2.many_to_many :attributes, :class => @c1
    p = @c2.load(:id=>10)
    c = @c1.load(:id=>123)
    def p._remove_attribute(x,*y)
      @x = x
      @y = y
    end
    p.remove_attribute(c,:foo,:bar=>:baz)
    p.instance_variable_get(:@x).must_equal c
    p.instance_variable_get(:@y).must_equal [:foo,{:bar=>:baz}]
  end

  it "should allow additional arguments given to the remove_all_ method and pass them onwards to the _remove_all_ method" do
    @c2.many_to_many :attributes, :class => @c1
    p = @c2.load(:id=>10)
    def p._remove_all_attributes(*y)
      @y = y
    end
    p.remove_all_attributes(:foo,:bar=>:baz)
    p.instance_variable_get(:@y).must_equal [:foo,{:bar=>:baz}]
  end

  it "should call a _remove_all_ method internally to remove attributes" do
    @c2.many_to_many :attributes, :class => @c1
    @c2.private_instance_methods.must_include(:_remove_all_attributes)
    p = @c2.load(:id=>10)
    def p._remove_all_attributes
      @x = :foo
    end
    p.remove_all_attributes
    p.instance_variable_get(:@x).must_equal :foo
    DB.sqls.must_equal []
  end

  it "should support a :clearer option for defining the _remove_all_ method" do
    @c2.many_to_many :attributes, :class => @c1, :clearer=>proc{@x = :foo}
    p = @c2.load(:id=>10)
    p.remove_all_attributes
    p.instance_variable_get(:@x).must_equal :foo
    DB.sqls.must_equal []
  end

  it "should support (before|after)_(add|remove) callbacks" do
    h = []
    @c2.many_to_many :attributes, :class => @c1, :before_add=>[proc{|x,y| h << x.pk; h << -y.pk}, :blah], :after_add=>proc{h << 3}, :before_remove=>:blah, :after_remove=>[:blahr]
    @c2.class_eval do
      self::Foo = h
      def _add_attribute(v)
        model::Foo << 4
      end
      def _remove_attribute(v)
        model::Foo << 5
      end
      def blah(x)
        model::Foo << x.pk
      end
      def blahr(x)
        model::Foo << 6
      end
    end
    p = @c2.load(:id=>10)
    c = @c1.load(:id=>123)
    h.must_equal []
    p.add_attribute(c)
    h.must_equal [10, -123, 123, 4, 3]
    p.remove_attribute(c)
    h.must_equal [10, -123, 123, 4, 3, 123, 5, 6]
  end

  it "should support after_load association callback" do
    h = []
    @c2.many_to_many :attributes, :class => @c1, :after_load=>[proc{|x,y| h << [x.pk, y.collect{|z|z.pk}]}, :al]
    @c2.class_eval do
      self::Foo = h
      def al(v)
        v.each{|x| model::Foo << x.pk}
      end
    end
    @c1.dataset = @c1.dataset.with_fetch([{:id=>20}, {:id=>30}])
    p = @c2.load(:id=>10, :parent_id=>20)
    attributes = p.attributes
    h.must_equal [[10, [20, 30]], 20, 30]
    attributes.collect{|a| a.pk}.must_equal [20, 30]
  end

  it "should raise error and not call internal add or remove method if before callback calls cancel_action if raise_on_save_failure is true" do
    p = @c2.load(:id=>10)
    c = @c1.load(:id=>123)
    @c2.many_to_many :attributes, :class => @c1, :before_add=>:ba, :before_remove=>:br
    def p.ba(o) cancel_action end
    def p._add_attribute; raise; end
    def p._remove_attribute; raise; end
    p.associations[:attributes] = []
    p.raise_on_save_failure = true
    proc{p.add_attribute(c)}.must_raise(Sequel::HookFailed)
    p.attributes.must_equal []
    p.associations[:attributes] = [c]
    def p.br(o) cancel_action end
    proc{p.remove_attribute(c)}.must_raise(Sequel::HookFailed)
    p.attributes.must_equal [c]
  end

  it "should return nil and not call internal add or remove method if before callback calls cancel_action if raise_on_save_failure is false" do
    p = @c2.load(:id=>10)
    c = @c1.load(:id=>123)
    p.raise_on_save_failure = false
    @c2.many_to_many :attributes, :class => @c1, :before_add=>:ba, :before_remove=>:br
    def p.ba(o) cancel_action end
    def p._add_attribute; raise; end
    def p._remove_attribute; raise; end
    p.associations[:attributes] = []
    p.add_attribute(c).must_be_nil
    p.attributes.must_equal []
    p.associations[:attributes] = [c]
    def p.br(o) cancel_action end
    p.remove_attribute(c).must_be_nil
    p.attributes.must_equal [c]
  end

  it "should support a :uniq option that removes duplicates from the association" do
    @c2.many_to_many :attributes, :class => @c1, :uniq=>true
    @c1.dataset = @c1.dataset.with_fetch([{:id=>20}, {:id=>30}, {:id=>20}, {:id=>30}])
    @c2.load(:id=>10, :parent_id=>20).attributes.must_equal [@c1.load(:id=>20), @c1.load(:id=>30)]
  end
  
  it "should support a :distinct option that uses the DISTINCT clause" do
    @c2.many_to_many :attributes, :class => @c1, :distinct=>true
    @c2.load(:id=>10).attributes_dataset.sql.must_equal "SELECT DISTINCT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE (attributes_nodes.node_id = 10)"
  end

  it "should not apply association options when removing all associated records" do
    @c2.many_to_many :attributes, :class => @c1 do |ds|
      ds.filter(:name=>'John')
    end
    @c2.load(:id=>1).remove_all_attributes
    DB.sqls.must_equal ["DELETE FROM attributes_nodes WHERE (node_id = 1)"]
  end

  it "should use assocation's dataset when grabbing a record to remove from the assocation by primary key" do
    @c2.many_to_many :attributes, :class => @c1 do |ds|
      ds.filter(:join_table_att=>3)
    end
    @c1.dataset = @c1.dataset.with_fetch(:id=>2)
    @c2.load(:id=>1).remove_attribute(2)
    DB.sqls.must_equal ["SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE ((attributes_nodes.node_id = 1) AND (join_table_att = 3) AND (attributes.id = 2)) LIMIT 1",
      "DELETE FROM attributes_nodes WHERE ((node_id = 1) AND (attribute_id = 2))"] 
  end

  it "should have association dataset use false condition if any key is nil" do
    @c1.many_to_many :attributes, :class => @c1, :left_primary_key=>:y
    @c1.load(:id=>1).attributes_dataset.sql.must_equal "SELECT attributes.* FROM attributes INNER JOIN attributes_attributes ON (attributes_attributes.attribute_id = attributes.id) WHERE 'f'"
  end
end

describe Sequel::Model, "one_through_one" do
  before do
    @c1 = Class.new(Sequel::Model(:attributes)) do
      unrestrict_primary_key
      attr_accessor :yyy
      def self.name; 'Attribute'; end
      def self.to_s; 'Attribute'; end
      columns :id, :y, :z
    end

    @c2 = Class.new(Sequel::Model(:nodes)) do
      unrestrict_primary_key
      attr_accessor :xxx
      
      def self.name; 'Node'; end
      def self.to_s; 'Node'; end
      columns :id, :x
    end
    @dataset = @c2.dataset
    @c1.dataset = @c1.dataset.with_autoid(1)

    [@c1, @c2].each{|c| c.dataset = c.dataset.with_fetch({})}
    DB.reset
  end
  after do
    DB.fetch = {:id => 1, :x => 1}
  end

  it "should use implicit key values and join table if omitted" do
    @c2.one_through_one :attribute, :class => @c1 
    @c2.new(:id => 1234).attribute_dataset.sql.must_equal 'SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE (attributes_nodes.node_id = 1234) LIMIT 1'
  end
  
  it "should respect :predicate_key when lazily loading" do
    @c2.one_through_one :attribute, :class => @c1, :predicate_key=>Sequel.subscript(Sequel[:attributes_nodes][:node_id], 0)
    @c2.new(:id => 1234).attribute_dataset.sql.must_equal 'SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE (attributes_nodes.node_id[0] = 1234) LIMIT 1'
  end
  
  it "should use explicit key values and join table if given" do
    @c2.one_through_one :attribute, :class => @c1, :left_key => :nodeid, :right_key => :attributeid, :join_table => :attribute2node
    @c2.new(:id => 1234).attribute_dataset.sql.must_equal 'SELECT attributes.* FROM attributes INNER JOIN attribute2node ON (attribute2node.attributeid = attributes.id) WHERE (attribute2node.nodeid = 1234) LIMIT 1'
  end
  
  it "should support a conditions option" do
    @c2.one_through_one :attribute, :class => @c1, :conditions => {:a=>32}
    @c2.new(:id => 1234).attribute_dataset.sql.must_equal 'SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE ((a = 32) AND (attributes_nodes.node_id = 1234)) LIMIT 1'

    @c2.one_through_one :attribute, :class => @c1, :conditions => Sequel.lit('a = ?', 32)
    @c2.new(:id => 1234).attribute_dataset.sql.must_equal 'SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE ((a = 32) AND (attributes_nodes.node_id = 1234)) LIMIT 1'
    @c2.new(:id => 1234).attribute.must_equal @c1.load({})
  end
  
  it "should support an order option" do
    @c2.one_through_one :attribute, :class => @c1, :order => :blah
    @c2.new(:id => 1234).attribute_dataset.sql.must_equal 'SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE (attributes_nodes.node_id = 1234) ORDER BY blah LIMIT 1'
  end
  
  it "should support an array for the order option" do
    @c2.one_through_one :attribute, :class => @c1, :order => [:blah1, :blah2]
    @c2.new(:id => 1234).attribute_dataset.sql.must_equal 'SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE (attributes_nodes.node_id = 1234) ORDER BY blah1, blah2 LIMIT 1'
  end
  
  it "should support :left_primary_key and :right_primary_key options" do
    @c2.one_through_one :attribute, :class => @c1, :left_primary_key=>:xxx, :right_primary_key=>:yyy
    @c2.new(:id => 1234, :xxx=>5).attribute_dataset.sql.must_equal 'SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.yyy) WHERE (attributes_nodes.node_id = 5) LIMIT 1'
  end
  
  it "should support composite keys" do
    @c2.one_through_one :attribute, :class => @c1, :left_key=>[:l1, :l2], :right_key=>[:r1, :r2], :left_primary_key=>[:id, :x], :right_primary_key=>[:id, :y]
    @c2.load(:id => 1234, :x=>5).attribute_dataset.sql.must_equal 'SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON ((attributes_nodes.r1 = attributes.id) AND (attributes_nodes.r2 = attributes.y)) WHERE ((attributes_nodes.l1 = 1234) AND (attributes_nodes.l2 = 5)) LIMIT 1'
  end
  
  it "should not issue query if not all keys have values" do
    @c2.one_through_one :attribute, :class => @c1, :left_key=>[:l1, :l2], :right_key=>[:r1, :r2], :left_primary_key=>[:id, :x], :right_primary_key=>[:id, :y]
    @c2.load(:id => 1234, :x=>nil).attribute.must_be_nil
    DB.sqls.must_equal []
  end
  
  it "should raise an Error unless same number of composite keys used" do
    proc{@c2.one_through_one :attribute, :class => @c1, :left_key=>[:node_id, :id]}.must_raise(Sequel::Error)
    proc{@c2.one_through_one :attribute, :class => @c1, :left_primary_key=>[:node_id, :id]}.must_raise(Sequel::Error)
    proc{@c2.one_through_one :attribute, :class => @c1, :left_key=>[:node_id, :id], :left_primary_key=>:id}.must_raise(Sequel::Error)
    proc{@c2.one_through_one :attribute, :class => @c1, :left_key=>:id, :left_primary_key=>[:node_id, :id]}.must_raise(Sequel::Error)
    proc{@c2.one_through_one :attribute, :class => @c1, :left_key=>[:node_id, :id, :x], :left_primary_key=>[:parent_id, :id]}.must_raise(Sequel::Error)
    
    proc{@c2.one_through_one :attribute, :class => @c1, :right_primary_key=>[:node_id, :id]}.must_raise(Sequel::Error)
    proc{@c2.one_through_one :attribute, :class => @c1, :right_key=>[:node_id, :id], :right_primary_key=>:id}.must_raise(Sequel::Error)
    proc{@c2.one_through_one :attribute, :class => @c1, :right_key=>:id, :left_primary_key=>[:node_id, :id]}.must_raise(Sequel::Error)
    proc{@c2.one_through_one :attribute, :class => @c1, :right_key=>[:node_id, :id, :x], :right_primary_key=>[:parent_id, :id]}.must_raise(Sequel::Error)
  end
  
  it "should support a select option" do
    @c2.one_through_one :attribute, :class => @c1, :select => :blah

    @c2.new(:id => 1234).attribute_dataset.sql.must_equal 'SELECT blah FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE (attributes_nodes.node_id = 1234) LIMIT 1'
  end
  
  it "should support an array for the select option" do
    @c2.one_through_one :attribute, :class => @c1, :select => [Sequel::SQL::ColumnAll.new(:attributes), Sequel[:attribute_nodes][:blah2]]

    @c2.new(:id => 1234).attribute_dataset.sql.must_equal 'SELECT attributes.*, attribute_nodes.blah2 FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE (attributes_nodes.node_id = 1234) LIMIT 1'
  end
  
  it "should accept a block" do
    @c2.one_through_one :attribute, :class => @c1 do |ds|
      ds.filter(:xxx => @xxx)
    end

    n = @c2.new(:id => 1234)
    n.xxx = 555
    n.attribute_dataset.sql.must_equal 'SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE ((attributes_nodes.node_id = 1234) AND (xxx = 555)) LIMIT 1'
  end

  it "should allow the :order option while accepting a block" do
    @c2.one_through_one :attribute, :class => @c1, :order=>[:blah1, :blah2] do |ds|
      ds.filter(:xxx => @xxx)
    end

    n = @c2.new(:id => 1234)
    n.xxx = 555
    n.attribute_dataset.sql.must_equal 'SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE ((attributes_nodes.node_id = 1234) AND (xxx = 555)) ORDER BY blah1, blah2 LIMIT 1'
  end

  it "should support a :dataset option that is used instead of the default" do
    c1 = @c1
    @c2.one_through_one :attribute, :class => @c1, :dataset=>proc{c1.join_table(:natural, :an).filter(Sequel[:an][:nodeid]=>pk)}, :order=> :a, :select=>nil do |ds|
      ds.filter(:xxx => @xxx)
    end

    n = @c2.new(:id => 1234)
    n.xxx = 555
    n.attribute_dataset.sql.must_equal 'SELECT * FROM attributes NATURAL JOIN an WHERE ((an.nodeid = 1234) AND (xxx = 555)) ORDER BY a LIMIT 1'
    n.attribute.must_equal @c1.load({})
    DB.sqls.must_equal ['SELECT * FROM attributes NATURAL JOIN an WHERE ((an.nodeid = 1234) AND (xxx = 555)) ORDER BY a LIMIT 1']
  end

  it "should support a :dataset option that accepts the reflection as an argument" do
    @c2.one_through_one :attribute, :class => @c1, :dataset=>lambda{|opts| opts.associated_class.natural_join(:an).filter(Sequel[:an][:nodeid]=>pk)}, :order=> :a, :select=>nil do |ds|
      ds.filter(:xxx => @xxx)
    end

    n = @c2.new(:id => 1234)
    n.xxx = 555
    n.attribute_dataset.sql.must_equal 'SELECT * FROM attributes NATURAL JOIN an WHERE ((an.nodeid = 1234) AND (xxx = 555)) ORDER BY a LIMIT 1'
    n.attribute.must_equal @c1.load({})
    DB.sqls.must_equal ['SELECT * FROM attributes NATURAL JOIN an WHERE ((an.nodeid = 1234) AND (xxx = 555)) ORDER BY a LIMIT 1']
  end

  it "should support a :limit option to specify an offset" do
    @c2.one_through_one :attribute, :class => @c1 , :limit=>[nil, 10]
    @c2.new(:id => 1234).attribute_dataset.sql.must_equal 'SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE (attributes_nodes.node_id = 1234) LIMIT 1 OFFSET 10'
  end

  it "should have the :eager option affect the _dataset method" do
    @c2.one_through_one :attribute, :class => @c2 , :eager=>:attribute
    @c2.new(:id => 1234).attribute_dataset.opts[:eager].must_equal(:attribute=>nil)
  end
  
  it "should handle an aliased join table" do
    @c2.one_through_one :attribute, :class => @c1, :join_table => Sequel[:attribute2node].as(:attributes_nodes)
    n = @c2.load(:id => 1234)
    n.attribute_dataset.sql.must_equal "SELECT attributes.* FROM attributes INNER JOIN attribute2node AS attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE (attributes_nodes.node_id = 1234) LIMIT 1"
  end
  
  with_symbol_splitting "should handle an aliased join table with splittable symbol" do
    @c2.one_through_one :attribute, :class => @c1, :join_table => :attribute2node___attributes_nodes
    n = @c2.load(:id => 1234)
    n.attribute_dataset.sql.must_equal "SELECT attributes.* FROM attributes INNER JOIN attribute2node AS attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE (attributes_nodes.node_id = 1234) LIMIT 1"
  end
  
  it "should raise an error if the model object doesn't have a valid primary key" do
    @c2.one_through_one :attribute, :class => @c1 
    a = @c2.new
    proc{a.attribute_dataset}.must_raise(Sequel::Error)
  end
  
  it "should provide an array with all members of the association" do
    @c2.one_through_one :attribute, :class => @c1
    
    @c2.new(:id => 1234).attribute.must_equal @c1.load({})
    DB.sqls.must_equal ['SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE (attributes_nodes.node_id = 1234) LIMIT 1']
  end

  it "should populate cache when accessed" do
    @c2.one_through_one :attribute, :class => @c1

    n = @c2.new(:id => 1234)
    n.associations.include?(:attribute).must_equal false
    atts = n.attribute
    atts.must_equal n.associations[:attribute]
  end

  it "should use cache if available" do
    @c2.one_through_one :attribute, :class => @c1

    n = @c2.new(:id => 1234)
    n.associations[:attribute] = 42
    n.attribute.must_equal 42
    DB.sqls.must_equal []
  end

  it "should not use cache if asked to reload" do
    @c2.one_through_one :attribute, :class => @c1

    n = @c2.new(:id => 1234)
    n.associations[:attribute] = 42
    n.attribute(:reload=>true).wont_equal 42
    DB.sqls.must_equal ["SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE (attributes_nodes.node_id = 1234) LIMIT 1"]
  end

  it "should not add associations methods directly to class" do
    @c2.one_through_one :attribute, :class => @c1
    im = @c2.instance_methods
    im.must_include(:attribute)
    im.must_include(:attribute_dataset)
    im2 = @c2.instance_methods(false)
    im2.wont_include(:attribute)
    im2.wont_include(:attribute_dataset)
  end

  it "should support after_load association callback" do
    h = []
    @c2.one_through_one :attribute, :class => @c1, :after_load=>[proc{|x,y| h << [x.pk, y.pk]}, :al]
    @c2.class_eval do
      self::Foo = h
      def al(v)
        model::Foo << v.pk
      end
    end
    @c1.dataset = @c1.dataset.with_fetch([{:id=>20}])
    p = @c2.load(:id=>10, :parent_id=>20)
    attribute = p.attribute
    h.must_equal [[10, 20], 20]
    attribute.pk.must_equal 20
  end

  it "should support a :distinct option that uses the DISTINCT clause" do
    @c2.one_through_one :attribute, :class => @c1, :distinct=>true
    @c2.load(:id=>10).attribute_dataset.sql.must_equal "SELECT DISTINCT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE (attributes_nodes.node_id = 10) LIMIT 1"
  end

  it "should not add a setter method if the :read_only option is true" do
    @c2.one_through_one :attribute, :class => @c1, :read_only=>true
    im = @c2.instance_methods
    im.must_include(:attribute)
    im.wont_include(:attribute=)
  end

  it "should add a setter method" do
    @c2.one_through_one :attribute, :class => @c1
    attrib = @c1.new(:id=>3)
    DB.fetch = []
    o = @c2.load(:id => 1234)
    o.attribute = nil
    DB.sqls.must_equal ["SELECT * FROM attributes_nodes WHERE (node_id = 1234) LIMIT 1"]

    o.attribute = attrib
    DB.sqls.must_equal ["SELECT * FROM attributes_nodes WHERE (node_id = 1234) LIMIT 1",
      "INSERT INTO attributes_nodes (attribute_id, node_id) VALUES (3, 1234)"]

    DB.fetch = {:node_id=>1234, :attribute_id=>5}
    o.attribute = nil
    DB.sqls.must_equal ["SELECT * FROM attributes_nodes WHERE (node_id = 1234) LIMIT 1",
      "DELETE FROM attributes_nodes WHERE ((node_id = 1234) AND (attribute_id = 5))"]

    o.attribute = attrib
    DB.sqls.must_equal ["SELECT * FROM attributes_nodes WHERE (node_id = 1234) LIMIT 1",
      "UPDATE attributes_nodes SET attribute_id = 3 WHERE ((node_id = 1234) AND (attribute_id = 5))"]

    @c2.load(:id => 1234).attribute = @c1.new(:id=>5)
    DB.sqls.must_equal ["SELECT * FROM attributes_nodes WHERE (node_id = 1234) LIMIT 1"]
  end

  it "should use a transaction in the setter method" do
    @c2.one_through_one :attribute, :class => @c1
    @c2.use_transactions = true
    @c1.load(:id=>3)
    DB.fetch = []
    @c2.new(:id => 1234).attribute = nil
    DB.sqls.must_equal ['BEGIN',
      "SELECT * FROM attributes_nodes WHERE (node_id = 1234) LIMIT 1",
      'COMMIT']
  end
    
  it "should have setter method respect :join_table_block option" do
    @c2.one_through_one :attribute, :class => @c1, :join_table_block=>proc{|ds| ds.where(:a)}
    attrib = @c1.new(:id=>3)
    DB.fetch = []
    o = @c2.new(:id => 1234)
    o.attribute = nil
    DB.sqls.must_equal ["SELECT * FROM attributes_nodes WHERE (a AND (node_id = 1234)) LIMIT 1"]

    o.attribute = attrib
    DB.sqls.must_equal ["SELECT * FROM attributes_nodes WHERE (a AND (node_id = 1234)) LIMIT 1",
      "INSERT INTO attributes_nodes (attribute_id, node_id) VALUES (3, 1234)"]

    DB.fetch = {:node_id=>1234, :attribute_id=>5}
    o.attribute = nil
    DB.sqls.must_equal ["SELECT * FROM attributes_nodes WHERE (a AND (node_id = 1234)) LIMIT 1",
      "DELETE FROM attributes_nodes WHERE (a AND (node_id = 1234) AND (attribute_id = 5))"]

    o.attribute = attrib
    DB.sqls.must_equal ["SELECT * FROM attributes_nodes WHERE (a AND (node_id = 1234)) LIMIT 1",
      "UPDATE attributes_nodes SET attribute_id = 3 WHERE (a AND (node_id = 1234) AND (attribute_id = 5))"]
  end

  it "should have the setter method respect the :left_primary_key and :right_primary_key option" do
    @c2.one_through_one :attribute, :class => @c1, :left_primary_key=>:xxx, :right_primary_key=>:yyy
    attrib = @c1.new(:id=>3, :yyy=>7)
    DB.fetch = []
    o = @c2.new(:id => 1234, :xxx=>5)
    o.attribute = nil
    DB.sqls.must_equal ["SELECT * FROM attributes_nodes WHERE (node_id = 5) LIMIT 1"]

    o.attribute = attrib
    DB.sqls.must_equal ["SELECT * FROM attributes_nodes WHERE (node_id = 5) LIMIT 1",
      "INSERT INTO attributes_nodes (attribute_id, node_id) VALUES (7, 5)"]

    DB.fetch = {:node_id=>1234, :attribute_id=>9}
    o.attribute = nil
    DB.sqls.must_equal ["SELECT * FROM attributes_nodes WHERE (node_id = 5) LIMIT 1",
      "DELETE FROM attributes_nodes WHERE ((node_id = 5) AND (attribute_id = 9))"]

    o.attribute = attrib
    DB.sqls.must_equal ["SELECT * FROM attributes_nodes WHERE (node_id = 5) LIMIT 1",
      "UPDATE attributes_nodes SET attribute_id = 7 WHERE ((node_id = 5) AND (attribute_id = 9))"]
  end
    
  it "should have the setter method respect composite keys" do
    @c2.one_through_one :attribute, :class => @c1, :left_key=>[:node_id, :y], :left_primary_key=>[:id, :x], :right_key=>[:attribute_id, :z], :right_primary_key=>[:id, :w]
    attrib = @c1.load(:id=>3, :w=>7)
    @c1.def_column_alias :w, :w
    DB.fetch = []
    o = @c2.new(:id => 1234, :x=>5)
    o.attribute = nil
    DB.sqls.must_equal ["SELECT * FROM attributes_nodes WHERE ((node_id = 1234) AND (y = 5)) LIMIT 1"]

    o.attribute = attrib
    DB.sqls.must_equal ["SELECT * FROM attributes_nodes WHERE ((node_id = 1234) AND (y = 5)) LIMIT 1",
      "INSERT INTO attributes_nodes (attribute_id, z, node_id, y) VALUES (3, 7, 1234, 5)"]

    DB.fetch = {:node_id=>1234, :attribute_id=>10, :y=>6, :z=>8}
    o.attribute = nil
    DB.sqls.must_equal ["SELECT * FROM attributes_nodes WHERE ((node_id = 1234) AND (y = 5)) LIMIT 1",
      "DELETE FROM attributes_nodes WHERE ((node_id = 1234) AND (y = 5) AND (attribute_id = 10) AND (z = 8))"]

    o.attribute = attrib
    DB.sqls.must_equal ["SELECT * FROM attributes_nodes WHERE ((node_id = 1234) AND (y = 5)) LIMIT 1",
      "UPDATE attributes_nodes SET attribute_id = 3, z = 7 WHERE ((node_id = 1234) AND (y = 5) AND (attribute_id = 10) AND (z = 8))"]
  end

  it "should raise an error if the current model object that doesn't have a valid primary key" do
    @c2.one_through_one :attribute, :class => @c1
    p = @c2.new
    c = @c2.load(:id=>123)
    proc{c.attribute = p}.must_raise(Sequel::Error)
  end

  it "should raise an error if the associated object that doesn't have a valid primary key" do
    @c2.one_through_one :attribute, :class => @c1
    p = @c2.new
    c = @c2.load(:id=>123)
    proc{p.attribute = c}.must_raise(Sequel::Error)
  end

  it "should make the change to the foreign_key value inside a _association= method" do
    @c2.one_through_one :attribute, :class => @c1
    @c2.private_instance_methods.must_include(:_attribute=)
    attrib = @c1.new(:id=>3)
    o = @c2.new(:id => 1234)
    def o._attribute=(x)
      @x = x
    end
    o.attribute = attrib
    o.instance_variable_get(:@x).must_equal attrib
  end

  it "should have a :setter option define the _association= method" do
    @c2.one_through_one :attribute, :class => @c1, :setter=>proc{|x| @x = x}
    attrib = @c1.new(:id=>3)
    o = @c2.new(:id => 1234)
    o.attribute = attrib
    o.instance_variable_get(:@x).must_equal attrib
  end

  it "should support (before|after)_set callbacks" do
    h = []
    @c2.one_through_one :attribute, :class => @c1, :before_set=>[proc{|x,y| h << x.pk; h << (y ? -y.pk : :y)}, :blah], :after_set=>proc{h << :l}
    @c2.class_eval do
      self::Foo = h
      def blah(x)
        model::Foo << (x ? x.pk : :x)
      end
    end
    attrib = @c1.new(:id=>3)
    o = @c2.new(:id => 1234)
    h.must_equal []
    o.attribute = attrib
    h.must_equal [1234, -3, 3, :l]
    o.attribute = nil
    h.must_equal [1234, -3, 3, :l, 1234, :y, :x, :l]
  end

  it "should have association dataset use false condition if any key is nil" do
    @c1.one_through_one :attribute, :class => @c1, :left_primary_key=>:y
    @c1.load(:id=>1).attribute_dataset.sql.must_equal "SELECT attributes.* FROM attributes INNER JOIN attributes_attributes ON (attributes_attributes.attribute_id = attributes.id) WHERE 'f' LIMIT 1"
  end
end

describe "Filtering by associations" do
  before(:all) do
    db = Sequel.mock
    db.extend_datasets do
      def supports_window_functions?; true; end
      def supports_distinct_on?; true; end
    end
    @Album = Class.new(Sequel::Model(db[:albums]))
    artist = @Artist = Class.new(Sequel::Model(db[:artists]))
    tag = @Tag = Class.new(Sequel::Model(db[:tags]))
    track = @Track = Class.new(Sequel::Model(db[:tracks]))
    album_info = @AlbumInfo = Class.new(Sequel::Model(db[:album_infos]))
    @Artist.columns :id, :id1, :id2
    @Tag.columns :id, :tid1, :tid2
    @Track.columns :id, :album_id, :album_id1, :album_id2
    @AlbumInfo.columns :id, :album_id, :album_id1, :album_id2
    @Album.class_eval do
      columns :id, :id1, :id2, :artist_id, :artist_id1, :artist_id2
      b = lambda{|ds| ds.where(:name=>'B')}
      c = {:name=>'A'}

      many_to_one :artist, :class=>artist, :key=>:artist_id
      one_to_many :tracks, :class=>track, :key=>:album_id
      one_to_one :track, :class=>track, :key=>:album_id
      one_to_one :album_info, :class=>album_info, :key=>:album_id
      many_to_many :tags, :class=>tag, :left_key=>:album_id, :join_table=>:albums_tags, :right_key=>:tag_id

      many_to_one :a_artist, :clone=>:artist, :conditions=>c
      one_to_many :a_tracks, :clone=>:tracks, :conditions=>c
      one_to_one :a_album_info, :clone=>:album_info, :conditions=>c
      many_to_many :a_tags, :clone=>:tags, :conditions=>c

      many_to_one :b_artist, :clone=>:artist, &b
      one_to_many :b_tracks, :clone=>:tracks, &b
      one_to_one :b_album_info, :clone=>:album_info, &b
      many_to_many :b_tags, :clone=>:tags, &b

      one_to_many :l_tracks, :clone=>:tracks, :limit=>10
      one_to_one :l_track, :clone=>:tracks, :order=>:name
      many_to_many :l_tags, :clone=>:tags, :limit=>10
      one_through_one :l_tag, :clone=>:tags, :order=>:name

      one_to_many :al_tracks, :clone=>:l_tracks, :conditions=>c
      one_to_one :al_track, :clone=>:l_track, :conditions=>c
      many_to_many :al_tags, :clone=>:l_tags, :conditions=>c
      one_through_one :al_tag, :clone=>:l_tag, :conditions=>c

      many_to_one :cartist, :class=>artist, :key=>[:artist_id1, :artist_id2], :primary_key=>[:id1, :id2]
      one_to_many :ctracks, :class=>track, :key=>[:album_id1, :album_id2], :primary_key=>[:id1, :id2]
      one_to_one :calbum_info, :class=>album_info, :key=>[:album_id1, :album_id2], :primary_key=>[:id1, :id2]
      many_to_many :ctags, :class=>tag, :left_key=>[:album_id1, :album_id2], :left_primary_key=>[:id1, :id2], :right_key=>[:tag_id1, :tag_id2], :right_primary_key=>[:tid1, :tid2], :join_table=>:albums_tags

      many_to_one :a_cartist, :clone=>:cartist, :conditions=>c
      one_to_many :a_ctracks, :clone=>:ctracks, :conditions=>c
      one_to_one :a_calbum_info, :clone=>:calbum_info, :conditions=>c
      many_to_many :a_ctags, :clone=>:ctags, :conditions=>c

      many_to_one :b_cartist, :clone=>:cartist, &b
      one_to_many :b_ctracks, :clone=>:ctracks, &b
      one_to_one :b_calbum_info, :clone=>:calbum_info, &b
      many_to_many :b_ctags, :clone=>:ctags, &b

      one_to_many :l_ctracks, :clone=>:ctracks, :limit=>10
      one_to_one :l_ctrack, :clone=>:ctracks, :order=>:name
      many_to_many :l_ctags, :clone=>:ctags, :limit=>10
      one_through_one :l_ctag, :clone=>:ctags, :order=>:name

      one_to_many :al_ctracks, :clone=>:l_ctracks, :conditions=>c
      one_to_one :al_ctrack, :clone=>:l_ctrack, :conditions=>c
      many_to_many :al_ctags, :clone=>:l_ctags, :conditions=>c
      one_through_one :al_ctag, :clone=>:l_ctag, :conditions=>c
    end
  end
  after do
    @Album.default_eager_limit_strategy = true
  end

  it "should be able to filter on many_to_one associations" do
    @Album.filter(:artist=>@Artist.load(:id=>3)).sql.must_equal 'SELECT * FROM albums WHERE (albums.artist_id = 3)'
  end

  it "should be able to filter on one_to_many associations" do
    @Album.filter(:tracks=>@Track.load(:album_id=>3)).sql.must_equal 'SELECT * FROM albums WHERE (albums.id = 3)'
  end

  it "should be able to filter on one_to_one associations" do
    @Album.filter(:album_info=>@AlbumInfo.load(:album_id=>3)).sql.must_equal 'SELECT * FROM albums WHERE (albums.id = 3)'
  end

  it "should be able to filter on many_to_many associations" do
    @Album.filter(:tags=>@Tag.load(:id=>3)).sql.must_equal 'SELECT * FROM albums WHERE (albums.id IN (SELECT albums_tags.album_id FROM albums_tags WHERE ((albums_tags.tag_id = 3) AND (albums_tags.album_id IS NOT NULL))))'
  end

  it "should be able to filter on many_to_one associations with :conditions" do
    @Album.filter(:a_artist=>@Artist.load(:id=>3)).sql.must_equal "SELECT * FROM albums WHERE (albums.artist_id IN (SELECT artists.id FROM artists WHERE ((name = 'A') AND (artists.id IS NOT NULL) AND (artists.id = 3))))"
  end

  it "should be able to filter on one_to_many associations with :conditions" do
    @Album.filter(:a_tracks=>@Track.load(:id=>5, :album_id=>3)).sql.must_equal "SELECT * FROM albums WHERE (albums.id IN (SELECT tracks.album_id FROM tracks WHERE ((name = 'A') AND (tracks.album_id IS NOT NULL) AND (tracks.id = 5))))"
  end

  it "should be able to filter on one_to_one associations with :conditions" do
    @Album.filter(:a_album_info=>@AlbumInfo.load(:id=>5, :album_id=>3)).sql.must_equal "SELECT * FROM albums WHERE (albums.id IN (SELECT album_infos.album_id FROM album_infos WHERE ((name = 'A') AND (album_infos.album_id IS NOT NULL) AND (album_infos.id = 5))))"
  end

  it "should be able to filter on many_to_many associations with :conditions" do
    @Album.filter(:a_tags=>@Tag.load(:id=>3)).sql.must_equal "SELECT * FROM albums WHERE (albums.id IN (SELECT albums_tags.album_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) WHERE ((name = 'A') AND (albums_tags.album_id IS NOT NULL) AND (tags.id = 3))))"
  end

  it "should be able to filter on many_to_one associations with block" do
    @Album.filter(:b_artist=>@Artist.load(:id=>3)).sql.must_equal "SELECT * FROM albums WHERE (albums.artist_id IN (SELECT artists.id FROM artists WHERE ((name = 'B') AND (artists.id IS NOT NULL) AND (artists.id = 3))))"
  end

  it "should be able to filter on one_to_many associations with block" do
    @Album.filter(:b_tracks=>@Track.load(:id=>5, :album_id=>3)).sql.must_equal "SELECT * FROM albums WHERE (albums.id IN (SELECT tracks.album_id FROM tracks WHERE ((name = 'B') AND (tracks.album_id IS NOT NULL) AND (tracks.id = 5))))"
  end

  it "should be able to filter on one_to_one associations with block" do
    @Album.filter(:b_album_info=>@AlbumInfo.load(:id=>5, :album_id=>3)).sql.must_equal "SELECT * FROM albums WHERE (albums.id IN (SELECT album_infos.album_id FROM album_infos WHERE ((name = 'B') AND (album_infos.album_id IS NOT NULL) AND (album_infos.id = 5))))"
  end

  it "should be able to filter on many_to_many associations with block" do
    @Album.filter(:b_tags=>@Tag.load(:id=>3)).sql.must_equal "SELECT * FROM albums WHERE (albums.id IN (SELECT albums_tags.album_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) WHERE ((name = 'B') AND (albums_tags.album_id IS NOT NULL) AND (tags.id = 3))))"
  end

  it "should be able to filter on one_to_many associations with :limit" do
    @Album.filter(:l_tracks=>@Track.load(:id=>5, :album_id=>3)).sql.must_equal "SELECT * FROM albums WHERE (albums.id IN (SELECT tracks.album_id FROM tracks WHERE ((tracks.album_id IS NOT NULL) AND (tracks.id IN (SELECT id FROM (SELECT tracks.id, row_number() OVER (PARTITION BY tracks.album_id) AS x_sequel_row_number_x FROM tracks) AS t1 WHERE (x_sequel_row_number_x <= 10))) AND (tracks.id = 5))))"
  end

  it "should be able to filter on one_to_one associations with :order" do
    @Album.filter(:l_track=>@Track.load(:id=>5, :album_id=>3)).sql.must_equal "SELECT * FROM albums WHERE (albums.id IN (SELECT tracks.album_id FROM tracks WHERE ((tracks.album_id IS NOT NULL) AND (tracks.id IN (SELECT DISTINCT ON (tracks.album_id) tracks.id FROM tracks ORDER BY tracks.album_id, name)) AND (tracks.id = 5))))"
  end

  it "should be able to filter on one_to_one associations with :filter_limit_strategy" do
    @Album.one_to_one :l_track2, :clone=>:track, :filter_limit_strategy=>:window_function
    @Album.filter(:l_track2=>@Track.load(:id=>5, :album_id=>3)).sql.must_equal "SELECT * FROM albums WHERE (albums.id IN (SELECT tracks.album_id FROM tracks WHERE ((tracks.album_id IS NOT NULL) AND (tracks.id IN (SELECT id FROM (SELECT tracks.id, row_number() OVER (PARTITION BY tracks.album_id) AS x_sequel_row_number_x FROM tracks) AS t1 WHERE (x_sequel_row_number_x = 1))) AND (tracks.id = 5))))"
  end

  it "should be able to filter on one_to_one associations with :eager_limit_strategy" do
    @Album.one_to_one :l_track2, :clone=>:track, :eager_limit_strategy=>:window_function
    @Album.filter(:l_track2=>@Track.load(:id=>5, :album_id=>3)).sql.must_equal "SELECT * FROM albums WHERE (albums.id IN (SELECT tracks.album_id FROM tracks WHERE ((tracks.album_id IS NOT NULL) AND (tracks.id IN (SELECT id FROM (SELECT tracks.id, row_number() OVER (PARTITION BY tracks.album_id) AS x_sequel_row_number_x FROM tracks) AS t1 WHERE (x_sequel_row_number_x = 1))) AND (tracks.id = 5))))"
  end

  it "should be able to filter on one_to_one associations with :order and :filter_limit_strategy" do
    @Album.one_to_one :l_track2, :clone=>:l_track, :filter_limit_strategy=>:window_function
    @Album.filter(:l_track2=>@Track.load(:id=>5, :album_id=>3)).sql.must_equal "SELECT * FROM albums WHERE (albums.id IN (SELECT tracks.album_id FROM tracks WHERE ((tracks.album_id IS NOT NULL) AND (tracks.id IN (SELECT id FROM (SELECT tracks.id, row_number() OVER (PARTITION BY tracks.album_id ORDER BY name) AS x_sequel_row_number_x FROM tracks) AS t1 WHERE (x_sequel_row_number_x = 1))) AND (tracks.id = 5))))"
  end

  it "should be able to filter on one_to_one associations with :order and :eager_limit_strategy" do
    @Album.one_to_one :l_track2, :clone=>:l_track, :eager_limit_strategy=>:window_function
    @Album.filter(:l_track2=>@Track.load(:id=>5, :album_id=>3)).sql.must_equal "SELECT * FROM albums WHERE (albums.id IN (SELECT tracks.album_id FROM tracks WHERE ((tracks.album_id IS NOT NULL) AND (tracks.id IN (SELECT id FROM (SELECT tracks.id, row_number() OVER (PARTITION BY tracks.album_id ORDER BY name) AS x_sequel_row_number_x FROM tracks) AS t1 WHERE (x_sequel_row_number_x = 1))) AND (tracks.id = 5))))"
  end

  it "should be able to filter on one_to_one associations with :order and Model.default_eager_limit_strategy" do
    @Album.default_eager_limit_strategy = :window_function
    @Album.one_to_one :l_track2, :clone=>:l_track
    @Album.filter(:l_track2=>@Track.load(:id=>5, :album_id=>3)).sql.must_equal "SELECT * FROM albums WHERE (albums.id IN (SELECT tracks.album_id FROM tracks WHERE ((tracks.album_id IS NOT NULL) AND (tracks.id IN (SELECT id FROM (SELECT tracks.id, row_number() OVER (PARTITION BY tracks.album_id ORDER BY name) AS x_sequel_row_number_x FROM tracks) AS t1 WHERE (x_sequel_row_number_x = 1))) AND (tracks.id = 5))))"
  end

  it "should be able to filter on one_to_one associations with :order and :eager_limit_strategy=>:union" do
    @Album.one_to_one :l_track2, :clone=>:l_track, :eager_limit_strategy=>:union
    @Album.filter(:l_track2=>@Track.load(:id=>5, :album_id=>3)).sql.must_equal "SELECT * FROM albums WHERE (albums.id IN (SELECT tracks.album_id FROM tracks WHERE ((tracks.album_id IS NOT NULL) AND (tracks.id IN (SELECT DISTINCT ON (tracks.album_id) tracks.id FROM tracks ORDER BY tracks.album_id, name)) AND (tracks.id = 5))))"
  end

  it "should be able to filter on one_to_one associations with :order and :eager_limit_strategy=>:ruby" do
    @Album.one_to_one :l_track2, :clone=>:l_track, :eager_limit_strategy=>:ruby
    @Album.filter(:l_track2=>@Track.load(:id=>5, :album_id=>3)).sql.must_equal "SELECT * FROM albums WHERE (albums.id IN (SELECT tracks.album_id FROM tracks WHERE ((tracks.album_id IS NOT NULL) AND (tracks.id IN (SELECT DISTINCT ON (tracks.album_id) tracks.id FROM tracks ORDER BY tracks.album_id, name)) AND (tracks.id = 5))))"
  end

  it "should be able to filter on one_to_one associations with :filter_limit_strategy :correlated_subquery" do
    @Album.one_to_one :l_track2, :clone=>:track, :filter_limit_strategy=>:correlated_subquery
    @Album.filter(:l_track2=>@Track.load(:id=>5, :album_id=>3)).sql.must_equal "SELECT * FROM albums WHERE (albums.id IN (SELECT tracks.album_id FROM tracks WHERE ((tracks.album_id IS NOT NULL) AND (tracks.id IN (SELECT t1.id FROM tracks AS t1 WHERE (t1.album_id = tracks.album_id) LIMIT 1)) AND (tracks.id = 5))))"
  end

  it "should be able to filter on many_to_many associations with :limit" do
    @Album.filter(:l_tags=>@Tag.load(:id=>3)).sql.must_equal "SELECT * FROM albums WHERE (albums.id IN (SELECT albums_tags.album_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) WHERE ((albums_tags.album_id IS NOT NULL) AND ((albums_tags.album_id, tags.id) IN (SELECT b, c FROM (SELECT albums_tags.album_id AS b, tags.id AS c, row_number() OVER (PARTITION BY albums_tags.album_id) AS x_sequel_row_number_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id)) AS t1 WHERE (x_sequel_row_number_x <= 10))) AND (tags.id = 3))))"
  end

  it "should be able to filter on one_through_one associations with :order" do
    @Album.filter(:l_tag=>@Tag.load(:id=>3)).sql.must_equal "SELECT * FROM albums WHERE (albums.id IN (SELECT albums_tags.album_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) WHERE ((albums_tags.album_id IS NOT NULL) AND ((albums_tags.album_id, tags.id) IN (SELECT DISTINCT ON (albums_tags.album_id) albums_tags.album_id, tags.id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) ORDER BY albums_tags.album_id, name)) AND (tags.id = 3))))"
  end

  it "should be able to filter on one_to_many associations with :limit and :conditions" do
    @Album.filter(:al_tracks=>@Track.load(:id=>5, :album_id=>3)).sql.must_equal "SELECT * FROM albums WHERE (albums.id IN (SELECT tracks.album_id FROM tracks WHERE ((name = 'A') AND (tracks.album_id IS NOT NULL) AND (tracks.id IN (SELECT id FROM (SELECT tracks.id, row_number() OVER (PARTITION BY tracks.album_id) AS x_sequel_row_number_x FROM tracks WHERE (name = 'A')) AS t1 WHERE (x_sequel_row_number_x <= 10))) AND (tracks.id = 5))))"
  end

  it "should be able to filter on one_to_one associations with :order and :conditions" do
    @Album.filter(:al_track=>@Track.load(:id=>5, :album_id=>3)).sql.must_equal "SELECT * FROM albums WHERE (albums.id IN (SELECT tracks.album_id FROM tracks WHERE ((name = 'A') AND (tracks.album_id IS NOT NULL) AND (tracks.id IN (SELECT DISTINCT ON (tracks.album_id) tracks.id FROM tracks WHERE (name = 'A') ORDER BY tracks.album_id, name)) AND (tracks.id = 5))))"
  end

  it "should be able to filter on many_to_many associations with :limit and :conditions" do
    @Album.filter(:al_tags=>@Tag.load(:id=>3)).sql.must_equal "SELECT * FROM albums WHERE (albums.id IN (SELECT albums_tags.album_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) WHERE ((name = 'A') AND (albums_tags.album_id IS NOT NULL) AND ((albums_tags.album_id, tags.id) IN (SELECT b, c FROM (SELECT albums_tags.album_id AS b, tags.id AS c, row_number() OVER (PARTITION BY albums_tags.album_id) AS x_sequel_row_number_x FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) WHERE (name = 'A')) AS t1 WHERE (x_sequel_row_number_x <= 10))) AND (tags.id = 3))))"
  end

  it "should be able to filter on one_through_one associations with :order and :conditions" do
    @Album.filter(:al_tag=>@Tag.load(:id=>3)).sql.must_equal "SELECT * FROM albums WHERE (albums.id IN (SELECT albums_tags.album_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) WHERE ((name = 'A') AND (albums_tags.album_id IS NOT NULL) AND ((albums_tags.album_id, tags.id) IN (SELECT DISTINCT ON (albums_tags.album_id) albums_tags.album_id, tags.id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) WHERE (name = 'A') ORDER BY albums_tags.album_id, name)) AND (tags.id = 3))))"
  end

  it "should be able to filter on many_to_one associations with composite keys" do
    @Album.filter(:cartist=>@Artist.load(:id1=>3, :id2=>4)).sql.must_equal 'SELECT * FROM albums WHERE ((albums.artist_id1 = 3) AND (albums.artist_id2 = 4))'
  end

  it "should be able to filter on one_to_many associations with composite keys" do
    @Album.filter(:ctracks=>@Track.load(:album_id1=>3, :album_id2=>4)).sql.must_equal 'SELECT * FROM albums WHERE ((albums.id1 = 3) AND (albums.id2 = 4))'
  end

  it "should be able to filter on one_to_one associations with composite keys" do
    @Album.filter(:calbum_info=>@AlbumInfo.load(:album_id1=>3, :album_id2=>4)).sql.must_equal 'SELECT * FROM albums WHERE ((albums.id1 = 3) AND (albums.id2 = 4))' 
  end

  it "should be able to filter on many_to_many associations with composite keys" do
    @Album.filter(:ctags=>@Tag.load(:tid1=>3, :tid2=>4)).sql.must_equal 'SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN (SELECT albums_tags.album_id1, albums_tags.album_id2 FROM albums_tags WHERE ((albums_tags.tag_id1 = 3) AND (albums_tags.tag_id2 = 4) AND (albums_tags.album_id1 IS NOT NULL) AND (albums_tags.album_id2 IS NOT NULL))))'
  end

  it "should be able to filter on many_to_one associations with :conditions and composite keys" do
    @Album.filter(:a_cartist=>@Artist.load(:id=>5, :id1=>3, :id2=>4)).sql.must_equal "SELECT * FROM albums WHERE ((albums.artist_id1, albums.artist_id2) IN (SELECT artists.id1, artists.id2 FROM artists WHERE ((name = 'A') AND (artists.id1 IS NOT NULL) AND (artists.id2 IS NOT NULL) AND (artists.id = 5))))"
  end

  it "should be able to filter on one_to_many associations with :conditions and composite keys" do
    @Album.filter(:a_ctracks=>@Track.load(:id=>5, :album_id1=>3, :album_id2=>4)).sql.must_equal "SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN (SELECT tracks.album_id1, tracks.album_id2 FROM tracks WHERE ((name = 'A') AND (tracks.album_id1 IS NOT NULL) AND (tracks.album_id2 IS NOT NULL) AND (tracks.id = 5))))"
  end

  it "should be able to filter on one_to_one associations with :conditions and composite keys" do
    @Album.filter(:a_calbum_info=>@AlbumInfo.load(:id=>5, :album_id1=>3, :album_id2=>4)).sql.must_equal "SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN (SELECT album_infos.album_id1, album_infos.album_id2 FROM album_infos WHERE ((name = 'A') AND (album_infos.album_id1 IS NOT NULL) AND (album_infos.album_id2 IS NOT NULL) AND (album_infos.id = 5))))"
  end

  it "should be able to filter on many_to_many associations with block and composite keys" do
    @Album.filter(:a_ctags=>@Tag.load(:id=>5, :tid1=>3, :tid2=>4)).sql.must_equal "SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN (SELECT albums_tags.album_id1, albums_tags.album_id2 FROM tags INNER JOIN albums_tags ON ((albums_tags.tag_id1 = tags.tid1) AND (albums_tags.tag_id2 = tags.tid2)) WHERE ((name = 'A') AND (albums_tags.album_id1 IS NOT NULL) AND (albums_tags.album_id2 IS NOT NULL) AND (tags.id = 5))))"
  end

  it "should be able to filter on many_to_one associations with block and composite keys" do
    @Album.filter(:b_cartist=>@Artist.load(:id=>5, :id1=>3, :id2=>4)).sql.must_equal "SELECT * FROM albums WHERE ((albums.artist_id1, albums.artist_id2) IN (SELECT artists.id1, artists.id2 FROM artists WHERE ((name = 'B') AND (artists.id1 IS NOT NULL) AND (artists.id2 IS NOT NULL) AND (artists.id = 5))))"
  end

  it "should be able to filter on one_to_many associations with block and composite keys" do
    @Album.filter(:b_ctracks=>@Track.load(:id=>5, :album_id1=>3, :album_id2=>4)).sql.must_equal "SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN (SELECT tracks.album_id1, tracks.album_id2 FROM tracks WHERE ((name = 'B') AND (tracks.album_id1 IS NOT NULL) AND (tracks.album_id2 IS NOT NULL) AND (tracks.id = 5))))"
  end

  it "should be able to filter on one_to_one associations with block and composite keys" do
    @Album.filter(:b_calbum_info=>@AlbumInfo.load(:id=>5, :album_id1=>3, :album_id2=>4)).sql.must_equal "SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN (SELECT album_infos.album_id1, album_infos.album_id2 FROM album_infos WHERE ((name = 'B') AND (album_infos.album_id1 IS NOT NULL) AND (album_infos.album_id2 IS NOT NULL) AND (album_infos.id = 5))))"
  end

  it "should be able to filter on many_to_many associations with block and composite keys" do
    @Album.filter(:b_ctags=>@Tag.load(:id=>5, :tid1=>3, :tid2=>4)).sql.must_equal "SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN (SELECT albums_tags.album_id1, albums_tags.album_id2 FROM tags INNER JOIN albums_tags ON ((albums_tags.tag_id1 = tags.tid1) AND (albums_tags.tag_id2 = tags.tid2)) WHERE ((name = 'B') AND (albums_tags.album_id1 IS NOT NULL) AND (albums_tags.album_id2 IS NOT NULL) AND (tags.id = 5))))"
  end

  it "should be able to filter on one_to_many associations with :limit and composite keys" do
    @Album.filter(:l_ctracks=>@Track.load(:id=>5, :album_id1=>3, :album_id2=>4)).sql.must_equal "SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN (SELECT tracks.album_id1, tracks.album_id2 FROM tracks WHERE ((tracks.album_id1 IS NOT NULL) AND (tracks.album_id2 IS NOT NULL) AND (tracks.id IN (SELECT id FROM (SELECT tracks.id, row_number() OVER (PARTITION BY tracks.album_id1, tracks.album_id2) AS x_sequel_row_number_x FROM tracks) AS t1 WHERE (x_sequel_row_number_x <= 10))) AND (tracks.id = 5))))"
  end

  it "should be able to filter on one_to_many associations with composite keys and :filter_limit_strategy :correlated_subquery" do
    @Album.one_to_one :l_ctracks2, :clone=>:l_ctracks, :filter_limit_strategy=>:correlated_subquery
    @Album.filter(:l_ctracks2=>@Track.load(:id=>5, :album_id1=>3, :album_id2=>4)).sql.must_equal "SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN (SELECT tracks.album_id1, tracks.album_id2 FROM tracks WHERE ((tracks.album_id1 IS NOT NULL) AND (tracks.album_id2 IS NOT NULL) AND (tracks.id IN (SELECT t1.id FROM tracks AS t1 WHERE ((t1.album_id1 = tracks.album_id1) AND (t1.album_id2 = tracks.album_id2)) LIMIT 1)) AND (tracks.id = 5))))"
  end

  it "should be able to filter on one_to_one associations with :order and composite keys" do
    @Album.filter(:l_ctrack=>@Track.load(:id=>5, :album_id1=>3, :album_id2=>4)).sql.must_equal "SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN (SELECT tracks.album_id1, tracks.album_id2 FROM tracks WHERE ((tracks.album_id1 IS NOT NULL) AND (tracks.album_id2 IS NOT NULL) AND (tracks.id IN (SELECT DISTINCT ON (tracks.album_id1, tracks.album_id2) tracks.id FROM tracks ORDER BY tracks.album_id1, tracks.album_id2, name)) AND (tracks.id = 5))))"
  end

  it "should be able to filter on many_to_many associations with :limit and composite keys" do
    @Album.filter(:l_ctags=>@Tag.load(:id=>5, :tid1=>3, :tid2=>4)).sql.must_equal "SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN (SELECT albums_tags.album_id1, albums_tags.album_id2 FROM tags INNER JOIN albums_tags ON ((albums_tags.tag_id1 = tags.tid1) AND (albums_tags.tag_id2 = tags.tid2)) WHERE ((albums_tags.album_id1 IS NOT NULL) AND (albums_tags.album_id2 IS NOT NULL) AND ((albums_tags.album_id1, albums_tags.album_id2, tags.id) IN (SELECT b, c, d FROM (SELECT albums_tags.album_id1 AS b, albums_tags.album_id2 AS c, tags.id AS d, row_number() OVER (PARTITION BY albums_tags.album_id1, albums_tags.album_id2) AS x_sequel_row_number_x FROM tags INNER JOIN albums_tags ON ((albums_tags.tag_id1 = tags.tid1) AND (albums_tags.tag_id2 = tags.tid2))) AS t1 WHERE (x_sequel_row_number_x <= 10))) AND (tags.id = 5))))"
  end

  it "should be able to filter on one_through_one associations with :order and composite keys" do
    @Album.filter(:l_ctag=>@Tag.load(:id=>5, :tid1=>3, :tid2=>4)).sql.must_equal "SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN (SELECT albums_tags.album_id1, albums_tags.album_id2 FROM tags INNER JOIN albums_tags ON ((albums_tags.tag_id1 = tags.tid1) AND (albums_tags.tag_id2 = tags.tid2)) WHERE ((albums_tags.album_id1 IS NOT NULL) AND (albums_tags.album_id2 IS NOT NULL) AND ((albums_tags.album_id1, albums_tags.album_id2, tags.id) IN (SELECT DISTINCT ON (albums_tags.album_id1, albums_tags.album_id2) albums_tags.album_id1, albums_tags.album_id2, tags.id FROM tags INNER JOIN albums_tags ON ((albums_tags.tag_id1 = tags.tid1) AND (albums_tags.tag_id2 = tags.tid2)) ORDER BY albums_tags.album_id1, albums_tags.album_id2, name)) AND (tags.id = 5))))"
  end

  it "should be able to filter on one_to_many associations with :limit and :conditions and composite keys" do
    @Album.filter(:al_ctracks=>@Track.load(:id=>5, :album_id1=>3, :album_id2=>4)).sql.must_equal "SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN (SELECT tracks.album_id1, tracks.album_id2 FROM tracks WHERE ((name = 'A') AND (tracks.album_id1 IS NOT NULL) AND (tracks.album_id2 IS NOT NULL) AND (tracks.id IN (SELECT id FROM (SELECT tracks.id, row_number() OVER (PARTITION BY tracks.album_id1, tracks.album_id2) AS x_sequel_row_number_x FROM tracks WHERE (name = 'A')) AS t1 WHERE (x_sequel_row_number_x <= 10))) AND (tracks.id = 5))))"
  end

  it "should be able to filter on one_to_one associations with :order and :conditions and composite keys" do
    @Album.filter(:al_ctrack=>@Track.load(:id=>5, :album_id1=>3, :album_id2=>4)).sql.must_equal "SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN (SELECT tracks.album_id1, tracks.album_id2 FROM tracks WHERE ((name = 'A') AND (tracks.album_id1 IS NOT NULL) AND (tracks.album_id2 IS NOT NULL) AND (tracks.id IN (SELECT DISTINCT ON (tracks.album_id1, tracks.album_id2) tracks.id FROM tracks WHERE (name = 'A') ORDER BY tracks.album_id1, tracks.album_id2, name)) AND (tracks.id = 5))))"
  end

  it "should be able to filter on many_to_many associations with :limit and :conditions and composite keys" do
    @Album.filter(:al_ctags=>@Tag.load(:id=>5, :tid1=>3, :tid2=>4)).sql.must_equal "SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN (SELECT albums_tags.album_id1, albums_tags.album_id2 FROM tags INNER JOIN albums_tags ON ((albums_tags.tag_id1 = tags.tid1) AND (albums_tags.tag_id2 = tags.tid2)) WHERE ((name = 'A') AND (albums_tags.album_id1 IS NOT NULL) AND (albums_tags.album_id2 IS NOT NULL) AND ((albums_tags.album_id1, albums_tags.album_id2, tags.id) IN (SELECT b, c, d FROM (SELECT albums_tags.album_id1 AS b, albums_tags.album_id2 AS c, tags.id AS d, row_number() OVER (PARTITION BY albums_tags.album_id1, albums_tags.album_id2) AS x_sequel_row_number_x FROM tags INNER JOIN albums_tags ON ((albums_tags.tag_id1 = tags.tid1) AND (albums_tags.tag_id2 = tags.tid2)) WHERE (name = 'A')) AS t1 WHERE (x_sequel_row_number_x <= 10))) AND (tags.id = 5))))"
  end

  it "should be able to filter on one_through_one associations with :order and :conditions and composite keys" do
    @Album.filter(:al_ctag=>@Tag.load(:id=>5, :tid1=>3, :tid2=>4)).sql.must_equal "SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN (SELECT albums_tags.album_id1, albums_tags.album_id2 FROM tags INNER JOIN albums_tags ON ((albums_tags.tag_id1 = tags.tid1) AND (albums_tags.tag_id2 = tags.tid2)) WHERE ((name = 'A') AND (albums_tags.album_id1 IS NOT NULL) AND (albums_tags.album_id2 IS NOT NULL) AND ((albums_tags.album_id1, albums_tags.album_id2, tags.id) IN (SELECT DISTINCT ON (albums_tags.album_id1, albums_tags.album_id2) albums_tags.album_id1, albums_tags.album_id2, tags.id FROM tags INNER JOIN albums_tags ON ((albums_tags.tag_id1 = tags.tid1) AND (albums_tags.tag_id2 = tags.tid2)) WHERE (name = 'A') ORDER BY albums_tags.album_id1, albums_tags.album_id2, name)) AND (tags.id = 5))))"
  end

  it "should work inside a complex filter" do
    artist = @Artist.load(:id=>3)
    @Album.filter{foo & {:artist=>artist}}.sql.must_equal 'SELECT * FROM albums WHERE (foo AND (albums.artist_id = 3))'
    track = @Track.load(:album_id=>4)
    @Album.filter{foo & [[:artist, artist], [:tracks, track]]}.sql.must_equal 'SELECT * FROM albums WHERE (foo AND (albums.artist_id = 3) AND (albums.id = 4))'
  end

  it "should raise for an invalid association name" do
    proc{@Album.filter(:foo=>@Artist.load(:id=>3)).sql}.must_raise(Sequel::Error)
  end

  it "should raise for an invalid association type" do
    @Album.many_to_many :iatags, :clone=>:tags
    @Album.association_reflection(:iatags)[:type] = :foo
    proc{@Album.filter(:iatags=>@Tag.load(:id=>3)).sql}.must_raise(Sequel::Error)
  end

  it "should raise for an invalid associated object class " do
    proc{@Album.filter(:tags=>@Artist.load(:id=>3)).sql}.must_raise(Sequel::Error)
  end

  it "should raise for an invalid associated object class when multiple objects are used" do
    proc{@Album.filter(:tags=>[@Tag.load(:id=>3), @Artist.load(:id=>3)]).sql}.must_raise(Sequel::Error)
  end

  it "should correctly handle case when a multiple value association is used" do
    proc{@Album.filter(:tags=>[@Tag.load(:id=>3), @Artist.load(:id=>3)]).sql}.must_raise(Sequel::Error)
  end

  it "should not affect non-association IN/NOT IN filtering with an empty array" do
    @Album.filter(:tag_id=>[]).sql.must_equal 'SELECT * FROM albums WHERE (1 = 0)'
    @Album.exclude(:tag_id=>[]).sql.must_equal 'SELECT * FROM albums WHERE (1 = 1)'
  end

  it "should work correctly in subclasses" do
    c = Class.new(@Album)
    c.many_to_one :sartist, :class=>@Artist
    c.filter(:sartist=>@Artist.load(:id=>3)).sql.must_equal 'SELECT * FROM albums WHERE (albums.sartist_id = 3)'
  end

  it "should be able to exclude on many_to_one associations" do
    @Album.exclude(:artist=>@Artist.load(:id=>3)).sql.must_equal 'SELECT * FROM albums WHERE ((albums.artist_id != 3) OR (albums.artist_id IS NULL))'
  end

  it "should be able to exclude on one_to_many associations" do
    @Album.exclude(:tracks=>@Track.load(:album_id=>3)).sql.must_equal 'SELECT * FROM albums WHERE ((albums.id != 3) OR (albums.id IS NULL))'
  end

  it "should be able to exclude on one_to_one associations" do
    @Album.exclude(:album_info=>@AlbumInfo.load(:album_id=>3)).sql.must_equal 'SELECT * FROM albums WHERE ((albums.id != 3) OR (albums.id IS NULL))'
  end

  it "should be able to exclude on many_to_many associations" do
    @Album.exclude(:tags=>@Tag.load(:id=>3)).sql.must_equal 'SELECT * FROM albums WHERE ((albums.id NOT IN (SELECT albums_tags.album_id FROM albums_tags WHERE ((albums_tags.tag_id = 3) AND (albums_tags.album_id IS NOT NULL)))) OR (albums.id IS NULL))'
  end

  it "should be able to exclude on many_to_one associations with :conditions" do
    @Album.exclude(:a_artist=>@Artist.load(:id=>3)).sql.must_equal "SELECT * FROM albums WHERE ((albums.artist_id NOT IN (SELECT artists.id FROM artists WHERE ((name = 'A') AND (artists.id IS NOT NULL) AND (artists.id = 3)))) OR (albums.artist_id IS NULL))"
  end

  it "should be able to exclude on one_to_many associations with :conditions" do
    @Album.exclude(:a_tracks=>@Track.load(:id=>5, :album_id=>3)).sql.must_equal "SELECT * FROM albums WHERE ((albums.id NOT IN (SELECT tracks.album_id FROM tracks WHERE ((name = 'A') AND (tracks.album_id IS NOT NULL) AND (tracks.id = 5)))) OR (albums.id IS NULL))"
  end

  it "should be able to exclude on one_to_one associations with :conditions" do
    @Album.exclude(:a_album_info=>@AlbumInfo.load(:id=>5, :album_id=>3)).sql.must_equal "SELECT * FROM albums WHERE ((albums.id NOT IN (SELECT album_infos.album_id FROM album_infos WHERE ((name = 'A') AND (album_infos.album_id IS NOT NULL) AND (album_infos.id = 5)))) OR (albums.id IS NULL))"
  end

  it "should be able to exclude on many_to_many associations with :conditions" do
    @Album.exclude(:a_tags=>@Tag.load(:id=>3)).sql.must_equal "SELECT * FROM albums WHERE ((albums.id NOT IN (SELECT albums_tags.album_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) WHERE ((name = 'A') AND (albums_tags.album_id IS NOT NULL) AND (tags.id = 3)))) OR (albums.id IS NULL))"
  end

  it "should be able to exclude on many_to_one associations with block" do
    @Album.exclude(:b_artist=>@Artist.load(:id=>3)).sql.must_equal "SELECT * FROM albums WHERE ((albums.artist_id NOT IN (SELECT artists.id FROM artists WHERE ((name = 'B') AND (artists.id IS NOT NULL) AND (artists.id = 3)))) OR (albums.artist_id IS NULL))"
  end

  it "should be able to exclude on one_to_many associations with block" do
    @Album.exclude(:b_tracks=>@Track.load(:id=>5, :album_id=>3)).sql.must_equal "SELECT * FROM albums WHERE ((albums.id NOT IN (SELECT tracks.album_id FROM tracks WHERE ((name = 'B') AND (tracks.album_id IS NOT NULL) AND (tracks.id = 5)))) OR (albums.id IS NULL))"
  end

  it "should be able to exclude on one_to_one associations with block" do
    @Album.exclude(:b_album_info=>@AlbumInfo.load(:id=>5, :album_id=>3)).sql.must_equal "SELECT * FROM albums WHERE ((albums.id NOT IN (SELECT album_infos.album_id FROM album_infos WHERE ((name = 'B') AND (album_infos.album_id IS NOT NULL) AND (album_infos.id = 5)))) OR (albums.id IS NULL))"
  end

  it "should be able to exclude on many_to_many associations with block" do
    @Album.exclude(:b_tags=>@Tag.load(:id=>3)).sql.must_equal "SELECT * FROM albums WHERE ((albums.id NOT IN (SELECT albums_tags.album_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) WHERE ((name = 'B') AND (albums_tags.album_id IS NOT NULL) AND (tags.id = 3)))) OR (albums.id IS NULL))"
  end

  it "should be able to exclude on many_to_one associations with composite keys" do
    @Album.exclude(:cartist=>@Artist.load(:id1=>3, :id2=>4)).sql.must_equal 'SELECT * FROM albums WHERE ((albums.artist_id1 != 3) OR (albums.artist_id2 != 4) OR (albums.artist_id1 IS NULL) OR (albums.artist_id2 IS NULL))'
  end

  it "should be able to exclude on one_to_many associations with composite keys" do
    @Album.exclude(:ctracks=>@Track.load(:album_id1=>3, :album_id2=>4)).sql.must_equal 'SELECT * FROM albums WHERE ((albums.id1 != 3) OR (albums.id2 != 4) OR (albums.id1 IS NULL) OR (albums.id2 IS NULL))'
  end

  it "should be able to exclude on one_to_one associations with composite keys" do
    @Album.exclude(:calbum_info=>@AlbumInfo.load(:album_id1=>3, :album_id2=>4)).sql.must_equal 'SELECT * FROM albums WHERE ((albums.id1 != 3) OR (albums.id2 != 4) OR (albums.id1 IS NULL) OR (albums.id2 IS NULL))' 
  end

  it "should be able to exclude on many_to_many associations with composite keys" do
    @Album.exclude(:ctags=>@Tag.load(:tid1=>3, :tid2=>4)).sql.must_equal 'SELECT * FROM albums WHERE (((albums.id1, albums.id2) NOT IN (SELECT albums_tags.album_id1, albums_tags.album_id2 FROM albums_tags WHERE ((albums_tags.tag_id1 = 3) AND (albums_tags.tag_id2 = 4) AND (albums_tags.album_id1 IS NOT NULL) AND (albums_tags.album_id2 IS NOT NULL)))) OR (albums.id1 IS NULL) OR (albums.id2 IS NULL))'
  end

  it "should be able to exclude on many_to_one associations with :conditions and composite keys" do
    @Album.exclude(:a_cartist=>@Artist.load(:id=>5, :id1=>3, :id2=>4)).sql.must_equal "SELECT * FROM albums WHERE (((albums.artist_id1, albums.artist_id2) NOT IN (SELECT artists.id1, artists.id2 FROM artists WHERE ((name = 'A') AND (artists.id1 IS NOT NULL) AND (artists.id2 IS NOT NULL) AND (artists.id = 5)))) OR (albums.artist_id1 IS NULL) OR (albums.artist_id2 IS NULL))"
  end

  it "should be able to exclude on one_to_many associations with :conditions and composite keys" do
    @Album.exclude(:a_ctracks=>@Track.load(:id=>5, :album_id1=>3, :album_id2=>4)).sql.must_equal "SELECT * FROM albums WHERE (((albums.id1, albums.id2) NOT IN (SELECT tracks.album_id1, tracks.album_id2 FROM tracks WHERE ((name = 'A') AND (tracks.album_id1 IS NOT NULL) AND (tracks.album_id2 IS NOT NULL) AND (tracks.id = 5)))) OR (albums.id1 IS NULL) OR (albums.id2 IS NULL))"
  end

  it "should be able to exclude on one_to_one associations with :conditions and composite keys" do
    @Album.exclude(:a_calbum_info=>@AlbumInfo.load(:id=>5, :album_id1=>3, :album_id2=>4)).sql.must_equal "SELECT * FROM albums WHERE (((albums.id1, albums.id2) NOT IN (SELECT album_infos.album_id1, album_infos.album_id2 FROM album_infos WHERE ((name = 'A') AND (album_infos.album_id1 IS NOT NULL) AND (album_infos.album_id2 IS NOT NULL) AND (album_infos.id = 5)))) OR (albums.id1 IS NULL) OR (albums.id2 IS NULL))"
  end

  it "should be able to exclude on many_to_many associations with block and composite keys" do
    @Album.exclude(:a_ctags=>@Tag.load(:id=>5, :tid1=>3, :tid2=>4)).sql.must_equal "SELECT * FROM albums WHERE (((albums.id1, albums.id2) NOT IN (SELECT albums_tags.album_id1, albums_tags.album_id2 FROM tags INNER JOIN albums_tags ON ((albums_tags.tag_id1 = tags.tid1) AND (albums_tags.tag_id2 = tags.tid2)) WHERE ((name = 'A') AND (albums_tags.album_id1 IS NOT NULL) AND (albums_tags.album_id2 IS NOT NULL) AND (tags.id = 5)))) OR (albums.id1 IS NULL) OR (albums.id2 IS NULL))"
  end

  it "should be able to exclude on many_to_one associations with block and composite keys" do
    @Album.exclude(:b_cartist=>@Artist.load(:id=>5, :id1=>3, :id2=>4)).sql.must_equal "SELECT * FROM albums WHERE (((albums.artist_id1, albums.artist_id2) NOT IN (SELECT artists.id1, artists.id2 FROM artists WHERE ((name = 'B') AND (artists.id1 IS NOT NULL) AND (artists.id2 IS NOT NULL) AND (artists.id = 5)))) OR (albums.artist_id1 IS NULL) OR (albums.artist_id2 IS NULL))"
  end

  it "should be able to exclude on one_to_many associations with block and composite keys" do
    @Album.exclude(:b_ctracks=>@Track.load(:id=>5, :album_id1=>3, :album_id2=>4)).sql.must_equal "SELECT * FROM albums WHERE (((albums.id1, albums.id2) NOT IN (SELECT tracks.album_id1, tracks.album_id2 FROM tracks WHERE ((name = 'B') AND (tracks.album_id1 IS NOT NULL) AND (tracks.album_id2 IS NOT NULL) AND (tracks.id = 5)))) OR (albums.id1 IS NULL) OR (albums.id2 IS NULL))"
  end

  it "should be able to exclude on one_to_one associations with block and composite keys" do
    @Album.exclude(:b_calbum_info=>@AlbumInfo.load(:id=>5, :album_id1=>3, :album_id2=>4)).sql.must_equal "SELECT * FROM albums WHERE (((albums.id1, albums.id2) NOT IN (SELECT album_infos.album_id1, album_infos.album_id2 FROM album_infos WHERE ((name = 'B') AND (album_infos.album_id1 IS NOT NULL) AND (album_infos.album_id2 IS NOT NULL) AND (album_infos.id = 5)))) OR (albums.id1 IS NULL) OR (albums.id2 IS NULL))"
  end

  it "should be able to exclude on many_to_many associations with block and composite keys" do
    @Album.exclude(:b_ctags=>@Tag.load(:id=>5, :tid1=>3, :tid2=>4)).sql.must_equal "SELECT * FROM albums WHERE (((albums.id1, albums.id2) NOT IN (SELECT albums_tags.album_id1, albums_tags.album_id2 FROM tags INNER JOIN albums_tags ON ((albums_tags.tag_id1 = tags.tid1) AND (albums_tags.tag_id2 = tags.tid2)) WHERE ((name = 'B') AND (albums_tags.album_id1 IS NOT NULL) AND (albums_tags.album_id2 IS NOT NULL) AND (tags.id = 5)))) OR (albums.id1 IS NULL) OR (albums.id2 IS NULL))"
  end

  it "should be able to filter on multiple many_to_one associations" do
    @Album.filter(:artist=>[@Artist.load(:id=>3), @Artist.load(:id=>4)]).sql.must_equal 'SELECT * FROM albums WHERE (albums.artist_id IN (3, 4))'
  end

  it "should be able to filter on multiple one_to_many associations" do
    @Album.filter(:tracks=>[@Track.load(:album_id=>3), @Track.load(:album_id=>4)]).sql.must_equal 'SELECT * FROM albums WHERE (albums.id IN (3, 4))'
  end

  it "should be able to filter on multiple one_to_one associations" do
    @Album.filter(:album_info=>[@AlbumInfo.load(:album_id=>3), @AlbumInfo.load(:album_id=>4)]).sql.must_equal 'SELECT * FROM albums WHERE (albums.id IN (3, 4))'
  end

  it "should be able to filter on multiple many_to_many associations" do
    @Album.filter(:tags=>[@Tag.load(:id=>3), @Tag.load(:id=>4)]).sql.must_equal 'SELECT * FROM albums WHERE (albums.id IN (SELECT albums_tags.album_id FROM albums_tags WHERE ((albums_tags.tag_id IN (3, 4)) AND (albums_tags.album_id IS NOT NULL))))'
  end

  it "should be able to filter on multiple many_to_one associations with :conditions" do
    @Album.filter(:a_artist=>[@Artist.load(:id=>3), @Artist.load(:id=>4)]).sql.must_equal "SELECT * FROM albums WHERE (albums.artist_id IN (SELECT artists.id FROM artists WHERE ((name = 'A') AND (artists.id IS NOT NULL) AND (artists.id IN (3, 4)))))"
  end

  it "should be able to filter on multiple one_to_many associations with :conditions" do
    @Album.filter(:a_tracks=>[@Track.load(:id=>5, :album_id=>3), @Track.load(:id=>6, :album_id=>4)]).sql.must_equal "SELECT * FROM albums WHERE (albums.id IN (SELECT tracks.album_id FROM tracks WHERE ((name = 'A') AND (tracks.album_id IS NOT NULL) AND (tracks.id IN (5, 6)))))"
  end

  it "should be able to filter on multiple one_to_one associations with :conditions" do
    @Album.filter(:a_album_info=>[@AlbumInfo.load(:id=>5, :album_id=>3), @AlbumInfo.load(:id=>6, :album_id=>4)]).sql.must_equal "SELECT * FROM albums WHERE (albums.id IN (SELECT album_infos.album_id FROM album_infos WHERE ((name = 'A') AND (album_infos.album_id IS NOT NULL) AND (album_infos.id IN (5, 6)))))"
  end

  it "should be able to filter on multiple many_to_many associations with :conditions" do
    @Album.filter(:a_tags=>[@Tag.load(:id=>3), @Tag.load(:id=>4)]).sql.must_equal "SELECT * FROM albums WHERE (albums.id IN (SELECT albums_tags.album_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) WHERE ((name = 'A') AND (albums_tags.album_id IS NOT NULL) AND (tags.id IN (3, 4)))))"
  end

  it "should be able to filter on multiple many_to_one associations with block" do
    @Album.filter(:b_artist=>[@Artist.load(:id=>3), @Artist.load(:id=>4)]).sql.must_equal "SELECT * FROM albums WHERE (albums.artist_id IN (SELECT artists.id FROM artists WHERE ((name = 'B') AND (artists.id IS NOT NULL) AND (artists.id IN (3, 4)))))"
  end

  it "should be able to filter on multiple one_to_many associations with block" do
    @Album.filter(:b_tracks=>[@Track.load(:id=>5, :album_id=>3), @Track.load(:id=>6, :album_id=>4)]).sql.must_equal "SELECT * FROM albums WHERE (albums.id IN (SELECT tracks.album_id FROM tracks WHERE ((name = 'B') AND (tracks.album_id IS NOT NULL) AND (tracks.id IN (5, 6)))))"
  end

  it "should be able to filter on multiple one_to_one associations with block" do
    @Album.filter(:b_album_info=>[@AlbumInfo.load(:id=>5, :album_id=>3), @AlbumInfo.load(:id=>6, :album_id=>4)]).sql.must_equal "SELECT * FROM albums WHERE (albums.id IN (SELECT album_infos.album_id FROM album_infos WHERE ((name = 'B') AND (album_infos.album_id IS NOT NULL) AND (album_infos.id IN (5, 6)))))"
  end

  it "should be able to filter on multiple many_to_many associations with block" do
    @Album.filter(:b_tags=>[@Tag.load(:id=>3), @Tag.load(:id=>4)]).sql.must_equal "SELECT * FROM albums WHERE (albums.id IN (SELECT albums_tags.album_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) WHERE ((name = 'B') AND (albums_tags.album_id IS NOT NULL) AND (tags.id IN (3, 4)))))"
  end

  it "should be able to filter on multiple many_to_one associations with composite keys" do
    @Album.filter(:cartist=>[@Artist.load(:id1=>3, :id2=>4), @Artist.load(:id1=>5, :id2=>6)]).sql.must_equal 'SELECT * FROM albums WHERE ((albums.artist_id1, albums.artist_id2) IN ((3, 4), (5, 6)))'
  end

  it "should be able to filter on multiple one_to_many associations with composite keys" do
    @Album.filter(:ctracks=>[@Track.load(:album_id1=>3, :album_id2=>4), @Track.load(:album_id1=>5, :album_id2=>6)]).sql.must_equal 'SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN ((3, 4), (5, 6)))'
  end

  it "should be able to filter on multiple one_to_one associations with composite keys" do
    @Album.filter(:calbum_info=>[@AlbumInfo.load(:album_id1=>3, :album_id2=>4), @AlbumInfo.load(:album_id1=>5, :album_id2=>6)]).sql.must_equal 'SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN ((3, 4), (5, 6)))' 
  end

  it "should be able to filter on multiple many_to_many associations with composite keys" do
    @Album.filter(:ctags=>[@Tag.load(:tid1=>3, :tid2=>4), @Tag.load(:tid1=>5, :tid2=>6)]).sql.must_equal 'SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN (SELECT albums_tags.album_id1, albums_tags.album_id2 FROM albums_tags WHERE (((albums_tags.tag_id1, albums_tags.tag_id2) IN ((3, 4), (5, 6))) AND (albums_tags.album_id1 IS NOT NULL) AND (albums_tags.album_id2 IS NOT NULL))))'
  end

  it "should be able to filter on multiple many_to_one associations with :conditions and composite keys" do
    @Album.filter(:a_cartist=>[@Artist.load(:id=>7, :id1=>3, :id2=>4), @Artist.load(:id=>8, :id1=>5, :id2=>6)]).sql.must_equal "SELECT * FROM albums WHERE ((albums.artist_id1, albums.artist_id2) IN (SELECT artists.id1, artists.id2 FROM artists WHERE ((name = 'A') AND (artists.id1 IS NOT NULL) AND (artists.id2 IS NOT NULL) AND (artists.id IN (7, 8)))))"
  end

  it "should be able to filter on multiple one_to_many associations with :conditions and composite keys" do
    @Album.filter(:a_ctracks=>[@Track.load(:id=>7, :album_id1=>3, :album_id2=>4), @Track.load(:id=>8, :album_id1=>5, :album_id2=>6)]).sql.must_equal "SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN (SELECT tracks.album_id1, tracks.album_id2 FROM tracks WHERE ((name = 'A') AND (tracks.album_id1 IS NOT NULL) AND (tracks.album_id2 IS NOT NULL) AND (tracks.id IN (7, 8)))))"
  end

  it "should be able to filter on multiple one_to_one associations with :conditions and composite keys" do
    @Album.filter(:a_calbum_info=>[@AlbumInfo.load(:id=>7, :album_id1=>3, :album_id2=>4), @AlbumInfo.load(:id=>8, :album_id1=>5, :album_id2=>6)]).sql.must_equal "SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN (SELECT album_infos.album_id1, album_infos.album_id2 FROM album_infos WHERE ((name = 'A') AND (album_infos.album_id1 IS NOT NULL) AND (album_infos.album_id2 IS NOT NULL) AND (album_infos.id IN (7, 8)))))"
  end

  it "should be able to filter on multiple many_to_many associations with block and composite keys" do
    @Album.filter(:a_ctags=>[@Tag.load(:id=>7, :tid1=>3, :tid2=>4), @Tag.load(:id=>8, :tid1=>5, :tid2=>6)]).sql.must_equal "SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN (SELECT albums_tags.album_id1, albums_tags.album_id2 FROM tags INNER JOIN albums_tags ON ((albums_tags.tag_id1 = tags.tid1) AND (albums_tags.tag_id2 = tags.tid2)) WHERE ((name = 'A') AND (albums_tags.album_id1 IS NOT NULL) AND (albums_tags.album_id2 IS NOT NULL) AND (tags.id IN (7, 8)))))"
  end

  it "should be able to filter on multiple many_to_one associations with block and composite keys" do
    @Album.filter(:b_cartist=>[@Artist.load(:id=>7, :id1=>3, :id2=>4), @Artist.load(:id=>8, :id1=>5, :id2=>6)]).sql.must_equal "SELECT * FROM albums WHERE ((albums.artist_id1, albums.artist_id2) IN (SELECT artists.id1, artists.id2 FROM artists WHERE ((name = 'B') AND (artists.id1 IS NOT NULL) AND (artists.id2 IS NOT NULL) AND (artists.id IN (7, 8)))))"
  end

  it "should be able to filter on multiple one_to_many associations with block and composite keys" do
    @Album.filter(:b_ctracks=>[@Track.load(:id=>7, :album_id1=>3, :album_id2=>4), @Track.load(:id=>8, :album_id1=>5, :album_id2=>6)]).sql.must_equal "SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN (SELECT tracks.album_id1, tracks.album_id2 FROM tracks WHERE ((name = 'B') AND (tracks.album_id1 IS NOT NULL) AND (tracks.album_id2 IS NOT NULL) AND (tracks.id IN (7, 8)))))"
  end

  it "should be able to filter on multiple one_to_one associations with block and composite keys" do
    @Album.filter(:b_calbum_info=>[@AlbumInfo.load(:id=>7, :album_id1=>3, :album_id2=>4), @AlbumInfo.load(:id=>8, :album_id1=>5, :album_id2=>6)]).sql.must_equal "SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN (SELECT album_infos.album_id1, album_infos.album_id2 FROM album_infos WHERE ((name = 'B') AND (album_infos.album_id1 IS NOT NULL) AND (album_infos.album_id2 IS NOT NULL) AND (album_infos.id IN (7, 8)))))"
  end

  it "should be able to filter on multiple many_to_many associations with block and composite keys" do
    @Album.filter(:b_ctags=>[@Tag.load(:id=>7, :tid1=>3, :tid2=>4), @Tag.load(:id=>8, :tid1=>5, :tid2=>6)]).sql.must_equal "SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN (SELECT albums_tags.album_id1, albums_tags.album_id2 FROM tags INNER JOIN albums_tags ON ((albums_tags.tag_id1 = tags.tid1) AND (albums_tags.tag_id2 = tags.tid2)) WHERE ((name = 'B') AND (albums_tags.album_id1 IS NOT NULL) AND (albums_tags.album_id2 IS NOT NULL) AND (tags.id IN (7, 8)))))"
  end

  it "should be able to exclude on multiple many_to_one associations" do
    @Album.exclude(:artist=>[@Artist.load(:id=>3), @Artist.load(:id=>4)]).sql.must_equal 'SELECT * FROM albums WHERE ((albums.artist_id NOT IN (3, 4)) OR (albums.artist_id IS NULL))'
  end

  it "should be able to exclude on multiple one_to_many associations" do
    @Album.exclude(:tracks=>[@Track.load(:album_id=>3), @Track.load(:album_id=>4)]).sql.must_equal 'SELECT * FROM albums WHERE ((albums.id NOT IN (3, 4)) OR (albums.id IS NULL))'
  end

  it "should be able to exclude on multiple one_to_one associations" do
    @Album.exclude(:album_info=>[@AlbumInfo.load(:album_id=>3), @AlbumInfo.load(:album_id=>4)]).sql.must_equal 'SELECT * FROM albums WHERE ((albums.id NOT IN (3, 4)) OR (albums.id IS NULL))'
  end

  it "should be able to exclude on multiple many_to_many associations" do
    @Album.exclude(:tags=>[@Tag.load(:id=>3), @Tag.load(:id=>4)]).sql.must_equal 'SELECT * FROM albums WHERE ((albums.id NOT IN (SELECT albums_tags.album_id FROM albums_tags WHERE ((albums_tags.tag_id IN (3, 4)) AND (albums_tags.album_id IS NOT NULL)))) OR (albums.id IS NULL))'
  end

  it "should be able to exclude on multiple many_to_one associations with :conditions" do
    @Album.exclude(:a_artist=>[@Artist.load(:id=>3), @Artist.load(:id=>4)]).sql.must_equal "SELECT * FROM albums WHERE ((albums.artist_id NOT IN (SELECT artists.id FROM artists WHERE ((name = 'A') AND (artists.id IS NOT NULL) AND (artists.id IN (3, 4))))) OR (albums.artist_id IS NULL))"
  end

  it "should be able to exclude on multiple one_to_many associations with :conditions" do
    @Album.exclude(:a_tracks=>[@Track.load(:id=>5, :album_id=>3), @Track.load(:id=>6, :album_id=>4)]).sql.must_equal "SELECT * FROM albums WHERE ((albums.id NOT IN (SELECT tracks.album_id FROM tracks WHERE ((name = 'A') AND (tracks.album_id IS NOT NULL) AND (tracks.id IN (5, 6))))) OR (albums.id IS NULL))"
  end

  it "should be able to exclude on multiple one_to_one associations with :conditions" do
    @Album.exclude(:a_album_info=>[@AlbumInfo.load(:id=>5, :album_id=>3), @AlbumInfo.load(:id=>6, :album_id=>4)]).sql.must_equal "SELECT * FROM albums WHERE ((albums.id NOT IN (SELECT album_infos.album_id FROM album_infos WHERE ((name = 'A') AND (album_infos.album_id IS NOT NULL) AND (album_infos.id IN (5, 6))))) OR (albums.id IS NULL))"
  end

  it "should be able to exclude on multiple many_to_many associations with :conditions" do
    @Album.exclude(:a_tags=>[@Tag.load(:id=>3), @Tag.load(:id=>4)]).sql.must_equal "SELECT * FROM albums WHERE ((albums.id NOT IN (SELECT albums_tags.album_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) WHERE ((name = 'A') AND (albums_tags.album_id IS NOT NULL) AND (tags.id IN (3, 4))))) OR (albums.id IS NULL))"
  end

  it "should be able to exclude on multiple many_to_one associations with block" do
    @Album.exclude(:b_artist=>[@Artist.load(:id=>3), @Artist.load(:id=>4)]).sql.must_equal "SELECT * FROM albums WHERE ((albums.artist_id NOT IN (SELECT artists.id FROM artists WHERE ((name = 'B') AND (artists.id IS NOT NULL) AND (artists.id IN (3, 4))))) OR (albums.artist_id IS NULL))"
  end

  it "should be able to exclude on multiple one_to_many associations with block" do
    @Album.exclude(:b_tracks=>[@Track.load(:id=>5, :album_id=>3), @Track.load(:id=>6, :album_id=>4)]).sql.must_equal "SELECT * FROM albums WHERE ((albums.id NOT IN (SELECT tracks.album_id FROM tracks WHERE ((name = 'B') AND (tracks.album_id IS NOT NULL) AND (tracks.id IN (5, 6))))) OR (albums.id IS NULL))"
  end

  it "should be able to exclude on multiple one_to_one associations with block" do
    @Album.exclude(:b_album_info=>[@AlbumInfo.load(:id=>5, :album_id=>3), @AlbumInfo.load(:id=>6, :album_id=>4)]).sql.must_equal "SELECT * FROM albums WHERE ((albums.id NOT IN (SELECT album_infos.album_id FROM album_infos WHERE ((name = 'B') AND (album_infos.album_id IS NOT NULL) AND (album_infos.id IN (5, 6))))) OR (albums.id IS NULL))"
  end

  it "should be able to exclude on multiple many_to_many associations with block" do
    @Album.exclude(:b_tags=>[@Tag.load(:id=>3), @Tag.load(:id=>4)]).sql.must_equal "SELECT * FROM albums WHERE ((albums.id NOT IN (SELECT albums_tags.album_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) WHERE ((name = 'B') AND (albums_tags.album_id IS NOT NULL) AND (tags.id IN (3, 4))))) OR (albums.id IS NULL))"
  end

  it "should be able to exclude on multiple many_to_one associations with composite keys" do
    @Album.exclude(:cartist=>[@Artist.load(:id1=>3, :id2=>4), @Artist.load(:id1=>5, :id2=>6)]).sql.must_equal 'SELECT * FROM albums WHERE (((albums.artist_id1, albums.artist_id2) NOT IN ((3, 4), (5, 6))) OR (albums.artist_id1 IS NULL) OR (albums.artist_id2 IS NULL))'
  end

  it "should be able to exclude on multiple one_to_many associations with composite keys" do
    @Album.exclude(:ctracks=>[@Track.load(:album_id1=>3, :album_id2=>4), @Track.load(:album_id1=>5, :album_id2=>6)]).sql.must_equal 'SELECT * FROM albums WHERE (((albums.id1, albums.id2) NOT IN ((3, 4), (5, 6))) OR (albums.id1 IS NULL) OR (albums.id2 IS NULL))'
  end

  it "should be able to exclude on multiple one_to_one associations with composite keys" do
    @Album.exclude(:calbum_info=>[@AlbumInfo.load(:album_id1=>3, :album_id2=>4), @AlbumInfo.load(:album_id1=>5, :album_id2=>6)]).sql.must_equal 'SELECT * FROM albums WHERE (((albums.id1, albums.id2) NOT IN ((3, 4), (5, 6))) OR (albums.id1 IS NULL) OR (albums.id2 IS NULL))' 
  end

  it "should be able to exclude on multiple many_to_many associations with composite keys" do
    @Album.exclude(:ctags=>[@Tag.load(:tid1=>3, :tid2=>4), @Tag.load(:tid1=>5, :tid2=>6)]).sql.must_equal 'SELECT * FROM albums WHERE (((albums.id1, albums.id2) NOT IN (SELECT albums_tags.album_id1, albums_tags.album_id2 FROM albums_tags WHERE (((albums_tags.tag_id1, albums_tags.tag_id2) IN ((3, 4), (5, 6))) AND (albums_tags.album_id1 IS NOT NULL) AND (albums_tags.album_id2 IS NOT NULL)))) OR (albums.id1 IS NULL) OR (albums.id2 IS NULL))'
  end

  it "should be able to exclude on multiple many_to_one associations with :conditions and composite keys" do
    @Album.exclude(:a_cartist=>[@Artist.load(:id=>7, :id1=>3, :id2=>4), @Artist.load(:id=>8, :id1=>5, :id2=>6)]).sql.must_equal "SELECT * FROM albums WHERE (((albums.artist_id1, albums.artist_id2) NOT IN (SELECT artists.id1, artists.id2 FROM artists WHERE ((name = 'A') AND (artists.id1 IS NOT NULL) AND (artists.id2 IS NOT NULL) AND (artists.id IN (7, 8))))) OR (albums.artist_id1 IS NULL) OR (albums.artist_id2 IS NULL))"
  end

  it "should be able to exclude on multiple one_to_many associations with :conditions and composite keys" do
    @Album.exclude(:a_ctracks=>[@Track.load(:id=>7, :album_id1=>3, :album_id2=>4), @Track.load(:id=>8, :album_id1=>5, :album_id2=>6)]).sql.must_equal "SELECT * FROM albums WHERE (((albums.id1, albums.id2) NOT IN (SELECT tracks.album_id1, tracks.album_id2 FROM tracks WHERE ((name = 'A') AND (tracks.album_id1 IS NOT NULL) AND (tracks.album_id2 IS NOT NULL) AND (tracks.id IN (7, 8))))) OR (albums.id1 IS NULL) OR (albums.id2 IS NULL))"
  end

  it "should be able to exclude on multiple one_to_one associations with :conditions and composite keys" do
    @Album.exclude(:a_calbum_info=>[@AlbumInfo.load(:id=>7, :album_id1=>3, :album_id2=>4), @AlbumInfo.load(:id=>8, :album_id1=>5, :album_id2=>6)]).sql.must_equal "SELECT * FROM albums WHERE (((albums.id1, albums.id2) NOT IN (SELECT album_infos.album_id1, album_infos.album_id2 FROM album_infos WHERE ((name = 'A') AND (album_infos.album_id1 IS NOT NULL) AND (album_infos.album_id2 IS NOT NULL) AND (album_infos.id IN (7, 8))))) OR (albums.id1 IS NULL) OR (albums.id2 IS NULL))"
  end

  it "should be able to exclude on multiple many_to_many associations with :conditions and composite keys" do
    @Album.exclude(:a_ctags=>[@Tag.load(:id=>7, :tid1=>3, :tid2=>4), @Tag.load(:id=>8, :tid1=>5, :tid2=>6)]).sql.must_equal "SELECT * FROM albums WHERE (((albums.id1, albums.id2) NOT IN (SELECT albums_tags.album_id1, albums_tags.album_id2 FROM tags INNER JOIN albums_tags ON ((albums_tags.tag_id1 = tags.tid1) AND (albums_tags.tag_id2 = tags.tid2)) WHERE ((name = 'A') AND (albums_tags.album_id1 IS NOT NULL) AND (albums_tags.album_id2 IS NOT NULL) AND (tags.id IN (7, 8))))) OR (albums.id1 IS NULL) OR (albums.id2 IS NULL))"
  end

  it "should be able to exclude on multiple many_to_one associations with block and composite keys" do
    @Album.exclude(:b_cartist=>[@Artist.load(:id=>7, :id1=>3, :id2=>4), @Artist.load(:id=>8, :id1=>5, :id2=>6)]).sql.must_equal "SELECT * FROM albums WHERE (((albums.artist_id1, albums.artist_id2) NOT IN (SELECT artists.id1, artists.id2 FROM artists WHERE ((name = 'B') AND (artists.id1 IS NOT NULL) AND (artists.id2 IS NOT NULL) AND (artists.id IN (7, 8))))) OR (albums.artist_id1 IS NULL) OR (albums.artist_id2 IS NULL))"
  end

  it "should be able to exclude on multiple one_to_many associations with block and composite keys" do
    @Album.exclude(:b_ctracks=>[@Track.load(:id=>7, :album_id1=>3, :album_id2=>4), @Track.load(:id=>8, :album_id1=>5, :album_id2=>6)]).sql.must_equal "SELECT * FROM albums WHERE (((albums.id1, albums.id2) NOT IN (SELECT tracks.album_id1, tracks.album_id2 FROM tracks WHERE ((name = 'B') AND (tracks.album_id1 IS NOT NULL) AND (tracks.album_id2 IS NOT NULL) AND (tracks.id IN (7, 8))))) OR (albums.id1 IS NULL) OR (albums.id2 IS NULL))"
  end

  it "should be able to exclude on multiple one_to_one associations with block and composite keys" do
    @Album.exclude(:b_calbum_info=>[@AlbumInfo.load(:id=>7, :album_id1=>3, :album_id2=>4), @AlbumInfo.load(:id=>8, :album_id1=>5, :album_id2=>6)]).sql.must_equal "SELECT * FROM albums WHERE (((albums.id1, albums.id2) NOT IN (SELECT album_infos.album_id1, album_infos.album_id2 FROM album_infos WHERE ((name = 'B') AND (album_infos.album_id1 IS NOT NULL) AND (album_infos.album_id2 IS NOT NULL) AND (album_infos.id IN (7, 8))))) OR (albums.id1 IS NULL) OR (albums.id2 IS NULL))"
  end

  it "should be able to exclude on multiple many_to_many associations with block and composite keys" do
    @Album.exclude(:b_ctags=>[@Tag.load(:id=>7, :tid1=>3, :tid2=>4), @Tag.load(:id=>8, :tid1=>5, :tid2=>6)]).sql.must_equal "SELECT * FROM albums WHERE (((albums.id1, albums.id2) NOT IN (SELECT albums_tags.album_id1, albums_tags.album_id2 FROM tags INNER JOIN albums_tags ON ((albums_tags.tag_id1 = tags.tid1) AND (albums_tags.tag_id2 = tags.tid2)) WHERE ((name = 'B') AND (albums_tags.album_id1 IS NOT NULL) AND (albums_tags.album_id2 IS NOT NULL) AND (tags.id IN (7, 8))))) OR (albums.id1 IS NULL) OR (albums.id2 IS NULL))"
  end

  it "should be able to handle NULL values when filtering many_to_one associations" do
    @Album.filter(:artist=>@Artist.new).sql.must_equal 'SELECT * FROM albums WHERE \'f\''
  end

  it "should be able to handle NULL values when filtering one_to_many associations" do
    @Album.filter(:tracks=>@Track.new).sql.must_equal 'SELECT * FROM albums WHERE \'f\''
  end

  it "should be able to handle NULL values when filtering one_to_one associations" do
    @Album.filter(:album_info=>@AlbumInfo.new).sql.must_equal 'SELECT * FROM albums WHERE \'f\''
  end

  it "should be able to handle NULL values when filtering many_to_many associations" do
    @Album.filter(:tags=>@Tag.new).sql.must_equal 'SELECT * FROM albums WHERE \'f\''
  end

  it "should be able to handle filtering with NULL values for many_to_one associations with composite keys" do
    @Album.filter(:cartist=>@Artist.load(:id2=>4)).sql.must_equal 'SELECT * FROM albums WHERE \'f\''
    @Album.filter(:cartist=>@Artist.load(:id1=>3)).sql.must_equal 'SELECT * FROM albums WHERE \'f\''
    @Album.filter(:cartist=>@Artist.new).sql.must_equal 'SELECT * FROM albums WHERE \'f\''
  end

  it "should be able to filter with NULL values for one_to_many associations with composite keys" do
    @Album.filter(:ctracks=>@Track.load(:album_id2=>4)).sql.must_equal 'SELECT * FROM albums WHERE \'f\''
    @Album.filter(:ctracks=>@Track.load(:album_id1=>3)).sql.must_equal 'SELECT * FROM albums WHERE \'f\''
    @Album.filter(:ctracks=>@Track.new).sql.must_equal 'SELECT * FROM albums WHERE \'f\''
  end

  it "should be able to filter with NULL values for one_to_one associations with composite keys" do
    @Album.filter(:calbum_info=>@AlbumInfo.load(:album_id2=>4)).sql.must_equal 'SELECT * FROM albums WHERE \'f\'' 
    @Album.filter(:calbum_info=>@AlbumInfo.load(:album_id1=>3)).sql.must_equal 'SELECT * FROM albums WHERE \'f\'' 
    @Album.filter(:calbum_info=>@AlbumInfo.new).sql.must_equal 'SELECT * FROM albums WHERE \'f\'' 
  end

  it "should be able to filter with NULL values for many_to_many associations with composite keys" do
    @Album.filter(:ctags=>@Tag.load(:tid1=>3)).sql.must_equal 'SELECT * FROM albums WHERE \'f\''
    @Album.filter(:ctags=>@Tag.load(:tid2=>4)).sql.must_equal 'SELECT * FROM albums WHERE \'f\''
    @Album.filter(:ctags=>@Tag.new).sql.must_equal 'SELECT * FROM albums WHERE \'f\''
  end

  it "should be able to handle NULL values when excluding many_to_one associations" do
    @Album.exclude(:artist=>@Artist.new).sql.must_equal 'SELECT * FROM albums WHERE \'t\''
  end

  it "should be able to handle NULL values when excluding one_to_many associations" do
    @Album.exclude(:tracks=>@Track.new).sql.must_equal 'SELECT * FROM albums WHERE \'t\''
  end

  it "should be able to handle NULL values when excluding one_to_one associations" do
    @Album.exclude(:album_info=>@AlbumInfo.new).sql.must_equal 'SELECT * FROM albums WHERE \'t\''
  end

  it "should be able to handle NULL values when excluding many_to_many associations" do
    @Album.exclude(:tags=>@Tag.new).sql.must_equal 'SELECT * FROM albums WHERE \'t\''
  end

  it "should be able to handle excluding with NULL values for many_to_one associations with composite keys" do
    @Album.exclude(:cartist=>@Artist.load(:id2=>4)).sql.must_equal 'SELECT * FROM albums WHERE \'t\''
    @Album.exclude(:cartist=>@Artist.load(:id1=>3)).sql.must_equal 'SELECT * FROM albums WHERE \'t\''
    @Album.exclude(:cartist=>@Artist.new).sql.must_equal 'SELECT * FROM albums WHERE \'t\''
  end

  it "should be able to excluding with NULL values for one_to_many associations with composite keys" do
    @Album.exclude(:ctracks=>@Track.load(:album_id2=>4)).sql.must_equal 'SELECT * FROM albums WHERE \'t\''
    @Album.exclude(:ctracks=>@Track.load(:album_id1=>3)).sql.must_equal 'SELECT * FROM albums WHERE \'t\''
    @Album.exclude(:ctracks=>@Track.new).sql.must_equal 'SELECT * FROM albums WHERE \'t\''
  end

  it "should be able to excluding with NULL values for one_to_one associations with composite keys" do
    @Album.exclude(:calbum_info=>@AlbumInfo.load(:album_id2=>4)).sql.must_equal 'SELECT * FROM albums WHERE \'t\'' 
    @Album.exclude(:calbum_info=>@AlbumInfo.load(:album_id1=>3)).sql.must_equal 'SELECT * FROM albums WHERE \'t\'' 
    @Album.exclude(:calbum_info=>@AlbumInfo.new).sql.must_equal 'SELECT * FROM albums WHERE \'t\'' 
  end

  it "should be able to excluding with NULL values for many_to_many associations with composite keys" do
    @Album.exclude(:ctags=>@Tag.load(:tid1=>3)).sql.must_equal 'SELECT * FROM albums WHERE \'t\''
    @Album.exclude(:ctags=>@Tag.load(:tid2=>4)).sql.must_equal 'SELECT * FROM albums WHERE \'t\''
    @Album.exclude(:ctags=>@Tag.new).sql.must_equal 'SELECT * FROM albums WHERE \'t\''
  end

  it "should be able to handle NULL values when filtering multiple many_to_one associations" do
    @Album.filter(:artist=>[@Artist.load(:id=>3), @Artist.new]).sql.must_equal 'SELECT * FROM albums WHERE (albums.artist_id IN (3))'
    @Album.filter(:artist=>[@Artist.new, @Artist.new]).sql.must_equal 'SELECT * FROM albums WHERE \'f\''
  end

  it "should be able to handle NULL values when filtering multiple one_to_many associations" do
    @Album.filter(:tracks=>[@Track.load(:album_id=>3), @Track.new]).sql.must_equal 'SELECT * FROM albums WHERE (albums.id IN (3))'
    @Album.filter(:tracks=>[@Track.new, @Track.new]).sql.must_equal 'SELECT * FROM albums WHERE \'f\''
  end

  it "should be able to handle NULL values when filtering multiple one_to_one associations" do
    @Album.filter(:album_info=>[@AlbumInfo.load(:album_id=>3), @AlbumInfo.new]).sql.must_equal 'SELECT * FROM albums WHERE (albums.id IN (3))'
    @Album.filter(:album_info=>[@AlbumInfo.new, @AlbumInfo.new]).sql.must_equal 'SELECT * FROM albums WHERE \'f\''
  end

  it "should be able to handle NULL values when filtering multiple many_to_many associations" do
    @Album.filter(:tags=>[@Tag.load(:id=>3), @Tag.new]).sql.must_equal 'SELECT * FROM albums WHERE (albums.id IN (SELECT albums_tags.album_id FROM albums_tags WHERE ((albums_tags.tag_id IN (3)) AND (albums_tags.album_id IS NOT NULL))))'
    @Album.filter(:tags=>[@Tag.new, @Tag.new]).sql.must_equal 'SELECT * FROM albums WHERE \'f\''
  end

  it "should be able to handle NULL values when filtering multiple many_to_one associations with composite keys" do
    @Album.filter(:cartist=>[@Artist.load(:id1=>3, :id2=>4), @Artist.load(:id1=>3)]).sql.must_equal 'SELECT * FROM albums WHERE ((albums.artist_id1, albums.artist_id2) IN ((3, 4)))'
    @Album.filter(:cartist=>[@Artist.load(:id1=>3, :id2=>4), @Artist.new]).sql.must_equal 'SELECT * FROM albums WHERE ((albums.artist_id1, albums.artist_id2) IN ((3, 4)))'
  end

  it "should be able handle NULL values when filtering multiple one_to_many associations with composite keys" do
    @Album.filter(:ctracks=>[@Track.load(:album_id1=>3, :album_id2=>4), @Track.load(:album_id1=>3)]).sql.must_equal 'SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN ((3, 4)))'
    @Album.filter(:ctracks=>[@Track.load(:album_id1=>3, :album_id2=>4), @Track.new]).sql.must_equal 'SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN ((3, 4)))'
  end

  it "should be able to handle NULL values when filtering multiple one_to_one associations with composite keys" do
    @Album.filter(:calbum_info=>[@AlbumInfo.load(:album_id1=>3, :album_id2=>4), @AlbumInfo.load(:album_id1=>5)]).sql.must_equal 'SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN ((3, 4)))' 
    @Album.filter(:calbum_info=>[@AlbumInfo.load(:album_id1=>3, :album_id2=>4), @AlbumInfo.new]).sql.must_equal 'SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN ((3, 4)))' 
  end

  it "should be able to handle NULL values when filtering multiple many_to_many associations with composite keys" do
    @Album.filter(:ctags=>[@Tag.load(:tid1=>3, :tid2=>4), @Tag.load(:tid1=>5)]).sql.must_equal 'SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN (SELECT albums_tags.album_id1, albums_tags.album_id2 FROM albums_tags WHERE (((albums_tags.tag_id1, albums_tags.tag_id2) IN ((3, 4))) AND (albums_tags.album_id1 IS NOT NULL) AND (albums_tags.album_id2 IS NOT NULL))))'
    @Album.filter(:ctags=>[@Tag.load(:tid1=>3, :tid2=>4), @Tag.new]).sql.must_equal 'SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN (SELECT albums_tags.album_id1, albums_tags.album_id2 FROM albums_tags WHERE (((albums_tags.tag_id1, albums_tags.tag_id2) IN ((3, 4))) AND (albums_tags.album_id1 IS NOT NULL) AND (albums_tags.album_id2 IS NOT NULL))))'
  end

  it "should be able to handle NULL values when excluding multiple many_to_one associations" do
    @Album.exclude(:artist=>[@Artist.load(:id=>3), @Artist.new]).sql.must_equal 'SELECT * FROM albums WHERE ((albums.artist_id NOT IN (3)) OR (albums.artist_id IS NULL))'
    @Album.exclude(:artist=>[@Artist.new, @Artist.new]).sql.must_equal 'SELECT * FROM albums WHERE \'t\''
  end

  it "should be able to handle NULL values when excluding multiple one_to_many associations" do
    @Album.exclude(:tracks=>[@Track.load(:album_id=>3), @Track.new]).sql.must_equal 'SELECT * FROM albums WHERE ((albums.id NOT IN (3)) OR (albums.id IS NULL))'
    @Album.exclude(:tracks=>[@Track.new, @Track.new]).sql.must_equal 'SELECT * FROM albums WHERE \'t\''
  end

  it "should be able to handle NULL values when excluding multiple one_to_one associations" do
    @Album.exclude(:album_info=>[@AlbumInfo.load(:album_id=>3), @AlbumInfo.new]).sql.must_equal 'SELECT * FROM albums WHERE ((albums.id NOT IN (3)) OR (albums.id IS NULL))'
    @Album.exclude(:album_info=>[@AlbumInfo.new, @AlbumInfo.new]).sql.must_equal 'SELECT * FROM albums WHERE \'t\''
  end

  it "should be able to handle NULL values when excluding multiple many_to_many associations" do
    @Album.exclude(:tags=>[@Tag.load(:id=>3), @Tag.new]).sql.must_equal 'SELECT * FROM albums WHERE ((albums.id NOT IN (SELECT albums_tags.album_id FROM albums_tags WHERE ((albums_tags.tag_id IN (3)) AND (albums_tags.album_id IS NOT NULL)))) OR (albums.id IS NULL))'
    @Album.exclude(:tags=>[@Tag.new, @Tag.new]).sql.must_equal 'SELECT * FROM albums WHERE \'t\''
  end

  it "should be able to handle NULL values when excluding multiple many_to_one associations with composite keys" do
    @Album.exclude(:cartist=>[@Artist.load(:id1=>3, :id2=>4), @Artist.load(:id1=>3)]).sql.must_equal 'SELECT * FROM albums WHERE (((albums.artist_id1, albums.artist_id2) NOT IN ((3, 4))) OR (albums.artist_id1 IS NULL) OR (albums.artist_id2 IS NULL))'
    @Album.exclude(:cartist=>[@Artist.load(:id1=>3, :id2=>4), @Artist.new]).sql.must_equal 'SELECT * FROM albums WHERE (((albums.artist_id1, albums.artist_id2) NOT IN ((3, 4))) OR (albums.artist_id1 IS NULL) OR (albums.artist_id2 IS NULL))'
  end

  it "should be able handle NULL values when excluding multiple one_to_many associations with composite keys" do
    @Album.exclude(:ctracks=>[@Track.load(:album_id1=>3, :album_id2=>4), @Track.load(:album_id1=>3)]).sql.must_equal 'SELECT * FROM albums WHERE (((albums.id1, albums.id2) NOT IN ((3, 4))) OR (albums.id1 IS NULL) OR (albums.id2 IS NULL))'
    @Album.exclude(:ctracks=>[@Track.load(:album_id1=>3, :album_id2=>4), @Track.new]).sql.must_equal 'SELECT * FROM albums WHERE (((albums.id1, albums.id2) NOT IN ((3, 4))) OR (albums.id1 IS NULL) OR (albums.id2 IS NULL))'
  end

  it "should be able to handle NULL values when excluding multiple one_to_one associations with composite keys" do
    @Album.exclude(:calbum_info=>[@AlbumInfo.load(:album_id1=>3, :album_id2=>4), @AlbumInfo.load(:album_id1=>5)]).sql.must_equal 'SELECT * FROM albums WHERE (((albums.id1, albums.id2) NOT IN ((3, 4))) OR (albums.id1 IS NULL) OR (albums.id2 IS NULL))' 
    @Album.exclude(:calbum_info=>[@AlbumInfo.load(:album_id1=>3, :album_id2=>4), @AlbumInfo.new]).sql.must_equal 'SELECT * FROM albums WHERE (((albums.id1, albums.id2) NOT IN ((3, 4))) OR (albums.id1 IS NULL) OR (albums.id2 IS NULL))' 
  end

  it "should be able to handle NULL values when excluding multiple many_to_many associations with composite keys" do
    @Album.exclude(:ctags=>[@Tag.load(:tid1=>3, :tid2=>4), @Tag.load(:tid1=>5)]).sql.must_equal 'SELECT * FROM albums WHERE (((albums.id1, albums.id2) NOT IN (SELECT albums_tags.album_id1, albums_tags.album_id2 FROM albums_tags WHERE (((albums_tags.tag_id1, albums_tags.tag_id2) IN ((3, 4))) AND (albums_tags.album_id1 IS NOT NULL) AND (albums_tags.album_id2 IS NOT NULL)))) OR (albums.id1 IS NULL) OR (albums.id2 IS NULL))'
    @Album.exclude(:ctags=>[@Tag.load(:tid1=>3, :tid2=>4), @Tag.new]).sql.must_equal 'SELECT * FROM albums WHERE (((albums.id1, albums.id2) NOT IN (SELECT albums_tags.album_id1, albums_tags.album_id2 FROM albums_tags WHERE (((albums_tags.tag_id1, albums_tags.tag_id2) IN ((3, 4))) AND (albums_tags.album_id1 IS NOT NULL) AND (albums_tags.album_id2 IS NOT NULL)))) OR (albums.id1 IS NULL) OR (albums.id2 IS NULL))'
  end

  it "should be able to filter on many_to_one association datasets" do
    @Album.filter(:artist=>@Artist.filter(:x=>1)).sql.must_equal 'SELECT * FROM albums WHERE (albums.artist_id IN (SELECT artists.id FROM artists WHERE ((x = 1) AND (artists.id IS NOT NULL))))'
  end

  it "should be able to filter on one_to_many association datasets" do
    @Album.filter(:tracks=>@Track.filter(:x=>1)).sql.must_equal 'SELECT * FROM albums WHERE (albums.id IN (SELECT tracks.album_id FROM tracks WHERE ((x = 1) AND (tracks.album_id IS NOT NULL))))'
  end

  it "should be able to filter on one_to_one association datasets" do
    @Album.filter(:album_info=>@AlbumInfo.filter(:x=>1)).sql.must_equal 'SELECT * FROM albums WHERE (albums.id IN (SELECT album_infos.album_id FROM album_infos WHERE ((x = 1) AND (album_infos.album_id IS NOT NULL))))'
  end

  it "should be able to filter on many_to_many association datasets" do
    @Album.filter(:tags=>@Tag.filter(:x=>1)).sql.must_equal 'SELECT * FROM albums WHERE (albums.id IN (SELECT albums_tags.album_id FROM albums_tags WHERE ((albums_tags.tag_id IN (SELECT tags.id FROM tags WHERE ((x = 1) AND (tags.id IS NOT NULL)))) AND (albums_tags.album_id IS NOT NULL))))'
  end

  it "should be able to filter on many_to_one association datasets with :conditions" do
    @Album.filter(:a_artist=>@Artist.filter(:x=>1)).sql.must_equal "SELECT * FROM albums WHERE (albums.artist_id IN (SELECT artists.id FROM artists WHERE ((name = 'A') AND (artists.id IS NOT NULL) AND (artists.id IN (SELECT artists.id FROM artists WHERE (x = 1))))))"
  end

  it "should be able to filter on one_to_many association datasets with :conditions" do
    @Album.filter(:a_tracks=>@Track.filter(:x=>1)).sql.must_equal "SELECT * FROM albums WHERE (albums.id IN (SELECT tracks.album_id FROM tracks WHERE ((name = 'A') AND (tracks.album_id IS NOT NULL) AND (tracks.id IN (SELECT tracks.id FROM tracks WHERE (x = 1))))))"
  end

  it "should be able to filter on one_to_one association datasets with :conditions" do
    @Album.filter(:a_album_info=>@AlbumInfo.filter(:x=>1)).sql.must_equal "SELECT * FROM albums WHERE (albums.id IN (SELECT album_infos.album_id FROM album_infos WHERE ((name = 'A') AND (album_infos.album_id IS NOT NULL) AND (album_infos.id IN (SELECT album_infos.id FROM album_infos WHERE (x = 1))))))"
  end

  it "should be able to filter on many_to_many association datasets with :conditions" do
    @Album.filter(:a_tags=>@Tag.filter(:x=>1)).sql.must_equal "SELECT * FROM albums WHERE (albums.id IN (SELECT albums_tags.album_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) WHERE ((name = 'A') AND (albums_tags.album_id IS NOT NULL) AND (tags.id IN (SELECT tags.id FROM tags WHERE (x = 1))))))"
  end

  it "should be able to filter on many_to_one association datasets with block" do
    @Album.filter(:b_artist=>@Artist.filter(:x=>1)).sql.must_equal "SELECT * FROM albums WHERE (albums.artist_id IN (SELECT artists.id FROM artists WHERE ((name = 'B') AND (artists.id IS NOT NULL) AND (artists.id IN (SELECT artists.id FROM artists WHERE (x = 1))))))"
  end

  it "should be able to filter on one_to_many association datasets with block" do
    @Album.filter(:b_tracks=>@Track.filter(:x=>1)).sql.must_equal "SELECT * FROM albums WHERE (albums.id IN (SELECT tracks.album_id FROM tracks WHERE ((name = 'B') AND (tracks.album_id IS NOT NULL) AND (tracks.id IN (SELECT tracks.id FROM tracks WHERE (x = 1))))))"
  end

  it "should be able to filter on one_to_one association datasets with block" do
    @Album.filter(:b_album_info=>@AlbumInfo.filter(:x=>1)).sql.must_equal "SELECT * FROM albums WHERE (albums.id IN (SELECT album_infos.album_id FROM album_infos WHERE ((name = 'B') AND (album_infos.album_id IS NOT NULL) AND (album_infos.id IN (SELECT album_infos.id FROM album_infos WHERE (x = 1))))))"
  end

  it "should be able to filter on many_to_many association datasets with block" do
    @Album.filter(:b_tags=>@Tag.filter(:x=>1)).sql.must_equal "SELECT * FROM albums WHERE (albums.id IN (SELECT albums_tags.album_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) WHERE ((name = 'B') AND (albums_tags.album_id IS NOT NULL) AND (tags.id IN (SELECT tags.id FROM tags WHERE (x = 1))))))"
  end

  it "should be able to filter on many_to_one association datasets with composite keys" do
    @Album.filter(:cartist=>@Artist.filter(:x=>1)).sql.must_equal 'SELECT * FROM albums WHERE ((albums.artist_id1, albums.artist_id2) IN (SELECT artists.id1, artists.id2 FROM artists WHERE ((x = 1) AND (artists.id1 IS NOT NULL) AND (artists.id2 IS NOT NULL))))'
  end

  it "should be able to filter on one_to_many association datasets with composite keys" do
    @Album.filter(:ctracks=>@Track.filter(:x=>1)).sql.must_equal 'SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN (SELECT tracks.album_id1, tracks.album_id2 FROM tracks WHERE ((x = 1) AND (tracks.album_id1 IS NOT NULL) AND (tracks.album_id2 IS NOT NULL))))'
  end

  it "should be able to filter on one_to_one association datasets with composite keys" do
    @Album.filter(:calbum_info=>@AlbumInfo.filter(:x=>1)).sql.must_equal 'SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN (SELECT album_infos.album_id1, album_infos.album_id2 FROM album_infos WHERE ((x = 1) AND (album_infos.album_id1 IS NOT NULL) AND (album_infos.album_id2 IS NOT NULL))))'
  end

  it "should be able to filter on many_to_many association datasets with composite keys" do
    @Album.filter(:ctags=>@Tag.filter(:x=>1)).sql.must_equal 'SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN (SELECT albums_tags.album_id1, albums_tags.album_id2 FROM albums_tags WHERE (((albums_tags.tag_id1, albums_tags.tag_id2) IN (SELECT tags.tid1, tags.tid2 FROM tags WHERE ((x = 1) AND (tags.tid1 IS NOT NULL) AND (tags.tid2 IS NOT NULL)))) AND (albums_tags.album_id1 IS NOT NULL) AND (albums_tags.album_id2 IS NOT NULL))))'
  end

  it "should be able to filter on many_to_one association datasets with :conditions and composite keys" do
    @Album.filter(:a_cartist=>@Artist.filter(:x=>1)).sql.must_equal "SELECT * FROM albums WHERE ((albums.artist_id1, albums.artist_id2) IN (SELECT artists.id1, artists.id2 FROM artists WHERE ((name = 'A') AND (artists.id1 IS NOT NULL) AND (artists.id2 IS NOT NULL) AND (artists.id IN (SELECT artists.id FROM artists WHERE (x = 1))))))"
  end

  it "should be able to filter on one_to_many association datasets with :conditions and composite keys" do
    @Album.filter(:a_ctracks=>@Track.filter(:x=>1)).sql.must_equal "SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN (SELECT tracks.album_id1, tracks.album_id2 FROM tracks WHERE ((name = 'A') AND (tracks.album_id1 IS NOT NULL) AND (tracks.album_id2 IS NOT NULL) AND (tracks.id IN (SELECT tracks.id FROM tracks WHERE (x = 1))))))"
  end

  it "should be able to filter on one_to_one association datasets with :conditions and composite keys" do
    @Album.filter(:a_calbum_info=>@AlbumInfo.filter(:x=>1)).sql.must_equal "SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN (SELECT album_infos.album_id1, album_infos.album_id2 FROM album_infos WHERE ((name = 'A') AND (album_infos.album_id1 IS NOT NULL) AND (album_infos.album_id2 IS NOT NULL) AND (album_infos.id IN (SELECT album_infos.id FROM album_infos WHERE (x = 1))))))"
  end

  it "should be able to filter on many_to_many association datasets with :conditions and composite keys" do
    @Album.filter(:a_ctags=>@Tag.filter(:x=>1)).sql.must_equal "SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN (SELECT albums_tags.album_id1, albums_tags.album_id2 FROM tags INNER JOIN albums_tags ON ((albums_tags.tag_id1 = tags.tid1) AND (albums_tags.tag_id2 = tags.tid2)) WHERE ((name = 'A') AND (albums_tags.album_id1 IS NOT NULL) AND (albums_tags.album_id2 IS NOT NULL) AND (tags.id IN (SELECT tags.id FROM tags WHERE (x = 1))))))"
  end

  it "should be able to filter on many_to_one association datasets with block and composite keys" do
    @Album.filter(:b_cartist=>@Artist.filter(:x=>1)).sql.must_equal "SELECT * FROM albums WHERE ((albums.artist_id1, albums.artist_id2) IN (SELECT artists.id1, artists.id2 FROM artists WHERE ((name = 'B') AND (artists.id1 IS NOT NULL) AND (artists.id2 IS NOT NULL) AND (artists.id IN (SELECT artists.id FROM artists WHERE (x = 1))))))"
  end

  it "should be able to filter on one_to_many association datasets with block and composite keys" do
    @Album.filter(:b_ctracks=>@Track.filter(:x=>1)).sql.must_equal "SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN (SELECT tracks.album_id1, tracks.album_id2 FROM tracks WHERE ((name = 'B') AND (tracks.album_id1 IS NOT NULL) AND (tracks.album_id2 IS NOT NULL) AND (tracks.id IN (SELECT tracks.id FROM tracks WHERE (x = 1))))))"
  end

  it "should be able to filter on one_to_one association datasets with block and composite keys" do
    @Album.filter(:b_calbum_info=>@AlbumInfo.filter(:x=>1)).sql.must_equal "SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN (SELECT album_infos.album_id1, album_infos.album_id2 FROM album_infos WHERE ((name = 'B') AND (album_infos.album_id1 IS NOT NULL) AND (album_infos.album_id2 IS NOT NULL) AND (album_infos.id IN (SELECT album_infos.id FROM album_infos WHERE (x = 1))))))"
  end

  it "should be able to filter on many_to_many association datasets with block and composite keys" do
    @Album.filter(:b_ctags=>@Tag.filter(:x=>1)).sql.must_equal "SELECT * FROM albums WHERE ((albums.id1, albums.id2) IN (SELECT albums_tags.album_id1, albums_tags.album_id2 FROM tags INNER JOIN albums_tags ON ((albums_tags.tag_id1 = tags.tid1) AND (albums_tags.tag_id2 = tags.tid2)) WHERE ((name = 'B') AND (albums_tags.album_id1 IS NOT NULL) AND (albums_tags.album_id2 IS NOT NULL) AND (tags.id IN (SELECT tags.id FROM tags WHERE (x = 1))))))"
  end

  it "should be able to exclude on many_to_one association datasets" do
    @Album.exclude(:artist=>@Artist.filter(:x=>1)).sql.must_equal 'SELECT * FROM albums WHERE ((albums.artist_id NOT IN (SELECT artists.id FROM artists WHERE ((x = 1) AND (artists.id IS NOT NULL)))) OR (albums.artist_id IS NULL))'
  end

  it "should be able to exclude on one_to_many association datasets" do
    @Album.exclude(:tracks=>@Track.filter(:x=>1)).sql.must_equal 'SELECT * FROM albums WHERE ((albums.id NOT IN (SELECT tracks.album_id FROM tracks WHERE ((x = 1) AND (tracks.album_id IS NOT NULL)))) OR (albums.id IS NULL))'
  end

  it "should be able to exclude on one_to_one association datasets" do
    @Album.exclude(:album_info=>@AlbumInfo.filter(:x=>1)).sql.must_equal 'SELECT * FROM albums WHERE ((albums.id NOT IN (SELECT album_infos.album_id FROM album_infos WHERE ((x = 1) AND (album_infos.album_id IS NOT NULL)))) OR (albums.id IS NULL))'
  end

  it "should be able to exclude on many_to_many association datasets" do
    @Album.exclude(:tags=>@Tag.filter(:x=>1)).sql.must_equal 'SELECT * FROM albums WHERE ((albums.id NOT IN (SELECT albums_tags.album_id FROM albums_tags WHERE ((albums_tags.tag_id IN (SELECT tags.id FROM tags WHERE ((x = 1) AND (tags.id IS NOT NULL)))) AND (albums_tags.album_id IS NOT NULL)))) OR (albums.id IS NULL))'
  end

  it "should be able to exclude on many_to_one association datasets with :conditions" do
    @Album.exclude(:a_artist=>@Artist.filter(:x=>1)).sql.must_equal "SELECT * FROM albums WHERE ((albums.artist_id NOT IN (SELECT artists.id FROM artists WHERE ((name = 'A') AND (artists.id IS NOT NULL) AND (artists.id IN (SELECT artists.id FROM artists WHERE (x = 1)))))) OR (albums.artist_id IS NULL))"
  end

  it "should be able to exclude on one_to_many association datasets with :conditions" do
    @Album.exclude(:a_tracks=>@Track.filter(:x=>1)).sql.must_equal "SELECT * FROM albums WHERE ((albums.id NOT IN (SELECT tracks.album_id FROM tracks WHERE ((name = 'A') AND (tracks.album_id IS NOT NULL) AND (tracks.id IN (SELECT tracks.id FROM tracks WHERE (x = 1)))))) OR (albums.id IS NULL))"
  end

  it "should be able to exclude on one_to_one association datasets with :conditions" do
    @Album.exclude(:a_album_info=>@AlbumInfo.filter(:x=>1)).sql.must_equal "SELECT * FROM albums WHERE ((albums.id NOT IN (SELECT album_infos.album_id FROM album_infos WHERE ((name = 'A') AND (album_infos.album_id IS NOT NULL) AND (album_infos.id IN (SELECT album_infos.id FROM album_infos WHERE (x = 1)))))) OR (albums.id IS NULL))"
  end

  it "should be able to exclude on many_to_many association datasets with :conditions" do
    @Album.exclude(:a_tags=>@Tag.filter(:x=>1)).sql.must_equal "SELECT * FROM albums WHERE ((albums.id NOT IN (SELECT albums_tags.album_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) WHERE ((name = 'A') AND (albums_tags.album_id IS NOT NULL) AND (tags.id IN (SELECT tags.id FROM tags WHERE (x = 1)))))) OR (albums.id IS NULL))"
  end

  it "should be able to exclude on many_to_one association datasets with block" do
    @Album.exclude(:b_artist=>@Artist.filter(:x=>1)).sql.must_equal "SELECT * FROM albums WHERE ((albums.artist_id NOT IN (SELECT artists.id FROM artists WHERE ((name = 'B') AND (artists.id IS NOT NULL) AND (artists.id IN (SELECT artists.id FROM artists WHERE (x = 1)))))) OR (albums.artist_id IS NULL))"
  end

  it "should be able to exclude on one_to_many association datasets with block" do
    @Album.exclude(:b_tracks=>@Track.filter(:x=>1)).sql.must_equal "SELECT * FROM albums WHERE ((albums.id NOT IN (SELECT tracks.album_id FROM tracks WHERE ((name = 'B') AND (tracks.album_id IS NOT NULL) AND (tracks.id IN (SELECT tracks.id FROM tracks WHERE (x = 1)))))) OR (albums.id IS NULL))"
  end

  it "should be able to exclude on one_to_one association datasets with block" do
    @Album.exclude(:b_album_info=>@AlbumInfo.filter(:x=>1)).sql.must_equal "SELECT * FROM albums WHERE ((albums.id NOT IN (SELECT album_infos.album_id FROM album_infos WHERE ((name = 'B') AND (album_infos.album_id IS NOT NULL) AND (album_infos.id IN (SELECT album_infos.id FROM album_infos WHERE (x = 1)))))) OR (albums.id IS NULL))"
  end

  it "should be able to exclude on many_to_many association datasets with block" do
    @Album.exclude(:b_tags=>@Tag.filter(:x=>1)).sql.must_equal "SELECT * FROM albums WHERE ((albums.id NOT IN (SELECT albums_tags.album_id FROM tags INNER JOIN albums_tags ON (albums_tags.tag_id = tags.id) WHERE ((name = 'B') AND (albums_tags.album_id IS NOT NULL) AND (tags.id IN (SELECT tags.id FROM tags WHERE (x = 1)))))) OR (albums.id IS NULL))"
  end

  it "should be able to exclude on many_to_one association datasets with composite keys" do
    @Album.exclude(:cartist=>@Artist.filter(:x=>1)).sql.must_equal 'SELECT * FROM albums WHERE (((albums.artist_id1, albums.artist_id2) NOT IN (SELECT artists.id1, artists.id2 FROM artists WHERE ((x = 1) AND (artists.id1 IS NOT NULL) AND (artists.id2 IS NOT NULL)))) OR (albums.artist_id1 IS NULL) OR (albums.artist_id2 IS NULL))'
  end

  it "should be able to exclude on one_to_many association datasets with composite keys" do
    @Album.exclude(:ctracks=>@Track.filter(:x=>1)).sql.must_equal 'SELECT * FROM albums WHERE (((albums.id1, albums.id2) NOT IN (SELECT tracks.album_id1, tracks.album_id2 FROM tracks WHERE ((x = 1) AND (tracks.album_id1 IS NOT NULL) AND (tracks.album_id2 IS NOT NULL)))) OR (albums.id1 IS NULL) OR (albums.id2 IS NULL))'
  end

  it "should be able to exclude on one_to_one association datasets with composite keys" do
    @Album.exclude(:calbum_info=>@AlbumInfo.filter(:x=>1)).sql.must_equal 'SELECT * FROM albums WHERE (((albums.id1, albums.id2) NOT IN (SELECT album_infos.album_id1, album_infos.album_id2 FROM album_infos WHERE ((x = 1) AND (album_infos.album_id1 IS NOT NULL) AND (album_infos.album_id2 IS NOT NULL)))) OR (albums.id1 IS NULL) OR (albums.id2 IS NULL))'
  end

  it "should be able to exclude on many_to_many association datasets with composite keys" do
    @Album.exclude(:ctags=>@Tag.filter(:x=>1)).sql.must_equal 'SELECT * FROM albums WHERE (((albums.id1, albums.id2) NOT IN (SELECT albums_tags.album_id1, albums_tags.album_id2 FROM albums_tags WHERE (((albums_tags.tag_id1, albums_tags.tag_id2) IN (SELECT tags.tid1, tags.tid2 FROM tags WHERE ((x = 1) AND (tags.tid1 IS NOT NULL) AND (tags.tid2 IS NOT NULL)))) AND (albums_tags.album_id1 IS NOT NULL) AND (albums_tags.album_id2 IS NOT NULL)))) OR (albums.id1 IS NULL) OR (albums.id2 IS NULL))'
  end

  it "should be able to exclude on many_to_one association datasets with :conditions and composite keys" do
    @Album.exclude(:a_cartist=>@Artist.filter(:x=>1)).sql.must_equal "SELECT * FROM albums WHERE (((albums.artist_id1, albums.artist_id2) NOT IN (SELECT artists.id1, artists.id2 FROM artists WHERE ((name = 'A') AND (artists.id1 IS NOT NULL) AND (artists.id2 IS NOT NULL) AND (artists.id IN (SELECT artists.id FROM artists WHERE (x = 1)))))) OR (albums.artist_id1 IS NULL) OR (albums.artist_id2 IS NULL))"
  end

  it "should be able to exclude on one_to_many association datasets with :conditions and composite keys" do
    @Album.exclude(:a_ctracks=>@Track.filter(:x=>1)).sql.must_equal "SELECT * FROM albums WHERE (((albums.id1, albums.id2) NOT IN (SELECT tracks.album_id1, tracks.album_id2 FROM tracks WHERE ((name = 'A') AND (tracks.album_id1 IS NOT NULL) AND (tracks.album_id2 IS NOT NULL) AND (tracks.id IN (SELECT tracks.id FROM tracks WHERE (x = 1)))))) OR (albums.id1 IS NULL) OR (albums.id2 IS NULL))"
  end

  it "should be able to exclude on one_to_one association datasets with :conditions and composite keys" do
    @Album.exclude(:a_calbum_info=>@AlbumInfo.filter(:x=>1)).sql.must_equal "SELECT * FROM albums WHERE (((albums.id1, albums.id2) NOT IN (SELECT album_infos.album_id1, album_infos.album_id2 FROM album_infos WHERE ((name = 'A') AND (album_infos.album_id1 IS NOT NULL) AND (album_infos.album_id2 IS NOT NULL) AND (album_infos.id IN (SELECT album_infos.id FROM album_infos WHERE (x = 1)))))) OR (albums.id1 IS NULL) OR (albums.id2 IS NULL))"
  end

  it "should be able to exclude on many_to_many association datasets with :conditions and composite keys" do
    @Album.exclude(:a_ctags=>@Tag.filter(:x=>1)).sql.must_equal "SELECT * FROM albums WHERE (((albums.id1, albums.id2) NOT IN (SELECT albums_tags.album_id1, albums_tags.album_id2 FROM tags INNER JOIN albums_tags ON ((albums_tags.tag_id1 = tags.tid1) AND (albums_tags.tag_id2 = tags.tid2)) WHERE ((name = 'A') AND (albums_tags.album_id1 IS NOT NULL) AND (albums_tags.album_id2 IS NOT NULL) AND (tags.id IN (SELECT tags.id FROM tags WHERE (x = 1)))))) OR (albums.id1 IS NULL) OR (albums.id2 IS NULL))"
  end

  it "should be able to exclude on many_to_one association datasets with block and composite keys" do
    @Album.exclude(:b_cartist=>@Artist.filter(:x=>1)).sql.must_equal "SELECT * FROM albums WHERE (((albums.artist_id1, albums.artist_id2) NOT IN (SELECT artists.id1, artists.id2 FROM artists WHERE ((name = 'B') AND (artists.id1 IS NOT NULL) AND (artists.id2 IS NOT NULL) AND (artists.id IN (SELECT artists.id FROM artists WHERE (x = 1)))))) OR (albums.artist_id1 IS NULL) OR (albums.artist_id2 IS NULL))"
  end

  it "should be able to exclude on one_to_many association datasets with block and composite keys" do
    @Album.exclude(:b_ctracks=>@Track.filter(:x=>1)).sql.must_equal "SELECT * FROM albums WHERE (((albums.id1, albums.id2) NOT IN (SELECT tracks.album_id1, tracks.album_id2 FROM tracks WHERE ((name = 'B') AND (tracks.album_id1 IS NOT NULL) AND (tracks.album_id2 IS NOT NULL) AND (tracks.id IN (SELECT tracks.id FROM tracks WHERE (x = 1)))))) OR (albums.id1 IS NULL) OR (albums.id2 IS NULL))"
  end

  it "should be able to exclude on one_to_one association datasets with block and composite keys" do
    @Album.exclude(:b_calbum_info=>@AlbumInfo.filter(:x=>1)).sql.must_equal "SELECT * FROM albums WHERE (((albums.id1, albums.id2) NOT IN (SELECT album_infos.album_id1, album_infos.album_id2 FROM album_infos WHERE ((name = 'B') AND (album_infos.album_id1 IS NOT NULL) AND (album_infos.album_id2 IS NOT NULL) AND (album_infos.id IN (SELECT album_infos.id FROM album_infos WHERE (x = 1)))))) OR (albums.id1 IS NULL) OR (albums.id2 IS NULL))"
  end

  it "should be able to exclude on many_to_many association datasets with block and composite keys" do
    @Album.exclude(:b_ctags=>@Tag.filter(:x=>1)).sql.must_equal "SELECT * FROM albums WHERE (((albums.id1, albums.id2) NOT IN (SELECT albums_tags.album_id1, albums_tags.album_id2 FROM tags INNER JOIN albums_tags ON ((albums_tags.tag_id1 = tags.tid1) AND (albums_tags.tag_id2 = tags.tid2)) WHERE ((name = 'B') AND (albums_tags.album_id1 IS NOT NULL) AND (albums_tags.album_id2 IS NOT NULL) AND (tags.id IN (SELECT tags.id FROM tags WHERE (x = 1)))))) OR (albums.id1 IS NULL) OR (albums.id2 IS NULL))"
  end

  it "should do a regular IN query if the dataset for a different model is used" do
    @Album.filter(:artist=>@Album.select(:x)).sql.must_equal 'SELECT * FROM albums WHERE (artist IN (SELECT x FROM albums))'
  end

  it "should do a regular IN query if a non-model dataset is used" do
    @Album.filter(:artist=>@Album.db.from(:albums).select(:x)).sql.must_equal 'SELECT * FROM albums WHERE (artist IN (SELECT x FROM albums))'
  end
end

describe "Sequel::Model Associations with clashing column names" do
  before do
    @db = Sequel.mock(:fetch=>{:id=>1, :object_id=>2})
    @Foo = Class.new(Sequel::Model(@db[:foos]))
    @Bar = Class.new(Sequel::Model(@db[:bars]))
    @Foo.columns :id, :object_id
    @Bar.columns :id, :object_id
    @Foo.def_column_alias(:obj_id, :object_id)
    @Bar.def_column_alias(:obj_id, :object_id)
    @Foo.one_to_many :bars, :primary_key=>:obj_id, :primary_key_column=>:object_id, :key=>:object_id, :key_method=>:obj_id,  :class=>@Bar
    @Foo.one_to_one :bar, :primary_key=>:obj_id, :primary_key_column=>:object_id, :key=>:object_id, :key_method=>:obj_id, :class=>@Bar
    @Bar.many_to_one :foo, :key=>:obj_id, :key_column=>:object_id, :primary_key=>:object_id, :primary_key_method=>:obj_id, :class=>@Foo
    @Foo.many_to_many :mtmbars, :join_table=>:bars_foos, :left_primary_key=>:obj_id, :left_primary_key_column=>:object_id, :right_primary_key=>:object_id, :right_primary_key_method=>:obj_id, :left_key=>:foo_id, :right_key=>:object_id, :class=>@Bar
    @Bar.many_to_many :mtmfoos, :join_table=>:bars_foos, :left_primary_key=>:obj_id, :left_primary_key_column=>:object_id, :right_primary_key=>:object_id, :right_primary_key_method=>:obj_id, :left_key=>:object_id, :right_key=>:foo_id, :class=>@Foo
    @foo = @Foo.load(:id=>1, :object_id=>2)
    @bar = @Bar.load(:id=>1, :object_id=>2)
    @db.sqls
  end

  it "should have working regular association methods" do
    @Bar.first.foo.must_equal @foo
    @db.sqls.must_equal ["SELECT * FROM bars LIMIT 1", "SELECT * FROM foos WHERE (foos.object_id = 2) LIMIT 1"]
    @Foo.first.bars.must_equal [@bar]
    @db.sqls.must_equal ["SELECT * FROM foos LIMIT 1", "SELECT * FROM bars WHERE (bars.object_id = 2)"]
    @Foo.first.bar.must_equal @bar
    @db.sqls.must_equal ["SELECT * FROM foos LIMIT 1", "SELECT * FROM bars WHERE (bars.object_id = 2) LIMIT 1"]
    @Foo.first.mtmbars.must_equal [@bar]
    @db.sqls.must_equal ["SELECT * FROM foos LIMIT 1", "SELECT bars.* FROM bars INNER JOIN bars_foos ON (bars_foos.object_id = bars.object_id) WHERE (bars_foos.foo_id = 2)"]
    @Bar.first.mtmfoos.must_equal [@foo]
    @db.sqls.must_equal ["SELECT * FROM bars LIMIT 1", "SELECT foos.* FROM foos INNER JOIN bars_foos ON (bars_foos.foo_id = foos.object_id) WHERE (bars_foos.object_id = 2)"]
  end

  it "should have working eager loading methods" do
    @Bar.eager(:foo).all.map{|o| [o, o.foo]}.must_equal [[@bar, @foo]]
    @db.sqls.must_equal ["SELECT * FROM bars", "SELECT * FROM foos WHERE (foos.object_id IN (2))"]
    @Foo.eager(:bars).all.map{|o| [o, o.bars]}.must_equal [[@foo, [@bar]]]
    @db.sqls.must_equal ["SELECT * FROM foos", "SELECT * FROM bars WHERE (bars.object_id IN (2))"]
    @Foo.eager(:bar).all.map{|o| [o, o.bar]}.must_equal [[@foo, @bar]]
    @db.sqls.must_equal ["SELECT * FROM foos", "SELECT * FROM bars WHERE (bars.object_id IN (2))"]
    @db.fetch = [[{:id=>1, :object_id=>2}], [{:id=>1, :object_id=>2, :x_foreign_key_x=>2}]]
    @Foo.eager(:mtmbars).all.map{|o| [o, o.mtmbars]}.must_equal [[@foo, [@bar]]]
    @db.sqls.must_equal ["SELECT * FROM foos", "SELECT bars.*, bars_foos.foo_id AS x_foreign_key_x FROM bars INNER JOIN bars_foos ON (bars_foos.object_id = bars.object_id) WHERE (bars_foos.foo_id IN (2))"]
    @db.fetch = [[{:id=>1, :object_id=>2}], [{:id=>1, :object_id=>2, :x_foreign_key_x=>2}]]
    @Bar.eager(:mtmfoos).all.map{|o| [o, o.mtmfoos]}.must_equal [[@bar, [@foo]]]
    @db.sqls.must_equal ["SELECT * FROM bars", "SELECT foos.*, bars_foos.object_id AS x_foreign_key_x FROM foos INNER JOIN bars_foos ON (bars_foos.foo_id = foos.object_id) WHERE (bars_foos.object_id IN (2))"]
  end

  it "should have working eager graphing methods" do
    @db.fetch = {:id=>1, :object_id=>2, :foo_id=>1, :foo_object_id=>2}
    @Bar.eager_graph(:foo).all.map{|o| [o, o.foo]}.must_equal [[@bar, @foo]]
    @db.sqls.must_equal ["SELECT bars.id, bars.object_id, foo.id AS foo_id, foo.object_id AS foo_object_id FROM bars LEFT OUTER JOIN foos AS foo ON (foo.object_id = bars.object_id)"]
    @db.fetch = {:id=>1, :object_id=>2, :bars_id=>1, :bars_object_id=>2}
    @Foo.eager_graph(:bars).all.map{|o| [o, o.bars]}.must_equal [[@foo, [@bar]]]
    @db.sqls.must_equal ["SELECT foos.id, foos.object_id, bars.id AS bars_id, bars.object_id AS bars_object_id FROM foos LEFT OUTER JOIN bars ON (bars.object_id = foos.object_id)"]
    @db.fetch = {:id=>1, :object_id=>2, :bar_id=>1, :bar_object_id=>2}
    @Foo.eager_graph(:bar).all.map{|o| [o, o.bar]}.must_equal [[@foo, @bar]]
    @db.sqls.must_equal ["SELECT foos.id, foos.object_id, bar.id AS bar_id, bar.object_id AS bar_object_id FROM foos LEFT OUTER JOIN bars AS bar ON (bar.object_id = foos.object_id)"]
    @db.fetch = {:id=>1, :object_id=>2, :mtmfoos_id=>1, :mtmfoos_object_id=>2}
    @Bar.eager_graph(:mtmfoos).all.map{|o| [o, o.mtmfoos]}.must_equal [[@bar, [@foo]]]
    @db.sqls.must_equal ["SELECT bars.id, bars.object_id, mtmfoos.id AS mtmfoos_id, mtmfoos.object_id AS mtmfoos_object_id FROM bars LEFT OUTER JOIN bars_foos ON (bars_foos.object_id = bars.object_id) LEFT OUTER JOIN foos AS mtmfoos ON (mtmfoos.object_id = bars_foos.foo_id)"]
    @db.fetch = {:id=>1, :object_id=>2, :mtmbars_id=>1, :mtmbars_object_id=>2}
    @Foo.eager_graph(:mtmbars).all.map{|o| [o, o.mtmbars]}.must_equal [[@foo, [@bar]]]
    @db.sqls.must_equal ["SELECT foos.id, foos.object_id, mtmbars.id AS mtmbars_id, mtmbars.object_id AS mtmbars_object_id FROM foos LEFT OUTER JOIN bars_foos ON (bars_foos.foo_id = foos.object_id) LEFT OUTER JOIN bars AS mtmbars ON (mtmbars.object_id = bars_foos.object_id)"]
  end

  it "should not have filter by associations code break if using IN/NOT in with a set-returning function" do
    @Bar.where(Sequel::SQL::BooleanExpression.new(:IN, :foo, Sequel.function(:srf))).sql.must_equal 'SELECT * FROM bars WHERE (foo IN srf())'
    @Bar.exclude(Sequel::SQL::BooleanExpression.new(:IN, :foo, Sequel.function(:srf))).sql.must_equal 'SELECT * FROM bars WHERE (foo NOT IN srf())'
  end

  it "should have working eager graphing methods when using SQL::Identifier inside SQL::AliasedExpression" do
    @db.fetch = {:id=>1, :object_id=>2, :f_id=>1, :f_object_id=>2}
    @Bar.eager_graph(Sequel[:foo].as(:f)).all.map{|o| [o, o.foo]}.must_equal [[@bar, @foo]]
    @db.sqls.must_equal ["SELECT bars.id, bars.object_id, f.id AS f_id, f.object_id AS f_object_id FROM bars LEFT OUTER JOIN foos AS f ON (f.object_id = bars.object_id)"]
  end

  it "should have working filter by associations with model instances" do
    @Bar.first(:foo=>@foo).must_equal @bar
    @db.sqls.must_equal ["SELECT * FROM bars WHERE (bars.object_id = 2) LIMIT 1"]
    @Foo.first(:bars=>@bar).must_equal @foo
    @db.sqls.must_equal ["SELECT * FROM foos WHERE (foos.object_id = 2) LIMIT 1"]
    @Foo.first(:bar=>@bar).must_equal @foo
    @db.sqls.must_equal ["SELECT * FROM foos WHERE (foos.object_id = 2) LIMIT 1"]
    @Foo.first(:mtmbars=>@bar).must_equal @foo
    @db.sqls.must_equal ["SELECT * FROM foos WHERE (foos.object_id IN (SELECT bars_foos.foo_id FROM bars_foos WHERE ((bars_foos.object_id = 2) AND (bars_foos.foo_id IS NOT NULL)))) LIMIT 1"]
    @Bar.first(:mtmfoos=>@foo).must_equal @bar
    @db.sqls.must_equal ["SELECT * FROM bars WHERE (bars.object_id IN (SELECT bars_foos.object_id FROM bars_foos WHERE ((bars_foos.foo_id = 2) AND (bars_foos.object_id IS NOT NULL)))) LIMIT 1"]
  end

  it "should have working filter by associations for associations with :conditions with model instances" do
    @Bar.many_to_one :foo, :clone=>:foo, :conditions=>{:name=>'A'}
    @Foo.one_to_many :bars, :clone=>:bars, :conditions=>{:name=>'A'}
    @Foo.one_to_one :bar, :clone=>:bars
    @Foo.many_to_many :mtmbars, :clone=>:mtmbars, :conditions=>{:name=>'A'}
    @Bar.many_to_many :mtmfoos, :clone=>:mtmfoos, :conditions=>{:name=>'A'}

    @Bar.where(:foo=>@foo).sql.must_equal "SELECT * FROM bars WHERE (bars.object_id IN (SELECT foos.object_id FROM foos WHERE ((name = 'A') AND (foos.object_id IS NOT NULL) AND (foos.id = 1))))"
    @Foo.where(:bars=>@bar).sql.must_equal "SELECT * FROM foos WHERE (foos.object_id IN (SELECT bars.object_id FROM bars WHERE ((name = 'A') AND (bars.object_id IS NOT NULL) AND (bars.id = 1))))"
    @Foo.where(:bar=>@bar).sql.must_equal "SELECT * FROM foos WHERE (foos.object_id IN (SELECT bars.object_id FROM bars WHERE ((name = 'A') AND (bars.object_id IS NOT NULL) AND (bars.id = 1))))"
    @Foo.where(:mtmbars=>@bar).sql.must_equal "SELECT * FROM foos WHERE (foos.object_id IN (SELECT bars_foos.foo_id FROM bars INNER JOIN bars_foos ON (bars_foos.object_id = bars.object_id) WHERE ((name = 'A') AND (bars_foos.foo_id IS NOT NULL) AND (bars.id = 1))))"
    @Bar.where(:mtmfoos=>@foo).sql.must_equal "SELECT * FROM bars WHERE (bars.object_id IN (SELECT bars_foos.object_id FROM foos INNER JOIN bars_foos ON (bars_foos.foo_id = foos.object_id) WHERE ((name = 'A') AND (bars_foos.object_id IS NOT NULL) AND (foos.id = 1))))"
  end

  it "should have working filter by associations for associations with block with model instances" do
    b = lambda{|ds| ds.where(:name=>'A')}
    @Bar.many_to_one :foo, :clone=>:foo, &b
    @Foo.one_to_many :bars, :clone=>:bars, &b
    @Foo.one_to_one :bar, :clone=>:bars
    @Foo.many_to_many :mtmbars, :clone=>:mtmbars, &b
    @Bar.many_to_many :mtmfoos, :clone=>:mtmfoos, &b

    @Bar.where(:foo=>@foo).sql.must_equal "SELECT * FROM bars WHERE (bars.object_id IN (SELECT foos.object_id FROM foos WHERE ((name = 'A') AND (foos.object_id IS NOT NULL) AND (foos.id = 1))))"
    @Foo.where(:bars=>@bar).sql.must_equal "SELECT * FROM foos WHERE (foos.object_id IN (SELECT bars.object_id FROM bars WHERE ((name = 'A') AND (bars.object_id IS NOT NULL) AND (bars.id = 1))))"
    @Foo.where(:bar=>@bar).sql.must_equal "SELECT * FROM foos WHERE (foos.object_id IN (SELECT bars.object_id FROM bars WHERE ((name = 'A') AND (bars.object_id IS NOT NULL) AND (bars.id = 1))))"
    @Foo.where(:mtmbars=>@bar).sql.must_equal "SELECT * FROM foos WHERE (foos.object_id IN (SELECT bars_foos.foo_id FROM bars INNER JOIN bars_foos ON (bars_foos.object_id = bars.object_id) WHERE ((name = 'A') AND (bars_foos.foo_id IS NOT NULL) AND (bars.id = 1))))"
    @Bar.where(:mtmfoos=>@foo).sql.must_equal "SELECT * FROM bars WHERE (bars.object_id IN (SELECT bars_foos.object_id FROM foos INNER JOIN bars_foos ON (bars_foos.foo_id = foos.object_id) WHERE ((name = 'A') AND (bars_foos.object_id IS NOT NULL) AND (foos.id = 1))))"
  end

  it "should have working modification methods" do
    b = @Bar.load(:id=>2, :object_id=>3)
    f = @Foo.load(:id=>2, :object_id=>3)
    @db.numrows = 1

    @bar.foo = f
    @bar.obj_id.must_equal 3
    @foo.bar = @bar
    @bar.obj_id.must_equal 2

    @foo.add_bar(b)
    @db.fetch = [[{:id=>1, :object_id=>2}, {:id=>2, :object_id=>2}], [{:id=>1, :object_id=>2}]]
    @foo.bars.must_equal [@bar, b]
    @foo.remove_bar(b)
    @foo.bars.must_equal [@bar]
    @foo.remove_all_bars
    @foo.bars.must_equal []

    @db.fetch = [[{:id=>1, :object_id=>2}], [], [{:id=>2, :object_id=>2}]]
    @bar = @Bar.load(:id=>1, :object_id=>2)
    @foo.mtmbars.must_equal [@bar]
    @foo.remove_all_mtmbars
    @foo.mtmbars.must_equal []
    @foo.add_mtmbar(b)
    @foo.mtmbars.must_equal [b]
    @foo.remove_mtmbar(b)
    @foo.mtmbars.must_equal []

    @db.fetch = [[{:id=>2, :object_id=>3}], [], [{:id=>2, :object_id=>3}]]
    @bar.add_mtmfoo(f)
    @bar.mtmfoos.must_equal [f]
    @bar.remove_all_mtmfoos
    @bar.mtmfoos.must_equal []
    @bar.add_mtmfoo(f)
    @bar.mtmfoos.must_equal [f]
    @bar.remove_mtmfoo(f)
    @bar.mtmfoos.must_equal []
  end
end 

describe "Sequel::Model Associations with non-column expression keys" do
  before do
    @db = Sequel.mock(:fetch=>{:id=>1, :object_ids=>[2]})
    @Foo = Class.new(Sequel::Model(@db[:foos]))
    @Bar = Class.new(Sequel::Model(@db[:bars]))
    @Foo.columns :id, :object_ids
    @Bar.columns :id, :object_ids
    m = Module.new{def obj_id; object_ids[0]; end}
    @Foo.include m
    @Bar.include m

    @Foo.one_to_many :bars, :primary_key=>:obj_id, :primary_key_column=>Sequel.subscript(:object_ids, 0), :key=>Sequel.subscript(:object_ids, 0), :key_method=>:obj_id,  :class=>@Bar
    @Foo.one_to_one :bar, :primary_key=>:obj_id, :primary_key_column=>Sequel.subscript(:object_ids, 0), :key=>Sequel.subscript(:object_ids, 0), :key_method=>:obj_id, :class=>@Bar
    @Bar.many_to_one :foo, :key=>:obj_id, :key_column=>Sequel.subscript(:object_ids, 0), :primary_key=>Sequel.subscript(:object_ids, 0), :primary_key_method=>:obj_id, :class=>@Foo
    @Foo.many_to_many :mtmbars, :join_table=>:bars_foos, :left_primary_key=>:obj_id, :left_primary_key_column=>Sequel.subscript(:object_ids, 0), :right_primary_key=>Sequel.subscript(:object_ids, 0), :right_primary_key_method=>:obj_id, :left_key=>Sequel.subscript(:foo_ids, 0), :right_key=>Sequel.subscript(:bar_ids, 0), :class=>@Bar
    @Bar.many_to_many :mtmfoos, :join_table=>:bars_foos, :left_primary_key=>:obj_id, :left_primary_key_column=>Sequel.subscript(:object_ids, 0), :right_primary_key=>Sequel.subscript(:object_ids, 0), :right_primary_key_method=>:obj_id, :left_key=>Sequel.subscript(:bar_ids, 0), :right_key=>Sequel.subscript(:foo_ids, 0), :class=>@Foo, :reciprocal=>nil
    @foo = @Foo.load(:id=>1, :object_ids=>[2])
    @bar = @Bar.load(:id=>1, :object_ids=>[2])
    @db.sqls
  end

  it "should have working regular association methods" do
    @Bar.first.foo.must_equal @foo
    @db.sqls.must_equal ["SELECT * FROM bars LIMIT 1", "SELECT * FROM foos WHERE (foos.object_ids[0] = 2) LIMIT 1"]
    @Foo.first.bars.must_equal [@bar]
    @db.sqls.must_equal ["SELECT * FROM foos LIMIT 1", "SELECT * FROM bars WHERE (bars.object_ids[0] = 2)"]
    @Foo.first.bar.must_equal @bar
    @db.sqls.must_equal ["SELECT * FROM foos LIMIT 1", "SELECT * FROM bars WHERE (bars.object_ids[0] = 2) LIMIT 1"]
    @Foo.first.mtmbars.must_equal [@bar]
    @db.sqls.must_equal ["SELECT * FROM foos LIMIT 1", "SELECT bars.* FROM bars INNER JOIN bars_foos ON (bars_foos.bar_ids[0] = bars.object_ids[0]) WHERE (bars_foos.foo_ids[0] = 2)"]
    @Bar.first.mtmfoos.must_equal [@foo]
    @db.sqls.must_equal ["SELECT * FROM bars LIMIT 1", "SELECT foos.* FROM foos INNER JOIN bars_foos ON (bars_foos.foo_ids[0] = foos.object_ids[0]) WHERE (bars_foos.bar_ids[0] = 2)"]
  end

  it "should have working eager loading methods" do
    @Bar.eager(:foo).all.map{|o| [o, o.foo]}.must_equal [[@bar, @foo]]
    @db.sqls.must_equal ["SELECT * FROM bars", "SELECT * FROM foos WHERE (foos.object_ids[0] IN (2))"]
    @Foo.eager(:bars).all.map{|o| [o, o.bars]}.must_equal [[@foo, [@bar]]]
    @db.sqls.must_equal ["SELECT * FROM foos", "SELECT * FROM bars WHERE (bars.object_ids[0] IN (2))"]
    @Foo.eager(:bar).all.map{|o| [o, o.bar]}.must_equal [[@foo, @bar]]
    @db.sqls.must_equal ["SELECT * FROM foos", "SELECT * FROM bars WHERE (bars.object_ids[0] IN (2))"]
    @db.fetch = [[{:id=>1, :object_ids=>[2]}], [{:id=>1, :object_ids=>[2], :x_foreign_key_x=>2}]]
    @Foo.eager(:mtmbars).all.map{|o| [o, o.mtmbars]}.must_equal [[@foo, [@bar]]]
    @db.sqls.must_equal ["SELECT * FROM foos", "SELECT bars.*, bars_foos.foo_ids[0] AS x_foreign_key_x FROM bars INNER JOIN bars_foos ON (bars_foos.bar_ids[0] = bars.object_ids[0]) WHERE (bars_foos.foo_ids[0] IN (2))"]
    @db.fetch = [[{:id=>1, :object_ids=>[2]}], [{:id=>1, :object_ids=>[2], :x_foreign_key_x=>2}]]
    @Bar.eager(:mtmfoos).all.map{|o| [o, o.mtmfoos]}.must_equal [[@bar, [@foo]]]
    @db.sqls.must_equal ["SELECT * FROM bars", "SELECT foos.*, bars_foos.bar_ids[0] AS x_foreign_key_x FROM foos INNER JOIN bars_foos ON (bars_foos.foo_ids[0] = foos.object_ids[0]) WHERE (bars_foos.bar_ids[0] IN (2))"]
  end

  it "should have working eager graphing methods" do
    @db.fetch = {:id=>1, :object_ids=>[2], :foo_id=>1, :foo_object_ids=>[2]}
    @Bar.eager_graph(:foo).all.map{|o| [o, o.foo]}.must_equal [[@bar, @foo]]
    @db.sqls.must_equal ["SELECT bars.id, bars.object_ids, foo.id AS foo_id, foo.object_ids AS foo_object_ids FROM bars LEFT OUTER JOIN foos AS foo ON (foo.object_ids[0] = bars.object_ids[0])"]
    @db.fetch = {:id=>1, :object_ids=>[2], :bars_id=>1, :bars_object_ids=>[2]}
    @Foo.eager_graph(:bars).all.map{|o| [o, o.bars]}.must_equal [[@foo, [@bar]]]
    @db.sqls.must_equal ["SELECT foos.id, foos.object_ids, bars.id AS bars_id, bars.object_ids AS bars_object_ids FROM foos LEFT OUTER JOIN bars ON (bars.object_ids[0] = foos.object_ids[0])"]
    @db.fetch = {:id=>1, :object_ids=>[2], :bar_id=>1, :bar_object_ids=>[2]}
    @Foo.eager_graph(:bar).all.map{|o| [o, o.bar]}.must_equal [[@foo, @bar]]
    @db.sqls.must_equal ["SELECT foos.id, foos.object_ids, bar.id AS bar_id, bar.object_ids AS bar_object_ids FROM foos LEFT OUTER JOIN bars AS bar ON (bar.object_ids[0] = foos.object_ids[0])"]
    @db.fetch = {:id=>1, :object_ids=>[2], :mtmfoos_id=>1, :mtmfoos_object_ids=>[2]}
    @Bar.eager_graph(:mtmfoos).all.map{|o| [o, o.mtmfoos]}.must_equal [[@bar, [@foo]]]
    @db.sqls.must_equal ["SELECT bars.id, bars.object_ids, mtmfoos.id AS mtmfoos_id, mtmfoos.object_ids AS mtmfoos_object_ids FROM bars LEFT OUTER JOIN bars_foos ON (bars_foos.bar_ids[0] = bars.object_ids[0]) LEFT OUTER JOIN foos AS mtmfoos ON (mtmfoos.object_ids[0] = bars_foos.foo_ids[0])"]
    @db.fetch = {:id=>1, :object_ids=>[2], :mtmbars_id=>1, :mtmbars_object_ids=>[2]}
    @Foo.eager_graph(:mtmbars).all.map{|o| [o, o.mtmbars]}.must_equal [[@foo, [@bar]]]
    @db.sqls.must_equal ["SELECT foos.id, foos.object_ids, mtmbars.id AS mtmbars_id, mtmbars.object_ids AS mtmbars_object_ids FROM foos LEFT OUTER JOIN bars_foos ON (bars_foos.foo_ids[0] = foos.object_ids[0]) LEFT OUTER JOIN bars AS mtmbars ON (mtmbars.object_ids[0] = bars_foos.bar_ids[0])"]
  end

  it "should have working filter by associations with model instances" do
    @Bar.first(:foo=>@foo).must_equal @bar
    @db.sqls.must_equal ["SELECT * FROM bars WHERE (bars.object_ids[0] = 2) LIMIT 1"]
    @Foo.first(:bars=>@bar).must_equal @foo
    @db.sqls.must_equal ["SELECT * FROM foos WHERE (foos.object_ids[0] = 2) LIMIT 1"]
    @Foo.first(:bar=>@bar).must_equal @foo
    @db.sqls.must_equal ["SELECT * FROM foos WHERE (foos.object_ids[0] = 2) LIMIT 1"]
    @Foo.first(:mtmbars=>@bar).must_equal @foo
    @db.sqls.must_equal ["SELECT * FROM foos WHERE (foos.object_ids[0] IN (SELECT bars_foos.foo_ids[0] FROM bars_foos WHERE ((bars_foos.bar_ids[0] = 2) AND (bars_foos.foo_ids[0] IS NOT NULL)))) LIMIT 1"]
    @Bar.first(:mtmfoos=>@foo).must_equal @bar
    @db.sqls.must_equal ["SELECT * FROM bars WHERE (bars.object_ids[0] IN (SELECT bars_foos.bar_ids[0] FROM bars_foos WHERE ((bars_foos.foo_ids[0] = 2) AND (bars_foos.bar_ids[0] IS NOT NULL)))) LIMIT 1"]
  end

  it "should have working filter by associations for associations with :conditions with model instances" do
    @Bar.many_to_one :foo, :clone=>:foo, :conditions=>{:name=>'A'}
    @Foo.one_to_many :bars, :clone=>:bars, :conditions=>{:name=>'A'}
    @Foo.one_to_one :bar, :clone=>:bars
    @Foo.many_to_many :mtmbars, :clone=>:mtmbars, :conditions=>{:name=>'A'}
    @Bar.many_to_many :mtmfoos, :clone=>:mtmfoos, :conditions=>{:name=>'A'}

    @Bar.where(:foo=>@foo).sql.must_equal "SELECT * FROM bars WHERE (bars.object_ids[0] IN (SELECT foos.object_ids[0] FROM foos WHERE ((name = 'A') AND (foos.object_ids[0] IS NOT NULL) AND (foos.id = 1))))"
    @Foo.where(:bars=>@bar).sql.must_equal "SELECT * FROM foos WHERE (foos.object_ids[0] IN (SELECT bars.object_ids[0] FROM bars WHERE ((name = 'A') AND (bars.object_ids[0] IS NOT NULL) AND (bars.id = 1))))"
    @Foo.where(:bar=>@bar).sql.must_equal "SELECT * FROM foos WHERE (foos.object_ids[0] IN (SELECT bars.object_ids[0] FROM bars WHERE ((name = 'A') AND (bars.object_ids[0] IS NOT NULL) AND (bars.id = 1))))"
    @Foo.where(:mtmbars=>@bar).sql.must_equal "SELECT * FROM foos WHERE (foos.object_ids[0] IN (SELECT bars_foos.foo_ids[0] FROM bars INNER JOIN bars_foos ON (bars_foos.bar_ids[0] = bars.object_ids[0]) WHERE ((name = 'A') AND (bars_foos.foo_ids[0] IS NOT NULL) AND (bars.id = 1))))"
    @Bar.where(:mtmfoos=>@foo).sql.must_equal "SELECT * FROM bars WHERE (bars.object_ids[0] IN (SELECT bars_foos.bar_ids[0] FROM foos INNER JOIN bars_foos ON (bars_foos.foo_ids[0] = foos.object_ids[0]) WHERE ((name = 'A') AND (bars_foos.bar_ids[0] IS NOT NULL) AND (foos.id = 1))))"
  end

  it "should have working filter by associations for associations with block with model instances" do
    b = lambda{|ds| ds.where(:name=>'A')}
    @Bar.many_to_one :foo, :clone=>:foo, &b
    @Foo.one_to_many :bars, :clone=>:bars, &b
    @Foo.one_to_one :bar, :clone=>:bars
    @Foo.many_to_many :mtmbars, :clone=>:mtmbars, &b
    @Bar.many_to_many :mtmfoos, :clone=>:mtmfoos, &b

    @Bar.where(:foo=>@foo).sql.must_equal "SELECT * FROM bars WHERE (bars.object_ids[0] IN (SELECT foos.object_ids[0] FROM foos WHERE ((name = 'A') AND (foos.object_ids[0] IS NOT NULL) AND (foos.id = 1))))"
    @Foo.where(:bars=>@bar).sql.must_equal "SELECT * FROM foos WHERE (foos.object_ids[0] IN (SELECT bars.object_ids[0] FROM bars WHERE ((name = 'A') AND (bars.object_ids[0] IS NOT NULL) AND (bars.id = 1))))"
    @Foo.where(:bar=>@bar).sql.must_equal "SELECT * FROM foos WHERE (foos.object_ids[0] IN (SELECT bars.object_ids[0] FROM bars WHERE ((name = 'A') AND (bars.object_ids[0] IS NOT NULL) AND (bars.id = 1))))"
    @Foo.where(:mtmbars=>@bar).sql.must_equal "SELECT * FROM foos WHERE (foos.object_ids[0] IN (SELECT bars_foos.foo_ids[0] FROM bars INNER JOIN bars_foos ON (bars_foos.bar_ids[0] = bars.object_ids[0]) WHERE ((name = 'A') AND (bars_foos.foo_ids[0] IS NOT NULL) AND (bars.id = 1))))"
    @Bar.where(:mtmfoos=>@foo).sql.must_equal "SELECT * FROM bars WHERE (bars.object_ids[0] IN (SELECT bars_foos.bar_ids[0] FROM foos INNER JOIN bars_foos ON (bars_foos.foo_ids[0] = foos.object_ids[0]) WHERE ((name = 'A') AND (bars_foos.bar_ids[0] IS NOT NULL) AND (foos.id = 1))))"
  end

  it "should have working filter by associations with model datasets" do
    @Bar.first(:foo=>@Foo.where(:id=>@foo.id)).must_equal @bar
    @db.sqls.must_equal ["SELECT * FROM bars WHERE (bars.object_ids[0] IN (SELECT foos.object_ids[0] FROM foos WHERE ((id = 1) AND (foos.object_ids[0] IS NOT NULL)))) LIMIT 1"]
    @Foo.first(:bars=>@Bar.where(:id=>@bar.id)).must_equal @foo
    @db.sqls.must_equal ["SELECT * FROM foos WHERE (foos.object_ids[0] IN (SELECT bars.object_ids[0] FROM bars WHERE ((id = 1) AND (bars.object_ids[0] IS NOT NULL)))) LIMIT 1"]
    @Foo.first(:bar=>@Bar.where(:id=>@bar.id)).must_equal @foo
    @db.sqls.must_equal ["SELECT * FROM foos WHERE (foos.object_ids[0] IN (SELECT bars.object_ids[0] FROM bars WHERE ((id = 1) AND (bars.object_ids[0] IS NOT NULL)))) LIMIT 1"]
    @Foo.first(:mtmbars=>@Bar.where(:id=>@bar.id)).must_equal @foo
    @db.sqls.must_equal ["SELECT * FROM foos WHERE (foos.object_ids[0] IN (SELECT bars_foos.foo_ids[0] FROM bars_foos WHERE ((bars_foos.bar_ids[0] IN (SELECT bars.object_ids[0] FROM bars WHERE ((id = 1) AND (bars.object_ids[0] IS NOT NULL)))) AND (bars_foos.foo_ids[0] IS NOT NULL)))) LIMIT 1"]
    @Bar.first(:mtmfoos=>@Foo.where(:id=>@foo.id)).must_equal @bar
    @db.sqls.must_equal ["SELECT * FROM bars WHERE (bars.object_ids[0] IN (SELECT bars_foos.bar_ids[0] FROM bars_foos WHERE ((bars_foos.foo_ids[0] IN (SELECT foos.object_ids[0] FROM foos WHERE ((id = 1) AND (foos.object_ids[0] IS NOT NULL)))) AND (bars_foos.bar_ids[0] IS NOT NULL)))) LIMIT 1"]
  end
end

describe Sequel::Model, "#refresh" do
  before do
    @c = Class.new(Sequel::Model(:items)) do
      unrestrict_primary_key
      columns :id, :x
    end
    DB.reset
  end

  it "should remove cached associations" do
    @c.many_to_one :node, :class=>@c
    @m = @c.new(:id => 555)
    @m.associations[:node] = 15
    @m.reload
    @m.associations.must_equal({})
  end
end

describe "Model#freeze" do
  before do
    class ::Album < Sequel::Model
      columns :id
      class B < Sequel::Model
        columns :id, :album_id
        many_to_one :album, :class=>Album
      end
      one_to_one :b, :key=>:album_id, :class=>B
    end
    @o = Album.load(:id=>1).freeze
    DB.sqls
  end
  after do
    Object.send(:remove_const, :Album)
  end

  it "should freeze the object's associations" do
    @o.associations.frozen?.must_equal true
  end

  it "should freeze associations after validating" do
    Album.send(:define_method, :validate){super(); b}
    @o = Album.load(:id=>1)
    @o.freeze
    @o.associations.fetch(:b).id.must_equal 1
  end

  it "should not break associations getters" do
    Album::B.dataset = Album::B.dataset.with_fetch(:album_id=>1, :id=>2)
    @o.b.must_equal Album::B.load(:id=>2, :album_id=>1)
    @o.associations[:b].must_be_nil

    @o = @o.dup
    @o.b.must_equal Album::B.load(:id=>2, :album_id=>1)
    @o.associations[:b].must_equal Album::B.load(:id=>2, :album_id=>1)
  end

  it "should not break reciprocal associations" do
    b = Album::B.load(:id=>2, :album_id=>nil)
    b.album = @o
    @o.associations[:b].must_be_nil

    @o = @o.dup
    b = Album::B.load(:id=>2, :album_id=>nil)
    b.album = @o
    @o.associations[:b].must_equal Album::B.load(:id=>2, :album_id=>1)
  end
end

describe "association autoreloading" do
  before do
    @c = Class.new(Sequel::Model)
    @Artist = Class.new(@c).set_dataset(:artists)
    @Artist.dataset = @Artist.dataset.with_fetch(:id=>2, :name=>'Ar')
    @Album = Class.new(@c).set_dataset(:albums)
    @Artist.columns :id, :name
    @Album.columns :id, :name, :artist_id
    @Album.db_schema[:artist_id][:type] = :integer
    @Album.many_to_one :artist, :class=>@Artist
    DB.reset
  end

  it "should not reload many_to_one association when foreign key is not modified" do
    album = @Album.load(:id => 1, :name=>'Al', :artist_id=>1)
    album.artist
    DB.sqls.must_equal ['SELECT * FROM artists WHERE id = 1']
    album.artist_id = 1
    album.artist
    DB.sqls.must_equal []

    album = @Album.new(:name=>'Al', :artist_id=>1)
    album.artist
    DB.sqls.must_equal ['SELECT * FROM artists WHERE id = 1']
    album.artist_id = 1
    album.artist
    DB.sqls.must_equal []
  end

  it "should reload many_to_one association when foreign key is modified" do
    album = @Album.load(:id => 1, :name=>'Al', :artist_id=>2)
    album.artist
    DB.sqls.must_equal ['SELECT * FROM artists WHERE id = 2']

    album.artist_id = 1
    album.artist
    DB.sqls.must_equal ['SELECT * FROM artists WHERE id = 1']
  end

  it "should handle multiple many_to_one association with the same foreign key" do
    @Album.many_to_one :artist2, :key=>:artist_id, :class=>@Artist
    album = @Album.load(:id => 1, :name=>'Al', :artist_id=>2)
    album.artist
    album.artist2
    DB.sqls.must_equal ['SELECT * FROM artists WHERE id = 2'] * 2

    album.artist
    album.artist2
    DB.sqls.must_equal []

    album.artist_id = 1
    album.artist
    album.artist2
    DB.sqls.must_equal ['SELECT * FROM artists WHERE id = 1'] * 2
  end

  it "should not reload when value has not changed" do
    album = @Album.load(:id => 1, :name=>'Al', :artist_id=>2)
    album.artist
    DB.sqls.must_equal ['SELECT * FROM artists WHERE id = 2']

    album.artist_id = 2
    album.artist
    DB.sqls.must_equal []

    album.artist_id = "2"
    album.artist
    DB.sqls.must_equal []
  end

  it "should reload all associations which use the foreign key" do
    @Album.many_to_one :other_artist, :key => :artist_id, :foreign_key => :id, :class => @Artist
    album = @Album.load(:id => 1, :name=>'Al', :artist_id=>2)
    album.artist
    album.other_artist
    DB.reset

    album.artist_id = 1
    album.artist
    DB.sqls.must_equal ['SELECT * FROM artists WHERE id = 1']

    album.other_artist
    DB.sqls.must_equal ['SELECT * FROM artists WHERE id = 1']
  end

  it "should work with composite keys" do
    @Album.many_to_one :composite_artist, :key => [:artist_id, :name], :primary_key => [:id, :name], :class => @Artist
    album = @Album.load(:id => 1, :name=>'Al', :artist_id=>2)
    album.composite_artist
    DB.reset

    album.artist_id = 1
    album.composite_artist
    DB.sqls.must_equal ["SELECT * FROM artists WHERE ((artists.id = 1) AND (artists.name = 'Al')) LIMIT 1"]

    album.name = 'Al2'
    album.composite_artist
    DB.sqls.must_equal ["SELECT * FROM artists WHERE ((artists.id = 1) AND (artists.name = 'Al2')) LIMIT 1"]
  end

  it "should work with subclasses" do
    salbum = Class.new(@Album)
    oartist = Class.new(@c).set_dataset(:oartist)
    oartist.columns :id, :name
    salbum.many_to_one :artist2, :class=>oartist, :key=>:artist_id
    album = salbum.load(:id => 1, :name=>'Al', :artist_id=>2)
    album.artist
    DB.sqls.must_equal ['SELECT * FROM artists WHERE id = 2']

    album.artist_id = 1
    album.artist
    DB.sqls.must_equal ['SELECT * FROM artists WHERE id = 1']
  end
end

describe Sequel::Model, ".dataset_module" do
  before do
    @c = Class.new(Sequel::Model(:items))
  end
  
  it "should have dataset_module support an eager method" do
    @c.many_to_one :foo, :class=>@c
    @c.many_to_one :bar, :class=>@c
    @c.many_to_one :baz, :class=>@c
    @c.many_to_one :quux, :class=>@c
    @c.dataset_module{eager(:foo, {:foo=>{:bar=>:baz}}, :quux)}
    @c.foo.opts[:eager].must_equal(:foo=>{:bar=>:baz}, :quux=>nil)
    @c.where(:bar).foo.opts[:eager].must_equal(:foo=>{:bar=>:baz}, :quux=>nil)
  end
end
