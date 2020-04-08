require_relative "spec_helper"

describe "association_multi_add_remove plugin - one_to_many" do
  before do
    @c1 = Class.new(Sequel::Model(:attributes)) do
      unrestrict_primary_key
      columns :id, :node_id, :y, :z
    end

    @c2 = Class.new(Sequel::Model(:nodes)) do
      plugin :association_multi_add_remove

      def _refresh(ds); end
      unrestrict_primary_key
      attr_accessor :xxx

      def self.name; 'Node'; end
      def self.to_s; 'Node'; end

      columns :id, :x
    end
    @dataset = @c2.dataset = @c2.dataset.with_fetch({})
    @c1.dataset = @c1.dataset.with_fetch(proc { |sql| sql =~ /SELECT 1/ ? { a: 1 } : {} })
    DB.reset
  end

  it "should define an add_*s method that works on existing records" do
    @c2.one_to_many :attributes, class: @c1

    n = @c2.load(id: 1234)
    a1 = @c1.load(id: 2345)
    a2 = @c1.load(id: 3456)
    [a1, a2].must_equal n.add_attributes([a1, a2])
    a1.values.must_equal(:node_id => 1234, id: 2345)
    a2.values.must_equal(:node_id => 1234, id: 3456)
    DB.sqls.must_equal [
      'BEGIN',
      'UPDATE attributes SET node_id = 1234 WHERE (id = 2345)',
      'UPDATE attributes SET node_id = 1234 WHERE (id = 3456)',
      'COMMIT'
    ]
  end

  it "should not define add/remove methods with the same name as the ones defined by default " do
    @c2.one_to_many :sheep, class: @c1, :key=>:node_id

    n = @c2.load(id: 1234)
    a1 = @c1.load(id: 2345)
    a1.must_be_same_as n.add_sheep(a1)
    a1.values.must_equal(:node_id => 1234, id: 2345)
    DB.sqls.must_equal ['UPDATE attributes SET node_id = 1234 WHERE (id = 2345)']
    a1.must_be_same_as n.remove_sheep(a1)
    a1.values.must_equal(:node_id => nil, id: 2345)
    DB.sqls.must_equal [
      "SELECT 1 AS one FROM attributes WHERE ((attributes.node_id = 1234) AND (id = 2345)) LIMIT 1",
      'UPDATE attributes SET node_id = NULL WHERE (id = 2345)',
    ]
    n.respond_to?(:sheep=).must_equal false
  end

  it "should support :multi_add_method" do
    @c2.one_to_many :attributes, class: @c1, :multi_add_method=>:add_multiple_attributes

    n = @c2.load(id: 1234)
    a1 = @c1.load(id: 2345)
    a2 = @c1.load(id: 3456)
    [a1, a2].must_equal n.add_multiple_attributes([a1, a2])
    a1.values.must_equal(:node_id => 1234, id: 2345)
    a2.values.must_equal(:node_id => 1234, id: 3456)
    DB.sqls.must_equal [
      'BEGIN',
      'UPDATE attributes SET node_id = 1234 WHERE (id = 2345)',
      'UPDATE attributes SET node_id = 1234 WHERE (id = 3456)',
      'COMMIT'
    ]
  end

  it "should define an add_*s method that works on new records" do
    @c2.one_to_many :attributes, :class => @c1

    n = @c2.load(:id => 1234)
    a1 = @c1.new(:id => 234)
    a2 = @c1.new(:id => 345)
    @c1.dataset = @c1.dataset.with_fetch([
      [{ :id=>234, :node_id=>1234 }], [{ :id=>345, :node_id=>1234 }]
    ])
    [a1, a2].must_equal n.add_attributes([a1, a2])
    DB.sqls.must_equal [
      'BEGIN',
      "INSERT INTO attributes (id, node_id) VALUES (234, 1234)",
      "SELECT * FROM attributes WHERE id = 234",
      "INSERT INTO attributes (id, node_id) VALUES (345, 1234)",
      "SELECT * FROM attributes WHERE id = 345",
      'COMMIT'
    ]
    a1.values.must_equal(:node_id => 1234, :id => 234)
    a2.values.must_equal(:node_id => 1234, :id => 345)
  end

  it "should define a remove_*s method that works on existing records" do
    @c2.one_to_many :attributes, :class => @c1

    n = @c2.load(:id => 1234)
    a1 = @c1.load(:id => 2345, :node_id => 1234)
    a2 = @c1.load(:id => 3456, :node_id => 1234)
    [a1, a2].must_equal n.remove_attributes([a1, a2])
    a1.values.must_equal(:node_id => nil, :id => 2345)
    a2.values.must_equal(:node_id => nil, :id => 3456)
    DB.sqls.must_equal [
      'BEGIN',
      "SELECT 1 AS one FROM attributes WHERE ((attributes.node_id = 1234) AND (id = 2345)) LIMIT 1",
      'UPDATE attributes SET node_id = NULL WHERE (id = 2345)',
      "SELECT 1 AS one FROM attributes WHERE ((attributes.node_id = 1234) AND (id = 3456)) LIMIT 1",
      'UPDATE attributes SET node_id = NULL WHERE (id = 3456)',
      'COMMIT'
    ]
  end

  it "should support :multi_remove_method" do
    @c2.one_to_many :attributes, :class => @c1, :multi_remove_method=>:remove_multiple_attributes

    n = @c2.load(:id => 1234)
    a1 = @c1.load(:id => 2345, :node_id => 1234)
    a2 = @c1.load(:id => 3456, :node_id => 1234)
    [a1, a2].must_equal n.remove_multiple_attributes([a1, a2])
    a1.values.must_equal(:node_id => nil, :id => 2345)
    a2.values.must_equal(:node_id => nil, :id => 3456)
    DB.sqls.must_equal [
      'BEGIN',
      "SELECT 1 AS one FROM attributes WHERE ((attributes.node_id = 1234) AND (id = 2345)) LIMIT 1",
      'UPDATE attributes SET node_id = NULL WHERE (id = 2345)',
      "SELECT 1 AS one FROM attributes WHERE ((attributes.node_id = 1234) AND (id = 3456)) LIMIT 1",
      'UPDATE attributes SET node_id = NULL WHERE (id = 3456)',
      'COMMIT'
    ]
  end

  it "should have the remove_*s method raise an error if the passed objects are not already associated" do
    @c2.one_to_many :attributes, :class => @c1

    n = @c2.new(:id => 1234)
    a1 = @c1.load(:id => 2345, :node_id => 1234)
    a2 = @c1.load(:id => 3456, :node_id => 1234)
    @c1.dataset = @c1.dataset.with_fetch([])
    proc{n.remove_attributes([a1, a2])}.must_raise(Sequel::Error)
    DB.sqls.must_equal [
      'BEGIN',
      "SELECT 1 AS one FROM attributes WHERE ((attributes.node_id = 1234) AND (id = 2345)) LIMIT 1",
      'ROLLBACK'
    ]
  end

  it "should accept hashes for the add_*s method and create a new records" do
    @c2.one_to_many :attributes, :class => @c1
    n = @c2.new(:id => 1234)
    DB.reset
    @c1.dataset = @c1.dataset.with_fetch([
      [{ :node_id => 1234, :id => 234 }], [{ :node_id => 1234, :id => 345 }]
    ])
    n.add_attributes([{ :id => 234 }, { :id => 345 }]).must_equal [
      @c1.load(:node_id => 1234, :id => 234),
      @c1.load(:node_id => 1234, :id => 345)
    ]
    DB.sqls.must_equal [
      'BEGIN',
      "INSERT INTO attributes (id, node_id) VALUES (234, 1234)",
      "SELECT * FROM attributes WHERE id = 234",
      "INSERT INTO attributes (id, node_id) VALUES (345, 1234)",
      "SELECT * FROM attributes WHERE id = 345",
      'COMMIT'
    ]
  end

  it "should accept primary keys for the add_*s method" do
    @c2.one_to_many :attributes, :class => @c1
    n = @c2.new(:id => 1234)
    @c1.dataset = @c1.dataset.with_fetch([
      [{ :node_id => nil, :id => 234 }], [{ :node_id => nil, :id => 345 }]
    ])
    n.add_attributes([234, 345]).must_equal [
      @c1.load(:node_id => 1234, :id => 234),
      @c1.load(:node_id => 1234, :id => 345)
    ]
    DB.sqls.must_equal [
      'BEGIN',
      "SELECT * FROM attributes WHERE id = 234",
      "UPDATE attributes SET node_id = 1234 WHERE (id = 234)",
      "SELECT * FROM attributes WHERE id = 345",
      "UPDATE attributes SET node_id = 1234 WHERE (id = 345)",
      'COMMIT'
    ]
  end

  it "should raise an error if the primary key passed to the add_*s method does not match an existing record" do
    @c2.one_to_many :attributes, :class => @c1
    n = @c2.new(:id => 1234)
    @c1.dataset = @c1.dataset.with_fetch([])
    proc{n.add_attributes([234, 345])}.must_raise(Sequel::NoMatchingRow)
    DB.sqls.must_equal [
      'BEGIN',
      "SELECT * FROM attributes WHERE id = 234",
      'ROLLBACK'
    ]
  end

  it "should raise an error in the add_*s method if the passed associated objects are not of the correct type" do
    @c2.one_to_many :attributes, :class => @c1
    proc{@c2.new(:id => 1234).add_attributes([@c2.new, @c2.new])}.must_raise(Sequel::Error)
  end

  it "should accept primary keys for the remove_*s method and remove existing records" do
    @c2.one_to_many :attributes, :class => @c1
    n = @c2.new(:id => 1234)
    @c1.dataset = @c1.dataset.with_fetch([
      [{ :id=>234, :node_id=>1234 }], [{ :id=>345, :node_id=>1234 }]
    ])
    n.remove_attributes([234, 345]).must_equal [
      @c1.load(:node_id => nil, :id => 234),
      @c1.load(:node_id => nil, :id => 345)
    ]
    DB.sqls.must_equal [
      'BEGIN',
      'SELECT * FROM attributes WHERE ((attributes.node_id = 1234) AND (attributes.id = 234)) LIMIT 1',
      'UPDATE attributes SET node_id = NULL WHERE (id = 234)',
      'SELECT * FROM attributes WHERE ((attributes.node_id = 1234) AND (attributes.id = 345)) LIMIT 1',
      'UPDATE attributes SET node_id = NULL WHERE (id = 345)',
      'COMMIT'
    ]
  end

  it "should raise an error in the remove_*s method if the passed associated objects are not of the correct type" do
    @c2.one_to_many :attributes, :class => @c1
    proc{@c2.new(:id => 1234).remove_attributes([@c2.new, @c2.new])}.must_raise(Sequel::Error)
  end

  it "should have add_*s method respect the :primary_key option" do
    @c2.one_to_many :attributes, :class => @c1, :primary_key=>:xxx

    n = @c2.new(:id => 1234, :xxx=>5)
    a1 = @c1.load(:id => 2345)
    a2 = @c1.load(:id => 3456)
    n.add_attributes([a1, a2]).must_equal [a1, a2]
    DB.sqls.must_equal [
      'BEGIN',
      'UPDATE attributes SET node_id = 5 WHERE (id = 2345)',
      'UPDATE attributes SET node_id = 5 WHERE (id = 3456)',
      'COMMIT'
    ]
  end

  it "should have add_*s method not add the same objects to the cached association array if the objects are already in the array" do
    @c2.one_to_many :attributes, :class => @c1

    n = @c2.new(:id => 1234)
    a1 = @c1.load(:id => 2345)
    a2 = @c1.load(:id => 3456)
    n.associations[:attributes] = []
    [a1, a2].must_equal n.add_attributes([a1, a2])
    [a1, a2].must_equal n.add_attributes([a1, a2])
    a1.values.must_equal(:node_id => 1234, :id => 2345)
    a2.values.must_equal(:node_id => 1234, :id => 3456)
    n.attributes.must_equal [a1, a2]
    DB.sqls.must_equal [
      'BEGIN',
      'UPDATE attributes SET node_id = 1234 WHERE (id = 2345)',
      'UPDATE attributes SET node_id = 1234 WHERE (id = 3456)',
      'COMMIT'
    ] * 2
  end

  it "should have add_*s method respect composite keys" do
    @c2.one_to_many :attributes, :class => @c1, :key =>[:node_id, :y], :primary_key=>[:id, :x]

    n = @c2.load(:id => 1234, :x=>5)
    a1 = @c1.load(:id => 2345)
    a2 = @c1.load(:id => 3456)
    n.add_attributes([a1, a2]).must_equal [a1, a2]
    DB.sqls.must_equal [
      'BEGIN',
      "UPDATE attributes SET node_id = 1234, y = 5 WHERE (id = 2345)",
      "UPDATE attributes SET node_id = 1234, y = 5 WHERE (id = 3456)",
      'COMMIT'
    ]
  end

  it "should have add_*s method accept composite keys" do
    @c1.dataset = @c1.dataset.with_fetch([
       [{ :id=>2345, :node_id=>1234, :z=>8, :y=>5 }],
       [{ :id=>3456, :node_id=>1234, :z=>9, :y=>5 }]
    ])
    @c1.set_primary_key [:id, :z]
    @c2.one_to_many :attributes, :class => @c1, :key =>[:node_id, :y], :primary_key=>[:id, :x]

    n = @c2.load(:id => 1234, :x=>5)
    a1 = @c1.load(:id => 2345, :z => 8, :node_id => 1234, :y=>5)
    a2 = @c1.load(:id => 3456, :z => 9, :node_id => 1234, :y=>5)
    n.add_attributes([[2345, 8], [3456, 9]]).must_equal [a1, a2]
    DB.sqls.must_equal [
      'BEGIN',
      "SELECT * FROM attributes WHERE ((id = 2345) AND (z = 8)) LIMIT 1",
      "UPDATE attributes SET node_id = 1234, y = 5 WHERE ((id = 2345) AND (z = 8))",
      "SELECT * FROM attributes WHERE ((id = 3456) AND (z = 9)) LIMIT 1",
      "UPDATE attributes SET node_id = 1234, y = 5 WHERE ((id = 3456) AND (z = 9))",
      'COMMIT'
    ]
  end

  it "should have remove_*s method respect composite keys" do
    @c2.one_to_many :attributes, :class => @c1, :key =>[:node_id, :y], :primary_key=>[:id, :x]
    
    n = @c2.load(:id => 1234, :x=>5)
    a1 = @c1.load(:id => 2345, :node_id=>1234, :y=>5)
    a2 = @c1.load(:id => 3456, :node_id=>1234, :y=>5)
    n.remove_attributes([a1, a2]).must_equal [a1, a2]
    DB.sqls.must_equal [
      'BEGIN',
      "SELECT 1 AS one FROM attributes WHERE ((attributes.node_id = 1234) AND (attributes.y = 5) AND (id = 2345)) LIMIT 1",
      "UPDATE attributes SET node_id = NULL, y = NULL WHERE (id = 2345)",
      "SELECT 1 AS one FROM attributes WHERE ((attributes.node_id = 1234) AND (attributes.y = 5) AND (id = 3456)) LIMIT 1",
      "UPDATE attributes SET node_id = NULL, y = NULL WHERE (id = 3456)",
      'COMMIT'
    ]
  end

  it "should accept a array of composite primary keys values for the remove_*s method and remove existing records" do
    @c1.dataset = @c1.dataset.with_fetch([
      [{ :id=>234, :node_id=>123, :y=>5 }], [{ :id=>345, :node_id=>123, :y=>6 }]
    ])
    @c1.set_primary_key [:id, :y]
    @c2.one_to_many :attributes, :class => @c1, :key=>:node_id, :primary_key=>:id
    n = @c2.new(:id => 123)
    n.remove_attributes([[234, 5], [345, 6]]).must_equal [
      @c1.load(:node_id => nil, :y => 5, :id => 234),
      @c1.load(:node_id => nil, :y => 6, :id => 345)
    ]
    DB.sqls.must_equal [
      'BEGIN',
      "SELECT * FROM attributes WHERE ((attributes.node_id = 123) AND (attributes.id = 234) AND (attributes.y = 5)) LIMIT 1",
      "UPDATE attributes SET node_id = NULL WHERE ((id = 234) AND (y = 5))",
      "SELECT * FROM attributes WHERE ((attributes.node_id = 123) AND (attributes.id = 345) AND (attributes.y = 6)) LIMIT 1",
      "UPDATE attributes SET node_id = NULL WHERE ((id = 345) AND (y = 6))",
      'COMMIT'
    ]
  end

  it "should raise an error in add_*s and remove_*s if the passed objects return false to save (are not valid)" do
    @c2.one_to_many :attributes, :class => @c1
    n = @c2.new(:id => 1234)
    a1 = @c1.new(:id => 2345)
    a2 = @c1.new(:id => 3456)
    def a1.validate() errors.add(:id, 'foo') end
    def a2.validate() errors.add(:id, 'bar') end
    proc{n.add_attributes([a1, a2])}.must_raise(Sequel::ValidationFailed)
    proc{n.remove_attributes([a1, a2])}.must_raise(Sequel::ValidationFailed)
  end

  it "should not validate the associated objects in add_*s and remove_*s if the :validate=>false option is used" do
    @c2.one_to_many :attributes, :class => @c1, :validate=>false
    n = @c2.new(:id => 1234)
    a1 = @c1.new(:id => 2345)
    a2 = @c1.new(:id => 3456)
    def a1.validate() errors.add(:id, 'foo') end
    def a2.validate() errors.add(:id, 'bar') end
    n.add_attributes([a1, a2]).must_equal [a1, a2]
    n.remove_attributes([a1, a2]).must_equal [a1, a2]
  end

  it "should not raise exception in add_*s and remove_*s if the :raise_on_save_failure=>false option is used" do
    @c2.one_to_many :attributes, :class => @c1, :raise_on_save_failure=>false
    n = @c2.new(:id => 1234)
    a1 = @c1.new(:id => 2345)
    a2 = @c1.new(:id => 3456)
    def a1.validate() errors.add(:id, 'foo') end
    def a2.validate() errors.add(:id, 'bar') end
    n.associations[:attributes] = []
    n.add_attributes([a1, a2]).must_equal []
    n.associations[:attributes].must_equal []
    n.remove_attributes([a1, a2]).must_equal []
    n.associations[:attributes].must_equal []
  end

  it "should add item to cache if it exists when calling add_*s" do
    @c2.one_to_many :attributes, :class => @c1
    n = @c2.new(:id => 123)
    a1 = @c1.load(:id => 234)
    a2 = @c1.load(:id => 345)
    arr = []
    n.associations[:attributes] = arr
    n.add_attributes([a1, a2])
    arr.must_equal [a1, a2]
  end

  it "should set object to item's reciprocal cache when calling add_*s" do
    @c2.one_to_many :attributes, :class => @c1
    @c1.many_to_one :node, :class => @c2

    n = @c2.new(:id => 123)
    a1 = @c1.new(:id => 234)
    a2 = @c1.new(:id => 345)
    n.add_attributes([a1, a2])
    a1.node.must_equal n
    a2.node.must_equal n
  end

  it "should remove item from cache if it exists when calling remove_*s" do
    @c2.one_to_many :attributes, :class => @c1

    n = @c2.load(:id => 123)
    a1 = @c1.load(:id => 234)
    a2 = @c1.load(:id => 345)
    arr = [a1, a2]
    n.associations[:attributes] = arr
    n.remove_attributes([a1, a2])
    arr.must_equal []
  end

  it "should remove item's reciprocal cache calling remove_*s" do
    @c2.one_to_many :attributes, :class => @c1
    @c1.many_to_one :node, :class => @c2

    n = @c2.new(:id => 123)
    a1 = @c1.new(:id => 234)
    a2 = @c1.new(:id => 345)
    a1.associations[:node] = n
    a2.associations[:node] = n
    a1.node.must_equal n
    a2.node.must_equal n
    n.remove_attributes([a1, a2])
    a1.node.must_be_nil
    a2.node.must_be_nil
  end

  it "should not create the add_*s or remove_*s methods if :read_only option is used" do
    @c2.one_to_many :attributes, :class => @c1, :read_only=>true
    im = @c2.instance_methods
    im.wont_include(:add_attributes)
    im.wont_include(:remove_attributes)
  end

  it "should not add associations methods directly to class" do
    @c2.one_to_many :attributes, :class => @c1
    im = @c2.instance_methods
    im.must_include(:add_attributes)
    im.must_include(:remove_attributes)
    im2 = @c2.instance_methods(false)
    im2.wont_include(:add_attributes)
    im2.wont_include(:remove_attributes)
  end

  it "should call an _add_ method internally to add attributes" do
    @c2.one_to_many :attributes, :class => @c1
    @c2.private_instance_methods.must_include(:_add_attribute)
    p = @c2.load(:id=>10)
    c1 = @c1.load(:id=>123)
    c2 = @c1.load(:id=>234)
    def p._add_attribute(x)
      (@x ||= []) << x
    end
    def c1._node_id=; raise; end
    def c2._node_id=; raise; end
    p.add_attributes([c1, c2])
    p.instance_variable_get(:@x).must_equal [c1, c2]
  end

  it "should allow additional arguments given to the add_*s method and pass them onwards to the _add_ method" do
    @c2.one_to_many :attributes, :class => @c1
    p = @c2.load(:id=>10)
    c1 = @c1.load(:id=>123)
    c2 = @c1.load(:id=>234)
    def p._add_attribute(x,*y)
      (@x ||= []) << x
      (@y ||= []) << y
    end
    def c1._node_id=; raise; end
    def c2._node_id=; raise; end
    p.add_attributes([c1, c2], :foo, :bar=>:baz)
    p.instance_variable_get(:@x).must_equal [c1, c2]
    p.instance_variable_get(:@y).must_equal [
      [:foo,{:bar=>:baz}], [:foo,{:bar=>:baz}]
    ]
  end

  it "should call a _remove_ method internally to remove attributes" do
    @c2.one_to_many :attributes, :class => @c1
    @c2.private_instance_methods.must_include(:_remove_attribute)
    p = @c2.load(:id=>10)
    c1 = @c1.load(:id=>123)
    c2 = @c1.load(:id=>234)
    def p._remove_attribute(x)
      (@x ||= []) << x
    end
    def c1._node_id=; raise; end
    def c2._node_id=; raise; end
    p.remove_attributes([c1, c2])
    p.instance_variable_get(:@x).must_equal [c1, c2]
  end

  it "should allow additional arguments given to the remove_*s method and pass them onwards to the _remove_ method" do
    @c2.one_to_many :attributes, :class => @c1, :reciprocal=>nil
    p = @c2.load(:id=>10)
    c1 = @c1.load(:id=>123)
    c2 = @c1.load(:id=>234)
    def p._remove_attribute(x,*y)
      (@x ||= []) << x
      (@y ||= []) << y
    end
    def c1._node_id=; raise; end
    def c2._node_id=; raise; end
    p.remove_attributes([c1, c2], :foo, :bar=>:baz)
    p.instance_variable_get(:@x).must_equal [c1, c2]
    p.instance_variable_get(:@y).must_equal [
      [:foo,{:bar=>:baz}], [:foo,{:bar=>:baz}]
    ]
  end

  it "should support (before|after)_(add|remove) callbacks for (add|remove)_*s methods" do
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
    c1 = @c1.load(:id=>123)
    c2 = @c1.load(:id=>234)
    h.must_equal []
    p.add_attributes([c1, c2])
    h.must_equal [
      10, -123, 123, 4, 3,
      10, -234, 234, 4, 3
    ]
    p.remove_attributes([c1, c2])
    h.must_equal [
      10, -123, 123, 4, 3,
      10, -234, 234, 4, 3,
      123, 5, 6,
      234, 5, 6
    ]
  end

  it "should raise error and not call internal add_*s or remove_*s method if before callback calls cancel_action if raise_on_save_failure is true" do
    p = @c2.load(:id=>10)
    c1 = @c1.load(:id=>123)
    c2 = @c1.load(:id=>234)
    @c2.one_to_many :attributes, :class => @c1, :before_add=>:ba, :before_remove=>:br
    def p.ba(o); cancel_action; end
    def p._add_attribute; raise; end
    def p._remove_attribute; raise; end
    p.associations[:attributes] = []
    proc{p.add_attributes([c1, c2])}.must_raise(Sequel::HookFailed)
    p.attributes.must_equal []
    p.associations[:attributes] = [c1, c2]
    def p.br(o); cancel_action; end
    proc{p.remove_attributes([c1, c2])}.must_raise(Sequel::HookFailed)
    p.attributes.must_equal [c1, c2]
  end

  it "should return nil and not call internal add_*s or remove_*s method if before callback calls cancel_action if raise_on_save_failure is false" do
    p = @c2.load(:id=>10)
    c1 = @c1.load(:id=>123)
    c2 = @c1.load(:id=>234)
    p.raise_on_save_failure = false
    @c2.one_to_many :attributes, :class => @c1, :before_add=>:ba, :before_remove=>:br
    def p.ba(o); cancel_action; end
    def p._add_attribute; raise; end
    def p._remove_attribute; raise; end
    p.associations[:attributes] = []
    p.add_attributes([c1, c2]).must_equal []
    p.attributes.must_equal []
    p.associations[:attributes] = [c1, c2]
    def p.br(o); cancel_action; end
    p.remove_attributes([c1, c2]).must_equal []
    p.attributes.must_equal [c1, c2]
  end

  it "should define a setter that works on existing records" do
    @c2.one_to_many :attributes, class: @c1
  
    n = @c2.load(id: 1234)
    a1 = @c1.load(id: 2345, node_id: 1234)
    a2 = @c1.load(id: 3456, node_id: 1234)
    a3 = @c1.load(id: 4567)

    n.associations[:attributes] = [a1, a2]

    [a2, a3].must_equal(n.attributes = [a2, a3])
    a1.values.must_equal(node_id: nil, id: 2345)
    a2.values.must_equal(node_id: 1234, id: 3456)
    a3.values.must_equal(node_id: 1234, id: 4567)
    DB.sqls.must_equal [
      'BEGIN',
      'SELECT 1 AS one FROM attributes WHERE ((attributes.node_id = 1234) AND (id = 2345)) LIMIT 1',
      'UPDATE attributes SET node_id = NULL WHERE (id = 2345)',
      'UPDATE attributes SET node_id = 1234 WHERE (id = 4567)',
      'COMMIT'
    ]
  end
end

describe "association_multi_add_remove plugin - many_to_many" do
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

      plugin :association_multi_add_remove

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

  it "should define an add_*s method that works on existing records" do
    @c2.many_to_many :attributes, :class => @c1

    n = @c2.load(:id => 1234)
    a1 = @c1.load(:id => 2345)
    a2 = @c1.load(:id => 3456)
    n.add_attributes([a1, a2]).must_equal [a1, a2]
    DB.sqls.must_equal [
      'BEGIN',
      "INSERT INTO attributes_nodes (node_id, attribute_id) VALUES (1234, 2345)",
      "INSERT INTO attributes_nodes (node_id, attribute_id) VALUES (1234, 3456)",
      'COMMIT'
    ]
  end

  it "should define an add_*s method that works with a primary key" do
    @c2.many_to_many :attributes, :class => @c1

    n = @c2.load(:id => 1234)
    a1 = @c1.load(:id => 2345)
    a2 = @c1.load(:id => 3456)
    @c1.dataset = @c1.dataset.with_fetch([[{ :id=>2345 }], [{ :id=>3456 }]])
    n.add_attributes([2345, 3456]).must_equal [a1, a2]
    DB.sqls.must_equal [
      'BEGIN',
      "SELECT * FROM attributes WHERE id = 2345",
      "INSERT INTO attributes_nodes (node_id, attribute_id) VALUES (1234, 2345)",
      "SELECT * FROM attributes WHERE id = 3456",
      "INSERT INTO attributes_nodes (node_id, attribute_id) VALUES (1234, 3456)",
      'COMMIT'
    ]
  end

  it "should allow passing hashes to the add_*s method which creates new records" do
    @c2.many_to_many :attributes, :class => @c1

    n = @c2.load(:id => 1234)
    @c1.dataset = @c1.dataset.with_fetch([[{ :id=>1 }], [{ :id=>2 }]])
    n.add_attributes([{ :id => 1 }, { :id => 2 }]).must_equal [
      @c1.load(:id => 1), @c1.load(:id => 2)
    ]
    DB.sqls.must_equal [
      'BEGIN',
      'INSERT INTO attributes (id) VALUES (1)',
      "SELECT * FROM attributes WHERE id = 1",
      "INSERT INTO attributes_nodes (node_id, attribute_id) VALUES (1234, 1)",
      'INSERT INTO attributes (id) VALUES (2)',
      "SELECT * FROM attributes WHERE id = 2",
      "INSERT INTO attributes_nodes (node_id, attribute_id) VALUES (1234, 2)",
      'COMMIT'
    ]
  end

  it "should define a remove_*s method that works on existing records" do
    @c2.many_to_many :attributes, :class => @c1

    n = @c2.new(:id => 1234)
    a1 = @c1.new(:id => 2345)
    a2 = @c1.new(:id => 3456)
    n.remove_attributes([a1, a2]).must_equal [a1, a2]
    DB.sqls.must_equal [
      'BEGIN',
      'DELETE FROM attributes_nodes WHERE ((node_id = 1234) AND (attribute_id = 2345))',
      'DELETE FROM attributes_nodes WHERE ((node_id = 1234) AND (attribute_id = 3456))',
      'COMMIT'
    ]
  end

  it "should accept primary keys for the remove_*s method and remove existing records" do
    @c2.many_to_many :attributes, :class => @c1
    n = @c2.new(:id => 1234)
    @c1.dataset = @c1.dataset.with_fetch([[{ :id=>234 }], [{ :id=>345 }]])
    n.remove_attributes([234, 345]).must_equal [
      @c1.load(:id => 234), @c1.load(:id => 345)
    ]
    DB.sqls.must_equal [
      'BEGIN',
      "SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE ((attributes_nodes.node_id = 1234) AND (attributes.id = 234)) LIMIT 1",
      "DELETE FROM attributes_nodes WHERE ((node_id = 1234) AND (attribute_id = 234))",
      "SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE ((attributes_nodes.node_id = 1234) AND (attributes.id = 345)) LIMIT 1",
      "DELETE FROM attributes_nodes WHERE ((node_id = 1234) AND (attribute_id = 345))",
      'COMMIT'
    ]
  end

  it "should have the add_*s method respect the :left_primary_key and :right_primary_key options" do
    @c2.many_to_many :attributes, :class => @c1, :left_primary_key=>:xxx, :right_primary_key=>:yyy

    n = @c2.load(:id => 1234).set(:xxx=>5)
    a1 = @c1.load(:id => 2345).set(:yyy=>8)
    a2 = @c1.load(:id => 3456).set(:yyy=>9)
    n.add_attributes([a1, a2]).must_equal [a1, a2]
    DB.sqls.must_equal [
      'BEGIN',
      "INSERT INTO attributes_nodes (node_id, attribute_id) VALUES (5, 8)",
      "INSERT INTO attributes_nodes (node_id, attribute_id) VALUES (5, 9)",
      'COMMIT'
    ]
  end

  it "should have the add_*s method respect composite keys" do
    @c2.many_to_many :attributes, :class => @c1, :left_key=>[:l1, :l2], :right_key=>[:r1, :r2], :left_primary_key=>[:id, :x], :right_primary_key=>[:id, :z]
    @c1.dataset = @c1.dataset.with_fetch([
      [{ :id=>2345, :z=>8 }], [{ :id=>3456, :z=>9 }]
    ])
    @c1.set_primary_key [:id, :z]
    n = @c2.load(:id => 1234, :x=>5)
    a1 = @c1.load(:id => 2345, :z=>8)
    a2 = @c1.load(:id => 3456, :z=>9)
    n.add_attributes([[2345, 8], [3456, 9]]).must_equal [a1, a2]
    DB.sqls.must_equal [
      'BEGIN',
      "SELECT * FROM attributes WHERE ((id = 2345) AND (z = 8)) LIMIT 1",
      "INSERT INTO attributes_nodes (l1, l2, r1, r2) VALUES (1234, 5, 2345, 8)",
      "SELECT * FROM attributes WHERE ((id = 3456) AND (z = 9)) LIMIT 1",
      "INSERT INTO attributes_nodes (l1, l2, r1, r2) VALUES (1234, 5, 3456, 9)",
      'COMMIT'
    ]
  end

  it "should have the remove_*s method respect the :left_primary_key and :right_primary_key options" do
    @c2.many_to_many :attributes, :class => @c1, :left_primary_key=>:xxx, :right_primary_key=>:yyy

    n = @c2.new(:id => 1234, :xxx=>5)
    a1 = @c1.new(:id => 2345, :yyy=>8)
    a2 = @c1.new(:id => 3456, :yyy=>9)
    n.remove_attributes([a1, a2]).must_equal [a1, a2]
    DB.sqls.must_equal [
      'BEGIN',
      'DELETE FROM attributes_nodes WHERE ((node_id = 5) AND (attribute_id = 8))',
      'DELETE FROM attributes_nodes WHERE ((node_id = 5) AND (attribute_id = 9))',
      'COMMIT'
    ]
  end

  it "should have the remove_*s method respect composite keys" do
    @c2.many_to_many :attributes, :class => @c1, :left_key=>[:l1, :l2], :right_key=>[:r1, :r2], :left_primary_key=>[:id, :x], :right_primary_key=>[:id, :z]
    n = @c2.load(:id => 1234, :x=>5)
    a1 = @c1.load(:id => 2345, :z=>8)
    a2 = @c1.load(:id => 3456, :z=>9)
    [a1, a2].must_equal n.remove_attributes([a1, a2])
    DB.sqls.must_equal [
      'BEGIN',
      "DELETE FROM attributes_nodes WHERE ((l1 = 1234) AND (l2 = 5) AND (r1 = 2345) AND (r2 = 8))",
      "DELETE FROM attributes_nodes WHERE ((l1 = 1234) AND (l2 = 5) AND (r1 = 3456) AND (r2 = 9))",
      'COMMIT'
    ]
  end

  it "should accept an array of arrays of composite primary key values for the remove_*s method and remove existing records" do
    @c1.dataset = @c1.dataset.with_fetch([
      [{ :id=>234, :y=>8 }], [{ :id=>345, :y=>9 }]
    ])
    @c1.set_primary_key [:id, :y]
    @c2.many_to_many :attributes, :class => @c1
    n = @c2.new(:id => 1234)
    n.remove_attributes([[234, 8], [345, 9]]).must_equal [
      @c1.load(:id => 234, :y=>8), @c1.load(:id => 345, :y=>9)
    ]
    DB.sqls.must_equal [
      'BEGIN',
      "SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE ((attributes_nodes.node_id = 1234) AND (attributes.id = 234) AND (attributes.y = 8)) LIMIT 1",
      "DELETE FROM attributes_nodes WHERE ((node_id = 1234) AND (attribute_id = 234))",
      "SELECT attributes.* FROM attributes INNER JOIN attributes_nodes ON (attributes_nodes.attribute_id = attributes.id) WHERE ((attributes_nodes.node_id = 1234) AND (attributes.id = 345) AND (attributes.y = 9)) LIMIT 1",
      "DELETE FROM attributes_nodes WHERE ((node_id = 1234) AND (attribute_id = 345))",
      'COMMIT'
    ]
  end

  it "should raise an error if trying to remove model objects that don't have valid primary keys" do
    @c2.many_to_many :attributes, :class => @c1
    n = @c2.new
    a1 = @c1.load(:id=>123)
    a2 = @c1.load(:id=>234)
    proc { n.remove_attributes([a1, a2]) }.must_raise(Sequel::Error)
  end

  it "should remove items from cache if they exist when calling remove_*s" do
    @c2.many_to_many :attributes, :class => @c1

    n = @c2.new(:id => 1234)
    a1 = @c1.load(:id => 345)
    a2 = @c1.load(:id => 456)
    arr = [a1, a2]
    n.associations[:attributes] = arr
    n.remove_attributes([a1, a2])
    arr.must_equal []
  end

  it "should remove items from reciprocal's if they exist when calling remove_*s" do
    @c2.many_to_many :attributes, :class => @c1
    @c1.many_to_many :nodes, :class => @c2

    n = @c2.new(:id => 1234)
    a1 = @c1.new(:id => 345)
    a2 = @c1.new(:id => 456)
    a1.associations[:nodes] = [n]
    a2.associations[:nodes] = [n]
    n.remove_attributes([a1, a2])
    a1.nodes.must_equal []
    a2.nodes.must_equal []
  end

  it "should not create the add_*s or remove_*s methods if :read_only option is used" do
    @c2.many_to_many :attributes, :class => @c1, :read_only=>true
    im = @c2.instance_methods
    im.wont_include(:add_attributes)
    im.wont_include(:remove_attributes)
  end

  it "should not add associations methods directly to class" do
    @c2.many_to_many :attributes, :class => @c1
    im = @c2.instance_methods
    im.must_include(:add_attributes)
    im.must_include(:remove_attributes)
    im2 = @c2.instance_methods(false)
    im2.wont_include(:add_attributes)
    im2.wont_include(:remove_attributes)
  end

  it "should call a _remove_*s method internally to remove attributes" do
    @c2.many_to_many :attributes, :class => @c1
    @c2.private_instance_methods.must_include(:_remove_attribute)
    p = @c2.load(:id=>10)
    c1 = @c1.load(:id=>123)
    c2 = @c1.load(:id=>234)
    def p._remove_attribute(x)
      (@x ||= []) << x
    end
    p.remove_attributes([c1, c2])
    p.instance_variable_get(:@x).must_equal [c1, c2]
    DB.sqls.must_equal ['BEGIN', 'COMMIT']
  end

  it "should support a :remover option for defining the _remove_*s method" do
    @c2.many_to_many :attributes, :class => @c1,
      :remover=>proc { |x| (@x ||= []) << x }
    p = @c2.load(:id=>10)
    c1 = @c1.load(:id=>123)
    c2 = @c1.load(:id=>234)
    p.remove_attributes([c1, c2])
    p.instance_variable_get(:@x).must_equal [c1, c2]
    DB.sqls.must_equal ['BEGIN', 'COMMIT']
  end

  it "should allow additional arguments given to the remove_*s method and pass them onwards to the _remove_ method" do
    @c2.many_to_many :attributes, :class => @c1
    p = @c2.load(:id=>10)
    c1 = @c1.load(:id=>123)
    c2 = @c1.load(:id=>234)
    def p._remove_attribute(x,*y)
      (@x ||= []) << x
      (@y ||= []) << y
    end
    p.remove_attributes([c1, c2], :foo, :bar=>:baz)
    p.instance_variable_get(:@x).must_equal [c1, c2]
    p.instance_variable_get(:@y).must_equal [
      [:foo, { :bar=>:baz }], [:foo, { :bar=>:baz }]
    ]
  end

  it "should raise an error in the remove_*s method if the passed associated objects are not of the correct type" do
    @c2.many_to_many :attributes, :class => @c1
    proc do
      @c2.new(:id => 1234).remove_attributes([@c2.new, @c2.new])
    end
      .must_raise(Sequel::Error)
  end

  it "should support (before|after)_(add|remove) callbacks for (add|remove)_* methods" do
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
    c1 = @c1.load(:id=>123)
    c2 = @c1.load(:id=>234)
    h.must_equal []
    p.add_attributes([c1, c2])
    h.must_equal [
      10, -123, 123, 4, 3,
      10, -234, 234, 4, 3
    ]
    p.remove_attributes([c1, c2])
    h.must_equal [
      10, -123, 123, 4, 3,
      10, -234, 234, 4, 3,
      123, 5, 6,
      234, 5, 6
    ]
  end

  it "should raise error and not call internal add_*s or remove_*s method if before callback calls cancel_action if raise_on_save_failure is true" do
    p = @c2.load(:id=>10)
    c1 = @c1.load(:id=>123)
    c2 = @c1.load(:id=>234)
    @c2.many_to_many :attributes, :class => @c1, :before_add=>:ba, :before_remove=>:br
    def p.ba(o) cancel_action end
    def p._add_attribute; raise; end
    def p._remove_attribute; raise; end
    p.associations[:attributes] = []
    p.raise_on_save_failure = true
    proc{p.add_attributes([c1, c2])}.must_raise(Sequel::HookFailed)
    p.attributes.must_equal []
    p.associations[:attributes] = [c1, c2]
    def p.br(o) cancel_action end
    proc { p.remove_attributes([c1, c2]) }.must_raise(Sequel::HookFailed)
    p.attributes.must_equal [c1, c2]
  end

  it "should return nil and not call internal add_*s or remove_*s method if before callback calls cancel_action if raise_on_save_failure is false" do
    p = @c2.load(:id=>10)
    c1 = @c1.load(:id=>123)
    c2 = @c1.load(:id=>234)
    p.raise_on_save_failure = false
    @c2.many_to_many :attributes, :class => @c1, :before_add=>:ba, :before_remove=>:br
    def p.ba(o) cancel_action end
    def p._add_attribute; raise; end
    def p._remove_attribute; raise; end
    p.associations[:attributes] = []
    p.add_attributes([c1, c2]).must_equal []
    p.attributes.must_equal []
    p.associations[:attributes] = [c1, c2]
    def p.br(o) cancel_action end
    p.remove_attributes([c1, c2]).must_equal []
    p.attributes.must_equal [c1, c2]
  end

  it "should define a setter that works on existing records" do
    @c2.many_to_many :attributes, class: @c1

    n = @c2.load(id: 1234)
    a1 = @c1.load(id: 2345)
    a2 = @c1.load(id: 3456)
    a3 = @c1.load(id: 4567)

    n.associations[:attributes] = [a1, a2]

    [a2, a3].must_equal(n.attributes = [a2, a3])
    DB.sqls.must_equal [
      'BEGIN',
      'DELETE FROM attributes_nodes WHERE ((node_id = 1234) AND (attribute_id = 2345))',
      'INSERT INTO attributes_nodes (node_id, attribute_id) VALUES (1234, 4567)',
      'COMMIT'
    ]
  end
end

describe "association_multi_add_remove plugin - sharding" do
  before do
    @db = Sequel.mock(:servers=>{:a=>{}}, :numrows=>1)
    @c1 = Class.new(Sequel::Model(@db[:attributes])) do
      unrestrict_primary_key
      columns :id, :node_id, :y, :z
    end

    @c2 = Class.new(Sequel::Model(@db[:nodes])) do
      plugin :association_multi_add_remove

      def _refresh(ds); end
      unrestrict_primary_key
      attr_accessor :xxx

      def self.name; 'Node'; end
      def self.to_s; 'Node'; end

      columns :id, :x
    end
    @dataset = @c2.dataset = @c2.dataset.with_fetch({})
    @c1.dataset = @c1.dataset.with_fetch(proc { |sql| sql =~ /SELECT 1/ ? { a: 1 } : {} })
    @db.sqls
  end

  it "should handle servers correctly" do
    @c2.one_to_many :attributes, class: @c1

    n = @c2.load(id: 1234).set_server(:a)
    a1 = @c1.load(id: 2345).set_server(:a)
    a2 = @c1.load(id: 3456).set_server(:a)
    [a1, a2].must_equal n.add_attributes([a1, a2])
    a1.values.must_equal(:node_id => 1234, id: 2345)
    a2.values.must_equal(:node_id => 1234, id: 3456)
    @db.sqls.must_equal [
      'BEGIN -- a',
      'UPDATE attributes SET node_id = 1234 WHERE (id = 2345) -- a',
      'UPDATE attributes SET node_id = 1234 WHERE (id = 3456) -- a',
      'COMMIT -- a'
    ]
  end
end
