require_relative "spec_helper"

describe "dataset_source_alias extension" do
  before do
    @db = Sequel.mock
    @db.extension(:dataset_source_alias)
  end

  it "should automatically alias datasets to their first source in #from" do
    @db[@db[:a]].sql.must_equal 'SELECT * FROM (SELECT * FROM a) AS a'
    @db[:a, @db[:b]].sql.must_equal 'SELECT * FROM a, (SELECT * FROM b) AS b'
  end

  it "should handle virtual row blocks in #from" do
    @db.dataset.from{|_| @db[:a]}.sql.must_equal 'SELECT * FROM (SELECT * FROM a) AS a'
    @db.dataset.from(:a){|_| @db[:b]}.sql.must_equal 'SELECT * FROM a, (SELECT * FROM b) AS b'
  end

  it "should automatically alias datasets to their first source in #join" do
    @db[:a].cross_join(@db[:b]).sql.must_equal 'SELECT * FROM a CROSS JOIN (SELECT * FROM b) AS b'
  end

  it "should handle :table_alias option when joining" do
    @db[:a].cross_join(@db[:b], :table_alias=>:c).sql.must_equal 'SELECT * FROM a CROSS JOIN (SELECT * FROM b) AS c'
  end

  it "should handle aliasing issues automatically" do
    @db[:a, @db[:a]].sql.must_equal 'SELECT * FROM a, (SELECT * FROM a) AS a_0'
    @db.dataset.from(:a, @db[:a]){|_| @db[:a]}.sql.must_equal 'SELECT * FROM a, (SELECT * FROM a) AS a_0, (SELECT * FROM a) AS a_1'
    @db.dataset.from(:a, @db[:a]){|_| @db[:a]}.cross_join(@db[:a]).sql.must_equal 'SELECT * FROM a, (SELECT * FROM a) AS a_0, (SELECT * FROM a) AS a_1 CROSS JOIN (SELECT * FROM a) AS a_2'
  end

  it "should handle from_self" do
    @db[:a].from_self.sql.must_equal 'SELECT * FROM (SELECT * FROM a) AS a'
    @db[:a].from_self.from_self.sql.must_equal 'SELECT * FROM (SELECT * FROM (SELECT * FROM a) AS a) AS a'
  end

  it "should handle datasets without sources" do
    @db[@db.select(1)].sql.must_equal 'SELECT * FROM (SELECT 1) AS t1'
    @db[:t, @db.select(1)].sql.must_equal 'SELECT * FROM t, (SELECT 1) AS t1'
    @db[:a].cross_join(@db.select(1)).sql.must_equal 'SELECT * FROM a CROSS JOIN (SELECT 1) AS t1'
  end

  it "should handle datasets selecting from functions" do
    @db.dataset.from{|o| @db[o.f(:a)]}.sql.must_equal 'SELECT * FROM (SELECT * FROM f(a)) AS t1'
  end

  it "should handle datasets with literal SQL" do
    @db.from(@db['SELECT c FROM d']).sql.must_equal 'SELECT * FROM (SELECT c FROM d) AS t1'
  end
end
