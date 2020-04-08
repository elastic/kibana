require_relative "spec_helper"

describe "Dataset#where" do
  before do
    @dataset = Sequel.mock[:test].extension(:auto_literal_strings)
  end

  it "should work with a string with placeholders and arguments for those placeholders" do
    @dataset.where('price < ? AND id in ?', 100, [1, 2, 3]).select_sql.must_equal "SELECT * FROM test WHERE (price < 100 AND id in (1, 2, 3))"
  end
  
  it "should use default behavior for array of conditions" do
    @dataset.where([[:a, 1], [:b, 2]]).sql.must_equal 'SELECT * FROM test WHERE ((a = 1) AND (b = 2))'
  end

  it "should not modify passed array with placeholders" do
    a = ['price < ? AND id in ?', 100, 1, 2, 3]
    b = a.dup
    @dataset.where(a)
    b.must_equal a
  end

  it "should work with strings (custom SQL expressions)" do
    @dataset.where('(a = 1 AND b = 2)').select_sql.must_equal "SELECT * FROM test WHERE ((a = 1 AND b = 2))"
  end
    
  it "should work with a string with named placeholders and a hash of placeholder value arguments" do
    @dataset.where('price < :price AND id in :ids', :price=>100, :ids=>[1, 2, 3]).select_sql.must_equal "SELECT * FROM test WHERE (price < 100 AND id in (1, 2, 3))"
  end
    
  it "should not modify passed array with named placeholders" do
    a = ['price < :price AND id in :ids', {:price=>100}]
    b = a.dup
    @dataset.where(a)
    b.must_equal a
  end

  it "should not replace named placeholders that don't exist in the hash" do
    @dataset.where('price < :price AND id in :ids', :price=>100).select_sql.must_equal "SELECT * FROM test WHERE (price < 100 AND id in :ids)"
  end
  
  it "should raise an error for a mismatched number of placeholders" do
    proc{@dataset.where('price < ? AND id in ?', 100).select_sql}.must_raise(Sequel::Error)
    proc{@dataset.where('price < ? AND id in ?', 100, [1, 2, 3], 4).select_sql}.must_raise(Sequel::Error)
  end

  it "should handle partial names" do
    @dataset.where('price < :price AND id = :p', :p=>2, :price=>100).select_sql.must_equal "SELECT * FROM test WHERE (price < 100 AND id = 2)"
  end

  it "should handle ::cast syntax when no parameters are supplied" do
    @dataset.where('price::float = 10', {}).select_sql.must_equal "SELECT * FROM test WHERE (price::float = 10)"
    @dataset.where('price::float ? 10', {}).select_sql.must_equal "SELECT * FROM test WHERE (price::float ? 10)"
  end

  it "should affect select, delete and update statements when using strings" do
    @d2 = @dataset.where('region = ?', 'Asia')
    @d2.select_sql.must_equal "SELECT * FROM test WHERE (region = 'Asia')"
    @d2.delete_sql.must_equal "DELETE FROM test WHERE (region = 'Asia')"
    @d2.update_sql(:GDP => 0).must_equal "UPDATE test SET GDP = 0 WHERE (region = 'Asia')"
    
    @d3 = @dataset.where("a = 1")
    @d3.select_sql.must_equal "SELECT * FROM test WHERE (a = 1)"
    @d3.delete_sql.must_equal "DELETE FROM test WHERE (a = 1)"
    @d3.update_sql(:GDP => 0).must_equal "UPDATE test SET GDP = 0 WHERE (a = 1)"
  end
  
  it "should be composable using AND operator (for scoping) when using strings" do
    @d2 = @dataset.where('region = ?', 'Asia')
    @d2.where('GDP > ?', 1000).select_sql.must_equal "SELECT * FROM test WHERE ((region = 'Asia') AND (GDP > 1000))"
    @d2.where(:name => ['Japan', 'China']).select_sql.must_equal "SELECT * FROM test WHERE ((region = 'Asia') AND (name IN ('Japan', 'China')))"
    @d2.where('GDP > ?').select_sql.must_equal "SELECT * FROM test WHERE ((region = 'Asia') AND (GDP > ?))"

    @d3 = @dataset.where("a = 1")
    @d3.where('b = 2').select_sql.must_equal "SELECT * FROM test WHERE ((a = 1) AND (b = 2))"
    @d3.where(:c => 3).select_sql.must_equal "SELECT * FROM test WHERE ((a = 1) AND (c = 3))"
    @d3.where('d = ?', 4).select_sql.must_equal "SELECT * FROM test WHERE ((a = 1) AND (d = 4))"
  end
      
  it "should be composable using AND operator (for scoping) with block and string" do
    @dataset.where("a = 1").where{e < 5}.select_sql.must_equal "SELECT * FROM test WHERE ((a = 1) AND (e < 5))"
  end
end
  
describe "Dataset #first and #last" do
  before do
    @d = Sequel.mock(:fetch=>proc{|s| {:s=>s}})[:test].extension(:auto_literal_strings)
  end
  
  it "should combine block and standard argument filters if argument is not an Integer" do
    ds = @d.order(:name).freeze
    5.times do
      @d.first('y = 25'){z > 26}.must_equal(:s=>'SELECT * FROM test WHERE ((y = 25) AND (z > 26)) LIMIT 1')
      ds.last('y = 16'){z > 26}.must_equal(:s=>'SELECT * FROM test WHERE ((y = 16) AND (z > 26)) ORDER BY name DESC LIMIT 1')
      @d.first('y = ?', 25){z > 26}.must_equal(:s=>'SELECT * FROM test WHERE ((y = 25) AND (z > 26)) LIMIT 1')
      ds.last('y = ?', 16){z > 26}.must_equal(:s=>'SELECT * FROM test WHERE ((y = 16) AND (z > 26)) ORDER BY name DESC LIMIT 1')
    end
  end
end 

describe "Dataset#exclude" do
  before do
    @dataset = Sequel.mock.dataset.from(:test).extension(:auto_literal_strings)
  end

  it "should parenthesize a single string condition correctly" do
    @dataset.exclude("region = 'Asia' AND name = 'Japan'").select_sql.must_equal "SELECT * FROM test WHERE NOT (region = 'Asia' AND name = 'Japan')"
  end

  it "should parenthesize an array condition correctly" do
    @dataset.exclude('region = ? AND name = ?', 'Asia', 'Japan').select_sql.must_equal "SELECT * FROM test WHERE NOT (region = 'Asia' AND name = 'Japan')"
  end
end

describe "Dataset#or" do
  before do
    @dataset = Sequel.mock.dataset.from(:test).extension(:auto_literal_strings)
    @d1 = @dataset.where(:x => 1)
  end

  it "should accept string filters" do
    @d1.or('y > ?', 2).sql.must_equal 'SELECT * FROM test WHERE ((x = 1) OR (y > 2))'
  end
end
  
describe "Dataset#having" do
  before do
    @dataset = Sequel.mock.dataset.from(:test).extension(:auto_literal_strings)
    @grouped = @dataset.group(:region).select(:region, Sequel.function(:sum, :population), Sequel.function(:avg, :gdp))
  end
  
  it "should handle string arguments" do
    @grouped.having('sum(population) > 10').select_sql.must_equal "SELECT region, sum(population), avg(gdp) FROM test GROUP BY region HAVING (sum(population) > 10)"
  end
end

describe "Dataset#join_table" do
  before do
    @d = Sequel.mock.dataset.from(:items).with_quote_identifiers(true).extension(:auto_literal_strings)
  end

  it "should support using a string as the join condition" do
    @d.join(:categories, "c.item_id = items.id", :table_alias=>:c).sql.must_equal 'SELECT * FROM "items" INNER JOIN "categories" AS "c" ON (c.item_id = items.id)'
  end
end
  
describe "Dataset prepared statements and bound variables " do
  before do
    @db = Sequel.mock
    @ds = @db[:items].with_extend{def insert_select_sql(*v) "#{insert_sql(*v)} RETURNING *" end}.extension(:auto_literal_strings)
  end

  it "should handle literal strings" do
    @ds.filter("num = ?", :$n).call(:select, :n=>1)
    @db.sqls.must_equal ['SELECT * FROM items WHERE (num = 1)']
  end
    
  it "should handle subselects with strings" do
    @ds.filter(:$b).filter(:num=>@ds.select(:num).filter("num = ?", :$n)).call(:select, :n=>1, :b=>0)
    @db.sqls.must_equal ['SELECT * FROM items WHERE (0 AND (num IN (SELECT num FROM items WHERE (num = 1))))']
  end
end
  
describe "Dataset#update_sql" do
  before do
    @ds = Sequel.mock.dataset.from(:items).extension(:auto_literal_strings)
  end
  
  it "should accept strings" do
    @ds.update_sql("a = b").must_equal "UPDATE items SET a = b"
  end
  
  it "should accept literal strings" do
    @ds.update_sql(Sequel.lit("a = b")).must_equal "UPDATE items SET a = b"
  end

  it "should accept hash" do
    @ds.update_sql(:c => 'd').must_equal "UPDATE items SET c = 'd'"
  end
end 

describe "Dataset::PlaceholderLiteralizer" do
  before do
    @c = Sequel::Dataset::PlaceholderLiteralizer
    @db = Sequel.mock
    @ds = @db[:items].extension(:auto_literal_strings)
    @h = {:id=>1}
    @ds.db.fetch = @h
  end
  
  it "should handle calls with a placeholders used as filter arguments" do
    loader = @c.loader(@ds){|pl, ds| ds.where(pl.arg)}
    loader.first(:id=>1).must_equal @h
    loader.first(Sequel.expr{a(b)}).must_equal @h
    loader.first("a = 1").must_equal @h
    @db.sqls.must_equal ["SELECT * FROM items WHERE (id = 1)", "SELECT * FROM items WHERE a(b)", "SELECT * FROM items WHERE (a = 1)"]
  end
  
  it "should handle calls with a placeholder used multiple times in different capacities" do
    loader = @c.loader(@ds){|pl, ds| a = pl.arg; ds.where(a).where(:b=>a)}
    loader.first("a = 1").must_equal @h
    loader.first(["a = ?", 2]).must_equal @h
    @db.sqls.must_equal ["SELECT * FROM items WHERE ((a = 1) AND (b = 'a = 1'))", "SELECT * FROM items WHERE ((a = 2) AND (b IN ('a = ?', 2)))"]
  end
end 
