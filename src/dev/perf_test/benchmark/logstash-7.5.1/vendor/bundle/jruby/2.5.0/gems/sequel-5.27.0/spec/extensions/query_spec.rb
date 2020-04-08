require_relative "spec_helper"

describe "Database#query" do
  before do
    @db = Sequel.mock.extension(:query)
  end

  it "should delegate to Dataset#query if block is provided" do
    @d = @db.query {select :x; from :y}
    @d.must_be_kind_of(Sequel::Dataset)
    @d.sql.must_equal "SELECT x FROM y"
  end
end

describe "Dataset#query" do
  before do
    @d = Sequel.mock.dataset.extension(:query)
  end
  
  it "should allow cloning without arguments" do
    q = @d.query {clone}
    q.class.must_equal @d.class
    q.sql.must_equal "SELECT *"
  end
  
  it "should support #from" do
    q = @d.query {from :xxx}
    q.class.must_equal @d.class
    q.sql.must_equal "SELECT * FROM xxx"
  end
  
  it "should support #select" do
    q = @d.query do
      select :a, Sequel[:b].as(:mongo)
      from :yyy
    end
    q.class.must_equal @d.class
    q.sql.must_equal "SELECT a, b AS mongo FROM yyy"
  end
  
  it "should support #where" do
    q = @d.query do
      from :zzz
      where{x + 2 > Sequel.expr(:y) + 3}
    end
    q.class.must_equal @d.class
    q.sql.must_equal "SELECT * FROM zzz WHERE ((x + 2) > (y + 3))"

    q = @d.from(:zzz).query do
      where{(x > 1) & (Sequel.expr(:y) > 2)}
    end
    q.class.must_equal @d.class
    q.sql.must_equal "SELECT * FROM zzz WHERE ((x > 1) AND (y > 2))"

    q = @d.from(:zzz).query do
      where :x => 33
    end
    q.class.must_equal @d.class
    q.sql.must_equal "SELECT * FROM zzz WHERE (x = 33)"
  end
  
  it "should support #group_by and #having" do
    q = @d.query do
      from :abc
      group_by :id
      having{x >= 2}
    end
    q.class.must_equal @d.class
    q.sql.must_equal "SELECT * FROM abc GROUP BY id HAVING (x >= 2)"
  end
  
  it "should support #order, #order_by" do
    q = @d.query do
      from :xyz
      order_by :stamp
    end
    q.class.must_equal @d.class
    q.sql.must_equal "SELECT * FROM xyz ORDER BY stamp"
  end

  it "should support blocks that end in nil" do
    condition = false
    q = @d.query do
      from :xyz
      order_by :stamp if condition
    end
    q.sql.must_equal "SELECT * FROM xyz"
  end
  
  it "should raise on non-chainable method calls" do
    proc {@d.query {row_proc}}.must_raise(Sequel::Error)
    proc {@d.query {all}}.must_raise(Sequel::Error)
  end
end
