require_relative "spec_helper"

describe "Sequel::Dataset::ImplicitSubquery" do
  it "should implicitly use a subquery for most dataset query methods" do
    db = Sequel.mock
    db.extend_datasets{def supports_cte?; true end}
    ds = db["SELECT * FROM table"].extension(:implicit_subquery)
    ds.columns(:id, :a)
    ods = db[:c]
    ods.columns(:id, :b)

    ds.cross_join(:c).sql.must_equal "SELECT * FROM (SELECT * FROM table) AS t1 CROSS JOIN c"
    ds.distinct.sql.must_equal "SELECT DISTINCT * FROM (SELECT * FROM table) AS t1"
    ds.except(ods).sql.must_equal "SELECT * FROM (SELECT * FROM (SELECT * FROM table) AS t1 EXCEPT SELECT * FROM c) AS t1"
    ds.exclude(:c).sql.must_equal "SELECT * FROM (SELECT * FROM table) AS t1 WHERE NOT c"
    ds.exclude_having(:c).sql.must_equal "SELECT * FROM (SELECT * FROM table) AS t1 HAVING NOT c"
    ds.filter(:c).sql.must_equal "SELECT * FROM (SELECT * FROM table) AS t1 WHERE c"
    ds.for_update.sql.must_equal "SELECT * FROM (SELECT * FROM table) AS t1 FOR UPDATE"
    ds.full_join(:c).sql.must_equal "SELECT * FROM (SELECT * FROM table) AS t1 FULL JOIN c"
    ds.full_outer_join(:c).sql.must_equal "SELECT * FROM (SELECT * FROM table) AS t1 FULL OUTER JOIN c"
    ds.graph(ods).sql.must_equal "SELECT t1.id, t1.a, c.id AS c_id, c.b FROM (SELECT * FROM table) AS t1 LEFT OUTER JOIN c"
    ds.grep(:c, 'a').sql.must_equal "SELECT * FROM (SELECT * FROM table) AS t1 WHERE ((c LIKE 'a' ESCAPE '\\'))"
    ds.group(:c).sql.must_equal "SELECT * FROM (SELECT * FROM table) AS t1 GROUP BY c"
    ds.group_append(:c).sql.must_equal "SELECT * FROM (SELECT * FROM table) AS t1 GROUP BY c"
    ds.group_and_count(:c).sql.must_equal "SELECT c, count(*) AS count FROM (SELECT * FROM table) AS t1 GROUP BY c"
    ds.group_by(:c).sql.must_equal "SELECT * FROM (SELECT * FROM table) AS t1 GROUP BY c"
    ds.having(:c).sql.must_equal "SELECT * FROM (SELECT * FROM table) AS t1 HAVING c"
    ds.inner_join(:c, [:d]).sql.must_equal "SELECT * FROM (SELECT * FROM table) AS t1 INNER JOIN c USING (d)"
    ds.intersect(ods).sql.must_equal "SELECT * FROM (SELECT * FROM (SELECT * FROM table) AS t1 INTERSECT SELECT * FROM c) AS t1"
    ds.invert.sql.must_equal "SELECT * FROM (SELECT * FROM table) AS t1 WHERE 'f'"
    ds.join(:c, [:d]).sql.must_equal "SELECT * FROM (SELECT * FROM table) AS t1 INNER JOIN c USING (d)"
    ds.join_table(:inner, :c, [:d]).sql.must_equal "SELECT * FROM (SELECT * FROM table) AS t1 INNER JOIN c USING (d)"
    ds.left_join(:c, [:d]).sql.must_equal "SELECT * FROM (SELECT * FROM table) AS t1 LEFT JOIN c USING (d)"
    ds.left_outer_join(:c, [:d]).sql.must_equal "SELECT * FROM (SELECT * FROM table) AS t1 LEFT OUTER JOIN c USING (d)"
    ds.limit(1).sql.must_equal "SELECT * FROM (SELECT * FROM table) AS t1 LIMIT 1"
    ds.lock_style('FOR UPDATE').sql.must_equal "SELECT * FROM (SELECT * FROM table) AS t1 FOR UPDATE"
    ds.natural_full_join(:c).sql.must_equal "SELECT * FROM (SELECT * FROM table) AS t1 NATURAL FULL JOIN c"
    ds.natural_join(:c).sql.must_equal "SELECT * FROM (SELECT * FROM table) AS t1 NATURAL JOIN c"
    ds.natural_left_join(:c).sql.must_equal "SELECT * FROM (SELECT * FROM table) AS t1 NATURAL LEFT JOIN c"
    ds.natural_right_join(:c).sql.must_equal "SELECT * FROM (SELECT * FROM table) AS t1 NATURAL RIGHT JOIN c"
    ds.offset(1).sql.must_equal "SELECT * FROM (SELECT * FROM table) AS t1 OFFSET 1"
    ds.order(:c).sql.must_equal "SELECT * FROM (SELECT * FROM table) AS t1 ORDER BY c"
    ds.order_append(:c).sql.must_equal "SELECT * FROM (SELECT * FROM table) AS t1 ORDER BY c"
    ds.order_by(:c).sql.must_equal "SELECT * FROM (SELECT * FROM table) AS t1 ORDER BY c"
    ds.order_more(:c).sql.must_equal "SELECT * FROM (SELECT * FROM table) AS t1 ORDER BY c"
    ds.order_prepend(:c).sql.must_equal "SELECT * FROM (SELECT * FROM table) AS t1 ORDER BY c"
    ds.right_join(:c, [:d]).sql.must_equal "SELECT * FROM (SELECT * FROM table) AS t1 RIGHT JOIN c USING (d)"
    ds.right_outer_join(:c, [:d]).sql.must_equal "SELECT * FROM (SELECT * FROM table) AS t1 RIGHT OUTER JOIN c USING (d)"
    ds.select(:c).sql.must_equal "SELECT c FROM (SELECT * FROM table) AS t1"
    ds.select_append(:c).sql.must_equal "SELECT *, c FROM (SELECT * FROM table) AS t1"
    ds.select_group(:c).sql.must_equal "SELECT c FROM (SELECT * FROM table) AS t1 GROUP BY c"
    ds.select_more(:c).sql.must_equal "SELECT *, c FROM (SELECT * FROM table) AS t1"
    ds.union(ods).sql.must_equal "SELECT * FROM (SELECT * FROM (SELECT * FROM table) AS t1 UNION SELECT * FROM c) AS t1"
    ds.where(:c).sql.must_equal "SELECT * FROM (SELECT * FROM table) AS t1 WHERE c"
    ds.with(:d, ods).sql.must_equal "WITH d AS (SELECT * FROM c) SELECT * FROM (SELECT * FROM table) AS t1"
    ds.with_recursive(:d, ods, ods).sql.must_equal "WITH d AS (SELECT * FROM c UNION ALL SELECT * FROM c) SELECT * FROM (SELECT * FROM table) AS t1"
  end
end
