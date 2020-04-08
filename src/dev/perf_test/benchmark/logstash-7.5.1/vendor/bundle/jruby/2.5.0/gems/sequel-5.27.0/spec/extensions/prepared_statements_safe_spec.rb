require_relative "spec_helper"

describe "prepared_statements_safe plugin" do
  before do
    @db = Sequel.mock(:fetch=>{:id=>1, :name=>'foo', :i=>2}, :autoid=>proc{|sql| 1}, :numrows=>1, :servers=>{:read_only=>{}})
    @c = Class.new(Sequel::Model(@db[:people]))
    @c.columns :id, :name, :i
    @c.instance_variable_set(:@db_schema, {:i=>{}, :name=>{}, :id=>{:primary_key=>true}})
    @c.plugin :prepared_statements_safe
    @p = @c.load(:id=>1, :name=>'foo', :i=>2)
    @db.sqls
  end

  it "should load the prepared_statements plugin" do
    @c.plugins.must_include(Sequel::Plugins::PreparedStatements)
  end

  it "should set default values correctly" do
    @c.prepared_statements_column_defaults.must_equal(:name=>nil, :i=>nil)
    @c.instance_variable_set(:@db_schema, {:i=>{:default=>'f(x)'}, :name=>{:ruby_default=>'foo'}, :id=>{:primary_key=>true}, :bar=>{:ruby_default=>Sequel::CURRENT_TIMESTAMP}})
    Class.new(@c).prepared_statements_column_defaults.must_equal(:name=>'foo')
  end

  it "should set default values when creating" do
    @c.create
    @db.sqls.must_equal ['INSERT INTO people (i, name) VALUES (NULL, NULL)', "SELECT * FROM people WHERE (id = 1) LIMIT 1"]
    @c.create(:name=>'foo')
    @db.sqls.must_equal ["INSERT INTO people (i, name) VALUES (NULL, 'foo')", "SELECT * FROM people WHERE (id = 1) LIMIT 1"]
    @c.create(:name=>'foo', :i=>2)
    @db.sqls.must_equal ["INSERT INTO people (i, name) VALUES (2, 'foo')", "SELECT * FROM people WHERE (id = 1) LIMIT 1"]
  end 

  it "should use database default values" do
    @c.instance_variable_set(:@db_schema, {:i=>{:ruby_default=>2}, :name=>{:ruby_default=>'foo'}, :id=>{:primary_key=>true}})
    c = Class.new(@c)
    c.create
    @db.sqls.must_equal ["INSERT INTO people (i, name) VALUES (2, 'foo')", "SELECT * FROM people WHERE (id = 1) LIMIT 1"]
  end

  it "should not set defaults for unparseable dataset default values" do
    @c.instance_variable_set(:@db_schema, {:i=>{:default=>'f(x)'}, :name=>{:ruby_default=>'foo'}, :id=>{:primary_key=>true}})
    c = Class.new(@c)
    c.create
    @db.sqls.must_equal ["INSERT INTO people (name) VALUES ('foo')", "SELECT * FROM people WHERE (id = 1) LIMIT 1"]
  end

  it "should save all fields when updating" do
    @p.update(:i=>3)
    @db.sqls.must_equal ["UPDATE people SET name = 'foo', i = 3 WHERE (id = 1)"]
  end

  it "should work with abstract classes" do
    c = Class.new(Sequel::Model)
    c.plugin :prepared_statements_safe
    c1 = Class.new(c)
    def c1.get_db_schema; @db_schema = {:i=>{:default=>'f(x)'}, :name=>{:ruby_default=>'foo'}, :id=>{:primary_key=>true}} end
    c1.set_dataset(:people)
    c1.prepared_statements_column_defaults.must_equal(:name=>'foo')
    Class.new(c1).prepared_statements_column_defaults.must_equal(:name=>'foo')
  end

  it "should freeze prepared statement column defaults when freezing model class" do
    @c.freeze
    @c.prepared_statements_column_defaults.frozen?.must_equal true
  end
end
