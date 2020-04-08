require_relative "spec_helper"

describe "DB#create_table" do
  before do
    @db = Sequel.mock
  end
  
  it "should accept the table name" do
    @db.create_table(:cats){}.must_be_nil
    @db.sqls.must_equal ['CREATE TABLE cats ()']
  end

  with_symbol_splitting "should accept the table name with splittable symbols" do
    @db.create_table(:cats__cats) {}
    @db.sqls.must_equal ['CREATE TABLE cats.cats ()']
  end

  it "should accept the table name in multiple formats" do
    @db.create_table(Sequel[:cats][:cats]) {}
    @db.create_table("cats__cats1") {}
    @db.create_table(Sequel.identifier(:cats__cats2)) {}
    @db.create_table(Sequel.qualify(:cats3, :cats)) {}
    @db.sqls.must_equal ['CREATE TABLE cats.cats ()', 'CREATE TABLE cats__cats1 ()', 'CREATE TABLE cats__cats2 ()', 'CREATE TABLE cats3.cats ()']
  end

  it "should raise an error if the table name argument is not valid" do
    proc{@db.create_table(1) {}}.must_raise(Sequel::Error)
    proc{@db.create_table(Sequel.as(:cats, :c)) {}}.must_raise(Sequel::Error)
  end

  it "should remove cached schema entry" do
    @db.instance_variable_set(:@schemas, {'cats'=>[]})
    @db.create_table(:cats){Integer :a}
    @db.instance_variable_get(:@schemas).must_be :empty?
  end
  
  it "should accept multiple columns" do
    @db.create_table(:cats) do
      column :id, :integer
      column :name, :text
    end
    @db.sqls.must_equal ['CREATE TABLE cats (id integer, name text)']
  end
  
  it "should accept method calls as data types" do
    @db.create_table(:cats) do
      integer :id
      text :name
    end
    @db.sqls.must_equal ['CREATE TABLE cats (id integer, name text)']
  end
  
  it "should transform types given as ruby classes to database-specific types" do
    @db.create_table(:cats) do
      String :a
      Integer :b
      Fixnum :c
      Bignum :d
      Float :e
      BigDecimal :f
      Date :g
      DateTime :h
      Time :i
      Numeric :j
      File :k
      TrueClass :l
      FalseClass :m
      column :n, Integer
      primary_key :o, :type=>String
      foreign_key :p, :f, :type=>Date
    end
    @db.sqls.must_equal ['CREATE TABLE cats (o varchar(255) PRIMARY KEY AUTOINCREMENT, a varchar(255), b integer, c integer, d bigint, e double precision, f numeric, g date, h timestamp, i timestamp, j numeric, k blob, l boolean, m boolean, n integer, p date REFERENCES f)']
  end

  it "should transform types given as ruby classes to database-specific types" do
    @db.default_string_column_size = 50
    @db.create_table(:cats) do
      String :a
      String :a2, :size=>13
      String :a3, :fixed=>true
      String :a4, :size=>13, :fixed=>true
      String :a5, :text=>true
      varchar :a6
      varchar :a7, :size=>13
    end
    @db.sqls.must_equal ['CREATE TABLE cats (a varchar(50), a2 varchar(13), a3 char(50), a4 char(13), a5 text, a6 varchar(50), a7 varchar(13))']
  end

  it "should allow the use of modifiers with ruby class types" do
    @db.create_table(:cats) do
      String :a, :size=>50
      String :b, :text=>true
      String :c, :fixed=>true, :size=>40
      Time :d, :only_time=>true
      BigDecimal :e, :size=>[11,2]
    end
    @db.sqls.must_equal ['CREATE TABLE cats (a varchar(50), b text, c char(40), d time, e numeric(11, 2))']
  end

  it "should allow the use of modifiers with ruby class types" do
    c = Class.new
    def c.name; 'Fixnum'; end
    @db.create_table(:cats) do
      column :a, c
    end
    @db.sqls.must_equal ['CREATE TABLE cats (a integer)']
  end

  it "should raise an error if you use a ruby class that isn't handled" do
    proc{@db.create_table(:cats){column :a, Class}}.must_raise(Sequel::Error)
  end

  it "should accept primary key definition" do
    @db.create_table(:cats) do
      primary_key :id
    end
    @db.sqls.must_equal ['CREATE TABLE cats (id integer PRIMARY KEY AUTOINCREMENT)']

    @db.create_table(:cats) do
      primary_key :id, :serial, :auto_increment => false
    end
    @db.sqls.must_equal ['CREATE TABLE cats (id serial PRIMARY KEY)']

    @db.create_table(:cats) do
      primary_key :id, :type => :serial, :auto_increment => false
    end
    @db.sqls.must_equal ['CREATE TABLE cats (id serial PRIMARY KEY)']

    @db.create_table(:cats) do
      Integer :a
      primary_key :id
    end
    @db.sqls.must_equal ['CREATE TABLE cats (id integer PRIMARY KEY AUTOINCREMENT, a integer)']

    @db.create_table(:cats) do
      Integer :a
      primary_key :id, :keep_order=>true
    end
    @db.sqls.must_equal ['CREATE TABLE cats (a integer, id integer PRIMARY KEY AUTOINCREMENT)']
  end

  it "should allow naming primary key constraint with :primary_key_constraint_name option" do
    @db.create_table(:cats) do
      primary_key :id, :primary_key_constraint_name=>:foo
    end
    @db.sqls.must_equal ['CREATE TABLE cats (id integer CONSTRAINT foo PRIMARY KEY AUTOINCREMENT)']
  end

  it "should automatically set primary key column NOT NULL if database doesn't do it automatically" do
    def @db.can_add_primary_key_constraint_on_nullable_columns?; false end
    @db.create_table(:cats) do
      primary_key :id
    end
    @db.sqls.must_equal ['CREATE TABLE cats (id integer NOT NULL PRIMARY KEY AUTOINCREMENT)']
  end

  it "should automatically set primary key column NOT NULL when adding constraint if database doesn't do it automatically" do
    def @db.can_add_primary_key_constraint_on_nullable_columns?; false end
    @db.create_table(:cats) do
      String :id
      primary_key [:id]
    end
    @db.sqls.must_equal ['CREATE TABLE cats (id varchar(255) NOT NULL, PRIMARY KEY (id))']
  end

  it "should handling splitting named column constraints into table constraints if unsupported" do
    def @db.supports_named_column_constraints?; false end
    @db.create_table(:cats) do
      primary_key :id, :primary_key_constraint_name=>:foo
      foreign_key :cat_id, :cats, :unique=>true, :unique_constraint_name=>:bar, :foreign_key_constraint_name=>:baz, :deferrable=>true, :key=>:foo_id, :on_delete=>:cascade, :on_update=>:restrict
    end
    @db.sqls.must_equal ['CREATE TABLE cats (id integer AUTOINCREMENT, cat_id integer, CONSTRAINT foo PRIMARY KEY (id), CONSTRAINT baz FOREIGN KEY (cat_id) REFERENCES cats(foo_id) ON DELETE CASCADE ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED, CONSTRAINT bar UNIQUE (cat_id))']
  end

  it "should accept and literalize default values" do
    @db.create_table(:cats) do
      integer :id, :default => 123
      text :name, :default => "abc'def"
    end
    @db.sqls.must_equal ["CREATE TABLE cats (id integer DEFAULT 123, name text DEFAULT 'abc''def')"]
  end
  
  it "should accept not null definition" do
    @db.create_table(:cats) do
      integer :id
      text :name, :null => false
      text :name2, :allow_null => false
    end
    @db.sqls.must_equal ["CREATE TABLE cats (id integer, name text NOT NULL, name2 text NOT NULL)"]
  end
  
  it "should accept null definition" do
    @db.create_table(:cats) do
      integer :id
      text :name, :null => true
      text :name2, :allow_null => true
    end
    @db.sqls.must_equal ["CREATE TABLE cats (id integer, name text NULL, name2 text NULL)"]
  end
  
  it "should accept unique definition" do
    @db.create_table(:cats) do
      integer :id
      text :name, :unique => true
    end
    @db.sqls.must_equal ["CREATE TABLE cats (id integer, name text UNIQUE)"]
  end
  
  it "should allow naming unique constraint with :unique_constraint_name option" do
    @db.create_table(:cats) do
      text :name, :unique => true, :unique_constraint_name=>:foo
    end
    @db.sqls.must_equal ["CREATE TABLE cats (name text CONSTRAINT foo UNIQUE)"]
  end
  
  it "should handle not deferred unique constraints" do
    @db.create_table(:cats) do
      integer :id
      text :name
      unique :name, :deferrable=>false
    end
    @db.sqls.must_equal ["CREATE TABLE cats (id integer, name text, UNIQUE (name) NOT DEFERRABLE)"]
  end
  
  it "should handle deferred unique constraints" do
    @db.create_table(:cats) do
      integer :id
      text :name
      unique :name, :deferrable=>true
    end
    @db.sqls.must_equal ["CREATE TABLE cats (id integer, name text, UNIQUE (name) DEFERRABLE INITIALLY DEFERRED)"]
  end
  
  it "should handle deferred initially immediate unique constraints" do
    @db.create_table(:cats) do
      integer :id
      text :name
      unique :name, :deferrable=>:immediate
    end
    @db.sqls.must_equal ["CREATE TABLE cats (id integer, name text, UNIQUE (name) DEFERRABLE INITIALLY IMMEDIATE)"]
  end
  
  it "should handle deferred unique column constraints" do
    @db.create_table(:cats) do
      integer :id, :unique=>true, :unique_deferrable=>true
      integer :i, :unique=>true, :unique_deferrable=>:immediate
      integer :j, :unique=>true, :unique_deferrable=>false
    end
    @db.sqls.must_equal ["CREATE TABLE cats (id integer UNIQUE DEFERRABLE INITIALLY DEFERRED, i integer UNIQUE DEFERRABLE INITIALLY IMMEDIATE, j integer UNIQUE NOT DEFERRABLE)"]
  end
  
  it "should handle deferred primary key column constraints" do
    @db.create_table(:cats) do
      integer :id, :primary_key=>true, :primary_key_deferrable=>true
      integer :i, :primary_key=>true, :primary_key_deferrable=>:immediate
      integer :j, :primary_key=>true, :primary_key_deferrable=>false
    end
    @db.sqls.must_equal ["CREATE TABLE cats (id integer PRIMARY KEY DEFERRABLE INITIALLY DEFERRED, i integer PRIMARY KEY DEFERRABLE INITIALLY IMMEDIATE, j integer PRIMARY KEY NOT DEFERRABLE)"]
  end
  
  it "should accept unsigned definition" do
    @db.create_table(:cats) do
      integer :value, :unsigned => true
    end
    @db.sqls.must_equal ["CREATE TABLE cats (value integer UNSIGNED)"]
  end
  
  it "should accept [SET|ENUM](...) types" do
    @db.create_table(:cats) do
      set :color, :elements => ['black', 'tricolor', 'grey']
    end
    @db.sqls.must_equal ["CREATE TABLE cats (color set('black', 'tricolor', 'grey'))"]
  end
  
  it "should accept varchar size" do
    @db.create_table(:cats) do
      varchar :name
    end
    @db.sqls.must_equal ["CREATE TABLE cats (name varchar(255))"]
    @db.create_table(:cats) do
      varchar :name, :size => 51
    end
    @db.sqls.must_equal ["CREATE TABLE cats (name varchar(51))"]
  end
  
  it "should use double precision for double type" do
    @db.create_table(:cats) do
      double :name
    end
    @db.sqls.must_equal ["CREATE TABLE cats (name double precision)"]
  end

  it "should accept foreign keys without options" do
    @db.create_table(:cats) do
      foreign_key :project_id
    end
    @db.sqls.must_equal ["CREATE TABLE cats (project_id integer)"]
  end

  it "should accept foreign keys with options" do
    @db.create_table(:cats) do
      foreign_key :project_id, :table => :projects
    end
    @db.sqls.must_equal ["CREATE TABLE cats (project_id integer REFERENCES projects)"]
  end

  it "should accept foreign keys with separate table argument" do
    @db.create_table(:cats) do
      foreign_key :project_id, :projects, :default=>3
    end
    @db.sqls.must_equal ["CREATE TABLE cats (project_id integer DEFAULT 3 REFERENCES projects)"]
  end
  
  it "should allowing naming foreign key constraint with :foreign_key_constraint_name option" do
    @db.create_table(:cats) do
      foreign_key :project_id, :projects, :foreign_key_constraint_name=>:foo
    end
    @db.sqls.must_equal ["CREATE TABLE cats (project_id integer CONSTRAINT foo REFERENCES projects)"]
  end
  
  it "should raise an error if the table argument to foreign_key isn't a hash, symbol, or nil" do
    proc{@db.create_table(:cats){foreign_key :project_id, Object.new, :default=>3}}.must_raise(Sequel::Error)
  end
  
  it "should accept foreign keys with arbitrary keys" do
    @db.create_table(:cats) do
      foreign_key :project_id, :table => :projects, :key => :id
    end
    @db.sqls.must_equal ["CREATE TABLE cats (project_id integer REFERENCES projects(id))"]

    @db.create_table(:cats) do
      foreign_key :project_id, :table => :projects, :key => :zzz
    end
    @db.sqls.must_equal ["CREATE TABLE cats (project_id integer REFERENCES projects(zzz))"]
  end
  
  it "should accept foreign keys with ON DELETE clause" do
    @db.create_table(:cats) do
      foreign_key :project_id, :table => :projects, :on_delete => :restrict
    end
    @db.sqls.must_equal ["CREATE TABLE cats (project_id integer REFERENCES projects ON DELETE RESTRICT)"]

    @db.create_table(:cats) do
      foreign_key :project_id, :table => :projects, :on_delete => :cascade
    end
    @db.sqls.must_equal ["CREATE TABLE cats (project_id integer REFERENCES projects ON DELETE CASCADE)"]

    @db.create_table(:cats) do
      foreign_key :project_id, :table => :projects, :on_delete => :no_action
    end
    @db.sqls.must_equal ["CREATE TABLE cats (project_id integer REFERENCES projects ON DELETE NO ACTION)"]

    @db.create_table(:cats) do
      foreign_key :project_id, :table => :projects, :on_delete => :set_null
    end
    @db.sqls.must_equal ["CREATE TABLE cats (project_id integer REFERENCES projects ON DELETE SET NULL)"]

    @db.create_table(:cats) do
      foreign_key :project_id, :table => :projects, :on_delete => :set_default
    end
    @db.sqls.must_equal ["CREATE TABLE cats (project_id integer REFERENCES projects ON DELETE SET DEFAULT)"]

    @db.create_table(:cats) do
      foreign_key :project_id, :table => :projects, :on_delete => 'NO ACTION FOO'
    end
    @db.sqls.must_equal ["CREATE TABLE cats (project_id integer REFERENCES projects ON DELETE NO ACTION FOO)"]
  end

  it "should accept foreign keys with ON UPDATE clause" do
    @db.create_table(:cats) do
      foreign_key :project_id, :table => :projects, :on_update => :restrict
    end
    @db.sqls.must_equal ["CREATE TABLE cats (project_id integer REFERENCES projects ON UPDATE RESTRICT)"]

    @db.create_table(:cats) do
      foreign_key :project_id, :table => :projects, :on_update => :cascade
    end
    @db.sqls.must_equal ["CREATE TABLE cats (project_id integer REFERENCES projects ON UPDATE CASCADE)"]

    @db.create_table(:cats) do
      foreign_key :project_id, :table => :projects, :on_update => :no_action
    end
    @db.sqls.must_equal ["CREATE TABLE cats (project_id integer REFERENCES projects ON UPDATE NO ACTION)"]

    @db.create_table(:cats) do
      foreign_key :project_id, :table => :projects, :on_update => :set_null
    end
    @db.sqls.must_equal ["CREATE TABLE cats (project_id integer REFERENCES projects ON UPDATE SET NULL)"]

    @db.create_table(:cats) do
      foreign_key :project_id, :table => :projects, :on_update => :set_default
    end
    @db.sqls.must_equal ["CREATE TABLE cats (project_id integer REFERENCES projects ON UPDATE SET DEFAULT)"]

    @db.create_table(:cats) do
      foreign_key :project_id, :table => :projects, :on_update => 'SET DEFAULT FOO'
    end
    @db.sqls.must_equal ["CREATE TABLE cats (project_id integer REFERENCES projects ON UPDATE SET DEFAULT FOO)"]
  end
  
  it "should accept foreign keys with deferrable option" do
    @db.create_table(:cats) do
      foreign_key :project_id, :projects, :deferrable=>true
    end
    @db.sqls.must_equal ["CREATE TABLE cats (project_id integer REFERENCES projects DEFERRABLE INITIALLY DEFERRED)"]
  end

  it "should accept collation" do
    @db.create_table(:cats) do
      String :name, :collate => :utf8_bin
    end
    @db.sqls.must_equal ['CREATE TABLE cats (name varchar(255) COLLATE utf8_bin)']
  end

  it "should accept collation as a String, treated literally" do
    @db.create_table(:cats) do
      String :name, :collate => '"utf8_bin"'
    end
    @db.sqls.must_equal ['CREATE TABLE cats (name varchar(255) COLLATE "utf8_bin")']
  end

  it "should accept inline index definition" do
    @db.create_table(:cats) do
      integer :id, :index => true
    end
    @db.sqls.must_equal ["CREATE TABLE cats (id integer)", "CREATE INDEX cats_id_index ON cats (id)"]
  end
  
  it "should accept inline index definition with a hash of options" do
    @db.create_table(:cats) do
      integer :id, :index => {:unique=>true}
    end
    @db.sqls.must_equal ["CREATE TABLE cats (id integer)", "CREATE UNIQUE INDEX cats_id_index ON cats (id)"]
  end
  
  it "should accept inline index definition for foreign keys" do
    @db.create_table(:cats) do
      foreign_key :project_id, :table => :projects, :on_delete => :cascade, :index => true
    end
    @db.sqls.must_equal ["CREATE TABLE cats (project_id integer REFERENCES projects ON DELETE CASCADE)",
      "CREATE INDEX cats_project_id_index ON cats (project_id)"]
  end
  
  it "should accept inline index definition for foreign keys with a hash of options" do
    @db.create_table(:cats) do
      foreign_key :project_id, :table => :projects, :on_delete => :cascade, :index => {:unique=>true}
    end
    @db.sqls.must_equal ["CREATE TABLE cats (project_id integer REFERENCES projects ON DELETE CASCADE)",
      "CREATE UNIQUE INDEX cats_project_id_index ON cats (project_id)"]
  end
  
  it "should accept index definitions" do
    @db.create_table(:cats) do
      integer :id
      index :id
    end
    @db.sqls.must_equal ["CREATE TABLE cats (id integer)", "CREATE INDEX cats_id_index ON cats (id)"]
  end

  it "should accept unique constraint definitions" do
    @db.create_table(:cats) do
      text :name
      unique :name
    end
    @db.sqls.must_equal ["CREATE TABLE cats (name text, UNIQUE (name))"]
  end

  it "should accept partial index definitions" do
    def @db.supports_partial_indexes?() true end
    @db.create_table(:cats) do
      integer :id
      index :id, :where=>proc{id > 1}
    end
    @db.sqls.must_equal ["CREATE TABLE cats (id integer)", "CREATE INDEX cats_id_index ON cats (id) WHERE (id > 1)"]
  end

  it "should raise an error if partial indexes are not supported" do
    proc do 
      @db.create_table(:cats) do
        integer :id
        index :id, :where=>proc{id > 1}
      end
    end.must_raise(Sequel::Error)
  end

  it "should not raise on index error for unsupported index definitions if ignore_index_errors is used" do
    @db.create_table(:cats, :ignore_index_errors=>true) do
      text :name
      full_text_index :name
    end
  end

  it "should raise on full-text index definitions" do
    proc {
      @db.create_table(:cats) do
        text :name
        full_text_index :name
      end
    }.must_raise(Sequel::Error)
  end

  it "should raise on spatial index definitions" do
    proc {
      @db.create_table(:cats) do
        point :geom
        spatial_index :geom
      end
    }.must_raise(Sequel::Error)
  end

  it "should raise on partial index definitions" do
    proc {
      @db.create_table(:cats) do
        text :name
        index :name, :where => {:something => true}
      end
    }.must_raise(Sequel::Error)
  end

  it "should raise index definitions with type" do
    proc {
      @db.create_table(:cats) do
        text :name
        index :name, :type => :hash
      end
    }.must_raise(Sequel::Error)
  end

  it "should ignore errors if the database raises an error on an index creation statement and the :ignore_index_errors option is used" do
    @db.define_singleton_method(:execute_ddl){|*a| raise Sequel::DatabaseError if /blah/.match(a.first); super(*a)}
    lambda{@db.create_table(:cats){Integer :id; index :blah; index :id}}.must_raise(Sequel::DatabaseError)
    @db.sqls.must_equal ['CREATE TABLE cats (id integer)']
    @db.create_table(:cats, :ignore_index_errors=>true){Integer :id; index :blah; index :id}
    @db.sqls.must_equal ['CREATE TABLE cats (id integer)', 'CREATE INDEX cats_id_index ON cats (id)']
  end

  it "should not use savepoints around index creation if running inside a transaction if :ignore_index_errors option is used" do
    @db.define_singleton_method(:execute_ddl){|*a| super(*a); raise Sequel::DatabaseError if /blah/.match(a.first)}
    @db.transaction{@db.create_table(:cats, :ignore_index_errors=>true){Integer :id; index :blah; index :id}}
    @db.sqls.must_equal ["BEGIN", "CREATE TABLE cats (id integer)", "CREATE INDEX cats_blah_index ON cats (blah)", "CREATE INDEX cats_id_index ON cats (id)", "COMMIT"]
  end

  it "should use savepoints around index creation if running inside a transaction if :ignore_index_errors option is used and transactional schema modifications are supported" do
    @db.define_singleton_method(:supports_transactional_ddl?){true}
    @db.define_singleton_method(:execute_ddl){|*a| super(*a); raise Sequel::DatabaseError if /blah/.match(a.first)}
    @db.transaction{@db.create_table(:cats, :ignore_index_errors=>true){Integer :id; index :blah; index :id}}
    @db.sqls.must_equal ["BEGIN", "CREATE TABLE cats (id integer)", "SAVEPOINT autopoint_1", "CREATE INDEX cats_blah_index ON cats (blah)", "ROLLBACK TO SAVEPOINT autopoint_1", "SAVEPOINT autopoint_1", "CREATE INDEX cats_id_index ON cats (id)", "RELEASE SAVEPOINT autopoint_1", "COMMIT"]
  end

  it "should accept multiple index definitions" do
    @db.create_table(:cats) do
      integer :id
      index :id
      index :name
    end
    @db.sqls.must_equal ["CREATE TABLE cats (id integer)", "CREATE INDEX cats_id_index ON cats (id)", "CREATE INDEX cats_name_index ON cats (name)"]
  end
  
  it "should accept functional indexes" do
    @db.create_table(:cats) do
      integer :id
      index Sequel.function(:lower, :name)
    end
    @db.sqls.must_equal ["CREATE TABLE cats (id integer)", "CREATE INDEX cats_lower_name__index ON cats (lower(name))"]
  end
  
  it "should accept indexes with identifiers" do
    @db.create_table(:cats) do
      integer :id
      index Sequel.identifier(:lower__name)
    end
    @db.sqls.must_equal ["CREATE TABLE cats (id integer)", "CREATE INDEX cats_lower__name_index ON cats (lower__name)"]
  end
  
  it "should accept custom index names" do
    @db.create_table(:cats) do
      integer :id
      index :id, :name => 'abc'
    end
    @db.sqls.must_equal ["CREATE TABLE cats (id integer)", "CREATE INDEX abc ON cats (id)"]
  end

  it "should accept unique index definitions" do
    @db.create_table(:cats) do
      integer :id
      index :id, :unique => true
    end
    @db.sqls.must_equal ["CREATE TABLE cats (id integer)", "CREATE UNIQUE INDEX cats_id_index ON cats (id)"]
  end
  
  it "should accept composite index definitions" do
    @db.create_table(:cats) do
      integer :id
      index [:id, :name], :unique => true
    end
    @db.sqls.must_equal ["CREATE TABLE cats (id integer)", "CREATE UNIQUE INDEX cats_id_name_index ON cats (id, name)"]
  end
  
  it "should accept unnamed constraint definitions with blocks" do
    @db.create_table(:cats) do
      integer :score
      check{(x > 0) & (y < 1)}
    end
    @db.sqls.must_equal ["CREATE TABLE cats (score integer, CHECK ((x > 0) AND (y < 1)))"]
  end

  it "should accept unnamed constraint definitions with function calls" do
    @db.create_table(:cats) do
      integer :score
      check{f(x)}
    end
    @db.sqls.must_equal ["CREATE TABLE cats (score integer, CHECK (f(x)))"]
  end

  it "should accept unnamed constraint definitions" do
    @db.create_table(:cats) do
      check 'price < ?', 100
    end
    @db.sqls.must_equal ["CREATE TABLE cats (CHECK (price < 100))"]
  end

  it "should accept arrays of pairs constraints" do
    @db.create_table(:cats) do
      check [[:price, 100]]
    end
    @db.sqls.must_equal ["CREATE TABLE cats (CHECK (price = 100))"]
  end

  it "should accept hash constraints" do
    @db.create_table(:cats) do
      check :price=>100
    end
    @db.sqls.must_equal ["CREATE TABLE cats (CHECK (price = 100))"]
  end

  it "should accept array constraints" do
    @db.create_table(:cats) do
      check [Sequel.expr(:x) > 0, Sequel.expr(:y) < 1]
    end
    @db.sqls.must_equal ["CREATE TABLE cats (CHECK ((x > 0) AND (y < 1)))"]
  end

  it "should accept expression constraints" do
    @db.create_table(:cats) do
      check Sequel.&(Sequel.expr(:x) > 0, Sequel.expr(:y) < 1)
    end
    @db.sqls.must_equal ["CREATE TABLE cats (CHECK ((x > 0) AND (y < 1)))"]
  end

  it "should accept named constraint definitions" do
    @db.create_table(:cats) do
      integer :score
      constraint :valid_score, 'score <= 100'
    end
    @db.sqls.must_equal ["CREATE TABLE cats (score integer, CONSTRAINT valid_score CHECK (score <= 100))"]
  end

  it "should accept named constraint definitions with options" do
    @db.create_table(:cats) do
      integer :score
      constraint({:name=>:valid_score, :deferrable=>true}, 'score <= 100')
    end
    @db.sqls.must_equal ["CREATE TABLE cats (score integer, CONSTRAINT valid_score CHECK (score <= 100) DEFERRABLE INITIALLY DEFERRED)"]
  end

  it "should accept named constraint definitions with block" do
    @db.create_table(:cats) do
      constraint(:blah_blah){(x.sql_number > 0) & (y.sql_number < 1)}
    end
    @db.sqls.must_equal ["CREATE TABLE cats (CONSTRAINT blah_blah CHECK ((x > 0) AND (y < 1)))"]
  end

  it "should raise an error if an invalid constraint type is used" do
    proc{@db.create_table(:cats){unique [:a, :b], :type=>:bb}}.must_raise(Sequel::Error)
  end

  it "should accept composite primary keys" do
    @db.create_table(:cats) do
      integer :a
      integer :b
      primary_key [:a, :b]
    end
    @db.sqls.must_equal ["CREATE TABLE cats (a integer, b integer, PRIMARY KEY (a, b))"]
  end

  it "should accept named composite primary keys" do
    @db.create_table(:cats) do
      integer :a
      integer :b
      primary_key [:a, :b], :name => :cpk
    end
    @db.sqls.must_equal ["CREATE TABLE cats (a integer, b integer, CONSTRAINT cpk PRIMARY KEY (a, b))"]
  end

  it "should accept composite foreign keys" do
    @db.create_table(:cats) do
      integer :a
      integer :b
      foreign_key [:a, :b], :abc
    end
    @db.sqls.must_equal ["CREATE TABLE cats (a integer, b integer, FOREIGN KEY (a, b) REFERENCES abc)"]
  end

  it "should accept named composite foreign keys" do
    @db.create_table(:cats) do
      integer :a
      integer :b
      foreign_key [:a, :b], :abc, :name => :cfk
    end
    @db.sqls.must_equal ["CREATE TABLE cats (a integer, b integer, CONSTRAINT cfk FOREIGN KEY (a, b) REFERENCES abc)"]
  end

  it "should accept composite foreign keys with arbitrary keys" do
    @db.create_table(:cats) do
      integer :a
      integer :b
      foreign_key [:a, :b], :abc, :key => [:real_a, :real_b]
    end
    @db.sqls.must_equal ["CREATE TABLE cats (a integer, b integer, FOREIGN KEY (a, b) REFERENCES abc(real_a, real_b))"]

    @db.create_table(:cats) do
      integer :a
      integer :b
      foreign_key [:a, :b], :abc, :key => [:z, :x]
    end
    @db.sqls.must_equal ["CREATE TABLE cats (a integer, b integer, FOREIGN KEY (a, b) REFERENCES abc(z, x))"]
  end

  it "should accept composite foreign keys with on delete and on update clauses" do
    @db.create_table(:cats) do
      integer :a
      integer :b
      foreign_key [:a, :b], :abc, :on_delete => :cascade
    end
    @db.sqls.must_equal ["CREATE TABLE cats (a integer, b integer, FOREIGN KEY (a, b) REFERENCES abc ON DELETE CASCADE)"]

    @db.create_table(:cats) do
      integer :a
      integer :b
      foreign_key [:a, :b], :abc, :on_update => :no_action
    end
    @db.sqls.must_equal ["CREATE TABLE cats (a integer, b integer, FOREIGN KEY (a, b) REFERENCES abc ON UPDATE NO ACTION)"]

    @db.create_table(:cats) do
      integer :a
      integer :b
      foreign_key [:a, :b], :abc, :on_delete => :restrict, :on_update => :set_default
    end
    @db.sqls.must_equal ["CREATE TABLE cats (a integer, b integer, FOREIGN KEY (a, b) REFERENCES abc ON DELETE RESTRICT ON UPDATE SET DEFAULT)"]

    @db.create_table(:cats) do
      integer :a
      integer :b
      foreign_key [:a, :b], :abc, :key => [:x, :y], :on_delete => :set_null, :on_update => :set_null
    end
    @db.sqls.must_equal ["CREATE TABLE cats (a integer, b integer, FOREIGN KEY (a, b) REFERENCES abc(x, y) ON DELETE SET NULL ON UPDATE SET NULL)"]
  end

  it "should accept an :as option to create a table from the results of a dataset" do
    @db.create_table(:cats, :as=>@db[:a])
    @db.sqls.must_equal ['CREATE TABLE cats AS SELECT * FROM a']
  end

  it "should accept an :as option to create a table from a SELECT string" do
    @db.create_table(:cats, :as=>'SELECT * FROM a')
    @db.sqls.must_equal ['CREATE TABLE cats AS SELECT * FROM a']
  end

  it "should raise an Error if both a block and an :as argument are given" do
    proc{@db.create_table(:cats, :as=>@db[:a]){}}.must_raise(Sequel::Error)
  end
end

describe "DB#create_table!" do
  before do
    @db = Sequel.mock
  end
  
  it "should create the table if it does not exist" do
    @db.define_singleton_method(:table_exists?){|a| false}
    @db.create_table!(:cats){|*a|}.must_be_nil
    @db.sqls.must_equal ['CREATE TABLE cats ()']
  end
  
  it "should drop the table before creating it if it already exists" do
    @db.define_singleton_method(:table_exists?){|a| true}
    @db.create_table!(:cats){|*a|}
    @db.sqls.must_equal ['DROP TABLE cats', 'CREATE TABLE cats ()']
  end
  
  it "should use IF EXISTS if the database supports it" do
    @db.define_singleton_method(:supports_drop_table_if_exists?){true}
    @db.create_table!(:cats){|*a|}
    @db.sqls.must_equal ['DROP TABLE IF EXISTS cats', 'CREATE TABLE cats ()']
  end
end

describe "DB#create_table?" do
  before do
    @db = Sequel.mock
  end
  
  it "should not create the table if the table already exists" do
    @db.define_singleton_method(:table_exists?){|a| true}
    @db.create_table?(:cats){|*a|}.must_be_nil
    @db.sqls.must_equal []
  end
  
  it "should create the table if the table doesn't already exist" do
    @db.define_singleton_method(:table_exists?){|a| false}
    @db.create_table?(:cats){|*a|}
    @db.sqls.must_equal ['CREATE TABLE cats ()']
  end
  
  it "should use IF NOT EXISTS if the database supports that" do
    @db.define_singleton_method(:supports_create_table_if_not_exists?){true}
    @db.create_table?(:cats){|*a|}
    @db.sqls.must_equal ['CREATE TABLE IF NOT EXISTS cats ()']
  end
  
  it "should not use IF NOT EXISTS if the indexes are created" do
    @db.define_singleton_method(:table_exists?){|a| false}
    @db.define_singleton_method(:supports_create_table_if_not_exists?){true}
    @db.create_table?(:cats){|*a| Integer :a, :index=>true}
    @db.sqls.must_equal ['CREATE TABLE cats (a integer)', 'CREATE INDEX cats_a_index ON cats (a)']

    @db.define_singleton_method(:table_exists?){|a| true}
    @db.create_table?(:cats){|*a| Integer :a, :index=>true}
    @db.sqls.must_equal []
  end
end

describe "DB#create_join_table" do
  before do
    @db = Sequel.mock
  end
  
  it "should take a hash with foreign keys and table name values" do
    @db.create_join_table(:cat_id=>:cats, :dog_id=>:dogs).must_be_nil
    @db.sqls.must_equal ['CREATE TABLE cats_dogs (cat_id integer NOT NULL REFERENCES cats, dog_id integer NOT NULL REFERENCES dogs, PRIMARY KEY (cat_id, dog_id))', 'CREATE INDEX cats_dogs_dog_id_cat_id_index ON cats_dogs (dog_id, cat_id)']
  end
  
  it "should be able to have values be a hash of options" do
    @db.create_join_table(:cat_id=>{:table=>:cats, :null=>true}, :dog_id=>{:table=>:dogs, :default=>0})
    @db.sqls.must_equal ['CREATE TABLE cats_dogs (cat_id integer NULL REFERENCES cats, dog_id integer DEFAULT 0 NOT NULL REFERENCES dogs, PRIMARY KEY (cat_id, dog_id))', 'CREATE INDEX cats_dogs_dog_id_cat_id_index ON cats_dogs (dog_id, cat_id)']
  end
  
  it "should be able to pass a second hash of table options" do
    @db.create_join_table({:cat_id=>:cats, :dog_id=>:dogs}, :temp=>true)
    @db.sqls.must_equal ['CREATE TEMPORARY TABLE cats_dogs (cat_id integer NOT NULL REFERENCES cats, dog_id integer NOT NULL REFERENCES dogs, PRIMARY KEY (cat_id, dog_id))', 'CREATE INDEX cats_dogs_dog_id_cat_id_index ON cats_dogs (dog_id, cat_id)']
  end
  
  it "should recognize :name option in table options" do
    @db.create_join_table({:cat_id=>:cats, :dog_id=>:dogs}, :name=>:f)
    @db.sqls.must_equal ['CREATE TABLE f (cat_id integer NOT NULL REFERENCES cats, dog_id integer NOT NULL REFERENCES dogs, PRIMARY KEY (cat_id, dog_id))', 'CREATE INDEX f_dog_id_cat_id_index ON f (dog_id, cat_id)']
  end
  
  it "should recognize :index_options option in table options" do
    @db.create_join_table({:cat_id=>:cats, :dog_id=>:dogs}, :index_options=>{:name=>:foo_index})
    @db.sqls.must_equal ['CREATE TABLE cats_dogs (cat_id integer NOT NULL REFERENCES cats, dog_id integer NOT NULL REFERENCES dogs, PRIMARY KEY (cat_id, dog_id))', 'CREATE INDEX foo_index ON cats_dogs (dog_id, cat_id)']
  end
  
  it "should recognize :no_index option in table options" do
    @db.create_join_table({:cat_id=>:cats, :dog_id=>:dogs}, :no_index=>true)
    @db.sqls.must_equal ['CREATE TABLE cats_dogs (cat_id integer NOT NULL REFERENCES cats, dog_id integer NOT NULL REFERENCES dogs, PRIMARY KEY (cat_id, dog_id))']
  end
  
  it "should recognize :no_primary_key option in table options" do
    @db.create_join_table({:cat_id=>:cats, :dog_id=>:dogs}, :no_primary_key=>true)
    @db.sqls.must_equal ['CREATE TABLE cats_dogs (cat_id integer NOT NULL REFERENCES cats, dog_id integer NOT NULL REFERENCES dogs)', 'CREATE INDEX cats_dogs_dog_id_cat_id_index ON cats_dogs (dog_id, cat_id)']
  end
  
  it "should raise an error if the hash doesn't have 2 entries with table names" do
    proc{@db.create_join_table({})}.must_raise(Sequel::Error)
    proc{@db.create_join_table({:cat_id=>:cats})}.must_raise(Sequel::Error)
    proc{@db.create_join_table({:cat_id=>:cats, :human_id=>:humans, :dog_id=>:dog})}.must_raise(Sequel::Error)
    proc{@db.create_join_table({:cat_id=>:cats, :dog_id=>{}})}.must_raise(Sequel::Error)
  end
end
  
describe "DB#create_join_table?" do
  before do
    @db = Sequel.mock
  end
  
  it "should create the table if it does not already exist" do
    @db.define_singleton_method(:table_exists?){|a| false}
    @db.create_join_table?(:cat_id=>:cats, :dog_id=>:dogs).must_be_nil
    @db.sqls.must_equal ['CREATE TABLE cats_dogs (cat_id integer NOT NULL REFERENCES cats, dog_id integer NOT NULL REFERENCES dogs, PRIMARY KEY (cat_id, dog_id))', 'CREATE INDEX cats_dogs_dog_id_cat_id_index ON cats_dogs (dog_id, cat_id)']
  end

  it "should not create the table if it already exists" do
    @db.define_singleton_method(:table_exists?){|a| true}
    @db.create_join_table?(:cat_id=>:cats, :dog_id=>:dogs)
    @db.sqls.must_equal []
  end

  it "should not use IF NOT EXISTS" do
    @db.define_singleton_method(:table_exists?){|a| false}
    @db.define_singleton_method(:supports_create_table_if_not_exists?){true}
    @db.create_join_table?(:cat_id=>:cats, :dog_id=>:dogs)
    @db.sqls.must_equal ['CREATE TABLE cats_dogs (cat_id integer NOT NULL REFERENCES cats, dog_id integer NOT NULL REFERENCES dogs, PRIMARY KEY (cat_id, dog_id))', 'CREATE INDEX cats_dogs_dog_id_cat_id_index ON cats_dogs (dog_id, cat_id)']

    @db.define_singleton_method(:table_exists?){|a| true}
    @db.create_join_table?(:cat_id=>:cats, :dog_id=>:dogs)
    @db.sqls.must_equal []
  end

  it "should not use IF NOT EXISTS if no_index is used" do
    @db.define_singleton_method(:supports_create_table_if_not_exists?){true}
    @db.create_join_table?({:cat_id=>:cats, :dog_id=>:dogs}, :no_index=>true)
    @db.sqls.must_equal ['CREATE TABLE IF NOT EXISTS cats_dogs (cat_id integer NOT NULL REFERENCES cats, dog_id integer NOT NULL REFERENCES dogs, PRIMARY KEY (cat_id, dog_id))']
  end
end
  
describe "DB#create_join_table!" do
  before do
    @db = Sequel.mock
  end
  
  it "should drop the table first if it already exists" do
    @db.define_singleton_method(:table_exists?){|a| true}
    @db.create_join_table!(:cat_id=>:cats, :dog_id=>:dogs).must_be_nil
    @db.sqls.must_equal ['DROP TABLE cats_dogs', 'CREATE TABLE cats_dogs (cat_id integer NOT NULL REFERENCES cats, dog_id integer NOT NULL REFERENCES dogs, PRIMARY KEY (cat_id, dog_id))', 'CREATE INDEX cats_dogs_dog_id_cat_id_index ON cats_dogs (dog_id, cat_id)']
  end

  it "should not drop the table if it doesn't exists" do
    @db.define_singleton_method(:table_exists?){|a| false}
    @db.create_join_table!(:cat_id=>:cats, :dog_id=>:dogs)
    @db.sqls.must_equal ['CREATE TABLE cats_dogs (cat_id integer NOT NULL REFERENCES cats, dog_id integer NOT NULL REFERENCES dogs, PRIMARY KEY (cat_id, dog_id))', 'CREATE INDEX cats_dogs_dog_id_cat_id_index ON cats_dogs (dog_id, cat_id)']
  end

  it "should use IF EXISTS if the database supports it" do
    @db.define_singleton_method(:supports_drop_table_if_exists?){true}
    @db.create_join_table!(:cat_id=>:cats, :dog_id=>:dogs)
    @db.sqls.must_equal ['DROP TABLE IF EXISTS cats_dogs', 'CREATE TABLE cats_dogs (cat_id integer NOT NULL REFERENCES cats, dog_id integer NOT NULL REFERENCES dogs, PRIMARY KEY (cat_id, dog_id))', 'CREATE INDEX cats_dogs_dog_id_cat_id_index ON cats_dogs (dog_id, cat_id)']
  end
end
  
describe "DB#drop_join_table" do
  before do
    @db = Sequel.mock
  end
  
  it "should take a hash with foreign keys and table name values and drop the table" do
    @db.drop_join_table(:cat_id=>:cats, :dog_id=>:dogs).must_be_nil
    @db.sqls.must_equal ['DROP TABLE cats_dogs']
  end
  
  it "should be able to have values be a hash of options" do
    @db.drop_join_table(:cat_id=>{:table=>:cats, :null=>true}, :dog_id=>{:table=>:dogs, :default=>0})
    @db.sqls.must_equal ['DROP TABLE cats_dogs']
  end

  it "should respect a second hash of table options" do
    @db.drop_join_table({:cat_id=>:cats, :dog_id=>:dogs}, :cascade=>true)
    @db.sqls.must_equal ['DROP TABLE cats_dogs CASCADE']
  end

  it "should respect :name option for table name" do
    @db.drop_join_table({:cat_id=>:cats, :dog_id=>:dogs}, :name=>:f)
    @db.sqls.must_equal ['DROP TABLE f']
  end
  
  it "should raise an error if the hash doesn't have 2 entries with table names" do
    proc{@db.drop_join_table({})}.must_raise(Sequel::Error)
    proc{@db.drop_join_table({:cat_id=>:cats})}.must_raise(Sequel::Error)
    proc{@db.drop_join_table({:cat_id=>:cats, :human_id=>:humans, :dog_id=>:dog})}.must_raise(Sequel::Error)
    proc{@db.drop_join_table({:cat_id=>:cats, :dog_id=>{}})}.must_raise(Sequel::Error)
  end
end

describe "DB#drop_table" do
  before do
    @db = Sequel.mock
  end

  it "should generate a DROP TABLE statement" do
    @db.drop_table(:cats).must_be_nil
    @db.sqls.must_equal ['DROP TABLE cats']
  end

  it "should drop multiple tables at once" do
    @db.drop_table :cats, :dogs
    @db.sqls.must_equal ['DROP TABLE cats', 'DROP TABLE dogs']
  end

  it "should take an options hash and support the :cascade option" do
    @db.drop_table :cats, :dogs, :cascade=>true
    @db.sqls.must_equal ['DROP TABLE cats CASCADE', 'DROP TABLE dogs CASCADE']
  end
end

describe "DB#drop_table?" do
  before do
    @db = Sequel.mock
  end
  
  it "should drop the table if it exists" do
    @db.define_singleton_method(:table_exists?){|a| true}
    @db.drop_table?(:cats).must_be_nil
    @db.sqls.must_equal ["DROP TABLE cats"]
  end
  
  it "should do nothing if the table does not exist" do
    @db.define_singleton_method(:table_exists?){|a| false}
    @db.drop_table?(:cats)
    @db.sqls.must_equal []
  end
  
  it "should operate on multiple tables at once" do
    @db.define_singleton_method(:table_exists?){|a| a == :cats}
    @db.drop_table? :cats, :dogs
    @db.sqls.must_equal ['DROP TABLE cats']
  end

  it "should take an options hash and support the :cascade option" do
    @db.define_singleton_method(:table_exists?){|a| true}
    @db.drop_table? :cats, :dogs, :cascade=>true
    @db.sqls.must_equal ['DROP TABLE cats CASCADE', 'DROP TABLE dogs CASCADE']
  end

  it "should use IF NOT EXISTS if the database supports that" do
    @db.define_singleton_method(:supports_drop_table_if_exists?){true}
    @db.drop_table? :cats, :dogs
    @db.sqls.must_equal ['DROP TABLE IF EXISTS cats', 'DROP TABLE IF EXISTS dogs']
  end

  it "should use IF NOT EXISTS with CASCADE if the database supports that" do
    @db.define_singleton_method(:supports_drop_table_if_exists?){true}
    @db.drop_table? :cats, :dogs, :cascade=>true
    @db.sqls.must_equal ['DROP TABLE IF EXISTS cats CASCADE', 'DROP TABLE IF EXISTS dogs CASCADE']
  end
end

describe "DB#alter_table" do
  before do
    @db = Sequel.mock
  end
  
  it "should allow adding not null constraint via set_column_allow_null with false argument" do
    @db.alter_table(:cats) do
      set_column_allow_null :score, false
    end.must_be_nil
    @db.sqls.must_equal ["ALTER TABLE cats ALTER COLUMN score SET NOT NULL"]
  end
  
  it "should allow removing not null constraint via set_column_allow_null with true argument" do
    @db.alter_table(:cats) do
      set_column_allow_null :score, true
    end
    @db.sqls.must_equal ["ALTER TABLE cats ALTER COLUMN score DROP NOT NULL"]
  end

  it "should allow adding not null constraint via set_column_not_null" do
    @db.alter_table(:cats) do
      set_column_not_null :score
    end
    @db.sqls.must_equal ["ALTER TABLE cats ALTER COLUMN score SET NOT NULL"]
  end
  
  it "should allow removing not null constraint via set_column_allow_null without argument" do
    @db.alter_table(:cats) do
      set_column_allow_null :score
    end
    @db.sqls.must_equal ["ALTER TABLE cats ALTER COLUMN score DROP NOT NULL"]
  end

  it "should support add_column" do
    @db.alter_table(:cats) do
      add_column :score, :integer
    end
    @db.sqls.must_equal ["ALTER TABLE cats ADD COLUMN score integer"]
  end

  it "should support add_constraint" do
    @db.alter_table(:cats) do
      add_constraint :valid_score, 'score <= 100'
    end
    @db.sqls.must_equal ["ALTER TABLE cats ADD CONSTRAINT valid_score CHECK (score <= 100)"]
  end

  it "should support add_constraint with options" do
    @db.alter_table(:cats) do
      add_constraint({:name=>:valid_score, :deferrable=>true}, 'score <= 100')
    end
    @db.sqls.must_equal ["ALTER TABLE cats ADD CONSTRAINT valid_score CHECK (score <= 100) DEFERRABLE INITIALLY DEFERRED"]
  end

  it "should support add_constraint with block" do
    @db.alter_table(:cats) do
      add_constraint(:blah_blah){(x.sql_number > 0) & (y.sql_number < 1)}
    end
    @db.sqls.must_equal ["ALTER TABLE cats ADD CONSTRAINT blah_blah CHECK ((x > 0) AND (y < 1))"]
  end

  it "should support add_unique_constraint" do
    @db.alter_table(:cats) do
      add_unique_constraint [:a, :b]
    end
    @db.sqls.must_equal ["ALTER TABLE cats ADD UNIQUE (a, b)"]

    @db.alter_table(:cats) do
      add_unique_constraint [:a, :b], :name => :ab_uniq
    end
    @db.sqls.must_equal ["ALTER TABLE cats ADD CONSTRAINT ab_uniq UNIQUE (a, b)"]
  end

  it "should support add_foreign_key" do
    @db.alter_table(:cats) do
      add_foreign_key :node_id, :nodes
    end
    @db.sqls.must_equal ["ALTER TABLE cats ADD COLUMN node_id integer REFERENCES nodes"]
  end

  it "should support add_foreign_key with composite foreign keys" do
    @db.alter_table(:cats) do
      add_foreign_key [:node_id, :prop_id], :nodes_props
    end
    @db.sqls.must_equal ["ALTER TABLE cats ADD FOREIGN KEY (node_id, prop_id) REFERENCES nodes_props"]

    @db.alter_table(:cats) do
      add_foreign_key [:node_id, :prop_id], :nodes_props, :name => :cfk
    end
    @db.sqls.must_equal ["ALTER TABLE cats ADD CONSTRAINT cfk FOREIGN KEY (node_id, prop_id) REFERENCES nodes_props"]

    @db.alter_table(:cats) do
      add_foreign_key [:node_id, :prop_id], :nodes_props, :key => [:nid, :pid]
    end
    @db.sqls.must_equal ["ALTER TABLE cats ADD FOREIGN KEY (node_id, prop_id) REFERENCES nodes_props(nid, pid)"]

    @db.alter_table(:cats) do
      add_foreign_key [:node_id, :prop_id], :nodes_props, :on_delete => :restrict, :on_update => :cascade
    end
    @db.sqls.must_equal ["ALTER TABLE cats ADD FOREIGN KEY (node_id, prop_id) REFERENCES nodes_props ON DELETE RESTRICT ON UPDATE CASCADE"]
  end

  it "should support add_index" do
    @db.alter_table(:cats) do
      add_index :name
    end
    @db.sqls.must_equal ["CREATE INDEX cats_name_index ON cats (name)"]
  end

  it "should ignore errors if the database raises an error on an add_index call and the :ignore_errors option is used" do
    @db.define_singleton_method(:execute_ddl){|*a| raise Sequel::DatabaseError}
    lambda{@db.add_index(:cats, :id)}.must_raise(Sequel::DatabaseError)
    @db.add_index(:cats, :id, :ignore_errors=>true)
    @db.sqls.must_equal []
  end

  it "should support add_primary_key" do
    @db.alter_table(:cats) do
      add_primary_key :id
    end
    @db.sqls.must_equal ["ALTER TABLE cats ADD COLUMN id integer PRIMARY KEY AUTOINCREMENT"]
  end

  it "should support add_primary_key with composite primary keys" do
    @db.alter_table(:cats) do
      add_primary_key [:id, :type]
    end
    @db.sqls.must_equal ["ALTER TABLE cats ADD PRIMARY KEY (id, type)"]

    @db.alter_table(:cats) do
      add_primary_key [:id, :type], :name => :cpk
    end
    @db.sqls.must_equal ["ALTER TABLE cats ADD CONSTRAINT cpk PRIMARY KEY (id, type)"]
  end

  it "should set primary key column NOT NULL when using add_primary_key if database doesn't handle it" do
    def @db.can_add_primary_key_constraint_on_nullable_columns?; false end
    @db.alter_table(:cats) do
      add_primary_key :id
    end
    @db.sqls.must_equal ["ALTER TABLE cats ADD COLUMN id integer NOT NULL PRIMARY KEY AUTOINCREMENT"]
  end

  it "should set primary key column NOT NULL when adding primary key constraint if database doesn't handle it" do
    def @db.can_add_primary_key_constraint_on_nullable_columns?; false end
    @db.alter_table(:cats) do
      add_primary_key [:id, :type]
    end
    @db.sqls.must_equal ["ALTER TABLE cats ALTER COLUMN id SET NOT NULL", "ALTER TABLE cats ALTER COLUMN type SET NOT NULL", "ALTER TABLE cats ADD PRIMARY KEY (id, type)"]
  end

  it "should support drop_column" do
    @db.alter_table(:cats) do
      drop_column :score
    end
    @db.sqls.must_equal ["ALTER TABLE cats DROP COLUMN score"]
  end

  it "should support drop_column with :cascade=>true option" do
    @db.alter_table(:cats) do
      drop_column :score, :cascade=>true
    end
    @db.sqls.must_equal ["ALTER TABLE cats DROP COLUMN score CASCADE"]
  end

  it "should support drop_constraint" do
    @db.alter_table(:cats) do
      drop_constraint :valid_score
    end
    @db.sqls.must_equal ["ALTER TABLE cats DROP CONSTRAINT valid_score"]
  end

  it "should support drop_constraint with :cascade=>true option" do
    @db.alter_table(:cats) do
      drop_constraint :valid_score, :cascade=>true
    end
    @db.sqls.must_equal ["ALTER TABLE cats DROP CONSTRAINT valid_score CASCADE"]
  end

  it "should support drop_foreign_key" do
    def @db.foreign_key_list(table_name)
      [{:name=>:cats_node_id_fkey, :columns=>[:node_id]}] 
    end
    @db.alter_table(:cats) do
      drop_foreign_key :node_id
    end
    @db.sqls.must_equal ["ALTER TABLE cats DROP CONSTRAINT cats_node_id_fkey", "ALTER TABLE cats DROP COLUMN node_id"]
  end

  it "should support drop_foreign_key with :foreign_key_constraint_name option" do
    @db.alter_table(:cats) do
      drop_foreign_key :node_id, :foreign_key_constraint_name=>:foo
    end
    @db.sqls.must_equal ["ALTER TABLE cats DROP CONSTRAINT foo", "ALTER TABLE cats DROP COLUMN node_id"]
  end

  it "should support drop_foreign_key with :name option" do
    @db.alter_table(:cats) do
      drop_foreign_key :node_id, :name=>:foo
    end
    @db.sqls.must_equal ["ALTER TABLE cats DROP CONSTRAINT foo", "ALTER TABLE cats DROP COLUMN node_id"]
  end

  it "should support drop_foreign_key with composite foreign keys" do
    def @db.foreign_key_list(table_name)
      [{:name=>:cats_node_id_prop_id_fkey, :columns=>[:node_id, :prop_id]}] 
    end
    @db.alter_table(:cats) do
      drop_foreign_key [:node_id, :prop_id]
    end
    @db.sqls.must_equal ["ALTER TABLE cats DROP CONSTRAINT cats_node_id_prop_id_fkey"]

    @db.alter_table(:cats) do
      drop_foreign_key [:node_id, :prop_id], :name => :cfk
    end
    @db.sqls.must_equal ["ALTER TABLE cats DROP CONSTRAINT cfk"]
  end

  it "should have drop_foreign_key raise Error if no name is found" do
    def @db.foreign_key_list(table_name)
      [{:name=>:cats_node_id_fkey, :columns=>[:foo_id]}] 
    end
    lambda{@db.alter_table(:cats){drop_foreign_key :node_id}}.must_raise(Sequel::Error)
  end

  it "should have drop_foreign_key raise Error if multiple foreign keys found" do
    def @db.foreign_key_list(table_name)
      [{:name=>:cats_node_id_fkey, :columns=>[:node_id]}, {:name=>:cats_node_id_fkey2, :columns=>[:node_id]}] 
    end
    lambda{@db.alter_table(:cats){drop_foreign_key :node_id}}.must_raise(Sequel::Error)
  end

  it "should support drop_index" do
    @db.alter_table(:cats) do
      drop_index :name
    end
    @db.sqls.must_equal ["DROP INDEX cats_name_index"]
  end

  it "should support drop_index with a given name" do
    @db.alter_table(:cats) do
      drop_index :name, :name=>:blah_blah
    end
    @db.sqls.must_equal ["DROP INDEX blah_blah"]
  end

  it "should support rename_column" do
    @db.alter_table(:cats) do
      rename_column :name, :old_name
    end
    @db.sqls.must_equal ["ALTER TABLE cats RENAME COLUMN name TO old_name"]
  end

  it "should support set_column_default" do
    @db.alter_table(:cats) do
      set_column_default :score, 3
    end
    @db.sqls.must_equal ["ALTER TABLE cats ALTER COLUMN score SET DEFAULT 3"]
  end

  it "should support set_column_type" do
    @db.alter_table(:cats) do
      set_column_type :score, :real
    end
    @db.sqls.must_equal ["ALTER TABLE cats ALTER COLUMN score TYPE real"]
  end

  it "should support set_column_type with options" do
    @db.alter_table(:cats) do
      set_column_type :score, :integer, :unsigned=>true
      set_column_type :score, :varchar, :size=>30
      set_column_type :score, :enum, :elements=>['a', 'b']
    end
    @db.sqls.must_equal ["ALTER TABLE cats ALTER COLUMN score TYPE integer UNSIGNED",
      "ALTER TABLE cats ALTER COLUMN score TYPE varchar(30)",
      "ALTER TABLE cats ALTER COLUMN score TYPE enum('a', 'b')"]
  end

  it "should combine operations into a single query if the database supports it" do
    @db.define_singleton_method(:supports_combining_alter_table_ops?){true}
    @db.alter_table(:cats) do
      add_column :a, Integer
      drop_column :b
      set_column_not_null :c
      rename_column :d, :e
      set_column_default :f, 'g'
      set_column_type :h, Integer
      add_constraint(:i){a > 1}
      drop_constraint :j
    end
    @db.sqls.must_equal ["ALTER TABLE cats ADD COLUMN a integer, DROP COLUMN b, ALTER COLUMN c SET NOT NULL, RENAME COLUMN d TO e, ALTER COLUMN f SET DEFAULT 'g', ALTER COLUMN h TYPE integer, ADD CONSTRAINT i CHECK (a > 1), DROP CONSTRAINT j"]
  end
  
  it "should combine operations into consecutive groups of combinable operations if the database supports combining operations" do
    @db.define_singleton_method(:supports_combining_alter_table_ops?){true}
    @db.alter_table(:cats) do
      add_column :a, Integer
      drop_column :b
      set_column_not_null :c
      rename_column :d, :e
      add_index :e
      set_column_default :f, 'g'
      set_column_type :h, Integer
      add_constraint(:i){a > 1}
      drop_constraint :j
    end
    @db.sqls.must_equal ["ALTER TABLE cats ADD COLUMN a integer, DROP COLUMN b, ALTER COLUMN c SET NOT NULL, RENAME COLUMN d TO e",
      "CREATE INDEX cats_e_index ON cats (e)",
      "ALTER TABLE cats ALTER COLUMN f SET DEFAULT 'g', ALTER COLUMN h TYPE integer, ADD CONSTRAINT i CHECK (a > 1), DROP CONSTRAINT j"]
  end
  
end

describe "Database#create_table" do
  before do
    @db = Sequel.mock
  end
  
  it "should construct proper SQL" do
    @db.create_table :test do
      primary_key :id, :integer, :null => false
      column :name, :text
      index :name, :unique => true
    end
    @db.sqls.must_equal ['CREATE TABLE test (id integer NOT NULL PRIMARY KEY AUTOINCREMENT, name text)',
      'CREATE UNIQUE INDEX test_name_index ON test (name)']
  end
  
  it "should create a temporary table" do
    @db.create_table :test_tmp, :temp => true do
      primary_key :id, :integer, :null => false
      column :name, :text
      index :name, :unique => true
    end
    
    @db.sqls.must_equal ['CREATE TEMPORARY TABLE test_tmp (id integer NOT NULL PRIMARY KEY AUTOINCREMENT, name text)',
      'CREATE UNIQUE INDEX test_tmp_name_index ON test_tmp (name)']
  end
end

describe "Database#alter_table" do
  before do
    @db = Sequel.mock
  end
  
  it "should construct proper SQL" do
    @db.alter_table :xyz do
      add_column :aaa, :text, :null => false, :unique => true
      drop_column :bbb
      rename_column :ccc, :ddd
      set_column_type :eee, :integer
      set_column_default :hhh, 'abcd'
      add_index :fff, :unique => true
      drop_index :ggg
    end
    
    @db.sqls.must_equal ['ALTER TABLE xyz ADD COLUMN aaa text NOT NULL UNIQUE',
      'ALTER TABLE xyz DROP COLUMN bbb',
      'ALTER TABLE xyz RENAME COLUMN ccc TO ddd',
      'ALTER TABLE xyz ALTER COLUMN eee TYPE integer',
      "ALTER TABLE xyz ALTER COLUMN hhh SET DEFAULT 'abcd'",
      'CREATE UNIQUE INDEX xyz_fff_index ON xyz (fff)',
      'DROP INDEX xyz_ggg_index']
  end
end

describe "Database#add_column" do
  it "should construct proper SQL" do
    db = Sequel.mock
    db.add_column(:test, :name, :text, :unique => true).must_be_nil
    db.sqls.must_equal ['ALTER TABLE test ADD COLUMN name text UNIQUE']
  end
end

describe "Database#drop_column" do
  before do
    @db = Sequel.mock
  end
  
  it "should construct proper SQL" do
    @db.drop_column(:test, :name).must_be_nil
    @db.sqls.must_equal ['ALTER TABLE test DROP COLUMN name']
  end
  
  it "should use CASCADE for :cascade=>true option" do
    @db.drop_column :test, :name, :cascade=>true
    @db.sqls.must_equal ['ALTER TABLE test DROP COLUMN name CASCADE']
  end
end

describe "Database#rename_column" do
  before do
    @db = Sequel.mock
  end
  
  it "should construct proper SQL" do
    @db.rename_column(:test, :abc, :def).must_be_nil
    @db.sqls.must_equal ['ALTER TABLE test RENAME COLUMN abc TO def']
  end
end

describe "Database#set_column_type" do
  before do
    @db = Sequel.mock
  end
  
  it "should construct proper SQL" do
    @db.set_column_type(:test, :name, :integer).must_be_nil
    @db.sqls.must_equal ['ALTER TABLE test ALTER COLUMN name TYPE integer']
  end
end

describe "Database#set_column_default" do
  before do
    @db = Sequel.mock
  end
  
  it "should construct proper SQL" do
    @db.set_column_default(:test, :name, 'zyx').must_be_nil
    @db.sqls.must_equal ["ALTER TABLE test ALTER COLUMN name SET DEFAULT 'zyx'"]
  end
end

describe "Database#add_index" do
  before do
    @db = Sequel.mock
  end
  
  it "should construct proper SQL" do
    @db.add_index(:test, :name, :unique => true).must_be_nil
    @db.sqls.must_equal ['CREATE UNIQUE INDEX test_name_index ON test (name)']
  end
  
  it "should accept multiple columns" do
    @db.add_index :test, [:one, :two]
    @db.sqls.must_equal ['CREATE INDEX test_one_two_index ON test (one, two)']
  end
end

describe "Database#drop_index" do
  before do
    @db = Sequel.mock
  end
  
  it "should construct proper SQL" do
    @db.drop_index(:test, :name).must_be_nil
    @db.sqls.must_equal ['DROP INDEX test_name_index']
  end
  
end

describe "Database#drop_table" do
  before do
    @db = Sequel.mock
  end
  
  it "should construct proper SQL" do
    @db.drop_table(:test).must_be_nil
    @db.sqls.must_equal ['DROP TABLE test']
  end
  
  it "should accept multiple table names" do
    @db.drop_table :a, :bb, :ccc
    @db.sqls.must_equal ['DROP TABLE a', 'DROP TABLE bb', 'DROP TABLE ccc']
  end
end

describe "Database#rename_table" do
  before do
    @db = Sequel.mock
  end
  
  it "should construct proper SQL" do
    @db.rename_table(:abc, :xyz).must_be_nil
    @db.sqls.must_equal ['ALTER TABLE abc RENAME TO xyz']
  end
end

describe "Database#create_view" do
  before do
    @db = Sequel.mock
  end
  
  it "should construct proper SQL with raw SQL" do
    @db.create_view(:test, "SELECT * FROM xyz").must_be_nil
    @db.sqls.must_equal ['CREATE VIEW test AS SELECT * FROM xyz']
    @db.create_view Sequel.identifier(:test), "SELECT * FROM xyz"
    @db.sqls.must_equal ['CREATE VIEW test AS SELECT * FROM xyz']
  end
  
  it "should construct proper SQL with dataset" do
    @db.create_view :test, @db[:items].select(:a, :b).order(:c)
    @db.sqls.must_equal ['CREATE VIEW test AS SELECT a, b FROM items ORDER BY c']
  end

  it "should handle :columns option" do
    @db.create_view :test, @db[:items].select(:a, :b).order(:c), :columns=>[:d, :e]
    @db.sqls.must_equal ['CREATE VIEW test (d, e) AS SELECT a, b FROM items ORDER BY c']
    @db.create_view :test, @db[:items].select(:a, :b).order(:c), :columns=>%w'd e'
    @db.sqls.must_equal ['CREATE VIEW test (d, e) AS SELECT a, b FROM items ORDER BY c']
    @db.create_view :test, @db[:items].select(:a, :b).order(:c), :columns=>[Sequel.identifier('d'), Sequel.lit('e')]
    @db.sqls.must_equal ['CREATE VIEW test (d, e) AS SELECT a, b FROM items ORDER BY c']
  end

  it "should handle :check option" do
    @db.create_view :test, @db[:items].select(:a, :b).order(:c), :check=>true
    @db.sqls.must_equal ['CREATE VIEW test AS SELECT a, b FROM items ORDER BY c WITH CHECK OPTION']
    @db.create_view :test, @db[:items].select(:a, :b).order(:c), :check=>:local
    @db.sqls.must_equal ['CREATE VIEW test AS SELECT a, b FROM items ORDER BY c WITH LOCAL CHECK OPTION']
  end

  with_symbol_splitting "should handle create_or_replace_view with splittable symbols" do
    @db.create_or_replace_view :sch__test, "SELECT * FROM xyz"
    @db.sqls.must_equal ['DROP VIEW sch.test', 'CREATE VIEW sch.test AS SELECT * FROM xyz']
  end

  it "should handle create_or_replace_view" do
    @db.create_or_replace_view :test, @db[:items].select(:a, :b).order(:c)
    @db.sqls.must_equal ['DROP VIEW test', 'CREATE VIEW test AS SELECT a, b FROM items ORDER BY c']
    @db.create_or_replace_view Sequel.identifier(:test), @db[:items].select(:a, :b).order(:c)
    @db.sqls.must_equal ['DROP VIEW test', 'CREATE VIEW test AS SELECT a, b FROM items ORDER BY c']
  end

  it "should use CREATE OR REPLACE VIEW if such syntax is supported" do
    def @db.supports_create_or_replace_view?() true end
    @db.create_or_replace_view :test, @db[:items]
    @db.sqls.must_equal ['CREATE OR REPLACE VIEW test AS SELECT * FROM items']
  end
end

describe "Database#drop_view" do
  before do
    @db = Sequel.mock
  end
  
  with_symbol_splitting "should construct proper SQL for splittable symbols" do
    @db.drop_view(:sch__test).must_be_nil
    @db.sqls.must_equal ['DROP VIEW sch.test']
  end

  it "should construct proper SQL" do
    @db.drop_view :test
    @db.drop_view Sequel.identifier(:test)
    @db.drop_view Sequel.qualify(:sch, :test)
    @db.sqls.must_equal ['DROP VIEW test', 'DROP VIEW test', 'DROP VIEW sch.test']
  end

  it "should drop multiple views at once" do
    @db.drop_view :cats, :dogs
    @db.sqls.must_equal ['DROP VIEW cats', 'DROP VIEW dogs']
  end

  it "should support the :cascade option" do
    @db.drop_view :cats, :dogs, :cascade=>true
    @db.sqls.must_equal ['DROP VIEW cats CASCADE', 'DROP VIEW dogs CASCADE']
  end

  it "should support the :if_exists option" do
    @db.drop_view :cats, :dogs, :if_exists=>true
    @db.sqls.must_equal ['DROP VIEW IF EXISTS cats', 'DROP VIEW IF EXISTS dogs']
  end
end

describe "Database#alter_table_sql" do
  it "should raise error for an invalid op" do
    proc {Sequel.mock.send(:alter_table_sql, :mau, :op => :blah)}.must_raise(Sequel::Error)
  end
end

describe "Schema Parser" do
  before do
    @sqls = []
    @db = Sequel::Database.new
  end

  it "should raise an error if there are no columns" do
    @db.define_singleton_method(:schema_parse_table) do |t, opts|
      []
    end
    proc{@db.schema(:x)}.must_raise(Sequel::Error)
  end

  it "should cache data by default" do
    @db.define_singleton_method(:schema_parse_table) do |t, opts|
      [[:a, {}]]
    end
    @db.schema(:x).must_be_same_as(@db.schema(:x))
  end

  it "should not cache data if :reload=>true is given" do
    @db.define_singleton_method(:schema_parse_table) do |t, opts|
      [[:a, {}]]
    end
    @db.schema(:x).wont_be_same_as(@db.schema(:x, :reload=>true))
  end

  it "should not cache schema metadata if cache_schema is false" do
    @db.cache_schema = false
    @db.define_singleton_method(:schema_parse_table) do |t, opts|
      [[:a, {}]]
    end
    @db.schema(:x).wont_be_same_as(@db.schema(:x))
  end

  it "should freeze string values in resulting hash" do
    @db.define_singleton_method(:schema_parse_table) do |t, opts|
      [[:a, {:oid=>1, :db_type=>'integer'.dup, :default=>"'a'".dup, :ruby_default=>'a'.dup}]]
    end
    c = @db.schema(:x)[0][1]
    c[:db_type].frozen?.must_equal true
    c[:default].frozen?.must_equal true
    c[:ruby_default].frozen?.must_equal true
  end

  it "should provide options if given a table name" do
    c = nil
    @db.define_singleton_method(:schema_parse_table) do |t, opts|
      c = [t, opts]
      [[:a, {:db_type=>t.to_s}]]
    end
    @db.schema(:x)
    c.must_equal ["x", {}]
    @db.schema(Sequel[:s][:x])
    c.must_equal ["x", {:schema=>"s"}]
    ds = @db[Sequel[:s][:y]]
    @db.schema(ds)
    c.must_equal ["y", {:schema=>"s", :dataset=>ds}]
  end

  with_symbol_splitting "should provide options if given a table name with splittable symbols" do
    c = nil
    @db.define_singleton_method(:schema_parse_table) do |t, opts|
      c = [t, opts]
      [[:a, {:db_type=>t.to_s}]]
    end
    @db.schema(:s__x)
    c.must_equal ["x", {:schema=>"s"}]
    ds = @db[:s__y]
    @db.schema(ds)
    c.must_equal ["y", {:schema=>"s", :dataset=>ds}]
  end

  it "should parse the schema correctly for a single table" do
    sqls = @sqls
    proc{@db.schema(:x)}.must_raise(Sequel::Error)
    @db.define_singleton_method(:schema_parse_table) do |t, opts|
      sqls << t
      [[:a, {:db_type=>t.to_s}]]
    end
    @db.schema(:x).must_equal [[:a, {:db_type=>"x", :ruby_default=>nil}]]
    @sqls.must_equal ['x']
    @db.schema(:x).must_equal [[:a, {:db_type=>"x", :ruby_default=>nil}]]
    @sqls.must_equal ['x']
    @db.schema(:x, :reload=>true).must_equal [[:a, {:db_type=>"x", :ruby_default=>nil}]]
    @sqls.must_equal ['x', 'x']
  end

  it "should dedup :db_type strings" do
    @db.define_singleton_method(:schema_parse_table) do |t, opts|
      [[:a, {:db_type=>t.to_s.dup}], [:b, {:db_type=>t.to_s.dup}]]
    end
    sch = @db.schema(:x)
    sch.must_equal [[:a, {:db_type=>"x", :ruby_default=>nil}], [:b, {:db_type=>"x", :ruby_default=>nil}]]
    sch[0][1][:db_type].must_be_same_as(sch[1][1][:db_type])
  end if RUBY_VERSION >= '2.5'

  it "should set :auto_increment to true by default if unset and a single integer primary key is used" do
    @db.define_singleton_method(:schema_parse_table){|*| [[:a, {:primary_key=>true, :db_type=>'integer'}]]}
    @db.schema(:x).first.last[:auto_increment].must_equal true
  end

  it "should not set :auto_increment if already set" do
    @db.define_singleton_method(:schema_parse_table){|*| [[:a, {:primary_key=>true, :db_type=>'integer', :auto_increment=>false}]]}
    @db.schema(:x).first.last[:auto_increment].must_equal false
  end

  it "should set :auto_increment to false by default if unset and a single nonintegery primary key is used" do
    @db.define_singleton_method(:schema_parse_table){|*| [[:a, {:primary_key=>true, :db_type=>'varchar'}]]}
    @db.schema(:x).first.last[:auto_increment].must_equal false
  end

  it "should set :auto_increment to false by default if unset and a composite primary key" do
    @db.define_singleton_method(:schema_parse_table){|*| [[:a, {:primary_key=>true, :db_type=>'integer'}], [:b, {:primary_key=>true, :db_type=>'integer'}]]}
    @db.schema(:x).first.last[:auto_increment].must_equal false
    @db.schema(:x).last.last[:auto_increment].must_equal false
  end

  it "should set :auto_increment to true by default if set and not the first column" do
    @db.define_singleton_method(:schema_parse_table){|*| [[:b, {}], [:a, {:primary_key=>true, :db_type=>'integer'}]]}
    @db.schema(:x).last.last[:auto_increment].must_equal true
  end

  it "should convert various types of table name arguments" do
    @db.define_singleton_method(:schema_parse_table) do |t, opts|
      [[t, opts]]
    end
    s1 = @db.schema(:x)
    s1.must_equal [['x', {:ruby_default=>nil}]]
    @db.schema(:x).object_id.must_equal s1.object_id
    @db.schema(Sequel.identifier(:x)).object_id.must_equal s1.object_id

    s2 = @db.schema(Sequel[:x][:y])
    s2.must_equal [['y', {:schema=>'x', :ruby_default=>nil}]]
    @db.schema(Sequel[:x][:y]).object_id.must_equal s2.object_id
    @db.schema(Sequel.qualify(:x, :y)).object_id.must_equal s2.object_id

    s2 = @db.schema(Sequel.qualify(:v, Sequel[:x][:y]))
    s2.must_equal [['y', {:schema=>'x', :ruby_default=>nil, :information_schema_schema=>Sequel.identifier('v')}]]
    @db.schema(Sequel.qualify(:v, Sequel[:x][:y])).object_id.must_equal s2.object_id
    @db.schema(Sequel.qualify(Sequel[:v][:x], :y)).object_id.must_equal s2.object_id

    s2 = @db.schema(Sequel.qualify(Sequel[:u][:v], Sequel[:x][:y]))
    s2.must_equal [['y', {:schema=>'x', :ruby_default=>nil, :information_schema_schema=>Sequel.qualify('u', 'v')}]]
    @db.schema(Sequel.qualify(Sequel[:u][:v], Sequel[:x][:y])).object_id.must_equal s2.object_id
    @db.schema(Sequel.qualify(Sequel.qualify(:u, :v), Sequel.qualify(:x, :y))).object_id.must_equal s2.object_id
  end

  with_symbol_splitting "should convert splittable symbol arguments" do
    @db.define_singleton_method(:schema_parse_table) do |t, opts|
      [[t, opts]]
    end
    s1 = @db.schema(:x)
    s1.must_equal [['x', {:ruby_default=>nil}]]
    @db.schema(:x).object_id.must_equal s1.object_id
    @db.schema(Sequel.identifier(:x)).object_id.must_equal s1.object_id

    s2 = @db.schema(:x__y)
    s2.must_equal [['y', {:schema=>'x', :ruby_default=>nil}]]
    @db.schema(:x__y).object_id.must_equal s2.object_id
    @db.schema(Sequel.qualify(:x, :y)).object_id.must_equal s2.object_id

    s2 = @db.schema(Sequel.qualify(:v, :x__y))
    s2.must_equal [['y', {:schema=>'x', :ruby_default=>nil, :information_schema_schema=>Sequel.identifier('v')}]]
    @db.schema(Sequel.qualify(:v, :x__y)).object_id.must_equal s2.object_id
    @db.schema(Sequel.qualify(:v__x, :y)).object_id.must_equal s2.object_id

    s2 = @db.schema(Sequel.qualify(:u__v, :x__y))
    s2.must_equal [['y', {:schema=>'x', :ruby_default=>nil, :information_schema_schema=>Sequel.qualify('u', 'v')}]]
    @db.schema(Sequel.qualify(:u__v, :x__y)).object_id.must_equal s2.object_id
    @db.schema(Sequel.qualify(Sequel.qualify(:u, :v), Sequel.qualify(:x, :y))).object_id.must_equal s2.object_id
  end

  it "should correctly parse all supported data types" do
    sm = Module.new do
      def schema_parse_table(t, opts)
        [[:x, {:db_type=>t.to_s, :type=>schema_column_type(t.to_s)}]]
      end
    end
    @db.extend(sm)
    @db.schema(:tinyint).first.last[:type].must_equal :integer
    @db.schema(:int).first.last[:type].must_equal :integer
    @db.schema(:integer).first.last[:type].must_equal :integer
    @db.schema(:bigint).first.last[:type].must_equal :integer
    @db.schema(:smallint).first.last[:type].must_equal :integer
    @db.schema(:character).first.last[:type].must_equal :string
    @db.schema(:"character varying").first.last[:type].must_equal :string
    @db.schema(:varchar).first.last[:type].must_equal :string
    @db.schema(:"varchar(255)").first.last[:type].must_equal :string
    @db.schema(:"varchar(255)").first.last[:max_length].must_equal 255
    @db.schema(:text).first.last[:type].must_equal :string
    @db.schema(:date).first.last[:type].must_equal :date
    @db.schema(:datetime).first.last[:type].must_equal :datetime
    @db.schema(:smalldatetime).first.last[:type].must_equal :datetime
    @db.schema(:timestamp).first.last[:type].must_equal :datetime
    @db.schema(:"timestamp with time zone").first.last[:type].must_equal :datetime
    @db.schema(:"timestamp without time zone").first.last[:type].must_equal :datetime
    @db.schema(:time).first.last[:type].must_equal :time
    @db.schema(:"time with time zone").first.last[:type].must_equal :time
    @db.schema(:"time without time zone").first.last[:type].must_equal :time
    @db.schema(:bool).first.last[:type].must_equal :boolean
    @db.schema(:boolean).first.last[:type].must_equal :boolean
    @db.schema(:real).first.last[:type].must_equal :float
    @db.schema(:float).first.last[:type].must_equal :float
    @db.schema(:"float unsigned").first.last[:type].must_equal :float
    @db.schema(:double).first.last[:type].must_equal :float
    @db.schema(:"double(1,2)").first.last[:type].must_equal :float
    @db.schema(:"double(1,2) unsigned").first.last[:type].must_equal :float
    @db.schema(:"double precision").first.last[:type].must_equal :float
    @db.schema(:number).first.last[:type].must_equal :decimal
    @db.schema(:numeric).first.last[:type].must_equal :decimal
    @db.schema(:decimal).first.last[:type].must_equal :decimal
    @db.schema(:"number(10,0)").first.last[:type].must_equal :integer
    @db.schema(:"numeric(10, 10)").first.last[:type].must_equal :decimal
    @db.schema(:"decimal(10,1)").first.last[:type].must_equal :decimal
    @db.schema(:bytea).first.last[:type].must_equal :blob
    @db.schema(:blob).first.last[:type].must_equal :blob
    @db.schema(:image).first.last[:type].must_equal :blob
    @db.schema(:nchar).first.last[:type].must_equal :string
    @db.schema(:nvarchar).first.last[:type].must_equal :string
    @db.schema(:ntext).first.last[:type].must_equal :string
    @db.schema(:clob).first.last[:type].must_equal :string
    @db.schema(:ntext).first.last[:type].must_equal :string
    @db.schema(:smalldatetime).first.last[:type].must_equal :datetime
    @db.schema(:binary).first.last[:type].must_equal :blob
    @db.schema(:varbinary).first.last[:type].must_equal :blob
    @db.schema(:enum).first.last[:type].must_equal :enum

    @db = Sequel.mock(:host=>'postgres')
    @db.extend(sm)
    @db.schema(:interval).first.last[:type].must_equal :interval
    @db.schema(:citext).first.last[:type].must_equal :string

    @db = Sequel.mock(:host=>'mysql')
    @db.extend(sm)
    @db.schema(:set).first.last[:type].must_equal :set
    @db.schema(:mediumint).first.last[:type].must_equal :integer
    @db.schema(:mediumtext).first.last[:type].must_equal :string
  end
end
