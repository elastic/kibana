require_relative "spec_helper"

describe Sequel::Model, "class dataset methods"  do
  before do
    @db = Sequel.mock
    @c = Class.new(Sequel::Model(@db[:items].with_extend{def supports_cte?(*) true end}.with_fetch(:id=>1).with_autoid(1).with_numrows(0)))
    @d = @c.dataset
    @db.sqls
  end

  it "should call the dataset method of the same name with the same args" do
    @c.all.must_equal [@c.load(:id=>1)]
    @db.sqls.must_equal ["SELECT * FROM items"]
    @c.avg(:id).must_equal 1
    @db.sqls.must_equal ["SELECT avg(id) AS avg FROM items LIMIT 1"]
    @c.count.must_equal 1
    @db.sqls.must_equal ["SELECT count(*) AS count FROM items LIMIT 1"]
    @c.cross_join(@c.table_name).sql.must_equal "SELECT * FROM items CROSS JOIN items"
    @c.distinct.sql.must_equal "SELECT DISTINCT * FROM items"
    @c.each{|r| r.must_equal @c.load(:id=>1)}.must_equal @d
    @db.sqls.must_equal ["SELECT * FROM items"]
    @c.each_server{|r| r.opts[:server].must_equal :default}
    @c.empty?.must_equal false
    @db.sqls.must_equal ["SELECT 1 AS one FROM items LIMIT 1"]
    @c.except(@d, :from_self=>false).sql.must_equal "SELECT * FROM items EXCEPT SELECT * FROM items"
    @c.exclude(:a).sql.must_equal "SELECT * FROM items WHERE NOT a"
    @c.exclude_having(:a).sql.must_equal "SELECT * FROM items HAVING NOT a"
    @c.fetch_rows("S"){|r| r.must_equal(:id=>1)}
    @db.sqls.must_equal ["S"]
    @c.filter(:a).sql.must_equal "SELECT * FROM items WHERE a"
    @c.first.must_equal @c.load(:id=>1)
    @db.sqls.must_equal ["SELECT * FROM items LIMIT 1"]
    @c.first!.must_equal @c.load(:id=>1)
    @db.sqls.must_equal ["SELECT * FROM items LIMIT 1"]
    @c.for_update.sql.must_equal "SELECT * FROM items FOR UPDATE"
    @c.from.sql.must_equal "SELECT *"
    @c.from_self.sql.must_equal "SELECT * FROM (SELECT * FROM items) AS t1"
    @c.full_join(@c.table_name).sql.must_equal "SELECT * FROM items FULL JOIN items"
    @c.full_outer_join(@c.table_name).sql.must_equal "SELECT * FROM items FULL OUTER JOIN items"
    @c.get(:a).must_equal 1
    @db.sqls.must_equal ["SELECT a FROM items LIMIT 1"]
    @c.graph(@c.table_name, nil, :table_alias=>:a).sql.must_equal "SELECT * FROM items LEFT OUTER JOIN items AS a"
    @db.sqls
    @c.grep(:id, 'a%').sql.must_equal "SELECT * FROM items WHERE ((id LIKE 'a%' ESCAPE '\\'))"
    @c.group(:a).sql.must_equal "SELECT * FROM items GROUP BY a"
    @c.group_append(:a).sql.must_equal "SELECT * FROM items GROUP BY a"
    @c.group_and_count(:a).sql.must_equal "SELECT a, count(*) AS count FROM items GROUP BY a"
    @c.group_by(:a).sql.must_equal "SELECT * FROM items GROUP BY a"
    @c.having(:a).sql.must_equal "SELECT * FROM items HAVING a"
    @c.import([:id], [[1]])
    @db.sqls.must_equal ["BEGIN", "INSERT INTO items (id) VALUES (1)", "COMMIT"]
    @c.inner_join(@c.table_name).sql.must_equal "SELECT * FROM items INNER JOIN items"
    @c.insert.must_equal 1
    @db.sqls.must_equal ["INSERT INTO items DEFAULT VALUES"]
    @c.intersect(@d, :from_self=>false).sql.must_equal "SELECT * FROM items INTERSECT SELECT * FROM items"
    @c.join(@c.table_name).sql.must_equal "SELECT * FROM items INNER JOIN items"
    @c.join_table(:inner, @c.table_name).sql.must_equal "SELECT * FROM items INNER JOIN items"
    @c.last.must_equal @c.load(:id=>1)
    @db.sqls.must_equal ["SELECT * FROM items ORDER BY id DESC LIMIT 1"]
    @c.left_join(@c.table_name).sql.must_equal "SELECT * FROM items LEFT JOIN items"
    @c.left_outer_join(@c.table_name).sql.must_equal "SELECT * FROM items LEFT OUTER JOIN items"
    @c.limit(2).sql.must_equal "SELECT * FROM items LIMIT 2"
    @c.lock_style(:update).sql.must_equal "SELECT * FROM items FOR UPDATE"
    @c.map(:id).must_equal [1]
    @db.sqls.must_equal ["SELECT * FROM items"]
    @c.max(:id).must_equal 1
    @db.sqls.must_equal ["SELECT max(id) AS max FROM items LIMIT 1"]
    @c.min(:id).must_equal 1
    @db.sqls.must_equal ["SELECT min(id) AS min FROM items LIMIT 1"]
    @c.multi_insert([{:id=>1}])
    @db.sqls.must_equal ["BEGIN", "INSERT INTO items (id) VALUES (1)", "COMMIT"]
    @c.naked.row_proc.must_be_nil
    @c.natural_full_join(@c.table_name).sql.must_equal "SELECT * FROM items NATURAL FULL JOIN items"
    @c.natural_join(@c.table_name).sql.must_equal "SELECT * FROM items NATURAL JOIN items"
    @c.natural_left_join(@c.table_name).sql.must_equal "SELECT * FROM items NATURAL LEFT JOIN items"
    @c.natural_right_join(@c.table_name).sql.must_equal "SELECT * FROM items NATURAL RIGHT JOIN items"
    @c.offset(2).sql.must_equal "SELECT * FROM items OFFSET 2"
    @c.order(:a).sql.must_equal "SELECT * FROM items ORDER BY a"
    @c.order_append(:a).sql.must_equal "SELECT * FROM items ORDER BY a"
    @c.order_by(:a).sql.must_equal "SELECT * FROM items ORDER BY a"
    @c.order_more(:a).sql.must_equal "SELECT * FROM items ORDER BY a"
    @c.order_prepend(:a).sql.must_equal "SELECT * FROM items ORDER BY a"
    @c.paged_each{|r| r.must_equal @c.load(:id=>1)}
    @db.sqls.must_equal ["BEGIN", "SELECT * FROM items ORDER BY id LIMIT 1000 OFFSET 0", "COMMIT"]
    @c.qualify.sql.must_equal 'SELECT items.* FROM items'
    @c.right_join(@c.table_name).sql.must_equal "SELECT * FROM items RIGHT JOIN items"
    @c.right_outer_join(@c.table_name).sql.must_equal "SELECT * FROM items RIGHT OUTER JOIN items"
    @c.select(:a).sql.must_equal "SELECT a FROM items"
    @c.select_all(:items).sql.must_equal "SELECT items.* FROM items"
    @c.select_append(:a).sql.must_equal "SELECT *, a FROM items"
    @c.select_group(:a).sql.must_equal "SELECT a FROM items GROUP BY a"
    @c.select_hash(:id, :id).must_equal(1=>1)
    @db.sqls.must_equal ["SELECT id, id FROM items"]
    @c.select_hash_groups(:id, :id).must_equal(1=>[1])
    @db.sqls.must_equal ["SELECT id, id FROM items"]
    @c.select_map(:id).must_equal [1]
    @db.sqls.must_equal ["SELECT id FROM items"]
    @c.select_order_map(:id).must_equal [1]
    @db.sqls.must_equal ["SELECT id FROM items ORDER BY id"]
    @c.server(:a).opts[:server].must_equal :a
    @c.single_record.must_equal @c.load(:id=>1)
    @db.sqls.must_equal ["SELECT * FROM items LIMIT 1"]
    @c.single_record!.must_equal @c.load(:id=>1)
    @db.sqls.must_equal ["SELECT * FROM items"]
    @c.single_value.must_equal 1
    @db.sqls.must_equal ["SELECT * FROM items LIMIT 1"]
    @c.single_value!.must_equal 1
    @db.sqls.must_equal ["SELECT * FROM items"]
    @c.sum(:id).must_equal 1
    @db.sqls.must_equal ["SELECT sum(id) AS sum FROM items LIMIT 1"]
    @c.as_hash(:id, :id).must_equal(1=>1)
    @db.sqls.must_equal ["SELECT * FROM items"]
    @c.to_hash(:id, :id).must_equal(1=>1)
    @db.sqls.must_equal ["SELECT * FROM items"]
    @c.to_hash_groups(:id, :id).must_equal(1=>[1])
    @db.sqls.must_equal ["SELECT * FROM items"]
    @c.truncate
    @db.sqls.must_equal ["TRUNCATE TABLE items"]
    @c.union(@d, :from_self=>false).sql.must_equal "SELECT * FROM items UNION SELECT * FROM items"
    @c.where(:a).sql.must_equal "SELECT * FROM items WHERE a"
    @c.with(:a, @d).sql.must_equal "WITH a AS (SELECT * FROM items) SELECT * FROM items"
    @c.with_recursive(:a, @d, @d).sql.must_equal "WITH a AS (SELECT * FROM items UNION ALL SELECT * FROM items) SELECT * FROM items"
    @c.with_sql('S').sql.must_equal "S"
    @c.where_all(:id=>1){|r|}.must_equal [@c.load(:id=>1)]
    @db.sqls.must_equal ["SELECT * FROM items WHERE (id = 1)"]
    @c.where_each(:id=>1){|r|}
    @db.sqls.must_equal ["SELECT * FROM items WHERE (id = 1)"]
    @c.where_single_value(:id=>1).must_equal 1
    @db.sqls.must_equal ["SELECT * FROM items WHERE (id = 1) LIMIT 1"]

    sc = Class.new(@c)
    sc.set_dataset(@d.where(:a).order(:a).select(:a).group(:a).limit(2))
    @db.sqls
    sc.invert.sql.must_equal 'SELECT a FROM items WHERE NOT a GROUP BY a ORDER BY a LIMIT 2'
    sc.dataset = sc.dataset.with_fetch(:v1=>1, :v2=>2)
    @db.sqls
    sc.reverse.sql.must_equal 'SELECT a FROM items WHERE a GROUP BY a ORDER BY a DESC LIMIT 2'
    sc.reverse_order.sql.must_equal 'SELECT a FROM items WHERE a GROUP BY a ORDER BY a DESC LIMIT 2'
    sc.select_more(:a).sql.must_equal 'SELECT a, a FROM items WHERE a GROUP BY a ORDER BY a LIMIT 2'
    sc.unfiltered.sql.must_equal 'SELECT a FROM items GROUP BY a ORDER BY a LIMIT 2'
    sc.ungrouped.sql.must_equal 'SELECT a FROM items WHERE a ORDER BY a LIMIT 2'
    sc.unordered.sql.must_equal 'SELECT a FROM items WHERE a GROUP BY a LIMIT 2'
    sc.unlimited.sql.must_equal 'SELECT a FROM items WHERE a GROUP BY a ORDER BY a'
    sc.dataset.graph(:a).ungraphed.opts[:graph].must_be_nil
  end
end
