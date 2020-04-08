require_relative "spec_helper"
require 'yaml'

describe "serialization_modification_detection plugin" do
  before do
    @ds = Sequel.mock(:fetch=>{:id=>1, :a=>'a'.dup, :b=>1, :c=>['a'.dup], :d=>{'b'=>'c'.dup}}, :numrows=>1, :autoid=>1)[:items]
    @c = Class.new(Sequel::Model(@ds))
    @c.plugin :modification_detection
    @c.columns :a, :b, :c, :d
    @o = @c.first
    @ds.db.sqls
  end
  
  it "should detect setting new column values on new objects" do
    @o = @c.new
    @o.changed_columns.must_equal []
    @o.a = 'c'
    @o.changed_columns.must_equal [:a]
  end

  it "should only detect columns that have been changed" do
    @o.changed_columns.must_equal []
    @o.a << 'b'
    @o.changed_columns.must_equal [:a]
    @o.a.replace('a') 
    @o.changed_columns.must_equal []

    @o.values[:b] = 2
    @o.changed_columns.must_equal [:b]
    @o.values[:b] = 1
    @o.changed_columns.must_equal []

    @o.c[0] << 'b'
    @o.d['b'] << 'b'
    @o.changed_columns.sort_by{|c| c.to_s}.must_equal [:c, :d]
    @o.c[0] = 'a'
    @o.changed_columns.must_equal [:d]
    @o.d['b'] = 'c'
    @o.changed_columns.must_equal []
  end
  
  it "should detect columns that have been changed on frozen objects" do
    @o.freeze
    @o.a << 'b'
    @o.changed_columns.must_equal [:a]
  end

  it "should not list a column twice" do
    @o.a = 'b'.dup
    @o.a << 'a'
    @o.changed_columns.must_equal [:a]
  end
  
  it "should report correct changed_columns after updating" do
    @o.a << 'a'
    @o.save_changes
    @o.changed_columns.must_equal []

    @o.values[:b] = 2
    @o.save_changes
    @o.changed_columns.must_equal []

    @o.c[0] << 'b'
    @o.save_changes
    @o.changed_columns.must_equal []

    @o.d['b'] << 'a'
    @o.save_changes
    @o.changed_columns.must_equal []

    @ds.db.sqls.must_equal ["UPDATE items SET a = 'aa' WHERE (id = 1)",
                       "UPDATE items SET b = 2 WHERE (id = 1)",
                       "UPDATE items SET c = ('ab') WHERE (id = 1)",
                       "UPDATE items SET d = ('b' = 'ca') WHERE (id = 1)"]
  end

  it "should report correct changed_columns after creating new object" do
    o = @c.create
    o.changed_columns.must_equal []
    o.a << 'a'
    o.changed_columns.must_equal [:a]
    @ds.db.sqls.must_equal ["INSERT INTO items DEFAULT VALUES", "SELECT * FROM items WHERE (id = 1) LIMIT 1"]
  end

  it "should report correct changed_columns after refreshing existing object" do
    @o.a << 'a'
    @o.changed_columns.must_equal [:a]
    @o.refresh
    @o.changed_columns.must_equal []
    @o.a << 'a'
    @o.changed_columns.must_equal [:a]
  end
end
