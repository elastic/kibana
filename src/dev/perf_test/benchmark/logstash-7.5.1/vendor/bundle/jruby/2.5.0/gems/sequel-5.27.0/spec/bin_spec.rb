require 'rbconfig'
require 'yaml'

RUBY = File.join(RbConfig::CONFIG['bindir'], RbConfig::CONFIG['RUBY_INSTALL_NAME'])
OUTPUT = "spec/bin-sequel-spec-output-#{$$}.log"
TMP_FILE = "spec/bin-sequel-tmp-#{$$}.rb"
BIN_SPEC_DB = "spec/bin-sequel-spec-db-#{$$}.sqlite3"
BIN_SPEC_DB2 = "spec/bin-sequel-spec-db2-#{$$}.sqlite3"

if defined?(RUBY_ENGINE) && RUBY_ENGINE == 'jruby'
  CONN_PREFIX = 'jdbc:sqlite:'
  CONN_HASH = {:adapter=>'jdbc', :uri=>"#{CONN_PREFIX}#{BIN_SPEC_DB}"}
else
  CONN_PREFIX = 'sqlite://'
  CONN_HASH = {:adapter=>'sqlite', :database=>BIN_SPEC_DB}
end

require_relative '../lib/sequel'

Sequel::DB = nil
File.delete(BIN_SPEC_DB) if File.file?(BIN_SPEC_DB)
File.delete(BIN_SPEC_DB2) if File.file?(BIN_SPEC_DB2)
DB = Sequel.connect("#{CONN_PREFIX}#{BIN_SPEC_DB}", :test=>false)
DB2 = Sequel.connect("#{CONN_PREFIX}#{BIN_SPEC_DB2}", :test=>false)

ENV['MT_NO_PLUGINS'] = '1' # Work around stupid autoloading of plugins
gem 'minitest'
require 'minitest/global_expectations/autorun'

describe "bin/sequel" do
  def bin(opts={})
    cmd = "#{opts[:pre]}\"#{RUBY}\" -I lib bin/sequel #{opts[:args]} #{"#{CONN_PREFIX}#{BIN_SPEC_DB}" unless opts[:no_conn]} #{opts[:post]}> #{OUTPUT}#{" 2>&1" if opts[:stderr]}"
    system(cmd)
    File.read(OUTPUT)
  end

  after do
    DB.disconnect
    DB2.disconnect
    [BIN_SPEC_DB, BIN_SPEC_DB2, TMP_FILE, OUTPUT].each do |file|
      if File.file?(file)
        begin
          File.delete(file)
        rescue Errno::ENOENT
          nil
        end
      end
    end
  end
  
  it "-h should print the help" do
    help = bin(:args=>"-h", :no_conn=>true)
    help.must_match(/\ASequel: The Database Toolkit for Ruby/)
    help.must_match(/^Usage: sequel /)
  end

  it "-c should run code" do
    bin(:args=>'-c "print DB.tables.inspect"').must_equal '[]'
    DB.create_table(:a){Integer :a}
    bin(:args=>'-c "print DB.tables.inspect"').must_equal '[:a]'
    bin(:args=>'-v -c "print DB.tables.inspect"').strip.must_equal "sequel #{Sequel.version}\n[:a]"
  end

  it "-C should copy databases" do
    DB.create_table(:a) do
      primary_key :a
      String :name
    end
    DB.create_table(:b) do
      foreign_key :a, :a
      index :a
    end
    DB[:a].insert(1, 'foo')
    DB[:b].insert(1)
    bin(:args=>'-C', :post=>"#{CONN_PREFIX}#{BIN_SPEC_DB2}").must_match Regexp.new(<<END)
Databases connections successful
Migrations dumped successfully
Tables created
Begin copying data
Begin copying records for table: a
Finished copying 1 records for table: a
Begin copying records for table: b
Finished copying 1 records for table: b
Finished copying data
Begin creating indexes
Finished creating indexes
Begin adding foreign key constraints
Finished adding foreign key constraints
Database copy finished in \\d+\\.\\d+ seconds
END
    DB2.tables.sort_by{|t| t.to_s}.must_equal [:a, :b]
    DB[:a].all.must_equal [{:a=>1, :name=>'foo'}]
    DB[:b].all.must_equal [{:a=>1}]
    DB2.schema(:a).map{|col, sch| [col, *sch.values_at(:allow_null, :default, :primary_key, :db_type, :type, :ruby_default)]}.must_equal [[:a, false, nil, true, "integer", :integer, nil], [:name, true, nil, false, "varchar(255)", :string, nil]]
    DB2.schema(:b).map{|col, sch| [col, *sch.values_at(:allow_null, :default, :primary_key, :db_type, :type, :ruby_default)]}.must_equal [[:a, true, nil, false, "integer", :integer, nil]]
    DB2.indexes(:a).must_equal({})
    DB2.indexes(:b).must_equal(:b_a_index=>{:unique=>false, :columns=>[:a]})
    DB2.foreign_key_list(:a).must_equal []
    DB2.foreign_key_list(:b).must_equal [{:columns=>[:a], :table=>:a, :key=>nil, :on_update=>:no_action, :on_delete=>:no_action}]
  end

  it "-C should convert integer to bigint when copying from SQLite to other databases" do
    DB.create_table(:a) do
      Integer :id
    end
    bin(:args=>'-EC', :post=>"mock://postgres").must_include 'CREATE TABLE "a" ("id" bigint)'
  end

  it "-d and -D should dump generic and specific migrations" do
    DB.create_table(:a) do
      primary_key :a
      String :name
    end
    DB.create_table(:b) do
      foreign_key :a, :a
      index :a
    end
    bin(:args=>'-d').must_equal <<END
Sequel.migration do
  change do
    create_table(:a) do
      primary_key :a
      String :name, :size=>255
    end
    
    create_table(:b, :ignore_index_errors=>true) do
      foreign_key :a, :a
      
      index [:a]
    end
  end
end
END
    bin(:args=>'-D').must_equal <<END
Sequel.migration do
  change do
    create_table(:a) do
      primary_key :a
      column :name, "varchar(255)"
    end
    
    create_table(:b) do
      foreign_key :a, :a
      
      index [:a]
    end
  end
end
END
  end

  it "-E should echo SQL statements to stdout" do
    bin(:args=>'-E -c DB.tables').must_include "SELECT * FROM `sqlite_master` WHERE ((`name` != 'sqlite_sequence') AND (`type` = 'table'))"
  end

  it "-I should include directory in load path" do
    bin(:args=>'-Ifoo -c "p 1 if $:.include?(\'foo\')"').must_equal "1\n"
  end

  it "-l should log SQL statements to file" do
    bin(:args=>"-l #{TMP_FILE} -c DB.tables").must_equal ''
    File.read(TMP_FILE).must_include "SELECT * FROM `sqlite_master` WHERE ((`name` != 'sqlite_sequence') AND (`type` = 'table'))"
  end

  it "-L should load all *.rb files in given directory" do
    bin(:args=>'-r ./lib/sequel/extensions/migration -L ./spec/files/integer_migrations -c "p Sequel::Migration.descendants.length"').must_equal "3\n"
  end

  it "-m should migrate database up" do
    bin(:args=>"-m spec/files/integer_migrations").must_equal ''
    DB.tables.sort_by{|t| t.to_s}.must_equal [:schema_info, :sm1111, :sm2222, :sm3333]
  end

  it "-M should specify version to migrate to" do
    bin(:args=>"-m spec/files/integer_migrations -M 2").must_equal ''
    DB.tables.sort_by{|t| t.to_s}.must_equal [:schema_info, :sm1111, :sm2222]
  end

  it "-N should not test for a valid connection" do
    bin(:no_conn=>true, :args=>"-c '' -N #{CONN_PREFIX}spec/nonexistent/foo").must_equal ''
    bin(:no_conn=>true, :args=>"-c '' #{CONN_PREFIX}spec/nonexistent/foo", :stderr=>true).must_match(/\AError: Sequel::DatabaseConnectionError: /)
  end

  it "-r should require a given library" do
    bin(:args=>'-rsequel/extensions/sql_expr -c "print DB.literal(1.sql_expr)"').must_equal "1"
  end

  it "-S should dump the schema cache" do
    bin(:args=>"-S #{TMP_FILE}").must_equal ''
    Marshal.load(File.read(TMP_FILE)).must_equal({})
    DB.create_table(:a){Integer :a}
    bin(:args=>"-S #{TMP_FILE}").must_equal ''
    Marshal.load(File.read(TMP_FILE)).must_equal("`a`"=>[[:a, {:type=>:integer, :db_type=>"integer", :ruby_default=>nil, :allow_null=>true, :default=>nil, :primary_key=>false}]])
  end

  it "-X should dump the index cache" do
    bin(:args=>"-X #{TMP_FILE}").must_equal ''
    Marshal.load(File.read(TMP_FILE)).must_equal({})
    DB.create_table(:a){Integer :id}
    DB.create_table(:b){Integer :b, index: {name: "idx_test", unique: true}}
    bin(:args=>"-X #{TMP_FILE}").must_equal ''
    Marshal.load(File.read(TMP_FILE)).must_equal("`a`"=>{}, "`b`"=>{:idx_test=>{:unique=>true, :columns=>[:b]}})
  end

  it "-t should output full backtraces on error" do
    bin(:args=>'-c "lambda{lambda{lambda{raise \'foo\'}.call}.call}.call"', :stderr=>true).count("\n").must_be :<,  3
    bin(:args=>'-t -c "lambda{lambda{lambda{raise \'foo\'}.call}.call}.call"', :stderr=>true).count("\n").must_be :>,  3
  end

  it "-v should output the Sequel version and exit if database is not given" do
    bin(:args=>"-v", :no_conn=>true).strip.must_equal "sequel #{Sequel.version}"
  end

  it "should error if using -M without -m" do
    bin(:args=>'-M 2', :stderr=>true).must_equal "Error: Must specify -m if using -M\n"
  end

  it "should error if using mutually exclusive options together" do
    bin(:args=>'-c foo -d', :stderr=>true).must_equal "Error: Cannot specify -c and -d together\n"
    bin(:args=>'-D -d', :stderr=>true).must_equal "Error: Cannot specify -D and -d together\n"
    bin(:args=>'-m foo -d', :stderr=>true).must_equal "Error: Cannot specify -m and -d together\n"
    bin(:args=>'-S foo -d', :stderr=>true).must_equal "Error: Cannot specify -S and -d together\n"
    bin(:args=>'-S foo -C', :stderr=>true).must_equal "Error: Cannot specify -S and -C together\n"
  end

  it "should warn if providing too many arguments" do
    bin(:args=>'-c "" "" 1 2 3 4', :stderr=>true).must_equal "Warning: last 5 arguments ignored\n"
  end

  it "should use a mock database if no database is given" do
    bin(:args=>'-c "print DB.adapter_scheme"', :no_conn=>true).must_equal "mock"
  end

  it "should work with a yaml config file" do
    File.open(TMP_FILE, 'wb'){|f| f.write(YAML.dump(CONN_HASH))}
    bin(:args=>"-c \"print DB.tables.inspect\" #{TMP_FILE}", :no_conn=>true).must_equal "[]"
    DB.create_table(:a){Integer :a}
    bin(:args=>"-c \"print DB.tables.inspect\" #{TMP_FILE}", :no_conn=>true).must_equal "[:a]"
  end

  it "should work with a yaml config file with string keys" do
    h = {}
    CONN_HASH.each{|k,v| h[k.to_s] = v}
    File.open(TMP_FILE, 'wb'){|f| f.write(YAML.dump(h))}
    DB.create_table(:a){Integer :a}
    bin(:args=>"-c \"print DB.tables.inspect\" #{TMP_FILE}", :no_conn=>true).must_equal "[:a]"
  end

  it "should work with a yaml config file with environments" do
    File.open(TMP_FILE, 'wb'){|f| f.write(YAML.dump(:development=>CONN_HASH))}
    bin(:args=>"-c \"print DB.tables.inspect\" #{TMP_FILE}", :no_conn=>true).must_equal "[]"
    DB.create_table(:a){Integer :a}
    bin(:args=>"-c \"print DB.tables.inspect\" #{TMP_FILE}", :no_conn=>true).must_equal "[:a]"
  end

  it "-e should set environment for yaml config file" do
    File.open(TMP_FILE, 'wb'){|f| f.write(YAML.dump(:foo=>CONN_HASH))}
    bin(:args=>"-c \"print DB.tables.inspect\" -e foo #{TMP_FILE}", :no_conn=>true).must_equal "[]"
    DB.create_table(:a){Integer :a}
    bin(:args=>"-c \"print DB.tables.inspect\" -e foo #{TMP_FILE}", :no_conn=>true).must_equal "[:a]"
    File.open(TMP_FILE, 'wb'){|f| f.write(YAML.dump('foo'=>CONN_HASH))}
    bin(:args=>"-c \"print DB.tables.inspect\" -e foo #{TMP_FILE}", :no_conn=>true).must_equal "[:a]"
  end

  it "should run code in given filenames" do
    File.open(TMP_FILE, 'wb'){|f| f.write('print DB.tables.inspect')}
    bin(:post=>TMP_FILE).must_equal '[]'
    DB.create_table(:a){Integer :a}
    bin(:post=>TMP_FILE).must_equal '[:a]'
    bin(:post=>TMP_FILE, :args=>'-v').strip.must_equal "sequel #{Sequel.version}\n[:a]"
  end

  it "should run code provided on stdin" do
    bin(:pre=>'echo print DB.tables.inspect | ').must_equal '[]'
    DB.create_table(:a){Integer :a}
    bin(:pre=>'echo print DB.tables.inspect | ').must_equal '[:a]'
  end
end
