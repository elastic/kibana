require_relative "spec_helper"

describe "Sequel::Plugins::EagerEach" do
  before do
    @c = Class.new(Sequel::Model(:items))
    @c.columns :id, :parent_id
    @c.plugin :eager_each
    @c.one_to_many :children, :class=>@c, :key=>:parent_id
    @c.db.sqls
  end

  it "should make #each on an eager dataset do eager loading" do
    a = []
    ds = @c.eager(:children).with_fetch([{:id=>1, :parent_id=>nil}, {:id=>2, :parent_id=>nil}])
    @c.dataset = @c.dataset.with_fetch([{:id=>3, :parent_id=>1}, {:id=>4, :parent_id=>1}, {:id=>5, :parent_id=>2}, {:id=>6, :parent_id=>2}])
    ds.each{|c| a << c}
    a.must_equal [@c.load(:id=>1, :parent_id=>nil), @c.load(:id=>2, :parent_id=>nil)]
    a.map{|c| c.associations[:children]}.must_equal [[@c.load(:id=>3, :parent_id=>1), @c.load(:id=>4, :parent_id=>1)], [@c.load(:id=>5, :parent_id=>2), @c.load(:id=>6, :parent_id=>2)]]
    sqls = @c.db.sqls
    sqls.shift.must_equal 'SELECT * FROM items'
    ['SELECT * FROM items WHERE (items.parent_id IN (1, 2))', 
     'SELECT * FROM items WHERE (items.parent_id IN (2, 1))'].must_include(sqls.pop)
  end

  it "should make #each on an eager_graph dataset do eager loading" do
    a = []
    ds = @c.eager_graph(:children).with_fetch([{:id=>1, :parent_id=>nil, :children_id=>3, :children_parent_id=>1}, {:id=>1, :parent_id=>nil, :children_id=>4, :children_parent_id=>1}, {:id=>2, :parent_id=>nil, :children_id=>5, :children_parent_id=>2}, {:id=>2, :parent_id=>nil, :children_id=>6, :children_parent_id=>2}])
    ds.each{|c| a << c}
    a.must_equal [@c.load(:id=>1, :parent_id=>nil), @c.load(:id=>2, :parent_id=>nil)]
    a.map{|c| c.associations[:children]}.must_equal [[@c.load(:id=>3, :parent_id=>1), @c.load(:id=>4, :parent_id=>1)], [@c.load(:id=>5, :parent_id=>2), @c.load(:id=>6, :parent_id=>2)]]
    @c.db.sqls.must_equal ['SELECT items.id, items.parent_id, children.id AS children_id, children.parent_id AS children_parent_id FROM items LEFT OUTER JOIN items AS children ON (children.parent_id = items.id)']
  end

  it "should make #first on an eager dataset do eager loading" do
    ds = @c.eager(:children).with_fetch([{:id=>1, :parent_id=>nil}])
    @c.dataset = @c.dataset.with_fetch([{:id=>3, :parent_id=>1}, {:id=>4, :parent_id=>1}])
    a = ds.first
    a.values.must_equal(:id=>1, :parent_id=>nil)
    a.associations[:children].must_equal [@c.load(:id=>3, :parent_id=>1), @c.load(:id=>4, :parent_id=>1)]
    @c.db.sqls.must_equal ['SELECT * FROM items LIMIT 1','SELECT * FROM items WHERE (items.parent_id IN (1))'] 
  end

  it "should make #first on an eager_graph dataset do eager loading" do
    a = @c.eager_graph(:children).with_fetch([[{:id=>1, :parent_id=>nil, :children_id=>3, :children_parent_id=>1}], [{:id=>1, :parent_id=>nil, :children_id=>3, :children_parent_id=>1}, {:id=>1, :parent_id=>nil, :children_id=>4, :children_parent_id=>1}]]).first
    a.values.must_equal(:id=>1, :parent_id=>nil)
    a.associations[:children].must_equal [@c.load(:id=>3, :parent_id=>1), @c.load(:id=>4, :parent_id=>1)]
    @c.db.sqls.must_equal ['SELECT items.id, items.parent_id, children.id AS children_id, children.parent_id AS children_parent_id FROM items LEFT OUTER JOIN items AS children ON (children.parent_id = items.id) LIMIT 1',
      'SELECT items.id, items.parent_id, children.id AS children_id, children.parent_id AS children_parent_id FROM items LEFT OUTER JOIN items AS children ON (children.parent_id = items.id) WHERE (items.id = 1)']
  end

  it "should make #first on a non-eager dataset work correctly" do
    @c.dataset.with_fetch([{:id=>1, :parent_id=>nil}]).first.must_equal @c.load(:id=>1, :parent_id=>nil)
  end

  it "should get columns normally columns" do
    @c.dataset.columns!.must_equal [:id, :parent_id]
  end

  it "should not attempt to eager load when getting the columns" do
    @c.eager(:children).with_extend{def all; raise; end}.columns!.must_equal [:id, :parent_id]
  end
end
