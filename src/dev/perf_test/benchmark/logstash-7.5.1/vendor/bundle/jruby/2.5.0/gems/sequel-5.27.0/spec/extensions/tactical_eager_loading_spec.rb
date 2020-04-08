require_relative "spec_helper"

describe "tactical_eager_loading plugin" do
  def sql_match(*args)
    sqls = DB.sqls
    sqls.length.must_equal args.length
    sqls.zip(args).each do |is, should|
      if should.is_a?(Regexp)
        is.must_match should
      else
        is.must_equal should
      end
    end
  end
  
  attr_reader :ts

  before do
    class ::TacticalEagerLoadingModel < Sequel::Model(:t)
      plugin :tactical_eager_loading
      columns :id, :parent_id
      many_to_one :parent, :class=>self
      one_to_many :children, :class=>self, :key=>:parent_id
      set_dataset dataset.with_fetch(proc do |sql|
        if sql !~ /WHERE/
          [{:id=>1, :parent_id=>101}, {:id=>2, :parent_id=>102}, {:id=>101, :parent_id=>nil}, {:id=>102, :parent_id=>nil}]
        elsif sql =~ /WHERE.*\bid = (\d+)/
          [{:id=>$1.to_i, :parent_id=>nil}]
        elsif sql =~ /WHERE.*\bid IN \(([\d, ]*)\)/
          $1.split(', ').map{|x| {:id=>x.to_i, :parent_id=>nil}}
        elsif sql =~ /WHERE.*\bparent_id = (\d+)/
           {:id=>$1.to_i - 100, :parent_id=>$1.to_i} if $1.to_i > 100
        elsif sql =~ /WHERE.*\bparent_id IN \(([\d, ]*)\)/
          $1.split(', ').map{|x| {:id=>x.to_i - 100, :parent_id=>x.to_i} if x.to_i > 100}.compact
        end
      end)
    end
    @c = ::TacticalEagerLoadingModel
    @ds = TacticalEagerLoadingModel.dataset
    DB.reset
    @ts = @c.all
    sql_match('SELECT * FROM t')
  end
  after do
    Object.send(:remove_const, :TacticalEagerLoadingModel)
    sql_match
  end

  it "Dataset#all should set the retrieved_by and retrieved_with attributes" do
    ts.map{|x| [x.retrieved_by, x.retrieved_with]}.must_equal [[@ds,ts], [@ds,ts], [@ds,ts], [@ds,ts]]
  end

  it "Dataset#all shouldn't raise an error if a Sequel::Model instance is not returned" do
    @c.naked.all
    sql_match('SELECT * FROM t')
  end

  it "association getter methods should eagerly load the association if the association isn't cached" do
    ts.map{|x| x.parent}.must_equal [ts[2], ts[3], nil, nil]
    sql_match(/\ASELECT \* FROM t WHERE \(t\.id IN \(10[12], 10[12]\)\)\z/)
    ts.map{|x| x.children}.must_equal [[], [], [ts[0]], [ts[1]]]
    sql_match(/\ASELECT \* FROM t WHERE \(t\.parent_id IN/)
  end

  it "association getter methods should not eagerly load the association if the association is cached" do
    ts.map{|x| x.parent}.must_equal [ts[2], ts[3], nil, nil]
    sql_match(/\ASELECT \* FROM t WHERE \(t\.id IN \(10[12], 10[12]\)\)\z/)
    @c.dataset = @c.dataset.with_extend{def eager_load(*) raise end}
    ts.map{|x| x.parent}.must_equal [ts[2], ts[3], nil, nil]
  end

  it "association getter methods should not eagerly load the association if a block is given" do
    ts.map{|x| x.parent{|ds| ds}}.must_equal [ts[2], ts[3], nil, nil]
    sql_match('SELECT * FROM t WHERE (t.id = 101) LIMIT 1', 'SELECT * FROM t WHERE (t.id = 102) LIMIT 1')
  end

  it "association getter methods should not eagerly load the association if a callback proc is given" do
    ts.map{|x| x.parent(:callback=>proc{|ds| ds})}.must_equal [ts[2], ts[3], nil, nil]
    sql_match('SELECT * FROM t WHERE (t.id = 101) LIMIT 1', 'SELECT * FROM t WHERE (t.id = 102) LIMIT 1')
  end

  it "association getter methods should not eagerly load the association if :reload=>true is passed" do
    ts.map{|x| x.parent(:reload=>true)}.must_equal [ts[2], ts[3], nil, nil]
    sql_match('SELECT * FROM t WHERE id = 101', 'SELECT * FROM t WHERE id = 102')
  end

  it "association getter methods should eagerly reload the association if :eager_reload=>true is passed" do
    ts.first.parent(:reload=>true)
    sql_match('SELECT * FROM t WHERE id = 101')
    ts.map{|x| x.associations.fetch(:parent, 1)}.must_equal [ts[2], 1, 1, 1]
    ts.first.parent(:eager_reload=>true)
    sql_match(/\ASELECT \* FROM t WHERE \(t\.id IN \(10[12], 10[12]\)\)\z/)
    ts.map{|x| x.associations.fetch(:parent, 1)}.must_equal [ts[2], ts[3], nil, nil]
  end

  it "association getter methods should support eagerly loading dependent associations via :eager" do
    parents = ts.map{|x| x.parent(:eager=>:children)}
    sql_match(/\ASELECT \* FROM t WHERE \(t\.id IN \(10[12], 10[12]\)\)\z/, /\ASELECT \* FROM t WHERE \(t\.parent_id IN/)
    parents.must_equal [ts[2], ts[3], nil, nil]
    parents[0..1].map{|x| x.children}.must_equal [[ts[0]], [ts[1]]]
  end

  it "association getter methods should support eager callbacks via :eager" do
    parents = ts.map{|x| x.parent(:eager=>proc{|ds| ds.where{name > 'M'}.eager(:children)})}
    sql_match(/\ASELECT \* FROM t WHERE \(\(t\.id IN \(10[12], 10[12]\)\) AND \(name > 'M'\)\)\z/, /\ASELECT \* FROM t WHERE \(t\.parent_id IN/)
    parents.must_equal [ts[2], ts[3], nil, nil]
    parents[0..1].map{|x| x.children}.must_equal [[ts[0]], [ts[1]]]
  end

  it "should not eager load when association uses :allow_eager=>false option" do
    @c.many_to_one :parent, :clone=>:parent, :allow_eager=>false
    @c.one_to_many :children, :clone=>:children, :allow_eager=>false
    ts.map{|x| x.parent}.must_equal [ts[2], ts[3], nil, nil]
    sql_match('SELECT * FROM t WHERE id = 101', 'SELECT * FROM t WHERE id = 102')
    ts.map{|x| x.children}.must_equal [[], [], [ts[0]], [ts[1]]]
    sql_match('SELECT * FROM t WHERE (t.parent_id = 1)', 'SELECT * FROM t WHERE (t.parent_id = 2)', 'SELECT * FROM t WHERE (t.parent_id = 101)', 'SELECT * FROM t WHERE (t.parent_id = 102)')
  end

  it "should handle case where an association is valid on an instance, but not on all instances" do
    c = Class.new(@c)
    c.many_to_one :parent2, :class=>@c, :key=>:parent_id
    @c.dataset.with_row_proc(proc{|r| (r[:parent_id] == 101 ? c : @c).call(r)}).all{|x| x.parent2 if x.is_a?(c)}
    sql_match('SELECT * FROM t', 'SELECT * FROM t WHERE id = 101')
  end

  it "association getter methods should not eagerly load the association if an instance is frozen" do
    ts.first.freeze
    ts.map{|x| x.parent}.must_equal [ts[2], ts[3], nil, nil]
    sql_match('SELECT * FROM t WHERE id = 101', 'SELECT * FROM t WHERE (t.id IN (102))')
    ts.map{|x| x.children}.must_equal [[], [], [ts[0]], [ts[1]]]
    sql_match('SELECT * FROM t WHERE (t.parent_id = 1)', /\ASELECT \* FROM t WHERE \(t\.parent_id IN/)
    ts.map{|x| x.parent}.must_equal [ts[2], ts[3], nil, nil]
    sql_match('SELECT * FROM t WHERE id = 101')
    ts.map{|x| x.children}.must_equal [[], [], [ts[0]], [ts[1]]]
    sql_match('SELECT * FROM t WHERE (t.parent_id = 1)')
  end

  it "#marshallable should make marshalling not fail" do
    Marshal.dump(ts.map{|x| x.marshallable!})
  end
end

describe "tactical_eager_loading plugin eager_graph_support" do
  before do
    @c = Class.new(Sequel::Model)
    @c.class_eval do
      set_dataset DB[:t]
      columns :id, :parent_id
      plugin :tactical_eager_loading
      many_to_one :parent, :class=>self
      one_to_many :children, :class=>self, :key=>:parent_id
    end
    DB.reset
  end

  it "should allow eager loading of associated objects from one_to_many associated objects retrieved via eager_graph" do
    a = @c.eager_graph(:children).
      with_fetch([
        {:id=>1, :parent_id=>nil, :children_id=>3, :children_parent_id=>1},
        {:id=>1, :parent_id=>nil, :children_id=>4, :children_parent_id=>1},
        {:id=>2, :parent_id=>nil, :children_id=>5, :children_parent_id=>2}
      ]).all
    @c.db.sqls.must_equal ["SELECT t.id, t.parent_id, children.id AS children_id, children.parent_id AS children_parent_id FROM t LEFT OUTER JOIN t AS children ON (children.parent_id = t.id)"]

    a.must_equal [@c.load(:id=>1, :parent_id=>nil), @c.load(:id=>2, :parent_id=>nil)]
    a.map(&:children).must_equal [
      [@c.load(:id=>3, :parent_id=>1),
       @c.load(:id=>4, :parent_id=>1)],
      [@c.load(:id=>5, :parent_id=>2)]]
    @c.db.sqls.must_equal []

    @c.dataset = @c.dataset.with_fetch([[{:id=>6, :parent_id=>3}, {:id=>7, :parent_id=>4}, {:id=>8, :parent_id=>5}],
      [{:id=>9, :parent_id=>6}, {:id=>10, :parent_id=>7}, {:id=>11, :parent_id=>8}]])

    a.map(&:children).map{|v| v.map(&:children)}.must_equal [
      [[@c.load(:id=>6, :parent_id=>3)],
       [@c.load(:id=>7, :parent_id=>4)]],
      [[@c.load(:id=>8, :parent_id=>5)]]]
    @c.db.sqls.must_equal ["SELECT * FROM t WHERE (t.parent_id IN (3, 4, 5))"]

    a.map(&:children).map{|v| v.map(&:children).map{|v1| v1.map(&:children)}}.must_equal [
      [[[@c.load(:id=>9, :parent_id=>6)]],
       [[@c.load(:id=>10, :parent_id=>7)]]],
      [[[@c.load(:id=>11, :parent_id=>8)]]]]
    @c.db.sqls.must_equal ["SELECT * FROM t WHERE (t.parent_id IN (6, 7, 8))"]
  end

  it "should allow eager loading of associated objects from many_to_one associated objects retrieved via eager_graph" do
    a = @c.eager_graph(:parent).
      with_fetch([
        {:id=>9, :parent_id=>6, :parent_id_0=>6, :parent_parent_id=>3},
        {:id=>10, :parent_id=>7, :parent_id_0=>7, :parent_parent_id=>4},
        {:id=>11, :parent_id=>8, :parent_id_0=>8, :parent_parent_id=>5}
      ]).all
    @c.db.sqls.must_equal ["SELECT t.id, t.parent_id, parent.id AS parent_id_0, parent.parent_id AS parent_parent_id FROM t LEFT OUTER JOIN t AS parent ON (parent.id = t.parent_id)"]

    a.must_equal [@c.load(:id=>9, :parent_id=>6), @c.load(:id=>10, :parent_id=>7), @c.load(:id=>11, :parent_id=>8)]
    a.map(&:parent).must_equal [@c.load(:id=>6, :parent_id=>3), @c.load(:id=>7, :parent_id=>4), @c.load(:id=>8, :parent_id=>5)]
    @c.db.sqls.must_equal []

    @c.dataset = @c.dataset.with_fetch([[{:id=>5, :parent_id=>2}, {:id=>4, :parent_id=>nil}, {:id=>3, :parent_id=>1}],
      [{:id=>2, :parent_id=>nil}, {:id=>1, :parent_id=>nil}]])

    a.map(&:parent).map(&:parent).must_equal [@c.load(:id=>3, :parent_id=>1), @c.load(:id=>4, :parent_id=>nil), @c.load(:id=>5, :parent_id=>2)]
    @c.db.sqls.must_equal ["SELECT * FROM t WHERE (t.id IN (3, 4, 5))"]
    a.map(&:parent).map(&:parent).map(&:parent).must_equal [@c.load(:id=>1, :parent_id=>nil), nil, @c.load(:id=>2, :parent_id=>nil)]
    @c.db.sqls.must_equal ["SELECT * FROM t WHERE (t.id IN (2, 1))"]
  end

  it "should allow eager loading of associated objects when using chained one_to_many associations" do
    a = @c.eager_graph(:children=>:children).
      with_fetch([
        {:id=>1, :parent_id=>nil, :children_id=>3, :children_parent_id=>1, :children_0_id=>6, :children_0_parent_id=>3},
        {:id=>1, :parent_id=>nil, :children_id=>4, :children_parent_id=>1, :children_0_id=>7, :children_0_parent_id=>4},
        {:id=>2, :parent_id=>nil, :children_id=>5, :children_parent_id=>2, :children_0_id=>8, :children_0_parent_id=>5}
      ]).all
    @c.db.sqls.must_equal ["SELECT t.id, t.parent_id, children.id AS children_id, children.parent_id AS children_parent_id, children_0.id AS children_0_id, children_0.parent_id AS children_0_parent_id FROM t LEFT OUTER JOIN t AS children ON (children.parent_id = t.id) LEFT OUTER JOIN t AS children_0 ON (children_0.parent_id = children.id)"]

    a.must_equal [@c.load(:id=>1, :parent_id=>nil), @c.load(:id=>2, :parent_id=>nil)]
    a.map(&:children).must_equal [
      [@c.load(:id=>3, :parent_id=>1),
       @c.load(:id=>4, :parent_id=>1)],
      [@c.load(:id=>5, :parent_id=>2)]]

    a.map(&:children).map{|v| v.map(&:children)}.must_equal [
      [[@c.load(:id=>6, :parent_id=>3)],
       [@c.load(:id=>7, :parent_id=>4)]],
      [[@c.load(:id=>8, :parent_id=>5)]]]
    @c.db.sqls.must_equal []

    @c.dataset = @c.dataset.with_fetch([{:id=>9, :parent_id=>6}, {:id=>10, :parent_id=>7}, {:id=>11, :parent_id=>8}])
    a.map(&:children).map{|v| v.map(&:children).map{|v1| v1.map(&:children)}}.must_equal [
      [[[@c.load(:id=>9, :parent_id=>6)]],
       [[@c.load(:id=>10, :parent_id=>7)]]],
      [[[@c.load(:id=>11, :parent_id=>8)]]]]
    @c.db.sqls.must_equal ["SELECT * FROM t WHERE (t.parent_id IN (6, 7, 8))"]
  end

  it "should allow eager loading of associated objects when using chained many_to_one associations" do
    a = @c.eager_graph(:parent=>:parent).
      with_fetch([
        {:id=>9, :parent_id=>6, :parent_id_0=>6, :parent_parent_id=>3, :parent_0_id=>3, :parent_0_parent_id=>1},
        {:id=>10, :parent_id=>7, :parent_id_0=>7, :parent_parent_id=>4, :parent_0_id=>4, :parent_0_parent_id=>1},
        {:id=>11, :parent_id=>8, :parent_id_0=>8, :parent_parent_id=>5, :parent_0_id=>5, :parent_0_parent_id=>2}
      ]).all
    @c.db.sqls.must_equal ["SELECT t.id, t.parent_id, parent.id AS parent_id_0, parent.parent_id AS parent_parent_id, parent_0.id AS parent_0_id, parent_0.parent_id AS parent_0_parent_id FROM t LEFT OUTER JOIN t AS parent ON (parent.id = t.parent_id) LEFT OUTER JOIN t AS parent_0 ON (parent_0.id = parent.parent_id)"]

    a.must_equal [@c.load(:id=>9, :parent_id=>6), @c.load(:id=>10, :parent_id=>7), @c.load(:id=>11, :parent_id=>8)]
    a.map(&:parent).must_equal [@c.load(:id=>6, :parent_id=>3), @c.load(:id=>7, :parent_id=>4), @c.load(:id=>8, :parent_id=>5)]
    a.map(&:parent).map(&:parent).must_equal [@c.load(:id=>3, :parent_id=>1), @c.load(:id=>4, :parent_id=>1), @c.load(:id=>5, :parent_id=>2)]
    @c.db.sqls.must_equal []

    @c.dataset = @c.dataset.with_fetch([{:id=>2, :parent_id=>nil}, {:id=>1, :parent_id=>nil}])
    a.map(&:parent).map(&:parent).map(&:parent).must_equal [@c.load(:id=>1, :parent_id=>nil), @c.load(:id=>1, :parent_id=>nil), @c.load(:id=>2, :parent_id=>nil)]
    @c.db.sqls.must_equal ["SELECT * FROM t WHERE (t.id IN (1, 2))"]
  end

  it "should allow eager loading of associated objects when using chained many_to_one=>one_to_many associations" do
    a = @c.eager_graph(:parent=>:children).
      with_fetch([
        {:id=>9, :parent_id=>6, :parent_id_0=>6, :parent_parent_id=>3, :children_id=>9, :children_parent_id=>6},
        {:id=>10, :parent_id=>7, :parent_id_0=>7, :parent_parent_id=>4, :children_id=>10, :children_parent_id=>7},
        {:id=>11, :parent_id=>8, :parent_id_0=>8, :parent_parent_id=>5, :children_id=>11, :children_parent_id=>8},
        {:id=>9, :parent_id=>6, :parent_id_0=>6, :parent_parent_id=>3, :children_id=>12, :children_parent_id=>6},
        {:id=>10, :parent_id=>7, :parent_id_0=>7, :parent_parent_id=>4, :children_id=>13, :children_parent_id=>7},
        {:id=>11, :parent_id=>8, :parent_id_0=>8, :parent_parent_id=>5, :children_id=>14, :children_parent_id=>8}
      ]).all
    @c.db.sqls.must_equal ["SELECT t.id, t.parent_id, parent.id AS parent_id_0, parent.parent_id AS parent_parent_id, children.id AS children_id, children.parent_id AS children_parent_id FROM t LEFT OUTER JOIN t AS parent ON (parent.id = t.parent_id) LEFT OUTER JOIN t AS children ON (children.parent_id = parent.id)"]

    a.must_equal [@c.load(:id=>9, :parent_id=>6), @c.load(:id=>10, :parent_id=>7), @c.load(:id=>11, :parent_id=>8)]
    a.map(&:parent).must_equal [@c.load(:id=>6, :parent_id=>3), @c.load(:id=>7, :parent_id=>4), @c.load(:id=>8, :parent_id=>5)]
    a.map(&:parent).map(&:children).must_equal [
      [@c.load(:id=>9, :parent_id=>6), @c.load(:id=>12, :parent_id=>6)],
      [@c.load(:id=>10, :parent_id=>7), @c.load(:id=>13, :parent_id=>7)],
      [@c.load(:id=>11, :parent_id=>8), @c.load(:id=>14, :parent_id=>8)]]
    @c.db.sqls.must_equal []

    @c.dataset = @c.dataset.with_fetch([{:id=>19, :parent_id=>9}, {:id=>24, :parent_id=>14}])
    a.map(&:parent).map(&:children).map{|v| v.map(&:children)}
    #.must_equal [
    #  [[@c.load(:id=>19, :parent_id=>9)], []],
    #  [[], []],
    #  [[], @c.load(:id=>24, :parent_id=>14)]]
    @c.db.sqls.must_equal ["SELECT * FROM t WHERE (t.parent_id IN (9, 10, 11, 12, 13, 14))"]
  end

  it "should allow eager loading of associated objects when using chained one_to_many associations with partial data" do
    a = @c.eager_graph(:children=>:children).
      with_fetch([
        {:id=>1, :parent_id=>nil, :children_id=>3, :children_parent_id=>1, :children_0_id=>6, :children_0_parent_id=>3},
        {:id=>1, :parent_id=>nil, :children_id=>4, :children_parent_id=>1, :children_0_id=>nil, :children_0_parent_id=>nil},
        {:id=>2, :parent_id=>nil, :children_id=>nil, :children_parent_id=>nil, :children_0_id=>nil, :children_0_parent_id=>nil}
      ]).all
    @c.db.sqls.must_equal ["SELECT t.id, t.parent_id, children.id AS children_id, children.parent_id AS children_parent_id, children_0.id AS children_0_id, children_0.parent_id AS children_0_parent_id FROM t LEFT OUTER JOIN t AS children ON (children.parent_id = t.id) LEFT OUTER JOIN t AS children_0 ON (children_0.parent_id = children.id)"]

    a.must_equal [@c.load(:id=>1, :parent_id=>nil), @c.load(:id=>2, :parent_id=>nil)]
    a.map(&:children).must_equal [
      [@c.load(:id=>3, :parent_id=>1),
       @c.load(:id=>4, :parent_id=>1)],
      []]

    a.map(&:children).map{|v| v.map(&:children)}.must_equal [
      [[@c.load(:id=>6, :parent_id=>3)],
       []],
      []]
    @c.db.sqls.must_equal []

    @c.dataset = @c.dataset.with_fetch([{:id=>9, :parent_id=>6}])
    a.map(&:children).map{|v| v.map(&:children).map{|v1| v1.map(&:children)}}.must_equal [
      [[[@c.load(:id=>9, :parent_id=>6)]],
       []],
      []]
    @c.db.sqls.must_equal ["SELECT * FROM t WHERE (t.parent_id IN (6))"]
  end

  it "should allow eager loading of associated objects when using chained many_to_one associations with partial data" do
    a = @c.eager_graph(:parent=>:parent).
      with_fetch([
        {:id=>9, :parent_id=>6, :parent_id_0=>6, :parent_parent_id=>3, :parent_0_id=>3, :parent_0_parent_id=>1},
        {:id=>10, :parent_id=>7, :parent_id_0=>7, :parent_parent_id=>nil, :parent_0_id=>nil, :parent_0_parent_id=>nil},
        {:id=>11, :parent_id=>nil, :parent_id_0=>nil, :parent_parent_id=>nil, :parent_0_id=>nil, :parent_0_parent_id=>nil}
      ]).all
    @c.db.sqls.must_equal ["SELECT t.id, t.parent_id, parent.id AS parent_id_0, parent.parent_id AS parent_parent_id, parent_0.id AS parent_0_id, parent_0.parent_id AS parent_0_parent_id FROM t LEFT OUTER JOIN t AS parent ON (parent.id = t.parent_id) LEFT OUTER JOIN t AS parent_0 ON (parent_0.id = parent.parent_id)"]

    a.must_equal [@c.load(:id=>9, :parent_id=>6), @c.load(:id=>10, :parent_id=>7), @c.load(:id=>11, :parent_id=>nil)]
    a.map(&:parent).must_equal [@c.load(:id=>6, :parent_id=>3), @c.load(:id=>7, :parent_id=>nil), nil]
    a.map(&:parent).map{|v| v.parent if v}.must_equal [@c.load(:id=>3, :parent_id=>1), nil, nil]
    @c.db.sqls.must_equal []

    @c.dataset = @c.dataset.with_fetch([{:id=>1, :parent_id=>nil}])
    a.map(&:parent).map{|v| v.parent.parent if v && v.parent}.must_equal [@c.load(:id=>1, :parent_id=>nil), nil, nil]
    @c.db.sqls.must_equal ["SELECT * FROM t WHERE (t.id IN (1))"]
  end

  it "should skip setup of eager loading when using eager_graph for association not using plugin" do
    c = Class.new(Sequel::Model)
    c.class_eval do
      set_dataset DB[:t]
      columns :id, :t_id
    end
    @c.many_to_one :f, :class=>c, :key=>:parent_id
    @c.one_to_many :fs, :class=>c
    c.many_to_one :t, :class=>@c
    c.one_to_many :ts, :class=>@c, :key=>:parent_id

    a = @c.eager_graph(:f, :parent, :fs=>:t).
      with_fetch([
        {:id=>5, :parent_id=>4, :f_id=>4, :t_id=>20, :parent_id_0=>4, :parent_parent_id=>3, :fs_id=>5, :fs_t_id=>30, :t_0_id=>30, :t_0_parent_id=>40},
        {:id=>15, :parent_id=>14, :f_id=>14, :t_id=>30, :parent_id_0=>14, :parent_parent_id=>13, :fs_id=>15, :fs_t_id=>40, :t_0_id=>40, :t_0_parent_id=>50},
      ]).
      all
    @c.db.sqls.must_equal ["SELECT t.id, t.parent_id, f.id AS f_id, f.t_id, parent.id AS parent_id_0, parent.parent_id AS parent_parent_id, fs.id AS fs_id, fs.t_id AS fs_t_id, t_0.id AS t_0_id, t_0.parent_id AS t_0_parent_id FROM t LEFT OUTER JOIN t AS f ON (f.id = t.parent_id) LEFT OUTER JOIN t AS parent ON (parent.id = t.parent_id) LEFT OUTER JOIN t AS fs ON (fs._id = t.id) LEFT OUTER JOIN t AS t_0 ON (t_0.id = fs.t_id)"]

    a.must_equal [@c.load(:id=>5, :parent_id=>4), @c.load(:id=>15, :parent_id=>14)]
    a.map(&:f).must_equal [c.load(:id=>4, :t_id=>20), c.load(:id=>14, :t_id=>30)]
    a.map(&:parent).must_equal [@c.load(:id=>4, :parent_id=>3), @c.load(:id=>14, :parent_id=>13)]
    a.map(&:fs).must_equal [[c.load(:id=>5, :t_id=>30)], [c.load(:id=>15, :t_id=>40)]]
    a.map(&:fs).map{|v| v.map(&:t)}.must_equal [[@c.load(:id=>30, :parent_id=>40)], [@c.load(:id=>40, :parent_id=>50)]]
    @c.db.sqls.must_equal []

    @c.dataset = @c.dataset.with_fetch([[{:id=>3, :parent_id=>1}, {:id=>13, :parent_id=>1}],
      [{:id=>1, :parent_id=>nil}],
      [{:id=>20, :parent_id=>nil}],
      [{:id=>30, :parent_id=>nil}],
      [{:id=>50, :parent_id=>nil}, {:id=>40, :parent_id=>nil}]
      ])
    a.map(&:parent).map(&:parent).must_equal [@c.load(:id=>3, :parent_id=>1), @c.load(:id=>13, :parent_id=>1)]
    @c.db.sqls.must_equal ["SELECT * FROM t WHERE (t.id IN (3, 13))"]
    a.map(&:parent).map(&:parent).map(&:parent).must_equal [@c.load(:id=>1, :parent_id=>nil), @c.load(:id=>1, :parent_id=>nil)]
    @c.db.sqls.must_equal ["SELECT * FROM t WHERE (t.id IN (1))"]

    a.map(&:f).map(&:t).must_equal [@c.load(:id=>20, :parent_id=>nil), @c.load(:id=>30, :parent_id=>nil)]
    @c.db.sqls.must_equal ["SELECT * FROM t WHERE id = 20", "SELECT * FROM t WHERE id = 30"]

    a.map(&:fs).map{|v| v.map(&:t).map(&:parent)}.must_equal [[@c.load(:id=>40, :parent_id=>nil)], [@c.load(:id=>50, :parent_id=>nil)]]
    @c.db.sqls.must_equal ["SELECT * FROM t WHERE (t.id IN (40, 50))"]
  end

  it "should skip frozen objects when eager loading for model objects" do
    a = @c.eager_graph(:parent).
      with_fetch([
        {:id=>9, :parent_id=>6, :parent_id_0=>6, :parent_parent_id=>3},
        {:id=>10, :parent_id=>7, :parent_id_0=>7, :parent_parent_id=>4},
        {:id=>11, :parent_id=>8, :parent_id_0=>8, :parent_parent_id=>5}
      ]).all
    @c.db.sqls.must_equal ["SELECT t.id, t.parent_id, parent.id AS parent_id_0, parent.parent_id AS parent_parent_id FROM t LEFT OUTER JOIN t AS parent ON (parent.id = t.parent_id)"]

    a.must_equal [@c.load(:id=>9, :parent_id=>6), @c.load(:id=>10, :parent_id=>7), @c.load(:id=>11, :parent_id=>8)]
    a.map(&:parent).must_equal [@c.load(:id=>6, :parent_id=>3), @c.load(:id=>7, :parent_id=>4), @c.load(:id=>8, :parent_id=>5)]
    @c.db.sqls.must_equal []

    @c.dataset = @c.dataset.with_fetch([[{:id=>3, :parent_id=>1}, {:id=>5, :parent_id=>2}], [{:id=>4, :parent_id=>nil}]])
    parents = a.map(&:parent)
    parents[1].freeze
    parents[0].parent.must_equal @c.load(:id=>3, :parent_id=>1)
    @c.db.sqls.must_equal ["SELECT * FROM t WHERE (t.id IN (3, 5))"]
    parents[1].parent.must_equal @c.load(:id=>4, :parent_id=>nil)
    @c.db.sqls.must_equal ["SELECT * FROM t WHERE id = 4"]
    parents[2].parent.must_equal @c.load(:id=>5, :parent_id=>2)
    @c.db.sqls.must_equal []
  end
end
