require_relative "spec_helper"

describe Sequel::Model, "tree plugin" do
  def klass(opts={})
    @db = DB
    c = Class.new(Sequel::Model(@db[:nodes]))
    c.class_eval do
      def self.name; 'Node'; end
      columns :id, :name, :parent_id, :i, :pi
      plugin :tree, opts
    end
    c
  end

  before do
    @c = klass
    @ds = @c.dataset
    @o = @c.load(:id=>2, :parent_id=>1, :name=>'AA', :i=>3, :pi=>4)
    @db.reset
  end

  it "should define the correct associations" do
    @c.associations.sort_by{|x| x.to_s}.must_equal [:children, :parent]
  end
  
  it "should define the correct reciprocals" do
    @c.associations.sort_by{|x| x.to_s}.map{|x| @c.association_reflection(x).reciprocal}.must_equal [:parent, :children]
  end
  
  it "should define the correct associations when giving options" do
    klass(:children=>{:name=>:cs}, :parent=>{:name=>:p}).associations.sort_by{|x| x.to_s}.must_equal [:cs, :p]
  end

  it "should use the correct SQL for lazy associations" do
    @o.parent_dataset.sql.must_equal 'SELECT * FROM nodes WHERE (nodes.id = 1) LIMIT 1'
    @o.children_dataset.sql.must_equal 'SELECT * FROM nodes WHERE (nodes.parent_id = 2)'
  end
  
  it "should use the correct SQL for lazy associations when giving options" do
    o = klass(:primary_key=>:i, :key=>:pi, :order=>:name, :children=>{:name=>:cs}, :parent=>{:name=>:p}).load(:id=>2, :parent_id=>1, :name=>'AA', :i=>3, :pi=>4)
    o.p_dataset.sql.must_equal 'SELECT * FROM nodes WHERE (nodes.i = 4) ORDER BY name LIMIT 1'
    o.cs_dataset.sql.must_equal 'SELECT * FROM nodes WHERE (nodes.pi = 3) ORDER BY name'
  end

  it "should have parent_column give the symbol of the parent column" do
    @c.parent_column.must_equal :parent_id
    klass(:key=>:p_id).parent_column.must_equal :p_id
  end

  it "should have tree_order give the order of the association" do
    @c.tree_order.must_be_nil
    klass(:order=>:name).tree_order.must_equal :name
    klass(:order=>[:parent_id, :name]).tree_order.must_equal [:parent_id, :name]
  end

  it "should work correctly in subclasses" do
    o = Class.new(klass(:primary_key=>:i, :key=>:pi, :order=>:name, :children=>{:name=>:cs}, :parent=>{:name=>:p})).load(:id=>2, :parent_id=>1, :name=>'AA', :i=>3, :pi=>4)
    o.p_dataset.sql.must_equal 'SELECT * FROM nodes WHERE (nodes.i = 4) ORDER BY name LIMIT 1'
    o.cs_dataset.sql.must_equal 'SELECT * FROM nodes WHERE (nodes.pi = 3) ORDER BY name'
  end

  it "should have roots return an array of the tree's roots" do
    @c.dataset = @c.dataset.with_fetch([{:id=>1, :parent_id=>nil, :name=>'r'}])
    @c.roots.must_equal [@c.load(:id=>1, :parent_id=>nil, :name=>'r')]
    @db.sqls.must_equal ["SELECT * FROM nodes WHERE (parent_id IS NULL)"]
    @c.exclude(id: 2).roots.must_equal [@c.load(:id=>1, :parent_id=>nil, :name=>'r')]
    @db.sqls.must_equal ["SELECT * FROM nodes WHERE ((id != 2) AND (parent_id IS NULL))"]
  end

  it "should have roots_dataset be a dataset representing the tree's roots" do
    @c.roots_dataset.sql.must_equal "SELECT * FROM nodes WHERE (parent_id IS NULL)"
    @c.exclude(id: 2).roots_dataset.sql.must_equal "SELECT * FROM nodes WHERE ((id != 2) AND (parent_id IS NULL))"
  end

  it "should have ancestors return the ancestors of the current node" do
    @c.dataset = @c.dataset.with_fetch([[{:id=>1, :parent_id=>5, :name=>'r'}], [{:id=>5, :parent_id=>nil, :name=>'r2'}]])
    @o.ancestors.must_equal [@c.load(:id=>1, :parent_id=>5, :name=>'r'), @c.load(:id=>5, :parent_id=>nil, :name=>'r2')]
    @db.sqls.must_equal ["SELECT * FROM nodes WHERE id = 1",
      "SELECT * FROM nodes WHERE id = 5"]
  end

  it "should have descendants return the descendants of the current node" do
    @c.dataset = @c.dataset.with_fetch([[{:id=>3, :parent_id=>2, :name=>'r'}, {:id=>4, :parent_id=>2, :name=>'r2'}], [{:id=>5, :parent_id=>4, :name=>'r3'}], []])
    @o.descendants.must_equal [@c.load(:id=>3, :parent_id=>2, :name=>'r'), @c.load(:id=>4, :parent_id=>2, :name=>'r2'), @c.load(:id=>5, :parent_id=>4, :name=>'r3')] 
    @db.sqls.must_equal ["SELECT * FROM nodes WHERE (nodes.parent_id = 2)",
      "SELECT * FROM nodes WHERE (nodes.parent_id = 3)",
      "SELECT * FROM nodes WHERE (nodes.parent_id = 5)",
      "SELECT * FROM nodes WHERE (nodes.parent_id = 4)"]
  end

  it "should have root return the root of the current node" do
    @c.dataset = @c.dataset.with_fetch([[{:id=>1, :parent_id=>5, :name=>'r'}], [{:id=>5, :parent_id=>nil, :name=>'r2'}]])
    @o.root.must_equal @c.load(:id=>5, :parent_id=>nil, :name=>'r2')
    @db.sqls.must_equal ["SELECT * FROM nodes WHERE id = 1",
      "SELECT * FROM nodes WHERE id = 5"]
  end

  it "should have root? return true for a root node and false for a child node" do
    @c.load(:parent_id => nil).root?.must_equal true
    @c.load(:parent_id => 1).root?.must_equal false
  end

  it "should have root? return false for an new node" do
    @c.new.root?.must_equal false
  end

  it "should have self_and_siblings return the children of the current node's parent" do
    @c.dataset = @c.dataset.with_fetch([[{:id=>1, :parent_id=>3, :name=>'r'}], [{:id=>7, :parent_id=>1, :name=>'r2'}, @o.values.dup]])
    @o.self_and_siblings.must_equal [@c.load(:id=>7, :parent_id=>1, :name=>'r2'), @o] 
    @db.sqls.must_equal ["SELECT * FROM nodes WHERE id = 1",
      "SELECT * FROM nodes WHERE (nodes.parent_id = 1)"]
  end

  it "should have self_and_siblings return the roots if the current object is a root" do
    h = {:id=>2, :parent_id=>nil, :name=>'AA'}
    @c.dataset = @c.dataset.with_fetch(h)
    @c.load(h).self_and_siblings.must_equal [@c.load(h)]
    @db.sqls.must_equal ["SELECT * FROM nodes WHERE (parent_id IS NULL)"]
  end

  it "should have siblings return the children of the current node's parent, except for the current node" do
    @c.dataset = @c.dataset.with_fetch([[{:id=>1, :parent_id=>3, :name=>'r'}], [{:id=>7, :parent_id=>1, :name=>'r2'}, @o.values.dup]])
    @o.siblings.must_equal [@c.load(:id=>7, :parent_id=>1, :name=>'r2')] 
    @db.sqls.must_equal ["SELECT * FROM nodes WHERE id = 1",
      "SELECT * FROM nodes WHERE (nodes.parent_id = 1)"]
  end

  it "should have methods work correctly with custom association names" do
    o = klass(:primary_key=>:i, :key=>:pi, :order=>:name, :children=>{:name=>:cs}, :parent=>{:name=>:p}).load(:id=>2, :parent_id=>1, :name=>'AA', :i=>3, :pi=>4)
    
    o.model.parent_association_name.must_equal :p
    o.model.children_association_name.must_equal :cs
    o.model.dataset = o.model.dataset.with_fetch(lambda do |sql|
      case sql
      when "SELECT * FROM nodes WHERE (nodes.i = 4) ORDER BY name LIMIT 1"
        {:id=>7, :parent_id=>8, :name=>'r2', :i=>4, :pi=>5}
      when "SELECT * FROM nodes WHERE (nodes.i = 5) ORDER BY name LIMIT 1"
        {:id=>10, :parent_id=>11, :name=>'r3', :i=>5, :pi=>nil}
      when 'SELECT * FROM nodes WHERE (nodes.pi = 3) ORDER BY name'
        {:id=>12, :parent_id=>13, :name=>'r4', :i=>7, :pi=>3}
      when 'SELECT * FROM nodes WHERE (nodes.pi = 7) ORDER BY name'
        {:id=>14, :parent_id=>15, :name=>'r5', :i=>8, :pi=>7}
      when 'SELECT * FROM nodes WHERE (nodes.pi = 8) ORDER BY name'
        []
      when 'SELECT * FROM nodes WHERE (nodes.pi = 4) ORDER BY name'
        [{:id=>2, :parent_id=>1, :name=>'AA', :i=>3, :pi=>4}, {:id=>20, :parent_id=>21, :name=>'r6', :i=>9, :pi=>4}]
      else
        raise sql
      end
    end)
    o.db.sqls.must_equal []

    o.ancestors.must_equal [o.model.load(:id=>7, :parent_id=>8, :name=>'r2', :i=>4, :pi=>5),
      o.model.load(:id=>10, :parent_id=>11, :name=>'r3', :i=>5, :pi=>nil)]
    o.db.sqls.must_equal ["SELECT * FROM nodes WHERE (nodes.i = 4) ORDER BY name LIMIT 1",
      "SELECT * FROM nodes WHERE (nodes.i = 5) ORDER BY name LIMIT 1"]

    o.descendants.must_equal [o.model.load(:id=>12, :parent_id=>13, :name=>'r4', :i=>7, :pi=>3),
      o.model.load(:id=>14, :parent_id=>15, :name=>'r5', :i=>8, :pi=>7)]
    o.db.sqls.must_equal ["SELECT * FROM nodes WHERE (nodes.pi = 3) ORDER BY name",
      "SELECT * FROM nodes WHERE (nodes.pi = 7) ORDER BY name",
      "SELECT * FROM nodes WHERE (nodes.pi = 8) ORDER BY name"]

    o.siblings.must_equal [o.model.load(:id=>20, :parent_id=>21, :name=>'r6', :i=>9, :pi=>4)] 
    o.db.sqls.must_equal ["SELECT * FROM nodes WHERE (nodes.pi = 4) ORDER BY name"]
  end

  describe ":single_root option" do
    before do
      @c = klass(:single_root => true)
    end

    it "should have root class method return the root" do
      @c.dataset = @c.dataset.with_fetch([{:id=>1, :parent_id=>nil, :name=>'r'}])
      @c.root.must_equal @c.load(:id=>1, :parent_id=>nil, :name=>'r')
    end

    it "prevents creating a second root" do
      @c.dataset = @c.dataset.with_fetch([{:id=>1, :parent_id=>nil, :name=>'r'}])
      lambda { @c.create }.must_raise(Sequel::Plugins::Tree::TreeMultipleRootError)
    end

    it "errors when promoting an existing record to a second root" do
      @c.dataset = @c.dataset.with_fetch([{:id=>1, :parent_id=>nil, :name=>'r'}])
      n = @c.load(:id => 2, :parent_id => 1)
      lambda { n.update(:parent_id => nil) }.must_raise(Sequel::Plugins::Tree::TreeMultipleRootError)
    end

    it "allows updating existing root" do
      @c.dataset = @c.dataset.with_fetch([{:id=>1, :parent_id=>nil, :name=>'r'}])
       @c.root.update(:name => 'fdsa') 
    end
  end
end

describe Sequel::Model, "tree plugin with composite keys" do
  def klass(opts={})
    @db = DB
    c = Class.new(Sequel::Model(@db[:nodes]))
    c.class_eval do
      def self.name; 'Node'; end
      columns :id, :id2, :name, :parent_id, :parent_id2, :i, :pi
      set_primary_key [:id, :id2]
      plugin :tree, opts.merge(:key=>[:parent_id, :parent_id2])
      def self.set_dataset(ds)
        super
        set_primary_key [:id, :id2]
      end
    end
    c
  end

  before do
    @c = klass
    @ds = @c.dataset
    @o = @c.load(:id=>2, :id2=>5, :parent_id=>1, :parent_id2=>6, :name=>'AA', :i=>3, :pi=>4)
    @db.reset
  end

  
  it "should use the correct SQL for lazy associations" do
    @o.parent_dataset.sql.must_equal 'SELECT * FROM nodes WHERE ((nodes.id = 1) AND (nodes.id2 = 6)) LIMIT 1'
    @o.children_dataset.sql.must_equal 'SELECT * FROM nodes WHERE ((nodes.parent_id = 2) AND (nodes.parent_id2 = 5))'
  end
  
  it "should have parent_column give an array of symbols of the parent column" do
    @c.parent_column.must_equal [:parent_id, :parent_id2]
  end

  it "should have roots return an array of the tree's roots" do
    @c.dataset = @c.dataset.with_fetch([{:id=>1, :parent_id=>nil, :parent_id2=>nil, :name=>'r'}])
    @c.roots.must_equal [@c.load(:id=>1, :parent_id=>nil, :parent_id2=>nil, :name=>'r')]
    @db.sqls.must_equal ["SELECT * FROM nodes WHERE ((parent_id IS NULL) OR (parent_id2 IS NULL))"]
  end

  it "should have roots_dataset be a dataset representing the tree's roots" do
    @c.roots_dataset.sql.must_equal "SELECT * FROM nodes WHERE ((parent_id IS NULL) OR (parent_id2 IS NULL))"
  end

  it "should have ancestors return the ancestors of the current node" do
    @c.dataset = @c.dataset.with_fetch([[{:id=>1, :id2=>6, :parent_id=>5, :parent_id2=>7, :name=>'r'}], [{:id=>5, :id2=>7, :parent_id=>nil, :parent_id2=>nil, :name=>'r2'}]])
    @o.ancestors.must_equal [@c.load(:id=>1, :id2=>6, :parent_id=>5, :parent_id2=>7, :name=>'r'), @c.load(:id=>5, :id2=>7, :parent_id=>nil, :parent_id2=>nil, :name=>'r2')]
    sqls = @db.sqls
    sqls.length.must_equal 2
    ["SELECT * FROM nodes WHERE ((id = 1) AND (id2 = 6)) LIMIT 1", "SELECT * FROM nodes WHERE ((id2 = 6) AND (id = 1)) LIMIT 1"].must_include(sqls[0])
    ["SELECT * FROM nodes WHERE ((id = 5) AND (id2 = 7)) LIMIT 1", "SELECT * FROM nodes WHERE ((id2 = 7) AND (id = 5)) LIMIT 1"].must_include(sqls[1])
  end

  it "should have descendants return the descendants of the current node" do
    @c.dataset = @c.dataset.with_fetch([[{:id=>3, :id2=>7, :parent_id=>2, :parent_id2=>5, :name=>'r'}, {:id=>4, :id2=>8, :parent_id=>2, :parent_id2=>5, :name=>'r2'}], [{:id=>5, :id2=>9, :parent_id=>4, :parent_id2=>8, :name=>'r3'}], []])
    @o.descendants.must_equal [@c.load(:id=>3, :id2=>7, :parent_id=>2, :parent_id2=>5, :name=>'r'), @c.load(:id=>4, :id2=>8, :parent_id=>2, :parent_id2=>5, :name=>'r2'), @c.load(:id=>5, :id2=>9, :parent_id=>4, :parent_id2=>8, :name=>'r3')] 
    @db.sqls.must_equal ["SELECT * FROM nodes WHERE ((nodes.parent_id = 2) AND (nodes.parent_id2 = 5))",
      "SELECT * FROM nodes WHERE ((nodes.parent_id = 3) AND (nodes.parent_id2 = 7))",
      "SELECT * FROM nodes WHERE ((nodes.parent_id = 5) AND (nodes.parent_id2 = 9))",
      "SELECT * FROM nodes WHERE ((nodes.parent_id = 4) AND (nodes.parent_id2 = 8))"]
  end

  it "should have root return the root of the current node" do
    @c.dataset = @c.dataset.with_fetch([[{:id=>1, :id2=>6, :parent_id=>5, :parent_id2=>7, :name=>'r'}], [{:id=>5, :id2=>7, :parent_id=>nil, :parent_id2=>nil, :name=>'r2'}]])
    @o.root.must_equal @c.load(:id=>5, :id2=>7, :parent_id=>nil, :parent_id2=>nil, :name=>'r2')
    sqls = @db.sqls
    sqls.length.must_equal 2
    ["SELECT * FROM nodes WHERE ((id = 1) AND (id2 = 6)) LIMIT 1", "SELECT * FROM nodes WHERE ((id2 = 6) AND (id = 1)) LIMIT 1"].must_include(sqls[0])
    ["SELECT * FROM nodes WHERE ((id = 5) AND (id2 = 7)) LIMIT 1", "SELECT * FROM nodes WHERE ((id2 = 7) AND (id = 5)) LIMIT 1"].must_include(sqls[1])
  end

  it "should have root? return true for a root node and false for a child node" do
    @c.load(:parent_id => nil, :parent_id2=>nil).root?.must_equal true
    @c.load(:parent_id => 1, :parent_id2=>nil).root?.must_equal true
    @c.load(:parent_id => nil, :parent_id2=>2).root?.must_equal true
    @c.load(:parent_id => 1, :parent_id2=>2).root?.must_equal false
  end

  it "should have root? return false for an new node" do
    @c.new.root?.must_equal false
  end

  it "should have self_and_siblings return the children of the current node's parent" do
    @c.dataset = @c.dataset.with_fetch([[{:id=>1, :id2=>6, :parent_id=>3, :parent_id2=>7, :name=>'r'}], [{:id=>7, :id2=>9, :parent_id=>1, :parent_id2=>6, :name=>'r2'}, @o.values.dup]])
    @o.self_and_siblings.must_equal [@c.load(:id=>7, :id2=>9, :parent_id=>1, :parent_id2=>6, :name=>'r2'), @o] 
    sqls = @db.sqls
    sqls.length.must_equal 2
    ["SELECT * FROM nodes WHERE ((id = 1) AND (id2 = 6)) LIMIT 1", "SELECT * FROM nodes WHERE ((id2 = 6) AND (id = 1)) LIMIT 1"].must_include(sqls[0])
    sqls[1].must_equal "SELECT * FROM nodes WHERE ((nodes.parent_id = 1) AND (nodes.parent_id2 = 6))"
  end

  it "should have siblings return the children of the current node's parent, except for the current node" do
    @c.dataset = @c.dataset.with_fetch([[{:id=>1, :id2=>6, :parent_id=>3, :parent_id2=>7, :name=>'r'}], [{:id=>7, :id2=>9, :parent_id=>1, :parent_id2=>6, :name=>'r2'}, @o.values.dup]])
    @o.siblings.must_equal [@c.load(:id=>7, :id2=>9, :parent_id=>1, :parent_id2=>6, :name=>'r2')] 
    sqls = @db.sqls
    sqls.length.must_equal 2
    ["SELECT * FROM nodes WHERE ((id = 1) AND (id2 = 6)) LIMIT 1", "SELECT * FROM nodes WHERE ((id2 = 6) AND (id = 1)) LIMIT 1"].must_include(sqls[0])
    sqls[1].must_equal "SELECT * FROM nodes WHERE ((nodes.parent_id = 1) AND (nodes.parent_id2 = 6))"
  end

  describe ":single_root option" do
    before do
      @c = klass(:single_root => true)
    end

    it "prevents creating a second root" do
      @c.dataset = @c.dataset.with_fetch([{:id=>1, :id2=>6, :parent_id=>nil, :parent_id2=>nil, :name=>'r'}])
      lambda { @c.create }.must_raise(Sequel::Plugins::Tree::TreeMultipleRootError)
      @c.dataset = @c.dataset.with_fetch([{:id=>1, :id2=>6, :parent_id=>1, :parent_id2=>nil, :name=>'r'}])
      lambda { @c.create(:parent_id2=>1) }.must_raise(Sequel::Plugins::Tree::TreeMultipleRootError)
      @c.dataset = @c.dataset.with_fetch([{:id=>1, :id2=>6, :parent_id=>nil, :parent_id2=>2, :name=>'r'}])
      lambda { @c.create(:parent_id=>2) }.must_raise(Sequel::Plugins::Tree::TreeMultipleRootError)
    end

    it "errors when promoting an existing record to a second root" do
      @c.dataset = @c.dataset.with_fetch([{:id=>1, :id2=>6, :parent_id=>nil, :parent_id2=>nil, :name=>'r'}])
      lambda { @c.load(:id => 2, :id2=>7, :parent_id => 1, :parent_id2=>2).update(:parent_id => nil, :parent_id2=>nil) }.must_raise(Sequel::Plugins::Tree::TreeMultipleRootError)
      @c.dataset = @c.dataset.with_fetch([{:id=>1, :id2=>6, :parent_id=>1, :parent_id2=>nil, :name=>'r'}])
      lambda { @c.load(:id => 2, :id2=>7, :parent_id => 1, :parent_id2=>2).update(:parent_id => nil) }.must_raise(Sequel::Plugins::Tree::TreeMultipleRootError)
      @c.dataset = @c.dataset.with_fetch([{:id=>1, :id2=>6, :parent_id=>nil, :parent_id2=>2, :name=>'r'}])
      lambda { @c.load(:id => 2, :id2=>7, :parent_id => 1, :parent_id2=>2).update(:parent_id2 => nil) }.must_raise(Sequel::Plugins::Tree::TreeMultipleRootError)
    end

    it "allows updating existing root" do
      @c.dataset = @c.dataset.with_fetch(:id=>1, :id2=>6, :parent_id=>nil, :parent_id2=>nil, :name=>'r')
      @c.root.update(:name => 'fdsa') 
      @c.dataset = @c.dataset.with_fetch(:id=>1, :id2=>6, :parent_id=>1, :parent_id2=>nil, :name=>'r')
      @c.root.update(:name => 'fdsa') 
      @c.dataset = @c.dataset.with_fetch(:id=>1, :id2=>6, :parent_id=>nil, :parent_id2=>2, :name=>'r')
      @c.root.update(:name => 'fdsa') 
    end

    it "freezes tree_order if it is an array" do
      @c.tree_order = [:id]
      @c.freeze
      @c.tree_order.frozen?.must_equal true
    end
  end
end
