require_relative "spec_helper"

Sequel.extension :migration

describe "Migration.descendants" do
  before do
    Sequel::Migration.descendants.clear
  end

  it "should include Migration subclasses" do
    @class = Class.new(Sequel::Migration)
    
    Sequel::Migration.descendants.must_equal [@class]
  end
  
  it "should include Migration subclasses in order of creation" do
    @c1 = Class.new(Sequel::Migration)
    @c2 = Class.new(Sequel::Migration)
    @c3 = Class.new(Sequel::Migration)
    
    Sequel::Migration.descendants.must_equal [@c1, @c2, @c3]
  end

  it "should include SimpleMigration instances created by migration DSL" do
    i1 = Sequel.migration{}
    i2 = Sequel.migration{}
    i3 = Sequel.migration{}
    
    Sequel::Migration.descendants.must_equal [i1, i2, i3]
  end
end

describe "Migration.apply" do
  before do
    @c = Class.new do
      define_method(:one) {|x| [1111, x]}
      define_method(:two) {|x| [2222, x]}
    end
    @db = @c.new
  end
  
  it "should raise for an invalid direction" do
    proc {Sequel::Migration.apply(@db, :hahaha)}.must_raise(ArgumentError)
  end
  
  it "should apply the up and down directions correctly" do
    m = Class.new(Sequel::Migration) do
      define_method(:up) {one(3333)}
      define_method(:down) {two(4444)}
    end
    m.apply(@db, :up).must_equal [1111, 3333]
    m.apply(@db, :down).must_equal [2222, 4444]
  end

  it "should have default up and down actions that do nothing" do
    m = Class.new(Sequel::Migration)
    m.apply(@db, :up).must_be_nil
    m.apply(@db, :down).must_be_nil
  end

  it "should respond to the methods the database responds to" do
    m = Sequel::Migration.new(Sequel.mock)
    m.respond_to?(:foo).must_equal false
    m.respond_to?(:execute).must_equal true
  end
end

describe "SimpleMigration#apply" do
  before do
    @c = Class.new do
      define_method(:one) {|x| [1111, x]}
      define_method(:two) {|x| [2222, x]}
    end
    @db = @c.new
  end
  
  it "should raise for an invalid direction" do
    proc {Sequel.migration{}.apply(@db, :hahaha)}.must_raise(ArgumentError)
  end
  
  it "should apply the up and down directions correctly" do
    m = Sequel.migration do
      up{one(3333)}
      down{two(4444)}
    end
    m.apply(@db, :up).must_equal [1111, 3333]
    m.apply(@db, :down).must_equal [2222, 4444]
  end

  it "should have default up and down actions that do nothing" do
    m = Sequel.migration{}
    m.apply(@db, :up).must_be_nil
    m.apply(@db, :down).must_be_nil
  end
end

describe "Reversible Migrations with Sequel.migration{change{}}" do
  before do
    @c = Class.new do
      self::AT = Class.new do
        attr_reader :actions
        def initialize(&block)
          @actions = []
          instance_eval(&block)
        end
        def method_missing(*args)
          @actions << args
        end
        self
      end
      attr_reader :actions
      def initialize
        @actions = []
      end
      def method_missing(*args)
        @actions << args
      end
      def alter_table(*args, &block)
        @actions << [:alter_table, self.class::AT.new(&block).actions]
      end
    end
    @db = @c.new
    @p = proc do
      create_table(:a, :foo=>:bar){Integer :a}
      add_column :a, :b, String
      add_index :a, :b
      rename_column :a, :b, :c
      rename_table :a, :b
      alter_table(:b) do
        add_column :d, String
        add_constraint :blah, 'd IS NOT NULL'
        add_constraint({:name=>:merp}, 'a > 1')
        add_foreign_key :e, :b
        add_foreign_key [:e], :b, :name=>'e_fk'
        add_foreign_key [:e, :a], :b
        add_primary_key :f, :b
        add_index :e, :name=>'e_n'
        add_full_text_index :e, :name=>'e_ft'
        add_spatial_index :e, :name=>'e_s'
        rename_column :e, :g
      end
      create_view(:c, 'SELECT * FROM b', :foo=>:bar)
      create_join_table(:cat_id=>:cats, :dog_id=>:dogs)
    end
  end
  
  it "should apply up with normal actions in normal order" do
    p = @p
    Sequel.migration{change(&p)}.apply(@db, :up)
    @db.actions.must_equal [[:create_table, :a, {:foo=>:bar}],
      [:add_column, :a, :b, String],
      [:add_index, :a, :b],
      [:rename_column, :a, :b, :c],
      [:rename_table, :a, :b],
      [:alter_table, [
        [:add_column, :d, String],
        [:add_constraint, :blah, "d IS NOT NULL"],
        [:add_constraint, {:name=>:merp}, "a > 1"],
        [:add_foreign_key, :e, :b],
        [:add_foreign_key, [:e], :b, {:name=>"e_fk"}],
        [:add_foreign_key, [:e, :a], :b],
        [:add_primary_key, :f, :b],
        [:add_index, :e, {:name=>"e_n"}],
        [:add_full_text_index, :e, {:name=>"e_ft"}],
        [:add_spatial_index, :e, {:name=>"e_s"}],
        [:rename_column, :e, :g]]
      ],
      [:create_view, :c, "SELECT * FROM b", {:foo=>:bar}],
      [:create_join_table, {:cat_id=>:cats, :dog_id=>:dogs}]]
  end

  it "should execute down with reversing actions in reverse order" do
    p = @p
    Sequel.migration{change(&p)}.apply(@db, :down)
    @db.actions.must_equal [
      [:drop_join_table, {:cat_id=>:cats, :dog_id=>:dogs}],
      [:drop_view, :c, {:foo=>:bar}],
      [:alter_table, [
        [:rename_column, :g, :e],
        [:drop_index, :e, {:name=>"e_s"}],
        [:drop_index, :e, {:name=>"e_ft"}],
        [:drop_index, :e, {:name=>"e_n"}],
        [:drop_column, :f],
        [:drop_foreign_key, [:e, :a]],
        [:drop_foreign_key, [:e], {:name=>"e_fk"}],
        [:drop_foreign_key, :e],
        [:drop_constraint, :merp],
        [:drop_constraint, :blah],
        [:drop_column, :d]]
      ],
      [:rename_table, :b, :a],
      [:rename_column, :a, :c, :b],
      [:drop_index, :a, :b],
      [:drop_column, :a, :b],
      [:drop_table, :a, {:foo=>:bar}]]
  end
  
  it "should reverse add_foreign_key with :type option" do
    Sequel.migration{change{alter_table(:t){add_foreign_key :b, :c, :type=>:f}}}.apply(@db, :down)
    actions = @db.actions
    actions.must_equal [[:alter_table, [[:drop_foreign_key, :b, {:type=>:f}]]]]
    @db.sqls
    db = Sequel.mock
    args = nil
    db.define_singleton_method(:foreign_key_list){|*a| args = a; [{:name=>:fbc, :columns=>[:b]}]}
    db.alter_table(:t){send(*actions[0][1][0])}
    db.sqls.must_equal ["ALTER TABLE t DROP CONSTRAINT fbc", "ALTER TABLE t DROP COLUMN b"]
    args.must_equal [:t]
  end
  
  it "should reverse add_foreign_key with :foreign_key_constraint_name option" do
    Sequel.migration{change{alter_table(:t){add_foreign_key :b, :c, :foreign_key_constraint_name=>:f}}}.apply(@db, :down)
    actions = @db.actions
    actions.must_equal [[:alter_table, [[:drop_foreign_key, :b, {:foreign_key_constraint_name=>:f}]]]]
    @db.sqls
    db = Sequel.mock
    db.alter_table(:t){send(*actions[0][1][0])}
    db.sqls.must_equal ["ALTER TABLE t DROP CONSTRAINT f", "ALTER TABLE t DROP COLUMN b"]
  end
  
  it "should raise in the down direction if migration uses unsupported method" do
    m = Sequel.migration{change{run 'SQL'}}
    m.apply(@db, :up)
    proc{m.apply(@db, :down)}.must_raise(Sequel::Error)
  end
  
  it "should raise in the down direction if migration uses add_primary_key with an array" do
    m = Sequel.migration{change{alter_table(:a){add_primary_key [:b]}}}
    m.apply(@db, :up)
    proc{m.apply(@db, :down)}.must_raise(Sequel::Error)
  end
  
  it "should raise in the down direction if migration uses add_foreign_key with an array" do
    m = Sequel.migration{change{alter_table(:a){add_foreign_key [:b]}}}
    m.apply(@db, :up)
    proc{m.apply(@db, :down)}.must_raise(Sequel::Error)
  end
end

describe "Sequel::Migrator.migrator_class" do
  it "should return IntegerMigrator if not using timestamp migrations" do
    Sequel::Migrator.migrator_class("spec/files/integer_migrations").must_equal Sequel::IntegerMigrator
  end

  it "should return TimestampMigrator if using timestamp migrations" do
    Sequel::Migrator.migrator_class('spec/files/timestamped_migrations').must_equal Sequel::TimestampMigrator
  end

  it "should return self if run on a subclass" do
    Sequel::IntegerMigrator.migrator_class("spec/files/timestamped_migrations").must_equal Sequel::IntegerMigrator
    Sequel::TimestampMigrator.migrator_class("spec/files/integer_migrations").must_equal Sequel::TimestampMigrator
  end

  it "should raise an error if the migration folder does not exist" do
    proc{Sequel::Migrator.apply(@db, "spec/files/nonexistant_migration_path")}.must_raise(Sequel::Migrator::Error)
  end
  
end

describe "Sequel::IntegerMigrator" do
  before do
    dbc = Class.new(Sequel::Mock::Database) do
      attr_reader :drops, :tables_created, :columns_created, :versions
      def initialize(*args)
        super
        @drops = []
        @tables_created = []
        @columns_created = []
        @versions = Hash.new{|h,k| h[k.to_sym]}
      end
  
      def version; versions.values.first || 0; end
      def creates; @tables_created.map{|x| y = x.to_s; y !~ /\Asm(\d+)/; $1.to_i if $1}.compact; end
      def drop_table(*a); super; @drops.concat(a.map{|x| y = x.to_s; y !~ /\Asm(\d+)/; $1.to_i if $1}.compact); end

      def create_table(name, opts={}, &block)
        super
        @columns_created << / \(?(\w+) integer.*\)?\z/.match(@sqls.last)[1].to_sym
        @tables_created << name.to_sym
      end
      
      def dataset
        super.with_extend do
          def count; 1; end
          def columns; db.columns_created end
          def insert(h); db.versions.merge!(h); db.run insert_sql(h) end
          def update(h); db.versions.merge!(h); db.run update_sql(h) end
          def fetch_rows(sql); db.execute(sql); yield(db.versions) unless db.versions.empty? end
        end
      end

      def table_exists?(name)
        @tables_created.include?(name.to_sym)
      end
    end
    @db = dbc.new
    
    @dirname = "spec/files/integer_migrations"
  end
  
  after do
    Object.send(:remove_const, "CreateSessions") if Object.const_defined?("CreateSessions")
  end

  it "should raise an error if there is a missing integer migration version" do
    proc{Sequel::Migrator.apply(@db, "spec/files/missing_integer_migrations")}.must_raise(Sequel::Migrator::Error)
  end
  
  it "should not raise an error if there is a missing integer migration version and allow_missing_migration_files is true" do
    Sequel::Migrator.run(@db, "spec/files/missing_integer_migrations", :allow_missing_migration_files => true)
    @db.sqls.last.must_equal "UPDATE schema_info SET version = 3"
    Sequel::Migrator.run(@db, "spec/files/missing_integer_migrations", :allow_missing_migration_files => true, :target=>0)
    @db.sqls.last.must_equal "UPDATE schema_info SET version = 0"
  end

  it "should raise an error if there is a duplicate integer migration version" do
    proc{Sequel::Migrator.apply(@db, "spec/files/duplicate_integer_migrations")}.must_raise(Sequel::Migrator::Error)
  end

  it "should raise an error if there is an empty migration file" do
    proc{Sequel::Migrator.apply(@db, "spec/files/empty_migration")}.must_raise(Sequel::Migrator::Error)
  end

  it "should raise an error if there is a migration file with multiple migrations" do
    proc{Sequel::Migrator.apply(@db, "spec/files/double_migration")}.must_raise(Sequel::Migrator::Error)
  end

  it "should raise an error if the most recent migration can't be detected" do
    # Have to specify a target version, otherwise an earlier check (inability
    # to detect the target) would raise an error, falsely matching the check.
    proc{Sequel::Migrator.apply(@db, "spec/files/empty_migration_folder", 2)}.must_raise(Sequel::Migrator::Error)
  end

  it "should add a column name if it doesn't already exist in the schema_info table" do
    @db.create_table(:schema_info){Integer :v}
    def @db.alter_table(*); end
    Sequel::Migrator.apply(@db, @dirname)
  end

  it "should automatically create the schema_info table with the version column" do
    @db.table_exists?(:schema_info).must_equal false
    Sequel::Migrator.run(@db, @dirname, :target=>0)
    @db.table_exists?(:schema_info).must_equal true
    @db.dataset.columns.must_equal [:version]
  end

  it "should allow specifying the table and columns" do
    @db.table_exists?(:si).must_equal false
    Sequel::Migrator.run(@db, @dirname, :target=>0, :table=>:si, :column=>:sic)
    @db.table_exists?(:si).must_equal true
    @db.dataset.columns.must_equal [:sic]
  end
  
  it "should support :relative option for running relative migrations" do
    Sequel::Migrator.run(@db, @dirname, :relative=>2).must_equal 2
    @db.creates.must_equal [1111, 2222]
    @db.version.must_equal 2
    @db.sqls.map{|x| x =~ /\AUPDATE.*(\d+)/ ? $1.to_i : nil}.compact.must_equal [1, 2]

    Sequel::Migrator.run(@db, @dirname, :relative=>-1).must_equal 1
    @db.drops.must_equal [2222]
    @db.version.must_equal 1
    @db.sqls.map{|x| x =~ /\AUPDATE.*(\d+)/ ? $1.to_i : nil}.compact.must_equal [1]

    Sequel::Migrator.run(@db, @dirname, :relative=>2).must_equal 3
    @db.creates.must_equal [1111, 2222, 2222, 3333]
    @db.version.must_equal 3
    @db.sqls.map{|x| x =~ /\AUPDATE.*(\d+)/ ? $1.to_i : nil}.compact.must_equal [2, 3]

    Sequel::Migrator.run(@db, @dirname, :relative=>-3).must_equal 0
    @db.drops.must_equal [2222, 3333, 2222, 1111]
    @db.version.must_equal 0
    @db.sqls.map{|x| x =~ /\AUPDATE.*(\d+)/ ? $1.to_i : nil}.compact.must_equal [2, 1, 0]
  end
  
  it "should handle :relative option beyond the upper and lower limit" do
    Sequel::Migrator.run(@db, @dirname, :relative=>100).must_equal 3
    @db.creates.must_equal [1111, 2222, 3333]
    @db.version.must_equal 3
    @db.sqls.map{|x| x =~ /\AUPDATE.*(\d+)/ ? $1.to_i : nil}.compact.must_equal [1, 2, 3]

    Sequel::Migrator.run(@db, @dirname, :relative=>-200).must_equal 0
    @db.drops.must_equal [3333, 2222, 1111]
    @db.version.must_equal 0
    @db.sqls.map{|x| x =~ /\AUPDATE.*(\d+)/ ? $1.to_i : nil}.compact.must_equal [2, 1, 0]
  end

  it "should correctly handle migration target versions beyond the upper and lower limits" do
    Sequel::Migrator.run(@db, @dirname, :target=>100).must_equal 3
    @db.creates.must_equal [1111, 2222, 3333]
    @db.version.must_equal 3
    @db.sqls.map{|x| x =~ /\AUPDATE.*(\d+)/ ? $1.to_i : nil}.compact.must_equal [1, 2, 3]

    Sequel::Migrator.run(@db, @dirname, :target=>-100).must_equal 0
    @db.drops.must_equal [3333, 2222, 1111]
    @db.version.must_equal 0
    @db.sqls.map{|x| x =~ /\AUPDATE.*(\d+)/ ? $1.to_i : nil}.compact.must_equal [2, 1, 0]
  end
  
  it "should apply migrations correctly in the up direction if no target is given" do
    Sequel::Migrator.apply(@db, @dirname)
    @db.creates.must_equal [1111, 2222, 3333]
    @db.version.must_equal 3
    @db.sqls.map{|x| x =~ /\AUPDATE.*(\d+)/ ? $1.to_i : nil}.compact.must_equal [1, 2, 3]
  end
  
  it "should be able to tell whether there are outstanding migrations" do
    Sequel::Migrator.is_current?(@db, @dirname).must_equal false
    Sequel::Migrator.apply(@db, @dirname)
    Sequel::Migrator.is_current?(@db, @dirname).must_equal true
  end 

  it "should have #check_current raise an exception if the migrator is not current" do
    proc{Sequel::Migrator.check_current(@db, @dirname)}.must_raise(Sequel::Migrator::NotCurrentError)
    Sequel::Migrator.apply(@db, @dirname)
    Sequel::Migrator.check_current(@db, @dirname)
  end

  it "should apply migrations correctly in the up direction with target" do
    Sequel::Migrator.apply(@db, @dirname, 2)
    @db.creates.must_equal [1111, 2222]
    @db.version.must_equal 2
    @db.sqls.map{|x| x =~ /\AUPDATE.*(\d+)/ ? $1.to_i : nil}.compact.must_equal [1, 2]
  end
  
  it "should apply migrations correctly in the up direction with target and existing" do
    Sequel::Migrator.apply(@db, @dirname, 2, 1)
    @db.creates.must_equal [2222]
    @db.version.must_equal 2
    @db.sqls.map{|x| x =~ /\AUPDATE.*(\d+)/ ? $1.to_i : nil}.compact.must_equal [2]
  end

  it "should apply migrations correctly in the down direction with target" do
    @db.create_table(:schema_info){Integer :version, :default=>0}
    @db[:schema_info].insert(:version=>3)
    @db.version.must_equal 3
    Sequel::Migrator.apply(@db, @dirname, 0)
    @db.drops.must_equal [3333, 2222, 1111]
    @db.version.must_equal 0
    @db.sqls.map{|x| x =~ /\AUPDATE.*(\d+)/ ? $1.to_i : nil}.compact.must_equal [2, 1, 0]
  end
  
  it "should apply migrations correctly in the down direction with target and existing" do
    Sequel::Migrator.apply(@db, @dirname, 1, 2)
    @db.drops.must_equal [2222]
    @db.version.must_equal 1
    @db.sqls.map{|x| x =~ /\AUPDATE.*(\d+)/ ? $1.to_i : nil}.compact.must_equal [1]
  end
  
  it "should return the target version" do
    Sequel::Migrator.apply(@db, @dirname, 3, 2).must_equal 3
    Sequel::Migrator.apply(@db, @dirname, 0).must_equal 0
    Sequel::Migrator.apply(@db, @dirname).must_equal 3
  end

  it "should use IntegerMigrator if IntegerMigrator.apply called, even for timestamped migration directory" do
    proc{Sequel::IntegerMigrator.apply(@db, "spec/files/timestamped_migrations")}.must_raise(Sequel::Migrator::Error)
  end

  it "should not use transactions by default" do
    Sequel::Migrator.apply(@db, "spec/files/transaction_unspecified_migrations")
    @db.sqls.must_equal ["CREATE TABLE schema_info (version integer DEFAULT 0 NOT NULL)", "SELECT 1 AS one FROM schema_info LIMIT 1", "INSERT INTO schema_info (version) VALUES (0)", "SELECT version FROM schema_info LIMIT 1", "CREATE TABLE sm11111 (smc1 integer)", "UPDATE schema_info SET version = 1", "CREATE TABLE sm (smc1 integer)", "UPDATE schema_info SET version = 2"]
  end

  it "should use transactions by default if the database supports transactional ddl" do
    def @db.supports_transactional_ddl?; true end
    Sequel::Migrator.apply(@db, "spec/files/transaction_unspecified_migrations")
    @db.sqls.must_equal ["CREATE TABLE schema_info (version integer DEFAULT 0 NOT NULL)", "SELECT 1 AS one FROM schema_info LIMIT 1", "INSERT INTO schema_info (version) VALUES (0)", "SELECT version FROM schema_info LIMIT 1", "BEGIN", "CREATE TABLE sm11111 (smc1 integer)", "UPDATE schema_info SET version = 1", "COMMIT", "BEGIN", "CREATE TABLE sm (smc1 integer)", "UPDATE schema_info SET version = 2", "COMMIT"]
  end

  it "should respect transaction use on a per migration basis" do
    def @db.supports_transactional_ddl?; true end
    Sequel::Migrator.apply(@db, "spec/files/transaction_specified_migrations")
    @db.sqls.must_equal ["CREATE TABLE schema_info (version integer DEFAULT 0 NOT NULL)", "SELECT 1 AS one FROM schema_info LIMIT 1", "INSERT INTO schema_info (version) VALUES (0)", "SELECT version FROM schema_info LIMIT 1", "BEGIN", "CREATE TABLE sm11111 (smc1 integer)", "UPDATE schema_info SET version = 1", "COMMIT", "CREATE TABLE sm (smc1 integer)", "UPDATE schema_info SET version = 2"]
  end

  it "should force transactions if enabled in the migrator" do
    Sequel::Migrator.run(@db, "spec/files/transaction_specified_migrations", :use_transactions=>true)
    @db.sqls.must_equal ["CREATE TABLE schema_info (version integer DEFAULT 0 NOT NULL)", "SELECT 1 AS one FROM schema_info LIMIT 1", "INSERT INTO schema_info (version) VALUES (0)", "SELECT version FROM schema_info LIMIT 1", "BEGIN", "CREATE TABLE sm11111 (smc1 integer)", "UPDATE schema_info SET version = 1", "COMMIT", "BEGIN", "CREATE TABLE sm (smc1 integer)", "UPDATE schema_info SET version = 2", "COMMIT"]
  end

  it "should not use transactions if disabled in the migrator" do
    Sequel::Migrator.run(@db, "spec/files/transaction_unspecified_migrations", :use_transactions=>false)
    @db.sqls.must_equal ["CREATE TABLE schema_info (version integer DEFAULT 0 NOT NULL)", "SELECT 1 AS one FROM schema_info LIMIT 1", "INSERT INTO schema_info (version) VALUES (0)", "SELECT version FROM schema_info LIMIT 1", "CREATE TABLE sm11111 (smc1 integer)", "UPDATE schema_info SET version = 1", "CREATE TABLE sm (smc1 integer)", "UPDATE schema_info SET version = 2"]
  end
end

describe "Sequel::TimestampMigrator" do
  before do
    @dsc = dsc = Class.new(Sequel::Mock::Dataset) do
      def files
        db.files
      end

      def columns
        super
        case opts[:from].first
        when :schema_info, 'schema_info'
          [:version]
        when :schema_migrations, 'schema_migrations'
          [:filename]
        when :sm, 'sm'
          [:fn]
        end
      end

      def fetch_rows(sql)
        super
        case opts[:from].first
        when :schema_info, 'schema_info'
          yield({:version=>db.sequel_migration_version})
        when :schema_migrations, 'schema_migrations'
          files.sort.each{|f| yield(:filename=>f)}
        when :sm, 'sm'
          files.sort.each{|f| yield(:fn=>f)}
        end
      end

      def insert(h={})
        super
        case opts[:from].first
        when :schema_info, 'schema_info'
          db.sequel_migration_version = h.values.first
        when :schema_migrations, :sm, 'schema_migrations', 'sm'
          files << h.values.first
        end
      end

      def update(h={})
        super
        case opts[:from].first
        when :schema_info, 'schema_info'
          db.sequel_migration_version = h.values.first
        end
      end

      def delete
        super
        case opts[:from].first
        when :schema_migrations, :sm, 'schema_migrations', 'sm'
          files.delete(opts[:where].args.last)
        end
      end
    end
    dbc = Class.new(Sequel::Mock::Database) do
      def files
        @files ||= []
      end

      def tables
        @tables ||= {}
      end

      def sequel_migration_version
        @sequel_migration_version ||= 0
      end
      attr_writer :sequel_migration_version

      def create_table(name, *args, &block)
        super
        tables[name.to_sym] = true
      end
      define_method(:drop_table){|*names| super(*names); names.each{|n| tables.delete(n.to_sym)}}
      define_method(:table_exists?){|name| super(name); tables.has_key?(name.to_sym)}
    end
    @db = dbc.new
    @db.dataset_class = dsc
    @m = Sequel::Migrator
  end

  after do
    Object.send(:remove_const, "CreateSessions") if Object.const_defined?("CreateSessions")
    Object.send(:remove_const, "CreateArtists") if Object.const_defined?("CreateArtists")
    Object.send(:remove_const, "CreateAlbums") if Object.const_defined?("CreateAlbums")
  end
  
  it "should raise an error if there is an empty migration file" do
    proc{Sequel::TimestampMigrator.apply(@db, "spec/files/empty_migration")}.must_raise(Sequel::Migrator::Error)
  end

  it "should raise an error if there is a migration file with multiple migrations" do
    proc{Sequel::TimestampMigrator.apply(@db, "spec/files/double_migration")}.must_raise(Sequel::Migrator::Error)
  end

  it "should handle migrating up or down all the way" do
    @dir = 'spec/files/timestamped_migrations'
    @m.apply(@db, @dir)
    [:schema_migrations, :sm1111, :sm2222, :sm3333].each{|n| @db.table_exists?(n).must_equal true}
    @db[:schema_migrations].select_order_map(:filename).must_equal %w'1273253849_create_sessions.rb 1273253851_create_nodes.rb 1273253853_3_create_users.rb'
    @m.apply(@db, @dir, 0)
    [:sm1111, :sm2222, :sm3333].each{|n| @db.table_exists?(n).must_equal false}
    @db[:schema_migrations].select_order_map(:filename).must_equal []
  end

  it "should handle migrating up or down to specific timestamps" do
    @dir = 'spec/files/timestamped_migrations'
    @m.apply(@db, @dir, 1273253851)
    [:schema_migrations, :sm1111, :sm2222].each{|n| @db.table_exists?(n).must_equal true}
    @db.table_exists?(:sm3333).must_equal false
    @db[:schema_migrations].select_order_map(:filename).must_equal %w'1273253849_create_sessions.rb 1273253851_create_nodes.rb'
    @m.apply(@db, @dir, 1273253849)
    [:sm2222, :sm3333].each{|n| @db.table_exists?(n).must_equal false}
    @db.table_exists?(:sm1111).must_equal true
    @db[:schema_migrations].select_order_map(:filename).must_equal %w'1273253849_create_sessions.rb'
  end

  it "should work correctly when multithreaded" do
    range = 0..4
    dbs = range.map do
      db = @db.class.new
      db.dataset_class = @db.dataset_class
      db
    end

    q1, q2  = Queue.new, Queue.new
    @dir = 'spec/files/timestamped_migrations'
    threads = dbs.map do |db|
      Thread.new do 
        q1.pop
        @m.apply(db, @dir)
        [:schema_migrations, :sm1111, :sm2222, :sm3333].each{|n| _(db.table_exists?(n)).must_equal true}
        _(db[:schema_migrations].select_order_map(:filename)).must_equal %w'1273253849_create_sessions.rb 1273253851_create_nodes.rb 1273253853_3_create_users.rb'
        q2.push db
      end
    end

    range.each{q1.push nil}
    (dbs - range.map{q2.pop}).must_be :empty?
    threads.each(&:join)
  end

  it "should not be current when there are migrations to apply" do
    @dir = 'spec/files/timestamped_migrations'
    @m.apply(@db, @dir)
    @m.is_current?(@db, @dir).must_equal true
    @dir = 'spec/files/interleaved_timestamped_migrations'
    @m.is_current?(@db, @dir).must_equal false
  end

  it "should raise an exception if the migrator is not current" do
    @dir = 'spec/files/timestamped_migrations'
    @m.apply(@db, @dir)
    @m.check_current(@db, @dir)
    @dir = 'spec/files/interleaved_timestamped_migrations'
    proc{@m.check_current(@db, @dir)}.must_raise(Sequel::Migrator::NotCurrentError)
  end

  it "should apply all missing files when migrating up" do
    @dir = 'spec/files/timestamped_migrations'
    @m.apply(@db, @dir)
    @dir = 'spec/files/interleaved_timestamped_migrations'
    @m.apply(@db, @dir)
    [:schema_migrations, :sm1111, :sm1122, :sm2222, :sm2233, :sm3333].each{|n| @db.table_exists?(n).must_equal true}
    @db[:schema_migrations].select_order_map(:filename).must_equal %w'1273253849_create_sessions.rb 1273253850_create_artists.rb 1273253851_create_nodes.rb 1273253852_create_albums.rb 1273253853_3_create_users.rb'
  end

  it "should not apply down action to migrations where up action hasn't been applied" do
    @dir = 'spec/files/timestamped_migrations'
    @m.apply(@db, @dir)
    @dir = 'spec/files/interleaved_timestamped_migrations'
    @m.apply(@db, @dir, 0)
    [:sm1111, :sm1122, :sm2222, :sm2233, :sm3333].each{|n| @db.table_exists?(n).must_equal false}
    @db[:schema_migrations].select_order_map(:filename).must_equal []
  end

  it "should handle updating to a specific timestamp when interleaving migrations" do
    @dir = 'spec/files/timestamped_migrations'
    @m.apply(@db, @dir)
    @dir = 'spec/files/interleaved_timestamped_migrations'
    @m.apply(@db, @dir, 1273253851)
    [:schema_migrations, :sm1111, :sm1122, :sm2222].each{|n| @db.table_exists?(n).must_equal true}
    [:sm2233, :sm3333].each{|n| @db.table_exists?(n).must_equal false}
    @db[:schema_migrations].select_order_map(:filename).must_equal %w'1273253849_create_sessions.rb 1273253850_create_artists.rb 1273253851_create_nodes.rb'
  end

  it "should correctly update schema_migrations table when an error occurs when migrating up or down" do
    @dir = 'spec/files/bad_timestamped_migrations'
    proc{@m.apply(@db, @dir)}.must_raise NoMethodError
    [:schema_migrations, :sm1111, :sm2222].each{|n| @db.table_exists?(n).must_equal true}
    @db.table_exists?(:sm3333).must_equal false
    @db[:schema_migrations].select_order_map(:filename).must_equal %w'1273253849_create_sessions.rb 1273253851_create_nodes.rb'
    proc{@m.apply(@db, @dir, 0)}.must_raise NoMethodError
    [:sm2222, :sm3333].each{|n| @db.table_exists?(n).must_equal false}
    @db.table_exists?(:sm1111).must_equal true
    @db[:schema_migrations].select_order_map(:filename).must_equal %w'1273253849_create_sessions.rb'
  end

  it "should handle multiple migrations with the same timestamp correctly" do
    @dir = 'spec/files/duplicate_timestamped_migrations'
    @m.apply(@db, @dir)
    [:schema_migrations, :sm1111, :sm2222, :sm3333].each{|n| @db.table_exists?(n).must_equal true}
    @db[:schema_migrations].select_order_map(:filename).must_equal %w'1273253849_create_sessions.rb 1273253853_create_nodes.rb 1273253853_create_users.rb'
    @m.apply(@db, @dir, 1273253853)
    [:sm1111, :sm2222, :sm3333].each{|n| @db.table_exists?(n).must_equal true}
    @db[:schema_migrations].select_order_map(:filename).must_equal %w'1273253849_create_sessions.rb 1273253853_create_nodes.rb 1273253853_create_users.rb'
    @m.apply(@db, @dir, 1273253849)
    [:sm1111].each{|n| @db.table_exists?(n).must_equal true}
    [:sm2222, :sm3333].each{|n| @db.table_exists?(n).must_equal false}
    @db[:schema_migrations].select_order_map(:filename).must_equal %w'1273253849_create_sessions.rb'
    @m.apply(@db, @dir, 1273253848)
    [:sm1111, :sm2222, :sm3333].each{|n| @db.table_exists?(n).must_equal false}
    @db[:schema_migrations].select_order_map(:filename).must_equal []
  end

  it "should convert schema_info table to schema_migrations table" do
    @dir = 'spec/files/integer_migrations'
    @m.apply(@db, @dir)
    [:schema_info, :sm1111, :sm2222, :sm3333].each{|n| @db.table_exists?(n).must_equal true}
    [:schema_migrations, :sm1122, :sm2233].each{|n| @db.table_exists?(n).must_equal false}

    @dir = 'spec/files/convert_to_timestamp_migrations'
    @m.apply(@db, @dir)
    [:schema_info, :sm1111, :sm2222, :sm3333, :schema_migrations, :sm1122, :sm2233].each{|n| @db.table_exists?(n).must_equal true}
    @db[:schema_migrations].select_order_map(:filename).must_equal %w'001_create_sessions.rb 002_create_nodes.rb 003_3_create_users.rb 1273253850_create_artists.rb 1273253852_create_albums.rb'

    @m.apply(@db, @dir, 4)
    [:schema_info, :schema_migrations, :sm1111, :sm2222, :sm3333].each{|n| @db.table_exists?(n).must_equal true}
    [:sm1122, :sm2233].each{|n| @db.table_exists?(n).must_equal false}
    @db[:schema_migrations].select_order_map(:filename).must_equal %w'001_create_sessions.rb 002_create_nodes.rb 003_3_create_users.rb'

    @m.apply(@db, @dir, 0)
    [:schema_info, :schema_migrations].each{|n| @db.table_exists?(n).must_equal true}
    [:sm1111, :sm2222, :sm3333, :sm1122, :sm2233].each{|n| @db.table_exists?(n).must_equal false}
    @db[:schema_migrations].select_order_map(:filename).must_equal []
  end

  it "should handle unapplied migrations when migrating schema_info table to schema_migrations table" do
    @dir = 'spec/files/integer_migrations'
    @m.apply(@db, @dir, 2)
    [:schema_info, :sm1111, :sm2222].each{|n| @db.table_exists?(n).must_equal true}
    [:schema_migrations, :sm3333, :sm1122, :sm2233].each{|n| @db.table_exists?(n).must_equal false}

    @dir = 'spec/files/convert_to_timestamp_migrations'
    @m.apply(@db, @dir, 1273253850)
    [:schema_info, :sm1111, :sm2222, :sm3333, :schema_migrations, :sm1122].each{|n| @db.table_exists?(n).must_equal true}
    [:sm2233].each{|n| @db.table_exists?(n).must_equal false}
    @db[:schema_migrations].select_order_map(:filename).must_equal %w'001_create_sessions.rb 002_create_nodes.rb 003_3_create_users.rb 1273253850_create_artists.rb'
  end

  it "should handle unapplied migrations when migrating schema_info table to schema_migrations table and target is less than last integer migration version" do
    @dir = 'spec/files/integer_migrations'
    @m.apply(@db, @dir, 1)
    [:schema_info, :sm1111].each{|n| @db.table_exists?(n).must_equal true}
    [:schema_migrations, :sm2222, :sm3333, :sm1122, :sm2233].each{|n| @db.table_exists?(n).must_equal false}

    @dir = 'spec/files/convert_to_timestamp_migrations'
    @m.apply(@db, @dir, 2)
    [:schema_info, :sm1111, :sm2222, :schema_migrations].each{|n| @db.table_exists?(n).must_equal true}
    [:sm3333, :sm1122, :sm2233].each{|n| @db.table_exists?(n).must_equal false}
    @db[:schema_migrations].select_order_map(:filename).must_equal %w'001_create_sessions.rb 002_create_nodes.rb'

    @m.apply(@db, @dir)
    [:schema_info, :sm1111, :sm2222, :schema_migrations, :sm3333, :sm1122, :sm2233].each{|n| @db.table_exists?(n).must_equal true}
    @db[:schema_migrations].select_order_map(:filename).must_equal %w'001_create_sessions.rb 002_create_nodes.rb 003_3_create_users.rb 1273253850_create_artists.rb 1273253852_create_albums.rb'
  end

  it "should raise error for applied migrations not in file system" do
    @dir = 'spec/files/timestamped_migrations'
    @m.apply(@db, @dir)
    [:schema_migrations, :sm1111, :sm2222, :sm3333].each{|n| @db.table_exists?(n).must_equal true}
    @db[:schema_migrations].select_order_map(:filename).must_equal %w'1273253849_create_sessions.rb 1273253851_create_nodes.rb 1273253853_3_create_users.rb'

    @dir = 'spec/files/missing_timestamped_migrations'
    proc{@m.apply(@db, @dir, 0)}.must_raise(Sequel::Migrator::Error)
    [:schema_migrations, :sm1111, :sm2222, :sm3333].each{|n| @db.table_exists?(n).must_equal true}
    @db[:schema_migrations].select_order_map(:filename).must_equal %w'1273253849_create_sessions.rb 1273253851_create_nodes.rb 1273253853_3_create_users.rb'
  end
  
  it "should not raise error for applied migrations not in file system if :allow_missing_migration_files is true" do
    @dir = 'spec/files/timestamped_migrations'
    @m.apply(@db, @dir)
    [:schema_migrations, :sm1111, :sm2222, :sm3333].each{|n| @db.table_exists?(n).must_equal true}
    @db[:schema_migrations].select_order_map(:filename).must_equal %w'1273253849_create_sessions.rb 1273253851_create_nodes.rb 1273253853_3_create_users.rb'

    @dir = 'spec/files/missing_timestamped_migrations'
    @m.run(@db, @dir, :allow_missing_migration_files => true)
    [:schema_migrations, :sm1111, :sm2222, :sm3333].each{|n| @db.table_exists?(n).must_equal true}
    @db[:schema_migrations].select_order_map(:filename).must_equal %w'1273253849_create_sessions.rb 1273253851_create_nodes.rb 1273253853_3_create_users.rb'
  end
  
  it "should raise error missing column name in existing schema_migrations table" do
    @dir = 'spec/files/timestamped_migrations'
    @m.apply(@db, @dir)
    proc{@m.run(@db, @dir, :column=>:fn)}.must_raise(Sequel::Migrator::Error)
  end
  
  it "should handle migration filenames in a case insensitive manner" do
    @dir = 'spec/files/uppercase_timestamped_migrations'
    @m.apply(@db, @dir)
    [:schema_migrations, :sm1111, :sm2222, :sm3333].each{|n| @db.table_exists?(n).must_equal true}
    @db[:schema_migrations].select_order_map(:filename).must_equal %w'1273253849_create_sessions.rb 1273253851_create_nodes.rb 1273253853_3_create_users.rb'
    @dir = 'spec/files/timestamped_migrations'
    @m.apply(@db, @dir, 0)
    [:sm1111, :sm2222, :sm3333].each{|n| @db.table_exists?(n).must_equal false}
    @db[:schema_migrations].select_order_map(:filename).must_equal []
  end

  it "should :table and :column options" do
    @dir = 'spec/files/timestamped_migrations'
    @m.run(@db, @dir, :table=>:sm, :column=>:fn)
    [:sm, :sm1111, :sm2222, :sm3333].each{|n| @db.table_exists?(n).must_equal true}
    @db[:sm].select_order_map(:filename).must_equal %w'1273253849_create_sessions.rb 1273253851_create_nodes.rb 1273253853_3_create_users.rb'
    @m.run(@db, @dir, :target=>0, :table=>:sm, :column=>:fn)
    [:sm1111, :sm2222, :sm3333].each{|n| @db.table_exists?(n).must_equal false}
    @db[:sm].select_order_map(:fn).must_equal []
  end

  it "should return nil" do
    @dir = 'spec/files/timestamped_migrations'
    @m.apply(@db, @dir, 1273253850).must_be_nil
    @m.apply(@db, @dir, 0).must_be_nil
    @m.apply(@db, @dir).must_be_nil
  end

  it "should use TimestampMigrator if TimestampMigrator.apply is called even for integer migrations directory" do
    Sequel::TimestampMigrator.apply(@db, "spec/files/integer_migrations")
    @db.sqls.must_equal ["SELECT NULL AS nil FROM schema_migrations LIMIT 1", "CREATE TABLE schema_migrations (filename varchar(255) PRIMARY KEY)", "SELECT NULL AS nil FROM schema_info LIMIT 1", "SELECT filename FROM schema_migrations ORDER BY filename", "CREATE TABLE sm1111 (smc1 integer)", "INSERT INTO schema_migrations (filename) VALUES ('001_create_sessions.rb')", "CREATE TABLE sm2222 (smc2 integer)", "INSERT INTO schema_migrations (filename) VALUES ('002_create_nodes.rb')", "CREATE TABLE sm3333 (smc3 integer)", "INSERT INTO schema_migrations (filename) VALUES ('003_3_create_users.rb')"]
  end

  it "should not use transactions by default" do
    Sequel::TimestampMigrator.apply(@db, "spec/files/transaction_unspecified_migrations")
    @db.sqls.must_equal ["SELECT NULL AS nil FROM schema_migrations LIMIT 1", "CREATE TABLE schema_migrations (filename varchar(255) PRIMARY KEY)", "SELECT NULL AS nil FROM schema_info LIMIT 1", "SELECT filename FROM schema_migrations ORDER BY filename", "CREATE TABLE sm11111 (smc1 integer)", "INSERT INTO schema_migrations (filename) VALUES ('001_create_alt_basic.rb')", "CREATE TABLE sm (smc1 integer)", "INSERT INTO schema_migrations (filename) VALUES ('002_create_basic.rb')"]
  end

  it "should use transactions by default if database supports transactional ddl" do
    def @db.supports_transactional_ddl?; true end
    Sequel::TimestampMigrator.apply(@db, "spec/files/transaction_unspecified_migrations")
    @db.sqls.must_equal ["SELECT NULL AS nil FROM schema_migrations LIMIT 1", "CREATE TABLE schema_migrations (filename varchar(255) PRIMARY KEY)", "SELECT NULL AS nil FROM schema_info LIMIT 1", "SELECT filename FROM schema_migrations ORDER BY filename", "BEGIN", "CREATE TABLE sm11111 (smc1 integer)", "INSERT INTO schema_migrations (filename) VALUES ('001_create_alt_basic.rb')", "COMMIT", "BEGIN", "CREATE TABLE sm (smc1 integer)", "INSERT INTO schema_migrations (filename) VALUES ('002_create_basic.rb')", "COMMIT"]
  end

  it "should support transaction use on a per migration basis" do
    Sequel::TimestampMigrator.apply(@db, "spec/files/transaction_specified_migrations")
    @db.sqls.must_equal ["SELECT NULL AS nil FROM schema_migrations LIMIT 1", "CREATE TABLE schema_migrations (filename varchar(255) PRIMARY KEY)", "SELECT NULL AS nil FROM schema_info LIMIT 1", "SELECT filename FROM schema_migrations ORDER BY filename", "BEGIN", "CREATE TABLE sm11111 (smc1 integer)", "INSERT INTO schema_migrations (filename) VALUES ('001_create_alt_basic.rb')", "COMMIT", "CREATE TABLE sm (smc1 integer)", "INSERT INTO schema_migrations (filename) VALUES ('002_create_basic.rb')"]
  end

  it "should force transactions if enabled by the migrator" do
    Sequel::TimestampMigrator.run(@db, "spec/files/transaction_specified_migrations", :use_transactions=>true)
    @db.sqls.must_equal ["SELECT NULL AS nil FROM schema_migrations LIMIT 1", "CREATE TABLE schema_migrations (filename varchar(255) PRIMARY KEY)", "SELECT NULL AS nil FROM schema_info LIMIT 1", "SELECT filename FROM schema_migrations ORDER BY filename", "BEGIN", "CREATE TABLE sm11111 (smc1 integer)", "INSERT INTO schema_migrations (filename) VALUES ('001_create_alt_basic.rb')", "COMMIT", "BEGIN", "CREATE TABLE sm (smc1 integer)", "INSERT INTO schema_migrations (filename) VALUES ('002_create_basic.rb')", "COMMIT"]
  end

  it "should not use transactions if disabled in the migrator" do
    Sequel::TimestampMigrator.run(@db, "spec/files/transaction_unspecified_migrations", :use_transactions=>false)
    @db.sqls.must_equal ["SELECT NULL AS nil FROM schema_migrations LIMIT 1", "CREATE TABLE schema_migrations (filename varchar(255) PRIMARY KEY)", "SELECT NULL AS nil FROM schema_info LIMIT 1", "SELECT filename FROM schema_migrations ORDER BY filename", "CREATE TABLE sm11111 (smc1 integer)", "INSERT INTO schema_migrations (filename) VALUES ('001_create_alt_basic.rb')", "CREATE TABLE sm (smc1 integer)", "INSERT INTO schema_migrations (filename) VALUES ('002_create_basic.rb')"]
  end

  it "should use shorter primary key field on MySQL if creating schema migrations table fails" do
    def @db.database_type; :mysql end
    def @db.execute_ddl(sql, *)
      super
      raise Sequel::DatabaseError, "Specified key was too long; max key length is 767 bytes" if sql =~ /varchar\(255\)/
    end
    Sequel::TimestampMigrator.run(@db, "spec/files/transaction_unspecified_migrations", :use_transactions=>false)
    @db.sqls.must_equal ["SELECT NULL AS nil FROM schema_migrations LIMIT 1", "CREATE TABLE schema_migrations (filename varchar(255) PRIMARY KEY)", "CREATE TABLE schema_migrations (filename varchar(190) PRIMARY KEY)",  "SELECT NULL AS nil FROM schema_info LIMIT 1", "SELECT filename FROM schema_migrations ORDER BY filename", "CREATE TABLE sm11111 (smc1 integer)", "INSERT INTO schema_migrations (filename) VALUES ('001_create_alt_basic.rb')", "CREATE TABLE sm (smc1 integer)", "INSERT INTO schema_migrations (filename) VALUES ('002_create_basic.rb')"]
  end

  it "should not use shorter primary key field on other databases if creating schema migrations table fails" do
    def @db.execute_ddl(sql, *)
      super
      raise Sequel::DatabaseError, "Specified key was too long; max key length is 767 bytes" if sql =~ /varchar\(255\)/
    end
    proc{Sequel::TimestampMigrator.run(@db, "spec/files/transaction_unspecified_migrations", :use_transactions=>false)}.must_raise Sequel::DatabaseError
    @db.sqls.must_equal ["SELECT NULL AS nil FROM schema_migrations LIMIT 1", "CREATE TABLE schema_migrations (filename varchar(255) PRIMARY KEY)"]
  end
end
