require_relative "spec_helper"

describe "instance_filters plugin" do
  before do
    @c = Class.new(Sequel::Model(:people))
    @c.columns :id, :name, :num
    @c.plugin :instance_filters
    @p = @c.load(:id=>1, :name=>'John', :num=>1)
    DB.sqls
  end

  it "should raise an error when updating a stale record" do
    @p.update(:name=>'Bob')
    DB.sqls.must_equal ["UPDATE people SET name = 'Bob' WHERE (id = 1)"]
    @p.instance_filter(:name=>'Jim')
    @p.instance_variable_set(:@this, @p.this.with_numrows(0))
    proc{@p.update(:name=>'Joe')}.must_raise(Sequel::Plugins::InstanceFilters::Error)
    DB.sqls.must_equal ["UPDATE people SET name = 'Joe' WHERE ((id = 1) AND (name = 'Jim'))"]
  end 

  it "should raise an error when destroying a stale record" do
    @p.destroy
    DB.sqls.must_equal ["DELETE FROM people WHERE id = 1"]
    @p.instance_filter(:name=>'Jim')
    @p.instance_variable_set(:@this, @p.this.with_numrows(0))
    proc{@p.destroy}.must_raise(Sequel::Plugins::InstanceFilters::Error)
    DB.sqls.must_equal ["DELETE FROM people WHERE ((id = 1) AND (name = 'Jim'))"]
  end 
  
  it "should work when using the prepared_statements plugin" do
    @c.plugin :prepared_statements

    @p.update(:name=>'Bob')
    DB.sqls.must_equal ["UPDATE people SET name = 'Bob' WHERE (id = 1)"]
    @p.instance_filter(:name=>'Jim')
    @p.instance_variable_set(:@this, @p.this.with_numrows(0))
    proc{@p.update(:name=>'Joe')}.must_raise(Sequel::Plugins::InstanceFilters::Error)
    DB.sqls.must_equal ["UPDATE people SET name = 'Joe' WHERE ((id = 1) AND (name = 'Jim'))"]

    @p = @c.load(:id=>1, :name=>'John', :num=>1)
    @p.instance_variable_set(:@this, @p.this.with_numrows(1))
    @c.instance_variable_set(:@fast_instance_delete_sql, nil)
    @p.destroy
    DB.sqls.must_equal ["DELETE FROM people WHERE (id = 1)"]
    @p.instance_filter(:name=>'Jim')
    @p.instance_variable_set(:@this, @p.this.with_numrows(0))
    proc{@p.destroy}.must_raise(Sequel::Plugins::InstanceFilters::Error)
    DB.sqls.must_equal ["DELETE FROM people WHERE ((id = 1) AND (name = 'Jim'))"]
    
    @c.create.must_be_kind_of(@c)
  end 
  
  it "should apply all instance filters" do
    @p.instance_filter(:name=>'Jim')
    @p.instance_filter{num > 2}
    @p.update(:name=>'Bob')
    DB.sqls.must_equal ["UPDATE people SET name = 'Bob' WHERE ((id = 1) AND (name = 'Jim') AND (num > 2))"]
  end 

  it "should drop instance filters after updating" do
    @p.instance_filter(:name=>'Joe')
    @p.update(:name=>'Joe')
    DB.sqls.must_equal ["UPDATE people SET name = 'Joe' WHERE ((id = 1) AND (name = 'Joe'))"]
    @p.update(:name=>'Bob')
    DB.sqls.must_equal ["UPDATE people SET name = 'Bob' WHERE (id = 1)"]
  end

  it "shouldn't allow instance filters on frozen objects" do
    @p.instance_filter(:name=>'Joe')
    @p.freeze
    proc{@p.instance_filter(:name=>'Jim')}.must_raise
  end 

  it "should have dup duplicate internal structures" do
    @p.instance_filter(:name=>'Joe')
    @p.dup.send(:instance_filters).must_equal @p.send(:instance_filters)
    @p.dup.send(:instance_filters).wont_be_same_as(@p.send(:instance_filters))
  end 
end
