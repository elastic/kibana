require_relative "spec_helper"

describe "Dataset#and" do
  before do
    @dataset = Sequel.mock.dataset.from(:test).extension(:sequel_4_dataset_methods)
    @d1 = @dataset.where(:x => 1)
  end
  
  it "should add a WHERE filter if none exists" do
    @dataset.and(:a => 1).sql.must_equal 'SELECT * FROM test WHERE (a = 1)'
  end
  
  it "should add an expression to the where clause" do
    @d1.and(:y => 2).sql.must_equal 'SELECT * FROM test WHERE ((x = 1) AND (y = 2))'
  end
  
  it "should accept placeholder literal string filters" do
    @d1.and(Sequel.lit('y > ?', 2)).sql.must_equal 'SELECT * FROM test WHERE ((x = 1) AND (y > 2))'
  end

  it "should accept expression filters" do
    @d1.and(Sequel.expr(:yy) > 3).sql.must_equal 'SELECT * FROM test WHERE ((x = 1) AND (yy > 3))'
  end
      
  it "should accept string filters with placeholders" do
    @d1.extension(:auto_literal_strings).and('y > ?', 2).sql.must_equal 'SELECT * FROM test WHERE ((x = 1) AND (y > 2))'
  end

  it "should accept blocks passed to filter" do
    @d1.and{yy > 3}.sql.must_equal 'SELECT * FROM test WHERE ((x = 1) AND (yy > 3))'
  end
  
  it "should correctly add parens to give predictable results" do
    @d1.or(:y => 2).and(:z => 3).sql.must_equal 'SELECT * FROM test WHERE (((x = 1) OR (y = 2)) AND (z = 3))'
    @d1.and(:y => 2).or(:z => 3).sql.must_equal 'SELECT * FROM test WHERE (((x = 1) AND (y = 2)) OR (z = 3))'
  end
end

describe "Dataset#exclude_where" do
  before do
    @dataset = Sequel.mock.dataset.from(:test).extension(:sequel_4_dataset_methods)
  end

  it "should correctly negate the expression and add it to the where clause" do
    @dataset.exclude_where(:region=>'Asia').sql.must_equal "SELECT * FROM test WHERE (region != 'Asia')"
    @dataset.exclude_where(:region=>'Asia').exclude_where(:region=>'NA').sql.must_equal "SELECT * FROM test WHERE ((region != 'Asia') AND (region != 'NA'))"
  end

  it "should affect the where clause even if having clause is already used" do
    @dataset.group_and_count(:name).having{count > 2}.exclude_where(:region=>'Asia').sql.
      must_equal "SELECT name, count(*) AS count FROM test WHERE (region != 'Asia') GROUP BY name HAVING (count > 2)"
  end
end

describe "Dataset#interval" do
  before do
    @db = Sequel.mock(:fetch=>{:v => 1234}).extension(:sequel_4_dataset_methods)
    @ds = @db[:test].freeze
  end
  
  it "should generate the correct SQL statement" do
    5.times do
      @ds.interval(:stamp)
      @db.sqls.must_equal ["SELECT (max(stamp) - min(stamp)) AS interval FROM test LIMIT 1"]
    end

    @ds.filter(Sequel.expr(:price) > 100).interval(:stamp)
    @db.sqls.must_equal ["SELECT (max(stamp) - min(stamp)) AS interval FROM test WHERE (price > 100) LIMIT 1"]
  end
  
  it "should use a subselect for the same conditions as count" do
    ds = @ds.order(:stamp).limit(5)
    5.times do
      ds.interval(:stamp).must_equal 1234
      @db.sqls.must_equal ['SELECT (max(stamp) - min(stamp)) AS interval FROM (SELECT * FROM test ORDER BY stamp LIMIT 5) AS t1 LIMIT 1']
    end
  end

  it "should accept virtual row blocks" do
    5.times do
      @ds.interval{a(b)}
      @db.sqls.must_equal ["SELECT (max(a(b)) - min(a(b))) AS interval FROM test LIMIT 1"]
    end
  end
end

describe "Dataset#range" do
  before do
    @db = Sequel.mock(:fetch=>{:v1 => 1, :v2 => 10}).extension(:sequel_4_dataset_methods)
    @ds = @db[:test].freeze
  end
  
  it "should generate a correct SQL statement" do
    5.times do
      @ds.range(:stamp)
      @db.sqls.must_equal ["SELECT min(stamp) AS v1, max(stamp) AS v2 FROM test LIMIT 1"]
    end

    @ds.filter(Sequel.expr(:price) > 100).range(:stamp)
    @db.sqls.must_equal ["SELECT min(stamp) AS v1, max(stamp) AS v2 FROM test WHERE (price > 100) LIMIT 1"]
  end
  
  it "should return a range object" do
    5.times do
      @ds.range(:tryme).must_equal(1..10)
    end
  end
  
  it "should use a subselect for the same conditions as count" do
    @ds.order(:stamp).limit(5).range(:stamp).must_equal(1..10)
    @db.sqls.must_equal ['SELECT min(stamp) AS v1, max(stamp) AS v2 FROM (SELECT * FROM test ORDER BY stamp LIMIT 5) AS t1 LIMIT 1']
  end
  
  it "should accept virtual row blocks" do
    5.times do
      @ds.range{a(b)}
      @db.sqls.must_equal ["SELECT min(a(b)) AS v1, max(a(b)) AS v2 FROM test LIMIT 1"]
    end
  end
end

