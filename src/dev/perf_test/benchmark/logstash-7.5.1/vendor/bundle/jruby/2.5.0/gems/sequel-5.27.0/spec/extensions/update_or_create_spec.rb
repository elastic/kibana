require_relative "spec_helper"

describe "Sequel::Plugins::UpdateOrCreate" do
  before do
    @db = Sequel.mock(:autoid=>proc{1}, :numrows=>1)
    @c = Class.new(Sequel::Model(@db[:test]))
    @c.plugin :update_or_create
    @c.columns :id, :a, :b 
    @db.sqls
  end

  it ".update_or_create should update an existing record if one exists" do
    @db.fetch = [[{:id=>1, :a=>2, :b=>3}]]
    @c.update_or_create(:a=>2){|t| t.b = 4}.must_equal @c.load(:id=>1, :a=>2, :b=>4)
    @db.sqls.must_equal ["SELECT * FROM test WHERE (a = 2) LIMIT 1", "UPDATE test SET b = 4 WHERE (id = 1)"]

    @db.fetch = [[{:id=>1, :a=>2, :b=>3}]]
    @c.update_or_create({:a=>2}, :b=>4).must_equal @c.load(:id=>1, :a=>2, :b=>4)
    @db.sqls.must_equal ["SELECT * FROM test WHERE (a = 2) LIMIT 1", "UPDATE test SET b = 4 WHERE (id = 1)"]

    @db.fetch = [[{:id=>1, :a=>2, :b=>3}]]
    @c.update_or_create({:a=>2}, :a=>3){|t| t.b = 4}.must_equal @c.load(:id=>1, :a=>3, :b=>4)
    @db.sqls.must_equal ["SELECT * FROM test WHERE (a = 2) LIMIT 1",
      'UPDATE test SET a = 3, b = 4 WHERE (id = 1)']
  end

  it ".update_or_create should create a record if an existing record does not exist" do
    @db.fetch = [[], [{:id=>1, :a=>1, :b=>4}]]
    @c.update_or_create(:a=>1){|t| t.b = 4}.must_equal @c.load(:id=>1, :a=>1, :b=>4)
    @db.sqls.must_equal ["SELECT * FROM test WHERE (a = 1) LIMIT 1",
      "INSERT INTO test (a, b) VALUES (1, 4)",
      "SELECT * FROM test WHERE (id = 1) LIMIT 1"]

    @db.fetch = [[], [{:id=>1, :a=>1, :b=>4}]]
    @c.update_or_create({:a=>1}, :b=>4).must_equal @c.load(:id=>1, :a=>1, :b=>4)
    @db.sqls.must_equal ["SELECT * FROM test WHERE (a = 1) LIMIT 1",
      "INSERT INTO test (a, b) VALUES (1, 4)",
      "SELECT * FROM test WHERE (id = 1) LIMIT 1"]

    @db.fetch = [[], [{:id=>1, :a=>3, :b=>4}]]
    @c.update_or_create({:a=>1}, :a=>3){|t| t.b = 4}.must_equal @c.load(:id=>1, :a=>3, :b=>4)
    @db.sqls.must_equal ["SELECT * FROM test WHERE (a = 1) LIMIT 1",
      "INSERT INTO test (a, b) VALUES (3, 4)",
      "SELECT * FROM test WHERE (id = 1) LIMIT 1"]
  end

  it ".update_or_create should return an existing record even if no changes necessary" do
    @db.fetch = [[{:id=>1, :a=>2, :b=>3}]]
    @c.update_or_create(:a=>2){|t| t.b = 3}.must_equal @c.load(:id=>1, :a=>2, :b=>3)
    @db.sqls.must_equal ["SELECT * FROM test WHERE (a = 2) LIMIT 1"]
  end

  it ".find_or_new should return an existing record" do
    @db.fetch = [[{:id=>1, :a=>2, :b=>3}]]
    @c.find_or_new(:a=>2){|t| t.b = 4}.must_equal @c.load(:id=>1, :a=>2, :b=>4)
    @db.sqls.must_equal ["SELECT * FROM test WHERE (a = 2) LIMIT 1"]

    @db.fetch = [[{:id=>1, :a=>2, :b=>3}]]
    @c.find_or_new({:a=>2}, :b=>4).must_equal @c.load(:id=>1, :a=>2, :b=>4)
    @db.sqls.must_equal ["SELECT * FROM test WHERE (a = 2) LIMIT 1"]

    @db.fetch = [[{:id=>1, :a=>2, :b=>3}]]
    @c.find_or_new({:a=>2}, :a=>3){|t| t.b = 4}.must_equal @c.load(:id=>1, :a=>3, :b=>4)
    @db.sqls.must_equal ["SELECT * FROM test WHERE (a = 2) LIMIT 1"]
  end

  it ".find_or_new should return a new record if no record exists" do
    o = @c.find_or_new(:a=>1){|t| t.b = 4}
    o.must_equal @c.load(:a=>1, :b=>4)
    o.new?.must_equal true
    @db.sqls.must_equal ["SELECT * FROM test WHERE (a = 1) LIMIT 1"]

    o = @c.find_or_new({:a=>1}, :b=>4)
    o.must_equal @c.load(:a=>1, :b=>4)
    o.new?.must_equal true
    @db.sqls.must_equal ["SELECT * FROM test WHERE (a = 1) LIMIT 1"]

    o = @c.find_or_new({:a=>1}, :a=>3){|t| t.b = 4}
    o.must_equal @c.load(:a=>3, :b=>4)
    o.new?.must_equal true
    @db.sqls.must_equal ["SELECT * FROM test WHERE (a = 1) LIMIT 1"]
  end
end
