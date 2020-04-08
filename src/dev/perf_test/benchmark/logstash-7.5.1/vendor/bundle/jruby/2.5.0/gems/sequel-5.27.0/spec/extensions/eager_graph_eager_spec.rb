require_relative "spec_helper"

describe "eager_graph_eager plugin" do
  before do
    @c = Class.new(Sequel::Model(:items))
    @c.columns :id, :parent_id
    @c.plugin :eager_graph_eager
    @c.one_to_many :children, :class=>@c, :key=>:parent_id
    @c.many_to_one :parent, :class=>@c
    @c.db.sqls
  end

  it "should support Dataset#eager_graph_eager for eager loading dependencies of eager_graph associations for one_to_many associations" do
    a = @c.eager_graph(:children).
      with_fetch([{:id=>1, :parent_id=>nil, :children_id=>3, :children_parent_id=>1}, {:id=>2, :parent_id=>nil}]).
      eager_graph_eager([:children], :children=>proc{|ds| ds.with_fetch(:id=>4, :parent_id=>3)}).
      all
    @c.db.sqls.must_equal ["SELECT items.id, items.parent_id, children.id AS children_id, children.parent_id AS children_parent_id FROM items LEFT OUTER JOIN items AS children ON (children.parent_id = items.id)",
      "SELECT * FROM items WHERE (items.parent_id IN (3))"]

    a.must_equal [@c.load(:id=>1, :parent_id=>nil), @c.load(:id=>2, :parent_id=>nil)]
    a.map(&:children).must_equal [[@c.load(:id=>3, :parent_id=>1)], []]
    a.first.children.first.children.must_equal [@c.load(:id=>4, :parent_id=>3)]
    @c.db.sqls.must_equal []
  end

  it "should support Dataset#eager_graph_eager for eager loading dependencies of eager_graph associations for many_to_one associations" do
    a = @c.eager_graph(:parent).
      with_fetch([{:id=>4, :parent_id=>3, :parent_id_0=>3, :parent_parent_id=>1}, {:id=>2, :parent_id=>nil}]).
      eager_graph_eager([:parent], :parent=>proc{|ds| ds.with_fetch(:id=>1, :parent_id=>nil)}).
      all
    @c.db.sqls.must_equal ["SELECT items.id, items.parent_id, parent.id AS parent_id_0, parent.parent_id AS parent_parent_id FROM items LEFT OUTER JOIN items AS parent ON (parent.id = items.parent_id)",
      "SELECT * FROM items WHERE (items.id IN (1))"]

    a.must_equal [@c.load(:id=>4, :parent_id=>3), @c.load(:id=>2, :parent_id=>nil)]
    a.map(&:parent).must_equal [@c.load(:id=>3, :parent_id=>1), nil]
    a.first.parent.parent.must_equal @c.load(:id=>1, :parent_id=>nil)
    @c.db.sqls.must_equal []
  end

  it "should support multiple entries in dependency chain" do
    a = @c.eager_graph(:children=>:children).
      with_fetch([{:id=>1, :parent_id=>nil, :children_id=>3, :children_parent_id=>1, :children_0_id=>4, :children_0_parent_id=>3}, {:id=>2, :parent_id=>nil}]).
      eager_graph_eager([:children, :children], :children=>proc{|ds| ds.with_fetch(:id=>5, :parent_id=>4)}).
      all
    @c.db.sqls.must_equal ["SELECT items.id, items.parent_id, children.id AS children_id, children.parent_id AS children_parent_id, children_0.id AS children_0_id, children_0.parent_id AS children_0_parent_id FROM items LEFT OUTER JOIN items AS children ON (children.parent_id = items.id) LEFT OUTER JOIN items AS children_0 ON (children_0.parent_id = children.id)",
      "SELECT * FROM items WHERE (items.parent_id IN (4))"]

    a.must_equal [@c.load(:id=>1, :parent_id=>nil), @c.load(:id=>2, :parent_id=>nil)]
    a.map(&:children).must_equal [[@c.load(:id=>3, :parent_id=>1)], []]
    a.first.children.first.children.must_equal [@c.load(:id=>4, :parent_id=>3)]
    a.first.children.first.children.first.children.must_equal [@c.load(:id=>5, :parent_id=>4)]
    @c.db.sqls.must_equal []
  end

  it "should support multiple dependency chains" do
    a = @c.eager_graph(:children, :parent).
      with_fetch([{:id=>4, :parent_id=>3, :children_id=>5, :children_parent_id=>4, :parent_id_0=>3, :parent_parent_id=>1}, {:id=>2, :parent_id=>nil}]).
      eager_graph_eager([:children], :children=>proc{|ds| ds.with_fetch(:id=>6, :parent_id=>5)}).
      eager_graph_eager([:parent], :parent=>proc{|ds| ds.with_fetch(:id=>1, :parent_id=>nil)}).
      all
    @c.db.sqls.must_equal ["SELECT items.id, items.parent_id, children.id AS children_id, children.parent_id AS children_parent_id, parent.id AS parent_id_0, parent.parent_id AS parent_parent_id FROM items LEFT OUTER JOIN items AS children ON (children.parent_id = items.id) LEFT OUTER JOIN items AS parent ON (parent.id = items.parent_id)",
      "SELECT * FROM items WHERE (items.parent_id IN (5))",
      "SELECT * FROM items WHERE (items.id IN (1))"]

    a.must_equal [@c.load(:id=>4, :parent_id=>3), @c.load(:id=>2, :parent_id=>nil)]
    a.map(&:children).must_equal [[@c.load(:id=>5, :parent_id=>4)], []]
    a.map(&:parent).must_equal [@c.load(:id=>3, :parent_id=>1), nil]
    a.first.children.first.children.must_equal [@c.load(:id=>6, :parent_id=>5)]
    a.first.parent.parent.must_equal @c.load(:id=>1, :parent_id=>nil)
    @c.db.sqls.must_equal []
  end

  it "should raise for invalid dependency chains" do
    proc{@c.dataset.eager_graph_eager([], :children)}.must_raise Sequel::Error
    proc{@c.dataset.eager_graph_eager(:children, :children)}.must_raise Sequel::Error
    proc{@c.dataset.eager_graph_eager(['foo'], :children)}.must_raise Sequel::Error
    proc{@c.dataset.eager_graph_eager([:foo], :children)}.must_raise Sequel::Error
  end

  it "should handle cases where not all associated objects are unique" do
    a = @c.eager_graph(:parent=>:children).
      with_fetch([
        {:id=>4, :parent_id=>3, :parent_id_0=>3, :parent_parent_id=>1, :children_id=>4, :children_parent_id=>3},
        {:id=>5, :parent_id=>3, :parent_id_0=>3, :parent_parent_id=>1, :children_id=>4, :children_parent_id=>3},
        {:id=>4, :parent_id=>3, :parent_id_0=>3, :parent_parent_id=>1, :children_id=>5, :children_parent_id=>3},
        {:id=>5, :parent_id=>3, :parent_id_0=>3, :parent_parent_id=>1, :children_id=>5, :children_parent_id=>3}
      ]).
      eager_graph_eager([:parent], :parent=>proc{|ds| ds.with_fetch(:id=>1, :parent_id=>nil)}).
      all
    @c.db.sqls.must_equal ["SELECT items.id, items.parent_id, parent.id AS parent_id_0, parent.parent_id AS parent_parent_id, children.id AS children_id, children.parent_id AS children_parent_id FROM items LEFT OUTER JOIN items AS parent ON (parent.id = items.parent_id) LEFT OUTER JOIN items AS children ON (children.parent_id = parent.id)",
      "SELECT * FROM items WHERE (items.id IN (1))"]

    a.must_equal [@c.load(:id=>4, :parent_id=>3), @c.load(:id=>5, :parent_id=>3)]
    a.map(&:parent).must_equal [@c.load(:id=>3, :parent_id=>1), @c.load(:id=>3, :parent_id=>1)]
    a.map(&:parent).map(&:children).must_equal [a, a]
    a.map(&:parent).map(&:parent).must_equal [@c.load(:id=>1, :parent_id=>nil), @c.load(:id=>1, :parent_id=>nil)]
    @c.db.sqls.must_equal []
  end
end
