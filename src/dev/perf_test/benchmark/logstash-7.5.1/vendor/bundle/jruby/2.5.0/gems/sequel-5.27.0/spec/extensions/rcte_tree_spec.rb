require_relative "spec_helper"

describe Sequel::Model, "rcte_tree" do
  before do
    @db = Sequel.mock
    @db.extend_datasets do
      def supports_cte?(*) true end
    end
    @c = Class.new(Sequel::Model(@db[:nodes]))
    @c.class_eval do
      def self.name; 'Node'; end
      columns :id, :name, :parent_id, :i, :pi
    end
    @ds = @c.dataset
    @o = @c.load(:id=>2, :parent_id=>1, :name=>'AA', :i=>3, :pi=>4)
    @db.sqls
  end

  it "should define the correct associations" do
    @c.plugin :rcte_tree
    @c.associations.sort_by{|x| x.to_s}.must_equal [:ancestors, :children, :descendants, :parent]
  end
  
  it "should define the correct associations when giving options" do
    @c.plugin :rcte_tree, :ancestors=>{:name=>:as}, :children=>{:name=>:cs}, :descendants=>{:name=>:ds}, :parent=>{:name=>:p}
    @c.associations.sort_by{|x| x.to_s}.must_equal [:as, :cs, :ds, :p]
  end

  it "should use the correct SQL for lazy associations" do
    @c.plugin :rcte_tree
    @o.parent_dataset.sql.must_equal 'SELECT * FROM nodes WHERE (nodes.id = 1) LIMIT 1'
    @o.children_dataset.sql.must_equal 'SELECT * FROM nodes WHERE (nodes.parent_id = 2)'
    @o.ancestors_dataset.sql.must_equal 'WITH t AS (SELECT * FROM nodes WHERE (id = 1) UNION ALL SELECT nodes.* FROM nodes INNER JOIN t ON (t.parent_id = nodes.id)) SELECT * FROM t AS nodes'
    @o.descendants_dataset.sql.must_equal 'WITH t AS (SELECT * FROM nodes WHERE (parent_id = 2) UNION ALL SELECT nodes.* FROM nodes INNER JOIN t ON (t.id = nodes.parent_id)) SELECT * FROM t AS nodes'
  end
  
  it "should use the correct SQL for lazy associations when recursive CTEs require column aliases" do
    @c.dataset = @c.dataset.with_extend{def recursive_cte_requires_column_aliases?; true end}
    @c.plugin :rcte_tree
    @o.parent_dataset.sql.must_equal 'SELECT * FROM nodes WHERE (nodes.id = 1) LIMIT 1'
    @o.children_dataset.sql.must_equal 'SELECT * FROM nodes WHERE (nodes.parent_id = 2)'
    @o.ancestors_dataset.sql.must_equal 'WITH t(id, name, parent_id, i, pi) AS (SELECT id, name, parent_id, i, pi FROM nodes WHERE (id = 1) UNION ALL SELECT nodes.id, nodes.name, nodes.parent_id, nodes.i, nodes.pi FROM nodes INNER JOIN t ON (t.parent_id = nodes.id)) SELECT * FROM t AS nodes'
    @o.descendants_dataset.sql.must_equal 'WITH t(id, name, parent_id, i, pi) AS (SELECT id, name, parent_id, i, pi FROM nodes WHERE (parent_id = 2) UNION ALL SELECT nodes.id, nodes.name, nodes.parent_id, nodes.i, nodes.pi FROM nodes INNER JOIN t ON (t.id = nodes.parent_id)) SELECT * FROM t AS nodes'
  end
  
  it "should use the correct SQL for eager loading when recursive CTEs require column aliases" do
    @c.dataset = @c.dataset.with_extend{def recursive_cte_requires_column_aliases?; true end}
    @c.plugin :rcte_tree
    @c.dataset = @c.dataset.with_fetch([[{:id=>1, :name=>'A', :parent_id=>3}]])
    @c.eager(:ancestors).all
    @db.sqls.must_equal ["SELECT * FROM nodes", "WITH t(x_root_x, id, name, parent_id, i, pi) AS (SELECT id AS x_root_x, nodes.id, nodes.name, nodes.parent_id, nodes.i, nodes.pi FROM nodes WHERE (id IN (3)) UNION ALL SELECT t.x_root_x, nodes.id, nodes.name, nodes.parent_id, nodes.i, nodes.pi FROM nodes INNER JOIN t ON (t.parent_id = nodes.id)) SELECT * FROM t AS nodes"]

    @c.dataset = @c.dataset.with_fetch([[{:id=>1, :name=>'A', :parent_id=>3}]])
    @c.eager(:descendants).all
    @db.sqls.must_equal ["SELECT * FROM nodes", "WITH t(x_root_x, id, name, parent_id, i, pi) AS (SELECT parent_id AS x_root_x, nodes.id, nodes.name, nodes.parent_id, nodes.i, nodes.pi FROM nodes WHERE (parent_id IN (1)) UNION ALL SELECT t.x_root_x, nodes.id, nodes.name, nodes.parent_id, nodes.i, nodes.pi FROM nodes INNER JOIN t ON (t.id = nodes.parent_id)) SELECT * FROM t AS nodes"]
  end
  
  it "should use the correct SQL for lazy associations when giving options" do
    @c.plugin :rcte_tree, :primary_key=>:i, :key=>:pi, :cte_name=>:cte, :order=>:name, :ancestors=>{:name=>:as}, :children=>{:name=>:cs}, :descendants=>{:name=>:ds}, :parent=>{:name=>:p}
    @o.p_dataset.sql.must_equal 'SELECT * FROM nodes WHERE (nodes.i = 4) ORDER BY name LIMIT 1'
    @o.cs_dataset.sql.must_equal 'SELECT * FROM nodes WHERE (nodes.pi = 3) ORDER BY name'
    @o.as_dataset.sql.must_equal 'WITH cte AS (SELECT * FROM nodes WHERE (i = 4) UNION ALL SELECT nodes.* FROM nodes INNER JOIN cte ON (cte.pi = nodes.i)) SELECT * FROM cte AS nodes ORDER BY name'
    @o.ds_dataset.sql.must_equal 'WITH cte AS (SELECT * FROM nodes WHERE (pi = 3) UNION ALL SELECT nodes.* FROM nodes INNER JOIN cte ON (cte.i = nodes.pi)) SELECT * FROM cte AS nodes ORDER BY name'
  end

  it "should use the correct SQL for lazy associations with :conditions option" do
    @c.plugin :rcte_tree, :conditions => {:i => 1}
    @o.parent_dataset.sql.must_equal 'SELECT * FROM nodes WHERE ((i = 1) AND (nodes.id = 1)) LIMIT 1'
    @o.children_dataset.sql.must_equal 'SELECT * FROM nodes WHERE ((i = 1) AND (nodes.parent_id = 2))'
    @o.ancestors_dataset.sql.must_equal 'WITH t AS (SELECT * FROM nodes WHERE ((id = 1) AND (i = 1)) UNION ALL SELECT nodes.* FROM nodes INNER JOIN t ON (t.parent_id = nodes.id) WHERE (i = 1)) SELECT * FROM t AS nodes WHERE (i = 1)'
    @o.descendants_dataset.sql.must_equal 'WITH t AS (SELECT * FROM nodes WHERE ((parent_id = 2) AND (i = 1)) UNION ALL SELECT nodes.* FROM nodes INNER JOIN t ON (t.id = nodes.parent_id) WHERE (i = 1)) SELECT * FROM t AS nodes WHERE (i = 1)'
  end
  
  it "should add all parent associations when lazily loading ancestors" do
    @c.plugin :rcte_tree
    @c.dataset = @c.dataset.with_fetch([[{:id=>1, :name=>'A', :parent_id=>3}, {:id=>4, :name=>'B', :parent_id=>nil}, {:id=>3, :name=>'?', :parent_id=>4}]])
    @o.ancestors.must_equal [@c.load(:id=>1, :name=>'A', :parent_id=>3), @c.load(:id=>4, :name=>'B', :parent_id=>nil), @c.load(:id=>3, :name=>'?', :parent_id=>4)]
    @o.associations[:parent].must_equal @c.load(:id=>1, :name=>'A', :parent_id=>3)
    @o.associations[:parent].associations[:parent].must_equal @c.load(:id=>3, :name=>'?', :parent_id=>4)
    @o.associations[:parent].associations[:parent].associations[:parent].must_equal @c.load(:id=>4, :name=>'B', :parent_id=>nil)
    @o.associations[:parent].associations[:parent].associations[:parent].associations.fetch(:parent, 1).must_be_nil
  end
  
  it "should add all parent associations when lazily loading ancestors and giving options" do
    @c.plugin :rcte_tree, :primary_key=>:i, :key=>:pi, :ancestors=>{:name=>:as}, :parent=>{:name=>:p}
    @c.dataset = @c.dataset.with_fetch([[{:i=>4, :name=>'A', :pi=>5}, {:i=>6, :name=>'B', :pi=>nil}, {:i=>5, :name=>'?', :pi=>6}]])
    @o.as.must_equal [@c.load(:i=>4, :name=>'A', :pi=>5), @c.load(:i=>6, :name=>'B', :pi=>nil), @c.load(:i=>5, :name=>'?', :pi=>6)]
    @o.associations[:p].must_equal @c.load(:i=>4, :name=>'A', :pi=>5)
    @o.associations[:p].associations[:p].must_equal @c.load(:i=>5, :name=>'?', :pi=>6)
    @o.associations[:p].associations[:p].associations[:p].must_equal @c.load(:i=>6, :name=>'B', :pi=>nil)
    @o.associations[:p].associations[:p].associations[:p].associations.fetch(:p, 1).must_be_nil
  end
  
  it "should add all parent and children associations when lazily loading descendants" do
    @c.plugin :rcte_tree
    @c.dataset = @c.dataset.with_fetch([[{:id=>3, :name=>'??', :parent_id=>1}, {:id=>1, :name=>'A', :parent_id=>2}, {:id=>4, :name=>'B', :parent_id=>2}, {:id=>5, :name=>'?', :parent_id=>3}]])
    @o.descendants.must_equal [@c.load(:id=>3, :name=>'??', :parent_id=>1), @c.load(:id=>1, :name=>'A', :parent_id=>2), @c.load(:id=>4, :name=>'B', :parent_id=>2), @c.load(:id=>5, :name=>'?', :parent_id=>3)]
    @o.associations[:children].must_equal [@c.load(:id=>1, :name=>'A', :parent_id=>2), @c.load(:id=>4, :name=>'B', :parent_id=>2)]
    @o.associations[:children].map{|c1| c1.associations[:children]}.must_equal [[@c.load(:id=>3, :name=>'??', :parent_id=>1)], []]
    @o.associations[:children].map{|c1| c1.associations[:parent]}.must_equal [@o, @o]
    @o.associations[:children].map{|c1| c1.associations[:children].map{|c2| c2.associations[:children]}}.must_equal [[[@c.load(:id=>5, :name=>'?', :parent_id=>3)]], []]
    @o.associations[:children].map{|c1| c1.associations[:children].map{|c2| c2.associations[:parent]}}.must_equal [[@o.children.first], []]
    @o.associations[:children].map{|c1| c1.associations[:children].map{|c2| c2.associations[:children].map{|c3| c3.associations[:children]}}}.must_equal [[[[]]], []]
    @o.associations[:children].map{|c1| c1.associations[:children].map{|c2| c2.associations[:children].map{|c3| c3.associations[:parent]}}}.must_equal [[[@o.children.first.children.first]], []]
  end
  
  it "should add all children associations when lazily loading descendants and giving options" do
    @c.plugin :rcte_tree, :primary_key=>:i, :key=>:pi, :children=>{:name=>:cs}, :descendants=>{:name=>:ds}
    @c.dataset = @c.dataset.with_fetch([[{:i=>7, :name=>'??', :pi=>5}, {:i=>5, :name=>'A', :pi=>3}, {:i=>6, :name=>'B', :pi=>3}, {:i=>8, :name=>'?', :pi=>7}]])
    @o.ds.must_equal [@c.load(:i=>7, :name=>'??', :pi=>5), @c.load(:i=>5, :name=>'A', :pi=>3), @c.load(:i=>6, :name=>'B', :pi=>3), @c.load(:i=>8, :name=>'?', :pi=>7)]
    @o.associations[:cs].must_equal [@c.load(:i=>5, :name=>'A', :pi=>3), @c.load(:i=>6, :name=>'B', :pi=>3)]
    @o.associations[:cs].map{|c1| c1.associations[:cs]}.must_equal [[@c.load(:i=>7, :name=>'??', :pi=>5)], []]
    @o.associations[:cs].map{|c1| c1.associations[:cs].map{|c2| c2.associations[:cs]}}.must_equal [[[@c.load(:i=>8, :name=>'?', :pi=>7)]], []]
    @o.associations[:cs].map{|c1| c1.associations[:cs].map{|c2| c2.associations[:cs].map{|c3| c3.associations[:cs]}}}.must_equal [[[[]]], []]
  end
  
  it "should eagerly load ancestors" do
    @c.plugin :rcte_tree
    @ds = @c.dataset = @c.dataset.with_fetch([[{:id=>2, :parent_id=>1, :name=>'AA'}, {:id=>6, :parent_id=>2, :name=>'C'}, {:id=>7, :parent_id=>1, :name=>'D'}, {:id=>9, :parent_id=>nil, :name=>'E'}],
      [{:id=>2, :name=>'AA', :parent_id=>1, :x_root_x=>2},
       {:id=>1, :name=>'00', :parent_id=>8, :x_root_x=>1}, {:id=>1, :name=>'00', :parent_id=>8, :x_root_x=>2},
       {:id=>8, :name=>'?', :parent_id=>nil, :x_root_x=>2}, {:id=>8, :name=>'?', :parent_id=>nil, :x_root_x=>1}]])
    os = @ds.eager(:ancestors).all
    @db.sqls.must_equal ["SELECT * FROM nodes",
      'WITH t AS (SELECT id AS x_root_x, nodes.* FROM nodes WHERE (id IN (1, 2)) UNION ALL SELECT t.x_root_x, nodes.* FROM nodes INNER JOIN t ON (t.parent_id = nodes.id)) SELECT * FROM t AS nodes']
    os.must_equal [@c.load(:id=>2, :parent_id=>1, :name=>'AA'), @c.load(:id=>6, :parent_id=>2, :name=>'C'), @c.load(:id=>7, :parent_id=>1, :name=>'D'), @c.load(:id=>9, :parent_id=>nil, :name=>'E')]
    os.map{|o| o.ancestors}.must_equal [[@c.load(:id=>1, :name=>'00', :parent_id=>8), @c.load(:id=>8, :name=>'?', :parent_id=>nil)],
      [@c.load(:id=>2, :name=>'AA', :parent_id=>1), @c.load(:id=>1, :name=>'00', :parent_id=>8), @c.load(:id=>8, :name=>'?', :parent_id=>nil)],
      [@c.load(:id=>1, :name=>'00', :parent_id=>8), @c.load(:id=>8, :name=>'?', :parent_id=>nil)],
      []]
    os.map{|o| o.parent}.must_equal [@c.load(:id=>1, :name=>'00', :parent_id=>8), @c.load(:id=>2, :name=>'AA', :parent_id=>1), @c.load(:id=>1, :name=>'00', :parent_id=>8), nil]
    os.map{|o| o.parent.parent if o.parent}.must_equal [@c.load(:id=>8, :name=>'?', :parent_id=>nil), @c.load(:id=>1, :name=>'00', :parent_id=>8), @c.load(:id=>8, :name=>'?', :parent_id=>nil), nil]
    os.map{|o| o.parent.parent.parent if o.parent and o.parent.parent}.must_equal [nil, @c.load(:id=>8, :name=>'?', :parent_id=>nil), nil, nil]
    os.map{|o| o.parent.parent.parent.parent if o.parent and o.parent.parent and o.parent.parent.parent}.must_equal [nil, nil, nil, nil]
    @db.sqls.must_equal []
  end
  
  it "should eagerly load ancestors when giving options" do
    @c.plugin :rcte_tree, :primary_key=>:i, :key=>:pi, :key_alias=>:kal, :cte_name=>:cte, :ancestors=>{:name=>:as}, :parent=>{:name=>:p}
    @ds = @c.dataset = @c.dataset.with_fetch([[{:i=>2, :pi=>1, :name=>'AA'}, {:i=>6, :pi=>2, :name=>'C'}, {:i=>7, :pi=>1, :name=>'D'}, {:i=>9, :pi=>nil, :name=>'E'}],
      [{:i=>2, :name=>'AA', :pi=>1, :kal=>2},
       {:i=>1, :name=>'00', :pi=>8, :kal=>1}, {:i=>1, :name=>'00', :pi=>8, :kal=>2},
       {:i=>8, :name=>'?', :pi=>nil, :kal=>2}, {:i=>8, :name=>'?', :pi=>nil, :kal=>1}]])
    os = @ds.eager(:as).all
    @db.sqls.must_equal ["SELECT * FROM nodes",
      'WITH cte AS (SELECT i AS kal, nodes.* FROM nodes WHERE (i IN (1, 2)) UNION ALL SELECT cte.kal, nodes.* FROM nodes INNER JOIN cte ON (cte.pi = nodes.i)) SELECT * FROM cte AS nodes']
    os.must_equal [@c.load(:i=>2, :pi=>1, :name=>'AA'), @c.load(:i=>6, :pi=>2, :name=>'C'), @c.load(:i=>7, :pi=>1, :name=>'D'), @c.load(:i=>9, :pi=>nil, :name=>'E')]
    os.map{|o| o.as}.must_equal [[@c.load(:i=>1, :name=>'00', :pi=>8), @c.load(:i=>8, :name=>'?', :pi=>nil)],
      [@c.load(:i=>2, :name=>'AA', :pi=>1), @c.load(:i=>1, :name=>'00', :pi=>8), @c.load(:i=>8, :name=>'?', :pi=>nil)],
      [@c.load(:i=>1, :name=>'00', :pi=>8), @c.load(:i=>8, :name=>'?', :pi=>nil)],
      []]
    os.map{|o| o.p}.must_equal [@c.load(:i=>1, :name=>'00', :pi=>8), @c.load(:i=>2, :name=>'AA', :pi=>1), @c.load(:i=>1, :name=>'00', :pi=>8), nil]
    os.map{|o| o.p.p if o.p}.must_equal [@c.load(:i=>8, :name=>'?', :pi=>nil), @c.load(:i=>1, :name=>'00', :pi=>8), @c.load(:i=>8, :name=>'?', :pi=>nil), nil]
    os.map{|o| o.p.p.p if o.p and o.p.p}.must_equal [nil, @c.load(:i=>8, :name=>'?', :pi=>nil), nil, nil]
    os.map{|o| o.p.p.p.p if o.p and o.p.p and o.p.p.p}.must_equal [nil, nil, nil, nil]
  end

  it "should eagerly load ancestors respecting association option :conditions" do
    @c.plugin :rcte_tree, :conditions => {:i => 1}
    @ds = @c.dataset = @c.dataset.with_fetch([[{:id=>2, :parent_id=>1, :name=>'AA'}, {:id=>6, :parent_id=>2, :name=>'C'}, {:id=>7, :parent_id=>1, :name=>'D'}, {:id=>9, :parent_id=>nil, :name=>'E'}],
      [{:id=>2, :name=>'AA', :parent_id=>1, :x_root_x=>2},
       {:id=>1, :name=>'00', :parent_id=>8, :x_root_x=>1}, {:id=>1, :name=>'00', :parent_id=>8, :x_root_x=>2},
       {:id=>8, :name=>'?', :parent_id=>nil, :x_root_x=>2}, {:id=>8, :name=>'?', :parent_id=>nil, :x_root_x=>1}]])
    @ds.eager(:ancestors).all
    @db.sqls.must_equal ["SELECT * FROM nodes",
      'WITH t AS (SELECT id AS x_root_x, nodes.* FROM nodes WHERE ((id IN (1, 2)) AND (i = 1)) UNION ALL SELECT t.x_root_x, nodes.* FROM nodes INNER JOIN t ON (t.parent_id = nodes.id) WHERE (i = 1)) SELECT * FROM t AS nodes WHERE (i = 1)']
  end

  it "should eagerly load descendants" do
    @c.plugin :rcte_tree
    @ds = @c.dataset = @c.dataset.with_fetch([[{:id=>2, :parent_id=>1, :name=>'AA'}, {:id=>6, :parent_id=>2, :name=>'C'}, {:id=>7, :parent_id=>1, :name=>'D'}],
      [{:id=>6, :parent_id=>2, :name=>'C', :x_root_x=>2}, {:id=>9, :parent_id=>2, :name=>'E', :x_root_x=>2},
       {:id=>3, :name=>'00', :parent_id=>6, :x_root_x=>6}, {:id=>3, :name=>'00', :parent_id=>6, :x_root_x=>2},
       {:id=>4, :name=>'?', :parent_id=>7, :x_root_x=>7}, {:id=>5, :name=>'?', :parent_id=>4, :x_root_x=>7}]])
    os = @ds.eager(:descendants).all
    @db.sqls.must_equal ["SELECT * FROM nodes",
      'WITH t AS (SELECT parent_id AS x_root_x, nodes.* FROM nodes WHERE (parent_id IN (2, 6, 7)) UNION ALL SELECT t.x_root_x, nodes.* FROM nodes INNER JOIN t ON (t.id = nodes.parent_id)) SELECT * FROM t AS nodes']
    os.must_equal [@c.load(:id=>2, :parent_id=>1, :name=>'AA'), @c.load(:id=>6, :parent_id=>2, :name=>'C'), @c.load(:id=>7, :parent_id=>1, :name=>'D')]
    os.map{|o| o.descendants}.must_equal [[@c.load(:id=>6, :parent_id=>2, :name=>'C'), @c.load(:id=>9, :parent_id=>2, :name=>'E'), @c.load(:id=>3, :name=>'00', :parent_id=>6)],
      [@c.load(:id=>3, :name=>'00', :parent_id=>6)],
      [@c.load(:id=>4, :name=>'?', :parent_id=>7), @c.load(:id=>5, :name=>'?', :parent_id=>4)]]
    os.map{|o| o.children}.must_equal [[@c.load(:id=>6, :parent_id=>2, :name=>'C'), @c.load(:id=>9, :parent_id=>2, :name=>'E')], [@c.load(:id=>3, :name=>'00', :parent_id=>6)], [@c.load(:id=>4, :name=>'?', :parent_id=>7)]]
    os.map{|o1| o1.children.map{|o2| o2.children}}.must_equal [[[@c.load(:id=>3, :name=>'00', :parent_id=>6)], []], [[]], [[@c.load(:id=>5, :name=>'?', :parent_id=>4)]]]
    os.map{|o1| o1.children.map{|o2| o2.parent}}.must_equal [[os[0], os[0]], [os[1]], [os[2]]]
    os.map{|o1| o1.children.map{|o2| o2.children.map{|o3| o3.children}}}.must_equal [[[[]], []], [[]], [[[]]]]
    os.map{|o1| o1.children.map{|o2| o2.children.map{|o3| o3.parent}}}.must_equal [[[os[0].children[0]], []], [[]], [[os[2].children[0]]]]
    @db.sqls.must_equal []
  end
  
  it "should eagerly load descendants when giving options" do
    @c.plugin :rcte_tree, :primary_key=>:i, :key=>:pi, :key_alias=>:kal, :cte_name=>:cte, :children=>{:name=>:cs}, :descendants=>{:name=>:ds}
    @ds = @c.dataset = @c.dataset.with_fetch([[{:i=>2, :pi=>1, :name=>'AA'}, {:i=>6, :pi=>2, :name=>'C'}, {:i=>7, :pi=>1, :name=>'D'}],
      [{:i=>6, :pi=>2, :name=>'C', :kal=>2}, {:i=>9, :pi=>2, :name=>'E', :kal=>2},
       {:i=>3, :name=>'00', :pi=>6, :kal=>6}, {:i=>3, :name=>'00', :pi=>6, :kal=>2},
       {:i=>4, :name=>'?', :pi=>7, :kal=>7}, {:i=>5, :name=>'?', :pi=>4, :kal=>7}]])
    os = @ds.eager(:ds).all
    @db.sqls.must_equal ["SELECT * FROM nodes",
      'WITH cte AS (SELECT pi AS kal, nodes.* FROM nodes WHERE (pi IN (2, 6, 7)) UNION ALL SELECT cte.kal, nodes.* FROM nodes INNER JOIN cte ON (cte.i = nodes.pi)) SELECT * FROM cte AS nodes']
    os.must_equal [@c.load(:i=>2, :pi=>1, :name=>'AA'), @c.load(:i=>6, :pi=>2, :name=>'C'), @c.load(:i=>7, :pi=>1, :name=>'D')]
    os.map{|o| o.ds}.must_equal [[@c.load(:i=>6, :pi=>2, :name=>'C'), @c.load(:i=>9, :pi=>2, :name=>'E'), @c.load(:i=>3, :name=>'00', :pi=>6)],
      [@c.load(:i=>3, :name=>'00', :pi=>6)],
      [@c.load(:i=>4, :name=>'?', :pi=>7), @c.load(:i=>5, :name=>'?', :pi=>4)]]
    os.map{|o| o.cs}.must_equal [[@c.load(:i=>6, :pi=>2, :name=>'C'), @c.load(:i=>9, :pi=>2, :name=>'E')], [@c.load(:i=>3, :name=>'00', :pi=>6)], [@c.load(:i=>4, :name=>'?', :pi=>7)]]
    os.map{|o1| o1.cs.map{|o2| o2.cs}}.must_equal [[[@c.load(:i=>3, :name=>'00', :pi=>6)], []], [[]], [[@c.load(:i=>5, :name=>'?', :pi=>4)]]]
    os.map{|o1| o1.cs.map{|o2| o2.cs.map{|o3| o3.cs}}}.must_equal [[[[]], []], [[]], [[[]]]]
    @db.sqls.must_equal []
  end
  
  it "should eagerly load descendants to a given level" do
    @c.plugin :rcte_tree
    @ds = @c.dataset = @c.dataset.with_fetch([[{:id=>2, :parent_id=>1, :name=>'AA'}, {:id=>6, :parent_id=>2, :name=>'C'}, {:id=>7, :parent_id=>1, :name=>'D'}],
      [{:id=>6, :parent_id=>2, :name=>'C', :x_root_x=>2, :x_level_x=>0}, {:id=>9, :parent_id=>2, :name=>'E', :x_root_x=>2, :x_level_x=>0},
       {:id=>3, :name=>'00', :parent_id=>6, :x_root_x=>6, :x_level_x=>0}, {:id=>3, :name=>'00', :parent_id=>6, :x_root_x=>2, :x_level_x=>1},
       {:id=>4, :name=>'?', :parent_id=>7, :x_root_x=>7, :x_level_x=>0}, {:id=>5, :name=>'?', :parent_id=>4, :x_root_x=>7, :x_level_x=>1}]])
    os = @ds.eager(:descendants=>2).all
    @db.sqls.must_equal ["SELECT * FROM nodes",
      'WITH t AS (SELECT parent_id AS x_root_x, nodes.*, CAST(0 AS integer) AS x_level_x FROM nodes WHERE (parent_id IN (2, 6, 7)) UNION ALL SELECT t.x_root_x, nodes.*, (t.x_level_x + 1) AS x_level_x FROM nodes INNER JOIN t ON (t.id = nodes.parent_id) WHERE (t.x_level_x < 1)) SELECT * FROM t AS nodes']
    os.must_equal [@c.load(:id=>2, :parent_id=>1, :name=>'AA'), @c.load(:id=>6, :parent_id=>2, :name=>'C'), @c.load(:id=>7, :parent_id=>1, :name=>'D')]
    os.map{|o| o.descendants}.must_equal [[@c.load(:id=>6, :parent_id=>2, :name=>'C'), @c.load(:id=>9, :parent_id=>2, :name=>'E'), @c.load(:id=>3, :name=>'00', :parent_id=>6)],
      [@c.load(:id=>3, :name=>'00', :parent_id=>6)],
      [@c.load(:id=>4, :name=>'?', :parent_id=>7), @c.load(:id=>5, :name=>'?', :parent_id=>4)]]
    os.map{|o| o.associations[:children]}.must_equal [[@c.load(:id=>6, :parent_id=>2, :name=>'C'), @c.load(:id=>9, :parent_id=>2, :name=>'E')], [@c.load(:id=>3, :name=>'00', :parent_id=>6)], [@c.load(:id=>4, :name=>'?', :parent_id=>7)]]
    os.map{|o1| o1.associations[:children].map{|o2| o2.associations[:children]}}.must_equal [[[@c.load(:id=>3, :name=>'00', :parent_id=>6)], []], [[]], [[@c.load(:id=>5, :name=>'?', :parent_id=>4)]]]
    os.map{|o1| o1.associations[:children].map{|o2| o2.associations[:children].map{|o3| o3.associations[:children]}}}.must_equal [[[[]], []], [[]], [[nil]]]
    @db.sqls.must_equal []
  end
  
  it "should eagerly load descendants to a given level when giving options" do
    @c.plugin :rcte_tree, :primary_key=>:i, :key=>:pi, :key_alias=>:kal, :level_alias=>:lal, :cte_name=>:cte, :children=>{:name=>:cs}, :descendants=>{:name=>:ds}
    @ds = @c.dataset = @c.dataset.with_fetch([[{:i=>2, :pi=>1, :name=>'AA'}, {:i=>6, :pi=>2, :name=>'C'}, {:i=>7, :pi=>1, :name=>'D'}],
      [{:i=>6, :pi=>2, :name=>'C', :kal=>2, :lal=>0}, {:i=>9, :pi=>2, :name=>'E', :kal=>2, :lal=>0},
       {:i=>3, :name=>'00', :pi=>6, :kal=>6, :lal=>0}, {:i=>3, :name=>'00', :pi=>6, :kal=>2, :lal=>1},
       {:i=>4, :name=>'?', :pi=>7, :kal=>7, :lal=>0}, {:i=>5, :name=>'?', :pi=>4, :kal=>7, :lal=>1}]])
    os = @ds.eager(:ds=>2).all
    @db.sqls.must_equal ["SELECT * FROM nodes",
      'WITH cte AS (SELECT pi AS kal, nodes.*, CAST(0 AS integer) AS lal FROM nodes WHERE (pi IN (2, 6, 7)) UNION ALL SELECT cte.kal, nodes.*, (cte.lal + 1) AS lal FROM nodes INNER JOIN cte ON (cte.i = nodes.pi) WHERE (cte.lal < 1)) SELECT * FROM cte AS nodes']
    os.must_equal [@c.load(:i=>2, :pi=>1, :name=>'AA'), @c.load(:i=>6, :pi=>2, :name=>'C'), @c.load(:i=>7, :pi=>1, :name=>'D')]
    os.map{|o| o.ds}.must_equal [[@c.load(:i=>6, :pi=>2, :name=>'C'), @c.load(:i=>9, :pi=>2, :name=>'E'), @c.load(:i=>3, :name=>'00', :pi=>6)],
      [@c.load(:i=>3, :name=>'00', :pi=>6)],
      [@c.load(:i=>4, :name=>'?', :pi=>7), @c.load(:i=>5, :name=>'?', :pi=>4)]]
    os.map{|o| o.associations[:cs]}.must_equal [[@c.load(:i=>6, :pi=>2, :name=>'C'), @c.load(:i=>9, :pi=>2, :name=>'E')], [@c.load(:i=>3, :name=>'00', :pi=>6)], [@c.load(:i=>4, :name=>'?', :pi=>7)]]
    os.map{|o1| o1.associations[:cs].map{|o2| o2.associations[:cs]}}.must_equal [[[@c.load(:i=>3, :name=>'00', :pi=>6)], []], [[]], [[@c.load(:i=>5, :name=>'?', :pi=>4)]]]
    os.map{|o1| o1.associations[:cs].map{|o2| o2.associations[:cs].map{|o3| o3.associations[:cs]}}}.must_equal [[[[]], []], [[]], [[nil]]]
    @db.sqls.must_equal []
  end

  it "should eagerly load descendants respecting association option :conditions" do
    @c.plugin :rcte_tree, :conditions => {:i => 1}
    @ds = @c.dataset = @c.dataset.with_fetch([[{:id=>2, :parent_id=>1, :name=>'AA'}, {:id=>6, :parent_id=>2, :name=>'C'}, {:id=>7, :parent_id=>1, :name=>'D'}],
      [{:id=>6, :parent_id=>2, :name=>'C', :x_root_x=>2}, {:id=>9, :parent_id=>2, :name=>'E', :x_root_x=>2},
       {:id=>3, :name=>'00', :parent_id=>6, :x_root_x=>6}, {:id=>3, :name=>'00', :parent_id=>6, :x_root_x=>2},
       {:id=>4, :name=>'?', :parent_id=>7, :x_root_x=>7}, {:id=>5, :name=>'?', :parent_id=>4, :x_root_x=>7}]])
    @ds.eager(:descendants).all
    @db.sqls.must_equal ["SELECT * FROM nodes",
      'WITH t AS (SELECT parent_id AS x_root_x, nodes.* FROM nodes WHERE ((parent_id IN (2, 6, 7)) AND (i = 1)) UNION ALL SELECT t.x_root_x, nodes.* FROM nodes INNER JOIN t ON (t.id = nodes.parent_id) WHERE (i = 1)) SELECT * FROM t AS nodes WHERE (i = 1)']
  end

  it "should disallow eager graphing of ancestors and descendants" do
    @c.plugin :rcte_tree
    proc{@c.eager_graph(:ancestors)}.must_raise Sequel::Error
    proc{@c.eager_graph(:descendants)}.must_raise Sequel::Error
  end
end

describe Sequel::Model, "rcte_tree with composite keys" do
  before do
    @db = Sequel.mock
    @db.extend_datasets do
      def supports_cte?(*) true end
    end
    @c = Class.new(Sequel::Model(@db[:nodes]))
    @c.class_eval do
      def self.name; 'Node'; end
      columns :id, :id2, :name, :parent_id, :parent_id2, :i, :pi
      set_primary_key [:id, :id2]
    end
    @ds = @c.dataset
    @o = @c.load(:id=>2, :id2=>5, :parent_id=>1, :parent_id2=>6, :name=>'AA', :i=>3, :pi=>4)
    @db.sqls
  end

  it "should use the correct SQL for lazy associations" do
    @c.plugin :rcte_tree, :key=>[:parent_id, :parent_id2]
    @o.parent_dataset.sql.must_equal 'SELECT * FROM nodes WHERE ((nodes.id = 1) AND (nodes.id2 = 6)) LIMIT 1'
    @o.children_dataset.sql.must_equal 'SELECT * FROM nodes WHERE ((nodes.parent_id = 2) AND (nodes.parent_id2 = 5))'
    @o.ancestors_dataset.sql.must_equal 'WITH t AS (SELECT * FROM nodes WHERE ((id = 1) AND (id2 = 6)) UNION ALL SELECT nodes.* FROM nodes INNER JOIN t ON ((t.parent_id = nodes.id) AND (t.parent_id2 = nodes.id2))) SELECT * FROM t AS nodes'
    @o.descendants_dataset.sql.must_equal 'WITH t AS (SELECT * FROM nodes WHERE ((parent_id = 2) AND (parent_id2 = 5)) UNION ALL SELECT nodes.* FROM nodes INNER JOIN t ON ((t.id = nodes.parent_id) AND (t.id2 = nodes.parent_id2))) SELECT * FROM t AS nodes'
  end
  
  it "should use the correct SQL for lazy associations when recursive CTEs require column aliases" do
    @c.dataset = @c.dataset.with_extend{def recursive_cte_requires_column_aliases?; true end}
    @c.plugin :rcte_tree, :key=>[:parent_id, :parent_id2]
    @o.ancestors_dataset.sql.must_equal 'WITH t(id, id2, name, parent_id, parent_id2, i, pi) AS (SELECT id, id2, name, parent_id, parent_id2, i, pi FROM nodes WHERE ((id = 1) AND (id2 = 6)) UNION ALL SELECT nodes.id, nodes.id2, nodes.name, nodes.parent_id, nodes.parent_id2, nodes.i, nodes.pi FROM nodes INNER JOIN t ON ((t.parent_id = nodes.id) AND (t.parent_id2 = nodes.id2))) SELECT * FROM t AS nodes'
    @o.descendants_dataset.sql.must_equal 'WITH t(id, id2, name, parent_id, parent_id2, i, pi) AS (SELECT id, id2, name, parent_id, parent_id2, i, pi FROM nodes WHERE ((parent_id = 2) AND (parent_id2 = 5)) UNION ALL SELECT nodes.id, nodes.id2, nodes.name, nodes.parent_id, nodes.parent_id2, nodes.i, nodes.pi FROM nodes INNER JOIN t ON ((t.id = nodes.parent_id) AND (t.id2 = nodes.parent_id2))) SELECT * FROM t AS nodes'
  end
  
  it "should use the correct SQL for eager loading when recursive CTEs require column aliases" do
    @c.dataset = @c.dataset.with_extend{def recursive_cte_requires_column_aliases?; true end}
    @c.plugin :rcte_tree, :key=>[:parent_id, :parent_id2]
    @c.dataset = @c.dataset.with_fetch([[{:id=>1, :id2=>2, :name=>'A', :parent_id=>3, :parent_id2=>4}]])
    @c.eager(:ancestors).all
    @db.sqls.must_equal ["SELECT * FROM nodes", "WITH t(x_root_x_0, x_root_x_1, id, id2, name, parent_id, parent_id2, i, pi) AS (SELECT id AS x_root_x_0, id2 AS x_root_x_1, nodes.id, nodes.id2, nodes.name, nodes.parent_id, nodes.parent_id2, nodes.i, nodes.pi FROM nodes WHERE ((id, id2) IN ((3, 4))) UNION ALL SELECT t.x_root_x_0, t.x_root_x_1, nodes.id, nodes.id2, nodes.name, nodes.parent_id, nodes.parent_id2, nodes.i, nodes.pi FROM nodes INNER JOIN t ON ((t.parent_id = nodes.id) AND (t.parent_id2 = nodes.id2))) SELECT * FROM t AS nodes"]

    @c.dataset = @c.dataset.with_fetch([[{:id=>1, :id2=>2, :name=>'A', :parent_id=>3, :parent_id2=>4}]])
    @c.eager(:descendants).all
    @db.sqls.must_equal ["SELECT * FROM nodes", "WITH t(x_root_x_0, x_root_x_1, id, id2, name, parent_id, parent_id2, i, pi) AS (SELECT parent_id AS x_root_x_0, parent_id2 AS x_root_x_1, nodes.id, nodes.id2, nodes.name, nodes.parent_id, nodes.parent_id2, nodes.i, nodes.pi FROM nodes WHERE ((parent_id, parent_id2) IN ((1, 2))) UNION ALL SELECT t.x_root_x_0, t.x_root_x_1, nodes.id, nodes.id2, nodes.name, nodes.parent_id, nodes.parent_id2, nodes.i, nodes.pi FROM nodes INNER JOIN t ON ((t.id = nodes.parent_id) AND (t.id2 = nodes.parent_id2))) SELECT * FROM t AS nodes"]
  end
  
  it "should add all parent associations when lazily loading ancestors" do
    @c.plugin :rcte_tree, :key=>[:parent_id, :parent_id2]
    @c.dataset = @c.dataset.with_fetch([[{:id=>1, :id2=>6, :name=>'A', :parent_id=>3, :parent_id2=>5}, {:id=>4, :id2=>8, :name=>'B', :parent_id=>nil, :parent_id2=>nil}, {:id=>3, :id2=>5, :name=>'?', :parent_id=>4, :parent_id2=>8}]])
    @o.ancestors.must_equal [@c.load(:id=>1, :id2=>6, :name=>'A', :parent_id=>3, :parent_id2=>5), @c.load(:id=>4, :id2=>8, :name=>'B', :parent_id=>nil, :parent_id2=>nil), @c.load(:id=>3, :id2=>5, :name=>'?', :parent_id=>4, :parent_id2=>8)]
    @o.associations[:parent].must_equal @c.load(:id=>1, :id2=>6, :name=>'A', :parent_id=>3, :parent_id2=>5)
    @o.associations[:parent].associations[:parent].must_equal @c.load(:id=>3, :id2=>5, :name=>'?', :parent_id=>4, :parent_id2=>8)
    @o.associations[:parent].associations[:parent].associations[:parent].must_equal @c.load(:id=>4, :id2=>8, :name=>'B', :parent_id=>nil, :parent_id2=>nil)
    @o.associations[:parent].associations[:parent].associations[:parent].associations.fetch(:parent, 1).must_be_nil
  end
  
  it "should add all children associations when lazily loading descendants" do
    @c.plugin :rcte_tree, :key=>[:parent_id, :parent_id2]
    @c.dataset = @c.dataset.with_fetch([[{:id=>3, :id2=>4, :name=>'??', :parent_id=>1, :parent_id2=>2}, {:id=>1, :id2=>2, :name=>'A', :parent_id=>2, :parent_id2=>5}, {:id=>4, :id2=>5, :name=>'B', :parent_id=>2, :parent_id2=>5}, {:id=>5, :id2=>7, :name=>'?', :parent_id=>3, :parent_id2=>4}]])
    @o.descendants.must_equal [@c.load(:id=>3, :id2=>4, :name=>'??', :parent_id=>1, :parent_id2=>2), @c.load(:id=>1, :id2=>2, :name=>'A', :parent_id=>2, :parent_id2=>5), @c.load(:id=>4, :id2=>5, :name=>'B', :parent_id=>2, :parent_id2=>5), @c.load(:id=>5, :id2=>7, :name=>'?', :parent_id=>3, :parent_id2=>4)]
    @o.associations[:children].must_equal [@c.load(:id=>1, :id2=>2, :name=>'A', :parent_id=>2, :parent_id2=>5), @c.load(:id=>4, :id2=>5, :name=>'B', :parent_id=>2, :parent_id2=>5)]
    @o.associations[:children].map{|c1| c1.associations[:children]}.must_equal [[@c.load(:id=>3, :id2=>4, :name=>'??', :parent_id=>1, :parent_id2=>2)], []]
    @o.associations[:children].map{|c1| c1.associations[:children].map{|c2| c2.associations[:children]}}.must_equal [[[@c.load(:id=>5, :id2=>7, :name=>'?', :parent_id=>3, :parent_id2=>4)]], []]
    @o.associations[:children].map{|c1| c1.associations[:children].map{|c2| c2.associations[:children].map{|c3| c3.associations[:children]}}}.must_equal [[[[]]], []]
  end
  
  it "should eagerly load ancestors" do
    @c.plugin :rcte_tree, :key=>[:parent_id, :parent_id2]
    @ds = @c.dataset = @c.dataset.with_fetch([[{:id=>2, :id2=>3, :parent_id=>1, :parent_id2=>2, :name=>'AA'}, {:id=>6, :id2=>7, :parent_id=>2, :parent_id2=>3, :name=>'C'}, {:id=>7, :id2=>8, :parent_id=>1, :parent_id2=>2, :name=>'D'}, {:id=>9, :id2=>10, :parent_id=>nil, :parent_id2=>nil, :name=>'E'}],
      [{:id=>2, :id2=>3, :name=>'AA', :parent_id=>1, :parent_id2=>2, :x_root_x_0=>2, :x_root_x_1=>3},
       {:id=>1, :id2=>2, :name=>'00', :parent_id=>8, :parent_id2=>9, :x_root_x_0=>1, :x_root_x_1=>2}, {:id=>1, :id2=>2, :name=>'00', :parent_id=>8, :parent_id2=>9, :x_root_x_0=>2, :x_root_x_1=>3},
       {:id=>8, :id2=>9, :name=>'?', :parent_id=>nil, :parent_id2=>nil, :x_root_x_0=>2, :x_root_x_1=>3}, {:id=>8, :id2=>9, :name=>'?', :parent_id=>nil, :parent_id2=>nil, :x_root_x_0=>1, :x_root_x_1=>2}]])
    os = @ds.eager(:ancestors).all
    @db.sqls.must_equal ["SELECT * FROM nodes",
      'WITH t AS (SELECT id AS x_root_x_0, id2 AS x_root_x_1, nodes.* FROM nodes WHERE ((id, id2) IN ((1, 2), (2, 3))) UNION ALL SELECT t.x_root_x_0, t.x_root_x_1, nodes.* FROM nodes INNER JOIN t ON ((t.parent_id = nodes.id) AND (t.parent_id2 = nodes.id2))) SELECT * FROM t AS nodes']
    os.must_equal [@c.load(:id=>2, :id2=>3, :parent_id=>1, :parent_id2=>2, :name=>'AA'), @c.load(:id=>6, :id2=>7, :parent_id=>2, :parent_id2=>3, :name=>'C'), @c.load(:id=>7, :id2=>8, :parent_id=>1, :parent_id2=>2, :name=>'D'), @c.load(:id=>9, :id2=>10, :parent_id=>nil, :parent_id2=>nil, :name=>'E')]
    os.map{|o| o.ancestors}.must_equal [[@c.load(:id=>1, :id2=>2, :name=>'00', :parent_id=>8, :parent_id2=>9), @c.load(:id=>8, :id2=>9, :name=>'?', :parent_id=>nil, :parent_id2=>nil)],
      [@c.load(:id=>2, :id2=>3, :name=>'AA', :parent_id=>1, :parent_id2=>2), @c.load(:id=>1, :id2=>2, :name=>'00', :parent_id=>8, :parent_id2=>9), @c.load(:id=>8, :id2=>9, :name=>'?', :parent_id=>nil, :parent_id2=>nil)],
      [@c.load(:id=>1, :id2=>2, :name=>'00', :parent_id=>8, :parent_id2=>9), @c.load(:id=>8, :id2=>9, :name=>'?', :parent_id=>nil, :parent_id2=>nil)],
      []]
    os.map{|o| o.parent}.must_equal [@c.load(:id=>1, :id2=>2, :name=>'00', :parent_id=>8, :parent_id2=>9), @c.load(:id=>2, :id2=>3, :name=>'AA', :parent_id=>1, :parent_id2=>2), @c.load(:id=>1, :id2=>2, :name=>'00', :parent_id=>8, :parent_id2=>9), nil]
    os.map{|o| o.parent.parent if o.parent}.must_equal [@c.load(:id=>8, :id2=>9, :name=>'?', :parent_id=>nil, :parent_id2=>nil), @c.load(:id=>1, :id2=>2, :name=>'00', :parent_id=>8, :parent_id2=>9), @c.load(:id=>8, :id2=>9, :name=>'?', :parent_id=>nil, :parent_id2=>nil), nil]
    os.map{|o| o.parent.parent.parent if o.parent and o.parent.parent}.must_equal [nil, @c.load(:id=>8, :id2=>9, :name=>'?', :parent_id=>nil, :parent_id2=>nil), nil, nil]
    os.map{|o| o.parent.parent.parent.parent if o.parent and o.parent.parent and o.parent.parent.parent}.must_equal [nil, nil, nil, nil]
    @db.sqls.must_equal []
  end
  
  it "should eagerly load descendants" do
    @c.plugin :rcte_tree, :key=>[:parent_id, :parent_id2]
    @ds = @c.dataset = @c.dataset.with_fetch([[{:id=>2, :id2=>3, :parent_id=>1, :parent_id2=>2, :name=>'AA'}, {:id=>6, :id2=>7, :parent_id=>2, :parent_id2=>3, :name=>'C'}, {:id=>7, :id2=>8, :parent_id=>1, :parent_id2=>2, :name=>'D'}],
      [{:id=>6, :id2=>7, :parent_id=>2, :parent_id2=>3, :name=>'C', :x_root_x_0=>2, :x_root_x_1=>3}, {:id=>9, :id2=>10, :parent_id=>2, :parent_id2=>3, :name=>'E', :x_root_x_0=>2, :x_root_x_1=>3},
       {:id=>3, :id2=>4, :name=>'00', :parent_id=>6, :parent_id2=>7, :x_root_x_0=>6, :x_root_x_1=>7}, {:id=>3, :id2=>4, :name=>'00', :parent_id=>6, :parent_id2=>7, :x_root_x_0=>2, :x_root_x_1=>3},
       {:id=>4, :id2=>5, :name=>'?', :parent_id=>7, :parent_id2=>8, :x_root_x_0=>7, :x_root_x_1=>8}, {:id=>5, :id2=>6, :name=>'?', :parent_id=>4, :parent_id2=>5, :x_root_x_0=>7, :x_root_x_1=>8}]])
    os = @ds.eager(:descendants).all
    @db.sqls.must_equal ["SELECT * FROM nodes",
      'WITH t AS (SELECT parent_id AS x_root_x_0, parent_id2 AS x_root_x_1, nodes.* FROM nodes WHERE ((parent_id, parent_id2) IN ((2, 3), (6, 7), (7, 8))) UNION ALL SELECT t.x_root_x_0, t.x_root_x_1, nodes.* FROM nodes INNER JOIN t ON ((t.id = nodes.parent_id) AND (t.id2 = nodes.parent_id2))) SELECT * FROM t AS nodes']
    os.must_equal [@c.load(:id=>2, :id2=>3, :parent_id=>1, :parent_id2=>2, :name=>'AA'), @c.load(:id=>6, :id2=>7, :parent_id=>2, :parent_id2=>3, :name=>'C'), @c.load(:id=>7, :id2=>8, :parent_id=>1, :parent_id2=>2, :name=>'D')]
    os.map{|o| o.descendants}.must_equal [[@c.load(:id=>6, :id2=>7, :parent_id=>2, :parent_id2=>3, :name=>'C'), @c.load(:id=>9, :id2=>10, :parent_id=>2, :parent_id2=>3, :name=>'E'), @c.load(:id=>3, :id2=>4, :name=>'00', :parent_id=>6, :parent_id2=>7)],
      [@c.load(:id=>3, :id2=>4, :name=>'00', :parent_id=>6, :parent_id2=>7)],
      [@c.load(:id=>4, :id2=>5, :name=>'?', :parent_id=>7, :parent_id2=>8), @c.load(:id=>5, :id2=>6, :name=>'?', :parent_id=>4, :parent_id2=>5)]]
    os.map{|o| o.children}.must_equal [[@c.load(:id=>6, :id2=>7, :parent_id=>2, :parent_id2=>3, :name=>'C'), @c.load(:id=>9, :id2=>10, :parent_id=>2, :parent_id2=>3, :name=>'E')], [@c.load(:id=>3, :id2=>4, :name=>'00', :parent_id=>6, :parent_id2=>7)], [@c.load(:id=>4, :id2=>5, :name=>'?', :parent_id=>7, :parent_id2=>8)]]
    os.map{|o1| o1.children.map{|o2| o2.children}}.must_equal [[[@c.load(:id=>3, :id2=>4, :name=>'00', :parent_id=>6, :parent_id2=>7)], []], [[]], [[@c.load(:id=>5, :id2=>6, :name=>'?', :parent_id=>4, :parent_id2=>5)]]]
    os.map{|o1| o1.children.map{|o2| o2.children.map{|o3| o3.children}}}.must_equal [[[[]], []], [[]], [[[]]]]
    @db.sqls.must_equal []
  end
  
  it "should eagerly load descendants to a given level" do
    @c.plugin :rcte_tree, :key=>[:parent_id, :parent_id2]
    @ds = @c.dataset = @c.dataset.with_fetch([[{:id=>2, :id2=>3, :parent_id=>1, :parent_id2=>2, :name=>'AA'}, {:id=>6, :id2=>7, :parent_id=>2, :parent_id2=>3, :name=>'C'}, {:id=>7, :id2=>8, :parent_id=>1, :parent_id2=>2, :name=>'D'}],
      [{:id=>6, :id2=>7, :parent_id=>2, :parent_id2=>3, :name=>'C', :x_root_x_0=>2, :x_root_x_1=>3, :x_level_x=>0}, {:id=>9, :id2=>10, :parent_id=>2, :parent_id2=>3, :name=>'E', :x_root_x_0=>2, :x_root_x_1=>3, :x_level_x=>0},
       {:id=>3, :id2=>4, :name=>'00', :parent_id=>6, :parent_id2=>7, :x_root_x_0=>6, :x_root_x_1=>7, :x_level_x=>0}, {:id=>3, :id2=>4, :name=>'00', :parent_id=>6, :parent_id2=>7, :x_root_x_0=>2, :x_root_x_1=>3, :x_level_x=>1},
       {:id=>4, :id2=>5, :name=>'?', :parent_id=>7, :parent_id2=>8, :x_root_x_0=>7, :x_root_x_1=>8, :x_level_x=>0}, {:id=>5, :id2=>6, :name=>'?', :parent_id=>4, :parent_id2=>5, :x_root_x_0=>7, :x_root_x_1=>8, :x_level_x=>1}]])
    os = @ds.eager(:descendants=>2).all
    @db.sqls.must_equal ["SELECT * FROM nodes",
      'WITH t AS (SELECT parent_id AS x_root_x_0, parent_id2 AS x_root_x_1, nodes.*, CAST(0 AS integer) AS x_level_x FROM nodes WHERE ((parent_id, parent_id2) IN ((2, 3), (6, 7), (7, 8))) UNION ALL SELECT t.x_root_x_0, t.x_root_x_1, nodes.*, (t.x_level_x + 1) AS x_level_x FROM nodes INNER JOIN t ON ((t.id = nodes.parent_id) AND (t.id2 = nodes.parent_id2)) WHERE (t.x_level_x < 1)) SELECT * FROM t AS nodes']
    os.must_equal [@c.load(:id=>2, :id2=>3, :parent_id=>1, :parent_id2=>2, :name=>'AA'), @c.load(:id=>6, :id2=>7, :parent_id=>2, :parent_id2=>3, :name=>'C'), @c.load(:id=>7, :id2=>8, :parent_id=>1, :parent_id2=>2, :name=>'D')]
    os.map{|o| o.descendants}.must_equal [[@c.load(:id=>6, :id2=>7, :parent_id=>2, :parent_id2=>3, :name=>'C'), @c.load(:id=>9, :id2=>10, :parent_id=>2, :parent_id2=>3, :name=>'E'), @c.load(:id=>3, :id2=>4, :name=>'00', :parent_id=>6, :parent_id2=>7)],
      [@c.load(:id=>3, :id2=>4, :name=>'00', :parent_id=>6, :parent_id2=>7)],
      [@c.load(:id=>4, :id2=>5, :name=>'?', :parent_id=>7, :parent_id2=>8), @c.load(:id=>5, :id2=>6, :name=>'?', :parent_id=>4, :parent_id2=>5)]]
    os.map{|o| o.associations[:children]}.must_equal [[@c.load(:id=>6, :id2=>7, :parent_id=>2, :parent_id2=>3, :name=>'C'), @c.load(:id=>9, :id2=>10, :parent_id=>2, :parent_id2=>3, :name=>'E')], [@c.load(:id=>3, :id2=>4, :name=>'00', :parent_id=>6, :parent_id2=>7)], [@c.load(:id=>4, :id2=>5, :name=>'?', :parent_id=>7, :parent_id2=>8)]]
    os.map{|o1| o1.associations[:children].map{|o2| o2.associations[:children]}}.must_equal [[[@c.load(:id=>3, :id2=>4, :name=>'00', :parent_id=>6, :parent_id2=>7)], []], [[]], [[@c.load(:id=>5, :id2=>6, :name=>'?', :parent_id=>4, :parent_id2=>5)]]]
    os.map{|o1| o1.associations[:children].map{|o2| o2.associations[:children].map{|o3| o3.associations[:children]}}}.must_equal [[[[]], []], [[]], [[nil]]]
    @db.sqls.must_equal []
  end
end
