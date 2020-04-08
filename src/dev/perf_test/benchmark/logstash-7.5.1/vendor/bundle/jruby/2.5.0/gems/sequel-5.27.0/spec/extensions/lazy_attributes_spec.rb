require_relative "spec_helper"
require 'yaml'

describe "Sequel::Plugins::LazyAttributes" do
  before do
    @db = Sequel.mock
    def @db.supports_schema_parsing?() true end
    def @db.schema(*a) [[:id, {:type=>:integer}], [:name,{:type=>:string}]] end
    class ::LazyAttributesModel < Sequel::Model(@db[:la])
      plugin :lazy_attributes
      set_columns([:id, :name])
      def self.columns; [:id, :name] end
      lazy_attributes :name
      def self.columns; [:id] end
      set_dataset dataset.with_fetch(proc do |sql|
        if sql !~ /WHERE/
          if sql =~ /name/
            [{:id=>1, :name=>'1'}, {:id=>2, :name=>'2'}]
          else
            [{:id=>1}, {:id=>2}]
          end
        else
          if sql =~ /id IN \(([\d, ]+)\)/
            $1.split(', ')
          elsif sql =~ /id = (\d)/
            [$1]
          end.map do |x|
            if sql =~ /SELECT (la.)?name FROM/
              {:name=>x.to_s}
            else
              {:id=>x.to_i, :name=>x.to_s}
            end
          end
        end
      end)
    end
    @c = ::LazyAttributesModel
    @ds = LazyAttributesModel.dataset
    @db.sqls
  end
  after do
    Object.send(:remove_const, :LazyAttributesModel)
  end
  
  it "should allowing adding additional lazy attributes via plugin :lazy_attributes" do
    @c.set_dataset(@ds.select(:id, :blah))
    @c.dataset.sql.must_equal 'SELECT id, blah FROM la'
    @c.plugin :lazy_attributes, :blah
    @c.dataset.sql.must_equal 'SELECT id FROM la'
  end
  
  it "should allowing adding additional lazy attributes via lazy_attributes" do
    @c.set_dataset(@ds.select(:id, :blah))
    @c.dataset.sql.must_equal 'SELECT id, blah FROM la'
    @c.lazy_attributes :blah
    @c.dataset.sql.must_equal 'SELECT id FROM la'
  end

  it "should handle lazy attributes that are qualified in the selection" do
    @c.set_dataset(@ds.select(Sequel[:la][:id], Sequel[:la][:blah]))
    @c.dataset.sql.must_equal 'SELECT la.id, la.blah FROM la'
    @c.plugin :lazy_attributes, :blah
    @c.dataset.sql.must_equal 'SELECT la.id FROM la'
  end
  
  with_symbol_splitting "should handle lazy attributes that are qualified in the selection using symbol splitting" do
    @c.set_dataset(@ds.select(:la__id, :la__blah))
    @c.dataset.sql.must_equal 'SELECT la.id, la.blah FROM la'
    @c.plugin :lazy_attributes, :blah
    @c.dataset.sql.must_equal 'SELECT la.id FROM la'
  end
  
  it "should remove the attributes given from the SELECT columns of the model's dataset" do
    @ds.sql.must_equal 'SELECT la.id FROM la'
  end

  it "should still typecast correctly in lazy loaded column setters" do
    m = @c.new
    m.name = 1
    m.name.must_equal '1'
  end

  it "should raise error if the model has no primary key" do
    m = @c.first
    @c.no_primary_key
    proc{m.name}.must_raise(Sequel::Error)
  end

  it "should lazily load the attribute for a single model object" do
    m = @c.first
    m.values.must_equal(:id=>1)
    m.name.must_equal '1'
    m.values.must_equal(:id=>1, :name=>'1')
    @db.sqls.must_equal ['SELECT la.id FROM la LIMIT 1', 'SELECT la.name FROM la WHERE (id = 1) LIMIT 1']
  end

  it "should lazily load the attribute for a frozen model object" do
    m = @c.first
    m.freeze
    m.name.must_equal '1'
    @db.sqls.must_equal ['SELECT la.id FROM la LIMIT 1', 'SELECT la.name FROM la WHERE (id = 1) LIMIT 1']
    m.name.must_equal '1'
    @db.sqls.must_equal ['SELECT la.name FROM la WHERE (id = 1) LIMIT 1']
  end

  it "should not lazily load the attribute for a single model object if the value already exists" do
    m = @c.first
    m.values.must_equal(:id=>1)
    m[:name] = '1'
    m.name.must_equal '1'
    m.values.must_equal(:id=>1, :name=>'1')
    @db.sqls.must_equal ['SELECT la.id FROM la LIMIT 1']
  end

  it "should not lazily load the attribute for a single model object if it is a new record" do
    m = @c.new
    m.values.must_equal({})
    m.name.must_be_nil
    @db.sqls.must_equal []
  end

  it "should eagerly load the attribute for all model objects reteived with it" do
    ms = @c.all
    ms.map{|m| m.values}.must_equal [{:id=>1}, {:id=>2}]
    ms.map{|m| m.name}.must_equal %w'1 2'
    ms.map{|m| m.values}.must_equal [{:id=>1, :name=>'1'}, {:id=>2, :name=>'2'}]
    sqls = @db.sqls
    ['SELECT la.id, la.name FROM la WHERE (la.id IN (1, 2))',
     'SELECT la.id, la.name FROM la WHERE (la.id IN (2, 1))'].must_include(sqls.pop)
    sqls.must_equal ['SELECT la.id FROM la']
  end

  it "should not eagerly load the attribute if model instance is frozen, and deal with other frozen instances if not frozen" do
    ms = @c.all
    ms.first.freeze
    ms.map{|m| m.name}.must_equal %w'1 2'
    @db.sqls.must_equal ['SELECT la.id FROM la', 'SELECT la.name FROM la WHERE (id = 1) LIMIT 1', 'SELECT la.id, la.name FROM la WHERE (la.id IN (2))']
  end

  it "should add the accessors to a module included in the class, so they can be easily overridden" do
    @c.class_eval do
      def name
        "#{super}-blah"
      end
    end
    ms = @c.all
    ms.map{|m| m.values}.must_equal [{:id=>1}, {:id=>2}]
    ms.map{|m| m.name}.must_equal %w'1-blah 2-blah'
    ms.map{|m| m.values}.must_equal [{:id=>1, :name=>'1'}, {:id=>2, :name=>'2'}]
    sqls = @db.sqls
    ['SELECT la.id, la.name FROM la WHERE (la.id IN (1, 2))',
     'SELECT la.id, la.name FROM la WHERE (la.id IN (2, 1))'].must_include(sqls.pop)
    sqls.must_equal ['SELECT la.id FROM la']
  end

  it "should work with the serialization plugin" do
    @c.plugin :serialization, :yaml, :name
    @ds = @c.dataset = @ds.with_fetch([[{:id=>1}, {:id=>2}], [{:id=>1, :name=>"--- 3\n"}, {:id=>2, :name=>"--- 6\n"}], [{:id=>1}], [{:name=>"--- 3\n"}]])
    ms = @ds.all
    ms.map{|m| m.values}.must_equal [{:id=>1}, {:id=>2}]
    ms.map{|m| m.name}.must_equal [3,6]
    ms.map{|m| m.values}.must_equal [{:id=>1, :name=>"--- 3\n"}, {:id=>2, :name=>"--- 6\n"}]
    ms.map{|m| m.deserialized_values}.must_equal [{:name=>3}, {:name=>6}]
    ms.map{|m| m.name}.must_equal [3,6]
    sqls = @db.sqls
    ['SELECT la.id, la.name FROM la WHERE (la.id IN (1, 2))',
     'SELECT la.id, la.name FROM la WHERE (la.id IN (2, 1))'].must_include(sqls.pop)
    sqls.must_equal ['SELECT la.id FROM la']
    m = @ds.first
    m.values.must_equal(:id=>1)
    m.name.must_equal 3
    m.values.must_equal(:id=>1, :name=>"--- 3\n")
    m.deserialized_values.must_equal(:name=>3)
    m.name.must_equal 3
    @db.sqls.must_equal ["SELECT la.id FROM la LIMIT 1", "SELECT la.name FROM la WHERE (id = 1) LIMIT 1"]
  end

  it "should not allow additional lazy attributes after freezing" do
    @c.plugin :lazy_attributes, :blah
    @c.freeze
    proc{@c.lazy_attributes :name}.must_raise RuntimeError, TypeError
  end
end
