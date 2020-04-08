require_relative "spec_helper"

describe "constraint_validations extension" do
  def parse_insert(s)
    m = /\AINSERT INTO "?sequel_constraint_validations"? \("?(.*)"?\) VALUES \((.*)\)\z/.match(s)
    Hash[*m[1].split(/"?, "?/).map{|v| v.to_sym}.zip(m[2].split(/"?, "?/).map{|v| parse_insert_value(v)}).reject{|k, v| v.nil?}.flatten]
  end

  def parse_insert_value(s)
    case s
    when 'NULL'
      nil
    when /\A'(.*)'\z/
      $1
    else
      raise Sequel::Error, "unhandled insert value: #{s.inspect}"
    end
  end

  before do
    @db = Sequel.mock
    @db.extend(Module.new{attr_writer :schema; def schema(table, *) execute("parse schema for #{table}"); @schema; end})
    def @db.table_exists?(_) true; end
    @db.extension(:constraint_validations)
  end

  it "should allow creating the sequel_constraint_validations table" do
    @db.create_constraint_validations_table
    @db.sqls.must_equal ["CREATE TABLE sequel_constraint_validations (table varchar(255) NOT NULL, constraint_name varchar(255), validation_type varchar(255) NOT NULL, column varchar(255) NOT NULL, argument varchar(255), message varchar(255), allow_nil boolean)"]
  end

  it "should allow creating the sequel_constraint_validations table with a non-default table name" do
    @db.constraint_validations_table = :foo
    @db.create_constraint_validations_table
    @db.sqls.must_equal ["CREATE TABLE foo (table varchar(255) NOT NULL, constraint_name varchar(255), validation_type varchar(255) NOT NULL, column varchar(255) NOT NULL, argument varchar(255), message varchar(255), allow_nil boolean)"]
  end

  it "should allow dropping the sequel_constraint_validations table" do
    @db.drop_constraint_validations_table
    @db.sqls.must_equal ["DELETE FROM sequel_constraint_validations WHERE (table = 'sequel_constraint_validations')", "DROP TABLE sequel_constraint_validations"]
  end

  it "should allow dropping the sequel_constraint_validations table with a non-default table name" do
    @db.constraint_validations_table = :foo
    @db.drop_constraint_validations_table
    @db.sqls.must_equal ["DELETE FROM foo WHERE (table = 'foo')", "DROP TABLE foo"]
  end

  it "should allow dropping validations for a given table" do
    @db.drop_constraint_validations_for(:table=>:foo)
    @db.sqls.must_equal ["DELETE FROM sequel_constraint_validations WHERE (table = 'foo')"]
  end

  it "should drop validations for a given table when dropping the table" do
    @db.drop_table(:foo)
    @db.sqls.must_equal ["DELETE FROM sequel_constraint_validations WHERE (table = 'foo')", "DROP TABLE foo"]

    @db.drop_table(:foo, :if_exists => true)
    @db.sqls.must_equal ["DELETE FROM sequel_constraint_validations WHERE (table = 'foo')", "DROP TABLE IF EXISTS foo"]

    @db.drop_table?(:foo)
    @db.sqls.must_equal ["DELETE FROM sequel_constraint_validations WHERE (table = 'foo')", "DROP TABLE foo"]
  end

  it "should not drop validations for a given table if the constraint validations table does not exist" do
    def @db.table_exists?(_) false; end
    @db.drop_table(:foo)
    @db.sqls.must_equal ["DROP TABLE foo"]
  end

  it "should allow dropping validations for a given table and column" do
    @db.drop_constraint_validations_for(:table=>:foo, :column=>:bar)
    @db.sqls.must_equal ["DELETE FROM sequel_constraint_validations WHERE ((table = 'foo') AND (column = 'bar'))"]
  end

  it "should allow dropping validations for a given table and constraint" do
    @db.drop_constraint_validations_for(:table=>:foo, :constraint=>:bar)
    @db.sqls.must_equal ["DELETE FROM sequel_constraint_validations WHERE ((table = 'foo') AND (constraint_name = 'bar'))"]
  end

  it "should allow dropping validations for a non-default constraint_validations table" do
    @db.constraint_validations_table = :cv
    @db.drop_constraint_validations_for(:table=>:foo)
    @db.sqls.must_equal ["DELETE FROM cv WHERE (table = 'foo')"]
  end

  it "should raise an error without deleting if attempting to drop validations without table, column, or constraint" do
    proc{@db.drop_constraint_validations_for({})}.must_raise(Sequel::Error)
    @db.sqls.must_equal []
  end

  it "should allow adding constraint validations via create_table validate" do
    @db.create_table(:foo){String :name; validate{presence :name}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"presence", :column=>"name", :table=>"foo")
    sqls.must_equal ["BEGIN", "COMMIT", "CREATE TABLE foo (name varchar(255), CHECK ((name IS NOT NULL) AND (trim(name) != '')))"]
  end

  it "should allow adding constraint validations via alter_table validate" do
    @db.schema = [[:name, {:type=>:string}]]
    @db.alter_table(:foo){validate{presence :name}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(2)).must_equal(:validation_type=>"presence", :column=>"name", :table=>"foo")
    sqls.must_equal ["parse schema for foo", "BEGIN", "COMMIT", "ALTER TABLE foo ADD CHECK ((name IS NOT NULL) AND (trim(name) != ''))"]
  end

  it "should handle :message option when adding validations" do
    @db.create_table(:foo){String :name; validate{presence :name, :message=>'not there'}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"presence", :column=>"name", :table=>"foo", :message=>'not there')
    sqls.must_equal ["BEGIN", "COMMIT", "CREATE TABLE foo (name varchar(255), CHECK ((name IS NOT NULL) AND (trim(name) != '')))"]
  end

  it "should handle :allow_nil option when adding validations" do
    @db.create_table(:foo){String :name; validate{presence :name, :allow_nil=>true}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"presence", :column=>"name", :table=>"foo", :allow_nil=>'t')
    sqls.must_equal ["BEGIN", "COMMIT", "CREATE TABLE foo (name varchar(255), CHECK ((name IS NULL) OR (trim(name) != '')))"]
  end

  it "should handle :name option when adding validations" do
    @db.create_table(:foo){String :name; validate{presence :name, :name=>'cons'}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"presence", :column=>"name", :table=>"foo", :constraint_name=>'cons')
    sqls.must_equal ["BEGIN", "COMMIT", "CREATE TABLE foo (name varchar(255), CONSTRAINT cons CHECK ((name IS NOT NULL) AND (trim(name) != '')))"]
  end

  it "should handle multiple string columns when adding presence validations" do
    @db.create_table(:foo){String :name; String :bar; validate{presence [:name, :bar]}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"presence", :column=>"name", :table=>"foo")
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"presence", :column=>"bar", :table=>"foo")
    sqls.must_equal ["BEGIN", "COMMIT", "CREATE TABLE foo (name varchar(255), bar varchar(255), CHECK ((name IS NOT NULL) AND (trim(name) != '') AND (bar IS NOT NULL) AND (trim(bar) != '')))"]
  end

  it "should handle multiple string columns when adding presence validations with :allow_nil" do
    @db.create_table(:foo){String :name; String :bar; validate{presence [:name, :bar], :allow_nil=>true}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"presence", :column=>"name", :table=>"foo", :allow_nil=>'t')
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"presence", :column=>"bar", :table=>"foo", :allow_nil=>'t')
    sqls.must_equal ["BEGIN", "COMMIT", "CREATE TABLE foo (name varchar(255), bar varchar(255), CHECK (((name IS NULL) OR (trim(name) != '')) AND ((bar IS NULL) OR (trim(bar) != ''))))"]
  end

  it "should handle multiple string columns when adding presence validations" do
    @db.create_table(:foo){String :name; Integer :x; String :bar; validate{presence [:name, :x, :bar]}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"presence", :column=>"name", :table=>"foo")
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"presence", :column=>"x", :table=>"foo")
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"presence", :column=>"bar", :table=>"foo")
    sqls.must_equal ["BEGIN", "COMMIT", "CREATE TABLE foo (name varchar(255), x integer, bar varchar(255), CHECK ((name IS NOT NULL) AND (trim(name) != '') AND (bar IS NOT NULL) AND (trim(bar) != '') AND (x IS NOT NULL)))"]
  end

  it "should handle multiple string columns when adding presence validations with :allow_nil" do
    @db.create_table(:foo){String :name; Integer :x; String :bar; validate{presence [:name, :x, :bar], :allow_nil=>true}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"presence", :column=>"name", :table=>"foo", :allow_nil=>'t')
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"presence", :column=>"x", :table=>"foo", :allow_nil=>'t')
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"presence", :column=>"bar", :table=>"foo", :allow_nil=>'t')
    sqls.must_equal ["BEGIN", "COMMIT", "CREATE TABLE foo (name varchar(255), x integer, bar varchar(255), CHECK (((name IS NULL) OR (trim(name) != '')) AND ((bar IS NULL) OR (trim(bar) != ''))))"]
  end

  it "should handle presence validation on non-String columns" do
    @db.create_table(:foo){Integer :name; validate{presence :name}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"presence", :column=>"name", :table=>"foo")
    sqls.must_equal ["BEGIN", "COMMIT", "CREATE TABLE foo (name integer, CHECK (name IS NOT NULL))"]

    @db.schema = [[:name, {:type=>:integer}]]
    @db.alter_table(:foo){validate{presence :name}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(2)).must_equal(:validation_type=>"presence", :column=>"name", :table=>"foo")
    sqls.must_equal ["parse schema for foo", "BEGIN", "COMMIT", "ALTER TABLE foo ADD CHECK (name IS NOT NULL)"]
  end

  it "should handle presence validation on Oracle with IS NOT NULL instead of != ''" do
    @db = Sequel.mock(:host=>'oracle')
    @db.extend_datasets do
      def quote_identifiers?; false end
      def input_identifier(v) v.to_s end
    end
    @db.extension(:constraint_validations)
    @db.create_table(:foo){String :name; validate{presence :name}}
    sqls = @db.sqls
    s = sqls.slice!(1).upcase
    m = /\AINSERT INTO sequel_constraint_validations \((.*)\) SELECT (.*) FROM DUAL\z/i.match(s)
    Hash[*m[1].split(', ').map{|v| v.downcase.to_sym}.zip(m[2].split(', ').map{|v| parse_insert_value(v.downcase.gsub('null', 'NULL'))}).reject{|k, v| v.nil?}.flatten].must_equal(:validation_type=>"presence", :column=>"name", :table=>"foo")
    sqls.must_equal ["BEGIN", "COMMIT", 'CREATE TABLE foo (name varchar(255), CHECK ((name IS NOT NULL) AND (trim(name) IS NOT NULL)))']
  end

  it "should assume column is not a String if it can't determine the type" do
    @db.create_table(:foo){Integer :name; validate{presence :bar}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"presence", :column=>"bar", :table=>"foo")
    sqls.must_equal ["BEGIN", "COMMIT", "CREATE TABLE foo (name integer, CHECK (bar IS NOT NULL))"]

    @db.schema = [[:name, {:type=>:integer}]]
    @db.alter_table(:foo){validate{presence :bar}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(2)).must_equal(:validation_type=>"presence", :column=>"bar", :table=>"foo")
    sqls.must_equal ["parse schema for foo", "BEGIN", "COMMIT", "ALTER TABLE foo ADD CHECK (bar IS NOT NULL)"]
  end

  it "should handle presence validation on non-String columns with :allow_nil option" do
    @db.create_table(:foo){Integer :name; validate{presence :name, :allow_nil=>true}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"presence", :column=>"name", :table=>"foo", :allow_nil=>'t')
    sqls.must_equal ["BEGIN", "COMMIT", "CREATE TABLE foo (name integer)"]
  end

  it "should support :exact_length constraint validation" do
    @db.create_table(:foo){String :name; validate{exact_length 5, :name}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"exact_length", :column=>"name", :table=>"foo", :argument=>'5')
    sqls.must_equal ["BEGIN", "COMMIT", "CREATE TABLE foo (name varchar(255), CHECK ((name IS NOT NULL) AND (char_length(name) = 5)))"]
  end

  it "should support :min_length constraint validation" do
    @db.create_table(:foo){String :name; validate{min_length 5, :name}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"min_length", :column=>"name", :table=>"foo", :argument=>'5')
    sqls.must_equal ["BEGIN", "COMMIT", "CREATE TABLE foo (name varchar(255), CHECK ((name IS NOT NULL) AND (char_length(name) >= 5)))"]
  end

  it "should support :max_length constraint validation" do
    @db.create_table(:foo){String :name; validate{max_length 5, :name}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"max_length", :column=>"name", :table=>"foo", :argument=>'5')
    sqls.must_equal ["BEGIN", "COMMIT", "CREATE TABLE foo (name varchar(255), CHECK ((name IS NOT NULL) AND (char_length(name) <= 5)))"]
  end

  it "should support :length_range constraint validation" do
    @db.create_table(:foo){String :name; validate{length_range 3..5, :name}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"length_range", :column=>"name", :table=>"foo", :argument=>'3..5')
    sqls.must_equal ["BEGIN", "COMMIT", "CREATE TABLE foo (name varchar(255), CHECK ((name IS NOT NULL) AND (char_length(name) >= 3) AND (char_length(name) <= 5)))"]

    @db.create_table(:foo){String :name; validate{length_range 3...5, :name}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"length_range", :column=>"name", :table=>"foo", :argument=>'3...5')
    sqls.must_equal ["BEGIN", "COMMIT", "CREATE TABLE foo (name varchar(255), CHECK ((name IS NOT NULL) AND (char_length(name) >= 3) AND (char_length(name) < 5)))"]
  end

  it "should support :format constraint validation" do
    @db = Sequel.mock(:host=>'postgres')
    @db.extend_datasets{def quote_identifiers?; false end}
    @db.extension(:constraint_validations)
    @db.create_table(:foo){String :name; validate{format(/^foo.*/, :name)}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"format", :column=>"name", :table=>"foo", :argument=>'^foo.*')
    sqls.must_equal ["BEGIN", "COMMIT", %[CREATE TABLE foo (name text, CHECK ((name IS NOT NULL) AND (name ~ '^foo.*')))]]
  end

  it "should support :format constraint validation with case insensitive format" do
    @db = Sequel.mock(:host=>'postgres')
    @db.extend_datasets{def quote_identifiers?; false end}
    @db.extension(:constraint_validations)
    @db.create_table(:foo){String :name; validate{format(/^foo.*/i, :name)}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"iformat", :column=>"name", :table=>"foo", :argument=>'^foo.*')
    sqls.must_equal ["BEGIN", "COMMIT", %[CREATE TABLE foo (name text, CHECK ((name IS NOT NULL) AND (name ~* '^foo.*')))]]
  end

  it "should support :includes constraint validation with an array of strings" do
    @db.create_table(:foo){String :name; validate{includes %w'a b c', :name}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"includes_str_array", :column=>"name", :table=>"foo", :argument=>'a,b,c')
    sqls.must_equal ["BEGIN", "COMMIT", "CREATE TABLE foo (name varchar(255), CHECK ((name IS NOT NULL) AND (name IN ('a', 'b', 'c'))))"]
  end

  it "should support :includes constraint validation with an array of integers" do
    @db.create_table(:foo){String :name; validate{includes [1, 2, 3], :name}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"includes_int_array", :column=>"name", :table=>"foo", :argument=>'1,2,3')
    sqls.must_equal ["BEGIN", "COMMIT", "CREATE TABLE foo (name varchar(255), CHECK ((name IS NOT NULL) AND (name IN (1, 2, 3))))"]
  end

  it "should support :includes constraint validation with a inclusive range of integers" do
    @db.create_table(:foo){String :name; validate{includes 3..5, :name}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"includes_int_range", :column=>"name", :table=>"foo", :argument=>'3..5')
    sqls.must_equal ["BEGIN", "COMMIT", "CREATE TABLE foo (name varchar(255), CHECK ((name IS NOT NULL) AND (name >= 3) AND (name <= 5)))"]
  end

  it "should support :includes constraint validation with a exclusive range of integers" do
    @db.create_table(:foo){String :name; validate{includes 3...5, :name}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"includes_int_range", :column=>"name", :table=>"foo", :argument=>'3...5')
    sqls.must_equal ["BEGIN", "COMMIT", "CREATE TABLE foo (name varchar(255), CHECK ((name IS NOT NULL) AND (name >= 3) AND (name < 5)))"]
  end

  it "should support :like constraint validation" do
    @db.create_table(:foo){String :name; validate{like 'foo%', :name}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"like", :column=>"name", :table=>"foo", :argument=>'foo%')
    sqls.must_equal ["BEGIN", "COMMIT", "CREATE TABLE foo (name varchar(255), CHECK ((name IS NOT NULL) AND (name LIKE 'foo%' ESCAPE '\\')))"]
  end

  it "should support :ilike constraint validation" do
    @db.create_table(:foo){String :name; validate{ilike 'foo%', :name}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"ilike", :column=>"name", :table=>"foo", :argument=>'foo%')
    sqls.must_equal ["BEGIN", "COMMIT", "CREATE TABLE foo (name varchar(255), CHECK ((name IS NOT NULL) AND (UPPER(name) LIKE UPPER('foo%') ESCAPE '\\')))"]
  end

  it "should support :operator :< constraint validation with string" do
    @db.create_table(:foo){String :name; validate{operator :<, 'a', :name}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"str_lt", :column=>"name", :table=>"foo", :argument=>'a')
    sqls.must_equal ["BEGIN", "COMMIT", "CREATE TABLE foo (name varchar(255), CHECK ((name IS NOT NULL) AND (name < 'a')))"]
  end

  it "should support :operator :<= constraint validation with string" do
    @db.create_table(:foo){String :name; validate{operator :<=, 'a', :name}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"str_lte", :column=>"name", :table=>"foo", :argument=>'a')
    sqls.must_equal ["BEGIN", "COMMIT", "CREATE TABLE foo (name varchar(255), CHECK ((name IS NOT NULL) AND (name <= 'a')))"]
  end

  it "should support :operator :> constraint validation with string" do
    @db.create_table(:foo){String :name; validate{operator :>, 'a', :name}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"str_gt", :column=>"name", :table=>"foo", :argument=>'a')
    sqls.must_equal ["BEGIN", "COMMIT", "CREATE TABLE foo (name varchar(255), CHECK ((name IS NOT NULL) AND (name > 'a')))"]
  end

  it "should support :operator :>= constraint validation with string" do
    @db.create_table(:foo){String :name; validate{operator :>=, 'a', :name}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"str_gte", :column=>"name", :table=>"foo", :argument=>'a')
    sqls.must_equal ["BEGIN", "COMMIT", "CREATE TABLE foo (name varchar(255), CHECK ((name IS NOT NULL) AND (name >= 'a')))"]
  end

  it "should support :operator :< constraint validation with integer" do
    @db.create_table(:foo){Integer :name; validate{operator :<, 2, :name}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"int_lt", :column=>"name", :table=>"foo", :argument=>'2')
    sqls.must_equal ["BEGIN", "COMMIT", "CREATE TABLE foo (name integer, CHECK ((name IS NOT NULL) AND (name < 2)))"]
  end

  it "should support :operator :<= constraint validation with integer" do
    @db.create_table(:foo){Integer :name; validate{operator :<=, 2, :name}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"int_lte", :column=>"name", :table=>"foo", :argument=>'2')
    sqls.must_equal ["BEGIN", "COMMIT", "CREATE TABLE foo (name integer, CHECK ((name IS NOT NULL) AND (name <= 2)))"]
  end

  it "should support :operator :> constraint validation with integer" do
    @db.create_table(:foo){Integer :name; validate{operator :>, 2, :name}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"int_gt", :column=>"name", :table=>"foo", :argument=>'2')
    sqls.must_equal ["BEGIN", "COMMIT", "CREATE TABLE foo (name integer, CHECK ((name IS NOT NULL) AND (name > 2)))"]
  end

  it "should support :operator :>= constraint validation with integer" do
    @db.create_table(:foo){Integer :name; validate{operator :>=, 2, :name}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"int_gte", :column=>"name", :table=>"foo", :argument=>'2')
    sqls.must_equal ["BEGIN", "COMMIT", "CREATE TABLE foo (name integer, CHECK ((name IS NOT NULL) AND (name >= 2)))"]
  end

  it "should support :unique constraint validation" do
    @db.create_table(:foo){String :name; validate{unique :name}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"unique", :column=>"name", :table=>"foo")
    sqls.must_equal ["BEGIN", "COMMIT", "CREATE TABLE foo (name varchar(255), UNIQUE (name))"]
  end

  it "should support :unique constraint validation with multiple columns" do
    @db.create_table(:foo){String :name; Integer :id; validate{unique [:name, :id]}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"unique", :column=>"name,id", :table=>"foo")
    sqls.must_equal ["BEGIN", "COMMIT", "CREATE TABLE foo (name varchar(255), id integer, UNIQUE (name, id))"]
  end

  it "should support :unique constraint validation in alter_table" do
    @db.alter_table(:foo){validate{unique :name}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"unique", :column=>"name", :table=>"foo")
    sqls.must_equal ["BEGIN", "COMMIT", "ALTER TABLE foo ADD UNIQUE (name)"]
  end

  it "should drop constraints and validations when dropping a constraint validation" do
    @db.alter_table(:foo){String :name; validate{drop :bar}}
    @db.sqls.must_equal ["DELETE FROM sequel_constraint_validations WHERE ((table, constraint_name) IN (('foo', 'bar')))", "ALTER TABLE foo DROP CONSTRAINT bar"]
  end

  it "should drop constraints and validations before adding new ones" do
    @db.alter_table(:foo){String :name; validate{unique :name; drop :bar}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(2)).must_equal(:validation_type=>"unique", :column=>"name", :table=>"foo")
    sqls.must_equal ["DELETE FROM sequel_constraint_validations WHERE ((table, constraint_name) IN (('foo', 'bar')))", "BEGIN", "COMMIT", "ALTER TABLE foo ADD UNIQUE (name)", "ALTER TABLE foo DROP CONSTRAINT bar"]
  end

  it "should raise an error if attempting to validate inclusion with a range of non-integers" do
    proc{@db.create_table(:foo){String :name; validate{includes 'a'..'z', :name}}}.must_raise(Sequel::Error)
  end

  it "should raise an error if attempting to validate inclusion with a range of non-integers or strings" do
    proc{@db.create_table(:foo){String :name; validate{includes [1.0, 2.0], :name}}}.must_raise(Sequel::Error)
  end

  it "should raise an error if attempting to validate inclusion with a unsupported object" do
    proc{@db.create_table(:foo){String :name; validate{includes 'a', :name}}}.must_raise(Sequel::Error)
  end

  it "should raise an error if attempting attempting to process an operator validation with an unsupported operator" do
    proc{@db.alter_table(:foo){String :name;  validate{operator :===, 'a', :name}}}.must_raise(Sequel::Error)
  end

  it "should raise an error if attempting attempting to process an operator validation with an unsupported argument" do
    proc{@db.alter_table(:foo){String :name;  validate{operator :>, [], :name}}}.must_raise(Sequel::Error)
  end

  it "should raise an error if attempting to drop a constraint validation in a create_table generator" do
    proc{@db.create_table(:foo){String :name; validate{drop :foo}}}.must_raise(Sequel::Error)
  end

  it "should raise an error if attempting to drop a constraint validation without a name" do
    proc{@db.alter_table(:foo){String :name; validate{drop nil}}}.must_raise(Sequel::Error)
  end

  it "should raise an error if attempting attempting to process a constraint validation with an unsupported type" do
    proc{@db.alter_table(:foo){String :name; validations << {:type=>:foo}}}.must_raise(Sequel::Error)
  end

  it "should allow adding constraint validations for tables specified as a SQL::Identifier" do
    @db.create_table(Sequel.identifier(:sch__foo)){String :name; validate{presence :name}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"presence", :column=>"name", :table=>"sch__foo")
    sqls.must_equal ["BEGIN", "COMMIT", "CREATE TABLE sch__foo (name varchar(255), CHECK ((name IS NOT NULL) AND (trim(name) != '')))"]
  end

  it "should allow adding constraint validations for tables specified as a SQL::QualifiedIdentifier" do
    @db.create_table(Sequel.qualify(:sch, :foo)){String :name; validate{presence :name}}
    sqls = @db.sqls
    parse_insert(sqls.slice!(1)).must_equal(:validation_type=>"presence", :column=>"name", :table=>"sch.foo")
    sqls.must_equal ["BEGIN", "COMMIT", "CREATE TABLE sch.foo (name varchar(255), CHECK ((name IS NOT NULL) AND (trim(name) != '')))"]
  end
end
