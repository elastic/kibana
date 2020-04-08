require_relative "spec_helper"

describe Sequel::Dataset, " graphing" do
  before do
    @db = Sequel.mock(:columns=>proc do |sql|
      case sql
      when /points/
        [:id, :x, :y]
      when /lines/
        [:id, :x, :y, :graph_id]
      else
        [:id, :name, :x, :y, :lines_x]
      end
    end).extension(:graph_each)
    @ds1 = @db.from(:points)
    @ds2 = @db.from(:lines)
    @ds3 = @db.from(:graphs)
    [@ds1, @ds2, @ds3].each{|ds| ds.columns}
    @db.sqls
  end

  it "#graph_each should handle graph using currently selected columns as the basis for the selected columns in a new graph" do
    @ds1.select(:id).graph(@ds2, :x=>:id).with_fetch(:id=>1, :lines_id=>2, :x=>3, :y=>4, :graph_id=>5).all.must_equal [{:points=>{:id=>1}, :lines=>{:id=>2, :x=>3, :y=>4, :graph_id=>5}}]

    @ds1.select(:id, :x).graph(@ds2, :x=>:id).with_fetch(:id=>1, :x=>-1, :lines_id=>2, :lines_x=>3, :y=>4, :graph_id=>5).all.must_equal [{:points=>{:id=>1, :x=>-1}, :lines=>{:id=>2, :x=>3, :y=>4, :graph_id=>5}}]

    @ds1.select(Sequel.identifier(:id), Sequel.qualify(:points, :x)).graph(@ds2, :x=>:id).with_fetch(:id=>1, :x=>-1, :lines_id=>2, :lines_x=>3, :y=>4, :graph_id=>5).all.must_equal [{:points=>{:id=>1, :x=>-1}, :lines=>{:id=>2, :x=>3, :y=>4, :graph_id=>5}}]

    @ds1.select(Sequel.identifier(:id).qualify(:points), Sequel.identifier(:x).as(:y)).graph(@ds2, :x=>:id).with_fetch(:id=>1, :y=>-1, :lines_id=>2, :x=>3, :lines_y=>4, :graph_id=>5).all.must_equal [{:points=>{:id=>1, :y=>-1}, :lines=>{:id=>2, :x=>3, :y=>4, :graph_id=>5}}]

    @ds1.select(:id, Sequel.identifier(:x).qualify(Sequel.identifier(:points)).as(Sequel.identifier(:y))).graph(@ds2, :x=>:id).with_fetch(:id=>1, :y=>-1, :lines_id=>2, :x=>3, :lines_y=>4, :graph_id=>5).all.must_equal [{:points=>{:id=>1, :y=>-1}, :lines=>{:id=>2, :x=>3, :y=>4, :graph_id=>5}}]
  end

  it "#graph_each should split the result set into component tables" do
    @db.fetch = [[{:id=>1,:x=>2,:y=>3,:lines_id=>4,:lines_x=>5,:lines_y=>6,:graph_id=>7}],
      [{:id=>1,:x=>2,:y=>3,:lines_id=>4,:lines_x=>5,:lines_y=>6,:graph_id=>7, :graphs_id=>8, :name=>9, :graphs_x=>10, :graphs_y=>11, :graphs_lines_x=>12}],
      [{:id=>1,:x=>2,:y=>3,:lines_id=>4,:lines_x=>5,:lines_y=>6,:graph_id=>7, :graph_id_0=>8, :graph_x=>9, :graph_y=>10, :graph_graph_id=>11}]]

    @ds1.graph(@ds2, :x=>:id).all.must_equal [{:points=>{:id=>1, :x=>2, :y=>3}, :lines=>{:id=>4, :x=>5, :y=>6, :graph_id=>7}}]
    @ds1.graph(@ds2, :x=>:id).graph(@ds3, :id=>:graph_id).all.must_equal [{:points=>{:id=>1, :x=>2, :y=>3}, :lines=>{:id=>4, :x=>5, :y=>6, :graph_id=>7}, :graphs=>{:id=>8, :name=>9, :x=>10, :y=>11, :lines_x=>12}}]
    @ds1.graph(@ds2, :x=>:id).graph(@ds2, {:y=>Sequel[:points][:id]}, :table_alias=>:graph).all.must_equal [{:points=>{:id=>1, :x=>2, :y=>3}, :lines=>{:id=>4, :x=>5, :y=>6, :graph_id=>7}, :graph=>{:id=>8, :x=>9, :y=>10, :graph_id=>11}}]
  end

  it "#graph_each should split the result set into component tables when using first" do
    @db.fetch = [[{:id=>1,:x=>2,:y=>3,:lines_id=>4,:lines_x=>5,:lines_y=>6,:graph_id=>7}],
      [{:id=>1,:x=>2,:y=>3,:lines_id=>4,:lines_x=>5,:lines_y=>6,:graph_id=>7, :graphs_id=>8, :name=>9, :graphs_x=>10, :graphs_y=>11, :graphs_lines_x=>12}],
      [{:id=>1,:x=>2,:y=>3,:lines_id=>4,:lines_x=>5,:lines_y=>6,:graph_id=>7, :graph_id_0=>8, :graph_x=>9, :graph_y=>10, :graph_graph_id=>11}]]

    @ds1.graph(@ds2, :x=>:id).first.must_equal(:points=>{:id=>1, :x=>2, :y=>3}, :lines=>{:id=>4, :x=>5, :y=>6, :graph_id=>7})
    @ds1.graph(@ds2, :x=>:id).graph(@ds3, :id=>:graph_id).first.must_equal(:points=>{:id=>1, :x=>2, :y=>3}, :lines=>{:id=>4, :x=>5, :y=>6, :graph_id=>7}, :graphs=>{:id=>8, :name=>9, :x=>10, :y=>11, :lines_x=>12})
    @ds1.graph(@ds2, :x=>:id).graph(@ds2, {:y=>Sequel[:points][:id]}, :table_alias=>:graph).first.must_equal(:points=>{:id=>1, :x=>2, :y=>3}, :lines=>{:id=>4, :x=>5, :y=>6, :graph_id=>7}, :graph=>{:id=>8, :x=>9, :y=>10, :graph_id=>11})
  end

  it "#graph_each should give a nil value instead of a hash when all values for a table are nil" do
    @db.fetch = [[{:id=>1,:x=>2,:y=>3,:lines_id=>nil,:lines_x=>nil,:lines_y=>nil,:graph_id=>nil}],
      [{:id=>1,:x=>2,:y=>3,:lines_id=>4,:lines_x=>5,:lines_y=>6,:graph_id=>7, :graphs_id=>nil, :name=>nil, :graphs_x=>nil, :graphs_y=>nil, :graphs_lines_x=>nil},
      {:id=>2,:x=>4,:y=>5,:lines_id=>nil,:lines_x=>nil,:lines_y=>nil,:graph_id=>nil, :graphs_id=>nil, :name=>nil, :graphs_x=>nil, :graphs_y=>nil, :graphs_lines_x=>nil},
      {:id=>3,:x=>5,:y=>6,:lines_id=>4,:lines_x=>5,:lines_y=>6,:graph_id=>7, :graphs_id=>7, :name=>8, :graphs_x=>9, :graphs_y=>10, :graphs_lines_x=>11},
      {:id=>3,:x=>5,:y=>6,:lines_id=>7,:lines_x=>5,:lines_y=>8,:graph_id=>9, :graphs_id=>9, :name=>10, :graphs_x=>10, :graphs_y=>11, :graphs_lines_x=>12}]]

    @ds1.graph(@ds2, :x=>:id).all.must_equal [{:points=>{:id=>1, :x=>2, :y=>3}, :lines=>nil}]
    @ds1.graph(@ds2, :x=>:id).graph(@ds3, :id=>:graph_id).all.must_equal [{:points=>{:id=>1, :x=>2, :y=>3}, :lines=>{:id=>4, :x=>5, :y=>6, :graph_id=>7}, :graphs=>nil},
      {:points=>{:id=>2, :x=>4, :y=>5}, :lines=>nil, :graphs=>nil},
      {:points=>{:id=>3, :x=>5, :y=>6}, :lines=>{:id=>4, :x=>5, :y=>6, :graph_id=>7}, :graphs=>{:id=>7, :name=>8, :x=>9, :y=>10, :lines_x=>11}},
      {:points=>{:id=>3, :x=>5, :y=>6}, :lines=>{:id=>7, :x=>5, :y=>8, :graph_id=>9}, :graphs=>{:id=>9, :name=>10, :x=>10, :y=>11, :lines_x=>12}}]
  end

  it "#graph_each should not give a nil value instead of a hash when any value for a table is false" do
    @db.fetch = {:id=>1,:x=>2,:y=>3,:lines_id=>nil,:lines_x=>false,:lines_y=>nil,:graph_id=>nil}
    @ds1.graph(@ds2, :x=>:id).all.must_equal [{:points=>{:id=>1, :x=>2, :y=>3}, :lines=>{:id=>nil, :x=>false, :y=>nil, :graph_id=>nil}}]
  end

  it "#graph_each should not included tables graphed with the :select => false option in the result set" do
    @db.fetch = {:id=>1,:x=>2,:y=>3,:graphs_id=>8, :name=>9, :graphs_x=>10, :graphs_y=>11, :lines_x=>12}
    @ds1.graph(:lines, {:x=>:id}, :select=>false).graph(:graphs, :id=>:graph_id).all.must_equal [{:points=>{:id=>1, :x=>2, :y=>3}, :graphs=>{:id=>8, :name=>9, :x=>10, :y=>11, :lines_x=>12}}]
  end

  it "#graph_each should only include the columns selected with #set_graph_aliases and #add_graph_aliases, if called" do
    @db.fetch = [[{:x=>2,:y=>3}], [{:x=>2}], [{:x=>2, :q=>18}]]

    @ds1.graph(:lines, :x=>:id).set_graph_aliases(:x=>[:points, :x], :y=>[:lines, :y]).all.must_equal [{:points=>{:x=>2}, :lines=>{:y=>3}}]
    ds = @ds1.graph(:lines, :x=>:id).set_graph_aliases(:x=>[:points, :x])
    ds.all.must_equal [{:points=>{:x=>2}, :lines=>nil}]
    ds = ds.add_graph_aliases(:q=>[:points, :r, 18])
    ds.all.must_equal [{:points=>{:x=>2, :r=>18}, :lines=>nil}]
  end

  it "#graph_each should correctly map values when #set_graph_aliases is used with a third argument for each entry" do
    @db.fetch = [{:x=>2,:y=>3}]
    @ds1.graph(:lines, :x=>:id).set_graph_aliases(:x=>[:points, :z1, 2], :y=>[:lines, :z2, Sequel.function(:random)]).all.must_equal [{:points=>{:z1=>2}, :lines=>{:z2=>3}}]
  end

  it "#graph_each should correctly map values when #set_graph_aliases is used with a single argument for each entry" do
    @db.fetch = [{:x=>2,:y=>3}]
    @ds1.graph(:lines, :x=>:id).set_graph_aliases(:x=>[:points], :y=>[:lines]).all.must_equal [{:points=>{:x=>2}, :lines=>{:y=>3}}]
  end

  it "#graph_each should correctly map values when #set_graph_aliases is used with a symbol for each entry" do
    @db.fetch = [{:x=>2,:y=>3}]
    @ds1.graph(:lines, :x=>:id).set_graph_aliases(:x=>:points, :y=>:lines).all.must_equal [{:points=>{:x=>2}, :lines=>{:y=>3}}]
  end

  it "#graph_each should run the row_proc for graphed datasets" do
    @db.fetch = {:id=>1,:x=>2,:y=>3,:lines_id=>4,:lines_x=>5,:lines_y=>6,:graph_id=>7}
    @ds1.with_row_proc(proc{|h| h.keys.each{|k| h[k] *= 2}; h}).graph(@ds2.with_row_proc(proc{|h| h.keys.each{|k| h[k] *= 3}; h}), :x=>:id).all.must_equal [{:points=>{:id=>2, :x=>4, :y=>6}, :lines=>{:id=>12, :x=>15, :y=>18, :graph_id=>21}}]
  end

  it "#with_sql_each should work normally if the dataset is not graphed" do
    @db.fetch = {:x=>1}
    @db.dataset.with_sql_each('SELECT 1 AS x'){|r| r.must_equal(:x=>1)}
    @db.sqls.must_equal ['SELECT 1 AS x']
  end
end
