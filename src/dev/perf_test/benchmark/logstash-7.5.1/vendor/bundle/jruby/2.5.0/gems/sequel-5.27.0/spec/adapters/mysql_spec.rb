SEQUEL_ADAPTER_TEST = :mysql

require_relative 'spec_helper'

describe "MySQL", '#create_table' do
  before do
    @db = DB
    @db.test_connection
  end
  after do
    @db.drop_table?(:dolls)
  end

  it "should create a temporary table" do
    @db.create_table(:tmp_dolls, :temp => true, :engine => 'MyISAM', :charset => 'latin2'){text :name}
    @db.table_exists?(:tmp_dolls).must_equal true
    @db.disconnect
    @db.table_exists?(:tmp_dolls).must_equal false
  end

  it "should not use a default for a String :text=>true type" do
    @db.create_table(:dolls){String :name, :text=>true, :default=>'blah'}
    @db[:dolls].insert
    @db[:dolls].all.must_equal [{:name=>nil}]
  end

  it "should not use a default for a File type" do
    @db.create_table(:dolls){File :name, :default=>'blah'}
    @db[:dolls].insert
    @db[:dolls].all.must_equal [{:name=>nil}]
  end

  it "should respect the size option for File type" do
    @db.create_table(:dolls) do
      File :n1
      File :n2, :size=>:tiny
      File :n3, :size=>:medium
      File :n4, :size=>:long
      File :n5, :size=>255
    end
    @db.schema(:dolls).map{|k, v| v[:db_type]}.must_equal %w"blob tinyblob mediumblob longblob blob"
  end

  it "should include an :auto_increment schema attribute if auto incrementing" do
    @db.create_table(:dolls) do
      primary_key :n4
      Integer :n2
      String :n3
    end
    @db.schema(:dolls).map{|k, v| v[:auto_increment]}.must_equal [true, nil, nil]
  end

  it "should support collate with various other column options" do
    @db.create_table!(:dolls){ String :name, :size=>128, :collate=>:utf8_bin, :default=>'foo', :null=>false, :unique=>true}
    @db[:dolls].insert
    @db[:dolls].select_map(:name).must_equal ["foo"]
  end

  it "should be able to parse the default value for set and enum types" do
    @db.create_table!(:dolls){column :t, "set('a', 'b', 'c', 'd')", :default=>'a,b'}
    @db.schema(:dolls).first.last[:ruby_default].must_equal 'a,b'
    @db.create_table!(:dolls){column :t, "enum('a', 'b', 'c', 'd')", :default=>'b'}
    @db.schema(:dolls).first.last[:ruby_default].must_equal 'b'
  end

  it "should allow setting auto_increment for existing column" do
    @db.create_table(:dolls){Integer :a, :primary_key=>true}
    @db.schema(:dolls).first.last[:auto_increment].must_equal false
    @db.set_column_type :dolls, :a, Integer, :auto_increment=>true
    @db.schema(:dolls).first.last[:auto_increment].must_equal true
  end

  it "should create generated column" do
    skip("generated columns not supported, skipping test") unless @db.supports_generated_columns?
    @db.create_table(:dolls){String :a; String :b, generated_always_as: Sequel.function(:CONCAT, :a, 'plus')}
    @db.schema(:dolls)[1][1][:generated].must_equal true
  end
end

if [:mysql, :mysql2].include?(DB.adapter_scheme)
  describe "Sequel::MySQL::Database#convert_tinyint_to_bool" do
    before do
      @db = DB
      @db.create_table(:booltest){column :b, 'tinyint(1)'; column :i, 'tinyint(4)'}
      @ds = @db[:booltest]
    end
    after do
      @db.convert_tinyint_to_bool = true
      @db.drop_table?(:booltest)
    end

    it "should consider tinyint(1) datatypes as boolean if set, but not larger tinyints" do
      @db.schema(:booltest, :reload=>true).map{|_, s| s[:type]}.must_equal [:boolean, :integer]
      @db.convert_tinyint_to_bool = false
      @db.schema(:booltest, :reload=>true).map{|_, s| s[:type]}.must_equal [:integer, :integer]
    end

    it "should return tinyint(1)s as bools and tinyint(4)s as integers when set" do
      @db.convert_tinyint_to_bool = true
      @ds.delete
      @ds.insert(:b=>true, :i=>10)
      @ds.all.must_equal [{:b=>true, :i=>10}]
      @ds.delete
      @ds.insert(:b=>false, :i=>0)
      @ds.all.must_equal [{:b=>false, :i=>0}]
      @ds.delete
      @ds.insert(:b=>true, :i=>1)
      @ds.all.must_equal [{:b=>true, :i=>1}]
    end

    it "should return all tinyints as integers when unset" do
      @db.convert_tinyint_to_bool = false
      @ds.delete
      @ds.insert(:b=>true, :i=>10)
      @ds.all.must_equal [{:b=>1, :i=>10}]
      @ds.delete
      @ds.insert(:b=>false, :i=>0)
      @ds.all.must_equal [{:b=>0, :i=>0}]

      @ds.delete
      @ds.insert(:b=>1, :i=>10)
      @ds.all.must_equal [{:b=>1, :i=>10}]
      @ds.delete
      @ds.insert(:b=>0, :i=>0)
      @ds.all.must_equal [{:b=>0, :i=>0}]
    end

    it "should allow disabling the conversion on a per-dataset basis" do
      @db.convert_tinyint_to_bool = true
      ds = @ds.with_extend do
        def cast_tinyint_integer?(f) true end #mysql
        def convert_tinyint_to_bool?() false end #mysql2
      end
      ds.delete
      ds.insert(:b=>true, :i=>10)
      ds.all.must_equal [{:b=>1, :i=>10}]
      @ds.all.must_equal [{:b=>true, :i=>10}]
    end
  end
end

describe "A MySQL dataset" do
  before do
    DB.create_table(:items){String :name; Integer :value}
    @d = DB[:items]
  end
  after do
    DB.drop_table?(:items)
  end

  it "should handle large unsigned smallint/integer values" do
    DB.alter_table(:items){set_column_type :value, 'smallint unsigned'}
    @d.insert(:value=>(1 << 15) + 1)
    @d.get(:value).must_equal((1 << 15) + 1)
    DB.alter_table(:items){set_column_type :value, 'integer unsigned'}
    @d.update(:value=>(1 << 31) + 1)
    @d.get(:value).must_equal((1 << 31) + 1)
    DB.alter_table(:items){set_column_type :value, 'bigint unsigned'}
    @d.update(:value=>(1 << 63) + 1)
    @d.get(:value).must_equal((1 << 63) + 1)
  end

  it "should support ORDER clause in UPDATE statements" do
    @d.order(:name).update_sql(:value => 1).must_equal 'UPDATE `items` SET `value` = 1 ORDER BY `name`'
  end

  it "should support updating a limited dataset" do
    @d.import [:value], [[2], [3]]
    @d.limit(1).update(:value => 4).must_equal 1
    [[2,4], [3,4]].must_include @d.select_order_map(:value)
  end

  it "should support updating a ordered, limited dataset" do
    @d.import [:value], [[2], [3]]
    @d.order(:value).limit(1).update(:value => 4).must_equal 1
    @d.select_order_map(:value).must_equal [3,4]
  end

  it "should raise error for updating a dataset with an offset" do
    proc{@d.offset(1).update(:value => 4)}.must_raise Sequel::InvalidOperation
    proc{@d.order(:value).offset(1).update(:value => 4)}.must_raise Sequel::InvalidOperation
  end

  it "should support regexps" do
    @d.insert(:name => 'abc', :value => 1)
    @d.insert(:name => 'bcd', :value => 2)
    @d.filter(:name => /bc/).count.must_equal 2
    @d.filter(:name => /^bc/).count.must_equal 1
  end

  it "should have explain output" do
    @d.explain.must_be_kind_of(String)
    @d.explain(:extended=>true).must_be_kind_of(String)
  end

  it "should correctly literalize strings with comment backslashes in them" do
    @d.delete
    @d.insert(:name => ':\\')

    @d.first[:name].must_equal ':\\'
  end

  it "should handle prepared statements with on_duplicate_key_update" do
    @d.db.add_index :items, :value, :unique=>true
    ds = @d.on_duplicate_key_update
    ps = ds.prepare(:insert, :insert_user_id_feature_name, :value => :$v, :name => :$n)
    ps.call(:v => 1, :n => 'a')
    ds.all.must_equal [{:value=>1, :name=>'a'}]
    ps.call(:v => 1, :n => 'b')
    ds.all.must_equal [{:value=>1, :name=>'b'}]
  end

  it "should support generated columns" do
    skip("generated columns not supported, skipping test") unless DB.supports_generated_columns?
    DB.alter_table(:items) {add_column :b, String, :generated_always_as => Sequel.function(:CONCAT, :name, 'plus')}
    @d.insert(name: 'hello')
    @d.first[:b].must_equal 'helloplus'
  end
end

describe "Dataset#distinct" do
  before do
    @db = DB
    @db.create_table!(:a) do
      Integer :a
      Integer :b
    end
    @ds = @db[:a]
  end
  after do
    @db.drop_table?(:a)
  end

  it "#distinct with arguments should return results distinct on those arguments" do
    skip("ONLY_FULL_GROUP_BY sql_mode set, skipping DISTINCT ON emulation test") if @db.get(Sequel.lit '@@sql_mode').include?('ONLY_FULL_GROUP_BY')

    @ds.insert(20, 10)
    @ds.insert(30, 10)
    @ds.order(:b, :a).distinct.map(:a).must_equal [20, 30]
    @ds.order(:b, Sequel.desc(:a)).distinct.map(:a).must_equal [30, 20]
    # MySQL doesn't respect orders when using the nonstandard GROUP BY
    [[20], [30]].must_include(@ds.order(:b, :a).distinct(:b).map(:a))
  end
end

describe "MySQL join expressions" do
  before(:all) do
    @ds = DB[:nodes]
    DB.create_table!(:nodes){Integer :id; Integer :y}
    DB.create_table!(:n1){Integer :id}
    DB.create_table!(:n2){Integer :y}
    @ds.insert(:id=>1, :y=>2)
    DB[:n1].insert(1)
    DB[:n2].insert(2)
  end
  after(:all) do
    DB.drop_table?(:n2, :n1, :nodes)
  end

  it "should support straight joins (force left table to be read before right)" do
    @ds.join_table(:straight, :n1).all.must_equal [{:id=>1, :y=>2}]
  end
  it "should support natural joins on multiple tables." do
    @ds.join_table(:natural_left_outer, [:n1, :n2]).all.must_equal [{:id=>1, :y=>2}]
  end
  it "should support straight joins on multiple tables." do
    @ds.join_table(:straight, [:n1, :n2]).all.must_equal [{:id=>1, :y=>2}]
  end
end

describe "A MySQL database" do
  after do
    DB.drop_table?(:test_innodb)
  end

  it "should handle the creation and dropping of an InnoDB table with foreign keys" do
    DB.create_table!(:test_innodb, :engine=>:InnoDB){primary_key :id; foreign_key :fk, :test_innodb, :key=>:id}
  end

  it "should handle qualified tables in #indexes" do
    DB.create_table!(:test_innodb){primary_key :id; String :name; index :name, :unique=>true, :name=>:test_innodb_name_idx}
    DB.indexes(Sequel.qualify(DB.get{database.function}, :test_innodb)).must_equal(:test_innodb_name_idx=>{:unique=>true, :columns=>[:name]})
  end
end

describe "A MySQL database" do
  before(:all) do
    @db = DB
    @db.create_table! :test2 do
      text :name
      Integer :value
    end
  end
  after(:all) do
    @db.drop_table?(:test2)
  end

  it "should provide the server version" do
    @db.server_version.must_be :>=,  40000
  end

  it "should support for_share" do
    @db[:test2].delete
    @db.transaction{@db[:test2].for_share.all.must_equal []}
  end

  it "should support column operations" do
    @db.add_column :test2, :xyz, :text

    @db[:test2].columns.must_equal [:name, :value, :xyz]
    @db[:test2].insert(:name => 'mmm', :value => 111, :xyz => '000')
    @db[:test2].first[:xyz].must_equal '000'

    @db[:test2].columns.must_equal [:name, :value, :xyz]
    @db.drop_column :test2, :xyz

    @db[:test2].columns.must_equal [:name, :value]

    @db[:test2].delete
    @db.add_column :test2, :xyz, :text
    @db[:test2].insert(:name => 'mmm', :value => 111, :xyz => 'qqqq')

    @db[:test2].columns.must_equal [:name, :value, :xyz]
    @db.rename_column :test2, :xyz, :zyx, :type => :text
    @db[:test2].columns.must_equal [:name, :value, :zyx]
    @db[:test2].first[:zyx].must_equal 'qqqq'

    @db[:test2].delete
    @db.add_column :test2, :tre, :text
    @db[:test2].insert(:name => 'mmm', :value => 111, :tre => 'qqqq')

    @db[:test2].columns.must_equal [:name, :value, :zyx, :tre]
    @db.rename_column :test2, :tre, :ert, :type => :varchar, :size=>255
    @db[:test2].columns.must_equal [:name, :value, :zyx, :ert]
    @db[:test2].first[:ert].must_equal 'qqqq'

    @db.add_column :test2, :xyz, :float
    @db[:test2].delete
    @db[:test2].insert(:name => 'mmm', :value => 111, :xyz => 56.78)
    @db.set_column_type :test2, :xyz, :integer

    @db[:test2].first[:xyz].must_equal 57

    @db.alter_table :test2 do
      add_index :value, :unique=>true
      add_foreign_key :value2, :test2, :key=>:value
    end
    @db[:test2].columns.must_equal [:name, :value, :zyx, :ert, :xyz, :value2]

    @db.alter_table :test2 do
      drop_foreign_key :value2
      drop_index :value
    end
  end
end  

describe "A MySQL database with table options" do
  before do
    @options = {:engine=>'MyISAM', :charset=>'latin1', :collate => 'latin1_swedish_ci'}

    @db = DB
    @db.default_engine = 'InnoDB'
    @db.default_charset = 'utf8'
    @db.default_collate = 'utf8_general_ci'
    @db.drop_table?(:items)
  end
  after do
    @db.drop_table?(:items)

    @db.default_engine = nil
    @db.default_charset = nil
    @db.default_collate = nil
  end

  it "should allow to pass custom options (engine, charset, collate) for table creation" do
    @db.create_table(:items, @options){Integer :size; text :name}
    @db.transaction(:rollback=>:always) do
      @db[:items].insert(:size=>1)
    end
    @db[:items].all.must_equal [{:size=>1, :name=>nil}]
  end

  it "should use default options if specified (engine, charset, collate) for table creation" do
    @db.create_table(:items){Integer :size; text :name}
    @db.transaction(:rollback=>:always) do
      @db[:items].insert(:size=>1)
    end
    @db[:items].all.must_equal []
  end

  it "should not use default if option has a nil value" do
    @db.default_engine = 'non_existent_engine'
    @db.create_table(:items, :engine=>nil, :charset=>nil, :collate=>nil){Integer :size; text :name}
  end
end

describe "A MySQL database" do
  before do
    @db = DB
    @db.drop_table?(:items)
  end
  after do
    @db.drop_table?(:items, :users)
  end

  it "should support defaults for boolean columns" do
    @db.create_table(:items){TrueClass :active1, :default=>true; FalseClass :active2, :default => false}
    @db[:items].insert
    @db[:items].get([:active1, :active2]).must_equal [true, false]
    @db[:items].get([Sequel.cast(:active1, Integer).as(:v1), Sequel.cast(:active2, Integer).as(:v2)]).must_equal [1, 0]
  end

  it "should correctly handle CREATE TABLE statements with foreign keys" do
    @db.create_table(:items){primary_key :id; foreign_key :p_id, :items, :key => :id, :null => false, :on_delete => :cascade}
    @db[:items].insert(:id=>1, :p_id=>1)
    @db[:items].insert(:id=>2, :p_id=>1)
    @db[:items].where(:id=>1).delete
    @db[:items].count.must_equal 0
  end

  it "should correctly handle CREATE TABLE statements with foreign keys, when :key != the default (:id)" do
    @db.create_table(:items){primary_key :id; Integer :other_than_id; foreign_key :p_id, :items, :key => :other_than_id, :null => false, :on_delete => :cascade}
    @db[:items].insert(:id=>1, :other_than_id=>2, :p_id=>2)
    @db[:items].insert(:id=>2, :other_than_id=>3, :p_id=>2)
    @db[:items].where(:id=>1).delete
    @db[:items].count.must_equal 0
  end

  it "should correctly handle ALTER TABLE statements with foreign keys" do
    @db.create_table(:items){Integer :id}
    @db.create_table(:users){primary_key :id}
    @db.alter_table(:items){add_foreign_key :p_id, :users, :key => :id, :null => false, :on_delete => :cascade}
    @db[:users].insert(:id=>1)
    @db[:items].insert(:id=>2, :p_id=>1)
    @db[:users].where(:id=>1).delete
    @db[:items].count.must_equal 0
  end

  it "should correctly format ALTER TABLE statements with named foreign keys" do
    @db.create_table(:items){Integer :id}
    @db.create_table(:users){primary_key :id}
    @db.alter_table(:items){add_foreign_key :p_id, :users, :key => :id, :null => false, :on_delete => :cascade, :foreign_key_constraint_name => :pk_items__users }
    @db[:users].insert(:id=>1)
    @db[:items].insert(:id=>2, :p_id=>1)
    @db[:users].where(:id=>1).delete
    @db[:items].count.must_equal 0
  end

  it "should correctly handle add_column :after option" do
    @db.create_table(:items){Integer :id; Integer :value}
    @db.alter_table(:items){add_column :name, String, :after=>:id}
    @db[:items].columns.must_equal [:id, :name, :value]
  end

  it "should correctly handle add_column :first option" do
    @db.create_table(:items){Integer :id; Integer :value}
    @db.alter_table(:items){add_column :name, String, :first => true}
    @db[:items].columns.must_equal [:name, :id, :value]
  end

  it "should correctly handle add_foreign_key :first option" do
    @db.create_table(:items){primary_key :id; Integer :value}
    @db.alter_table(:items){add_foreign_key :parent_id, :items, :first => true}
    @db[:items].columns.must_equal [:parent_id, :id, :value]
  end

  it "should have rename_column support keep existing options" do
    @db.create_table(:items){String :id, :null=>false, :default=>'blah'}
    @db.alter_table(:items){rename_column :id, :nid}
    @db[:items].insert
    @db[:items].all.must_equal [{:nid=>'blah'}]
    proc{@db[:items].insert(:nid=>nil)}.must_raise(Sequel::NotNullConstraintViolation)
  end

  it "should have set_column_type support keep existing options" do
    @db.create_table(:items){Integer :id, :null=>false, :default=>5}
    @db.alter_table(:items){set_column_type :id, :Bignum}
    @db[:items].insert
    @db[:items].all.must_equal [{:id=>5}]
    proc{@db[:items].insert(:id=>nil)}.must_raise(Sequel::NotNullConstraintViolation)
    @db[:items].delete
    @db[:items].insert(2**40)
    @db[:items].all.must_equal [{:id=>2**40}]
  end

  it "should have set_column_type pass through options" do
    @db.create_table(:items){integer :id; enum :list, :elements=>%w[one]}
    @db.alter_table(:items){set_column_type :id, :int, :unsigned=>true, :size=>8; set_column_type :list, :enum, :elements=>%w[two]}
    @db.schema(:items)[1][1][:db_type].must_equal "enum('two')"
  end

  it "should have set_column_default support keep existing options" do
    @db.create_table(:items){Integer :id, :null=>false, :default=>5}
    @db.alter_table(:items){set_column_default :id, 6}
    @db[:items].insert
    @db[:items].all.must_equal [{:id=>6}]
    proc{@db[:items].insert(:id=>nil)}.must_raise(Sequel::NotNullConstraintViolation)
  end

  it "should have set_column_allow_null support keep existing options" do
    @db.create_table(:items){Integer :id, :null=>false, :default=>5}
    @db.alter_table(:items){set_column_allow_null :id, true}
    @db[:items].insert
    @db[:items].all.must_equal [{:id=>5}]
    @db[:items].insert(:id=>nil)
  end

  it "should accept repeated raw sql statements using Database#<<" do
    @db.create_table(:items){String :name; Integer :value}
    @db << 'DELETE FROM items'
    @db[:items].count.must_equal 0

    @db << "INSERT INTO items (name, value) VALUES ('tutu', 1234)"
    @db[:items].first.must_equal(:name => 'tutu', :value => 1234)

    @db << 'DELETE FROM items'
    @db[:items].first.must_be_nil
  end

  it "should have schema handle generated columns" do
    skip("generated columns not supported, skipping test") unless @db.supports_generated_columns?
    @db.create_table(:items) {String :a}
    @db.alter_table(:items){add_column :b, String, :generated_always_as=>Sequel.function(:CONCAT, :a, 'plus'), :generated_type=>:stored, :unique=>true}
    @db.schema(:items)[1][1][:generated].must_equal true
    @db.alter_table(:items){add_column :c, String, :generated_always_as=>Sequel.function(:CONCAT, :a, 'minus'), :generated_type=>:virtual}
    @db.schema(:items)[2][1][:generated].must_equal true
  end
end  

# Socket tests should only be run if the MySQL server is on localhost
if DB.adapter_scheme == :mysql && %w'localhost 127.0.0.1 ::1'.include?(URI.parse(DB.uri).host)
  describe "A MySQL database" do
    socket_file = defined?(MYSQL_SOCKET_FILE) ? MYSQL_SOCKET_FILE : '/tmp/mysql.sock'

    it "should accept a socket option" do
      Sequel.mysql(DB.opts[:database], :host => 'localhost', :user => DB.opts[:user], :password => DB.opts[:password], :socket => socket_file, :keep_reference=>false)
    end

    it "should accept a socket option without host option" do
      Sequel.mysql(DB.opts[:database], :user => DB.opts[:user], :password => DB.opts[:password], :socket => socket_file, :keep_reference=>false)
    end

    it "should fail to connect with invalid socket" do
      proc{Sequel.mysql(DB.opts[:database], :user => DB.opts[:user], :password => DB.opts[:password], :socket =>'blah', :keep_reference=>false)}.must_raise Sequel::DatabaseConnectionError
    end
  end
end

describe "A MySQL database" do
  it "should accept a read_timeout option when connecting" do
    db = Sequel.connect(DB.opts.merge(:read_timeout=>22342))
    db.test_connection
  end
end

describe "MySQL foreign key support" do
  after do
    DB.drop_table?(:testfk, :testpk)
  end

  it "should create table without :key" do
    DB.create_table!(:testpk){primary_key :id}
    DB.create_table!(:testfk){foreign_key :fk, :testpk}
  end

  it "should create table with composite keys without :key" do
    DB.create_table!(:testpk){Integer :id; Integer :id2; primary_key([:id, :id2])}
    DB.create_table!(:testfk){Integer :fk; Integer :fk2; foreign_key([:fk, :fk2], :testpk)}
  end

  it "should create table with self referential without :key" do
    DB.create_table!(:testfk){primary_key :id; foreign_key :fk, :testfk}
  end

  it "should create table with self referential with non-autoincrementing key without :key" do
    DB.create_table!(:testfk){Integer :id, :primary_key=>true; foreign_key :fk, :testfk}
  end

  it "should create table with self referential with composite keys without :key" do
    DB.create_table!(:testfk){Integer :id; Integer :id2; Integer :fk; Integer :fk2; primary_key([:id, :id2]); foreign_key([:fk, :fk2], :testfk)}
  end

  it "should alter table without :key" do
    DB.create_table!(:testpk){primary_key :id}
    DB.create_table!(:testfk){Integer :id}
    DB.alter_table(:testfk){add_foreign_key :fk, :testpk}
  end

  it "should alter table with composite keys without :key" do
    DB.create_table!(:testpk){Integer :id; Integer :id2; primary_key([:id, :id2])}
    DB.create_table!(:testfk){Integer :fk; Integer :fk2}
    DB.alter_table(:testfk){add_foreign_key([:fk, :fk2], :testpk)}
  end

  it "should alter table with self referential without :key" do
    DB.create_table!(:testfk){primary_key :id}
    DB.alter_table(:testfk){add_foreign_key :fk, :testfk}
  end

  it "should alter table with self referential with composite keys without :key" do
    DB.create_table!(:testfk){Integer :id; Integer :id2; Integer :fk; Integer :fk2; primary_key([:id, :id2])}
    DB.alter_table(:testfk){add_foreign_key [:fk, :fk2], :testfk}
  end
end

describe "A grouped MySQL dataset" do
  before do
    DB.create_table! :test2 do
      text :name
      integer :value
    end
    DB[:test2].insert(:name => '11', :value => 10)
    DB[:test2].insert(:name => '11', :value => 20)
    DB[:test2].insert(:name => '11', :value => 30)
    DB[:test2].insert(:name => '12', :value => 10)
    DB[:test2].insert(:name => '12', :value => 20)
    DB[:test2].insert(:name => '13', :value => 10)
  end
  after do
    DB.drop_table?(:test2)
  end

  it "should return the correct count for raw sql query" do
    ds = DB["select name FROM test2 WHERE name = '11' GROUP BY name"]
    ds.count.must_equal 1
  end

  it "should return the correct count for a normal dataset" do
    ds = DB[:test2].select(:name).where(:name => '11').group(:name)
    ds.count.must_equal 1
  end
end

describe "A MySQL database" do
  before do
    @db = DB
    @db.drop_table?(:posts)
  end
  after do
    @db.drop_table?(:posts)
  end

  it "should support fulltext indexes and full_text_search" do
    @db.create_table(:posts, :engine=>:MyISAM){text :title; text :body; full_text_index :title; full_text_index [:title, :body]}

    @db[:posts].insert(:title=>'ruby rails', :body=>'y')
    @db[:posts].insert(:title=>'sequel', :body=>'ruby')
    @db[:posts].insert(:title=>'ruby scooby', :body=>'x')

    @db[:posts].full_text_search(:title, 'rails').all.must_equal [{:title=>'ruby rails', :body=>'y'}]
    @db[:posts].full_text_search([:title, :body], ['sequel', 'ruby']).all.must_equal [{:title=>'sequel', :body=>'ruby'}]
    @db[:posts].full_text_search(:title, '+ruby -rails', :boolean => true).all.must_equal [{:title=>'ruby scooby', :body=>'x'}]

    @db[:posts].full_text_search(:title, :$n).call(:select, :n=>'rails').must_equal [{:title=>'ruby rails', :body=>'y'}]
    @db[:posts].full_text_search(:title, :$n).prepare(:select, :fts_select).call(:n=>'rails').must_equal [{:title=>'ruby rails', :body=>'y'}]
  end

  it "should support spatial indexes" do
    @db.create_table(:posts, :engine=>:MyISAM){point :geom, :null=>false; spatial_index [:geom]}
  end

  it "should support indexes with index type" do
    @db.create_table(:posts){Integer :id; index :id, :type => :btree}
    @db[:posts].insert(1)
    @db[:posts].where(:id=>1).count.must_equal 1
  end

  it "should support unique indexes with index type" do
    @db.create_table(:posts){Integer :id; index :id, :type => :btree, :unique => true}
    @db[:posts].insert(1)
    proc{@db[:posts].insert(1)}.must_raise Sequel::UniqueConstraintViolation
  end

  it "should not dump partial indexes" do
    @db.create_table(:posts){text :id}
    @db << "CREATE INDEX posts_id_index ON posts (id(10))"
    @db.indexes(:posts).must_equal({})
  end

  it "should dump partial indexes if :partial option is set to true" do
    @db.create_table(:posts){text :id}
    @db << "CREATE INDEX posts_id_index ON posts (id(10))"
    @db.indexes(:posts, :partial => true).must_equal(:posts_id_index => {:columns => [:id], :unique => false})
  end
end

describe "MySQL::Dataset#insert and related methods" do
  before do
    DB.create_table(:items){String :name, :unique=>true; Integer :value}
    @d = DB[:items].order(:name)
  end
  after do
    DB.drop_table?(:items)
  end

  it "#insert should insert record with default values when no arguments given" do
    @d.insert
    @d.all.must_equal [{:name => nil, :value => nil}]
  end

  it "#insert  should insert record with default values when empty hash given" do
    @d.insert({})
    @d.all.must_equal [{:name => nil, :value => nil}]
  end

  it "#insert should insert record with default values when empty array given" do
    @d.insert []
    @d.all.must_equal [{:name => nil, :value => nil}]
  end

  it "#on_duplicate_key_update should work with regular inserts" do
    DB.add_index :items, :name, :unique=>true
    @d.insert(:name => 'abc', :value => 1)
    @d.on_duplicate_key_update(:name, :value => 6).insert(:name => 'abc', :value => 1)
    @d.on_duplicate_key_update(:name, :value => 6).insert(:name => 'def', :value => 2)
    @d.all.must_equal [{:name => 'abc', :value => 6}, {:name => 'def', :value => 2}]
  end

  it "#multi_replace should replace multiple records in a single statement" do
    @d.multi_replace([{:name => 'abc'}, {:name => 'def'}])
    @d.all.must_equal [ {:name => 'abc', :value => nil}, {:name => 'def', :value => nil} ]
    @d.multi_replace([{:name => 'abc', :value=>1}, {:name => 'ghi', :value=>3}])
    @d.all.must_equal [ {:name => 'abc', :value => 1}, {:name => 'def', :value => nil}, {:name => 'ghi', :value=>3} ]
  end

  it "#multi_replace should support :commit_every option" do
    @d.multi_replace([{:value => 1}, {:value => 2}, {:value => 3}, {:value => 4}], :commit_every => 2)
    @d.all.must_equal [ {:name => nil, :value => 1}, {:name => nil, :value => 2}, {:name => nil, :value => 3}, {:name => nil, :value => 4} ]
  end

  it "#multi_replace should support :slice option" do
    @d.multi_replace([{:value => 1}, {:value => 2}, {:value => 3}, {:value => 4}], :slice => 2)
    @d.all.must_equal [ {:name => nil, :value => 1}, {:name => nil, :value => 2}, {:name => nil, :value => 3}, {:name => nil, :value => 4} ]
  end

  it "#multi_insert should insert multiple records in a single statement" do
    @d.multi_insert([{:name => 'abc'}, {:name => 'def'}])
    @d.all.must_equal [ {:name => 'abc', :value => nil}, {:name => 'def', :value => nil} ]
  end

  it "#multi_insert should support :commit_every option" do
    @d.multi_insert([{:value => 1}, {:value => 2}, {:value => 3}, {:value => 4}], :commit_every => 2)
    @d.all.must_equal [ {:name => nil, :value => 1}, {:name => nil, :value => 2}, {:name => nil, :value => 3}, {:name => nil, :value => 4} ]
  end

  it "#multi_insert should support :slice option" do
    @d.multi_insert([{:value => 1}, {:value => 2}, {:value => 3}, {:value => 4}], :slice => 2)
    @d.all.must_equal [ {:name => nil, :value => 1}, {:name => nil, :value => 2}, {:name => nil, :value => 3}, {:name => nil, :value => 4} ]
  end

  it "#import should support inserting using columns and values arrays" do
    @d.import([:name, :value], [['abc', 1], ['def', 2]])
    @d.all.must_equal [ {:name => 'abc', :value => 1}, {:name => 'def', :value => 2} ]
  end

  it "#insert_ignore should ignore existing records when used with multi_insert" do
    @d.insert_ignore.multi_insert([{:name => 'abc'}, {:name => 'def'}])
    @d.all.must_equal [ {:name => 'abc', :value => nil}, {:name => 'def', :value => nil} ]
    @d.insert_ignore.multi_insert([{:name => 'abc', :value=>1}, {:name => 'ghi', :value=>3}])
    @d.all.must_equal [ {:name => 'abc', :value => nil}, {:name => 'def', :value => nil}, {:name => 'ghi', :value=>3} ]
  end

  it "#insert_ignore should ignore single records when used with insert" do
    @d.insert_ignore.insert(:name => 'ghi')
    @d.all.must_equal [{:name => 'ghi', :value => nil}]
    @d.insert_ignore.insert(:name => 'ghi', :value=>2)
    @d.all.must_equal [{:name => 'ghi', :value => nil}]
  end

  it "#on_duplicate_key_update should handle inserts with duplicate keys" do
    @d.on_duplicate_key_update.import([:name,:value], [['abc', 1], ['def',2]])
    @d.all.must_equal [ {:name => 'abc', :value => 1}, {:name => 'def', :value => 2} ]
    @d.on_duplicate_key_update.import([:name,:value], [['abc', 2], ['ghi',3]])
    @d.all.must_equal [ {:name => 'abc', :value => 2}, {:name => 'def', :value => 2}, {:name => 'ghi', :value=>3} ]
  end

  it "#on_duplicate_key_update should add the ON DUPLICATE KEY UPDATE and columns specified when args are given" do
    @d.on_duplicate_key_update(:value).import([:name,:value], [['abc', 1], ['def',2]])
    @d.all.must_equal [ {:name => 'abc', :value => 1}, {:name => 'def', :value => 2} ]
    @d.on_duplicate_key_update(:value).import([:name,:value], [['abc', 2], ['ghi',3]])
    @d.all.must_equal [ {:name => 'abc', :value => 2}, {:name => 'def', :value => 2}, {:name => 'ghi', :value=>3} ]
    @d.on_duplicate_key_update(:name).import([:name,:value], [['abc', 5], ['ghi',6]])
    @d.all.must_equal [ {:name => 'abc', :value => 2}, {:name => 'def', :value => 2}, {:name => 'ghi', :value=>3} ]
  end
end

describe "MySQL::Dataset#update and related methods" do
  before do
    DB.create_table(:items){String :name; Integer :value; index :name, :unique=>true}
    @d = DB[:items]
  end
  after do
    DB.drop_table?(:items)
  end

  it "#update_ignore should not raise error where normal update would fail" do
    @d.insert(:name => 'cow', :value => 0)
    @d.insert(:name => 'cat', :value => 1)
    proc{@d.where(:value => 1).update(:name => 'cow')}.must_raise(Sequel::UniqueConstraintViolation)
    @d.update_ignore.where(:value => 1).update(:name => 'cow')
    @d.order(:name).all.must_equal [{:name => 'cat', :value => 1}, {:name => 'cow', :value => 0}]
  end
end

describe "MySQL::Dataset#replace" do
  before do
    DB.create_table(:items){Integer :id, :unique=>true; Integer :value}
    @d = DB[:items]
  end
  after do
    DB.drop_table?(:items)
  end

  it "should use default values if they exist" do
    DB.alter_table(:items){set_column_default :id, 1; set_column_default :value, 2}
    @d.replace
    @d.all.must_equal [{:id=>1, :value=>2}]
    @d.replace([])
    @d.all.must_equal [{:id=>1, :value=>2}]
    @d.replace({})
    @d.all.must_equal [{:id=>1, :value=>2}]
  end
end

describe "MySQL::Dataset#complex_expression_sql" do
  before do
    @d = DB.dataset
  end

  it "should handle string concatenation with CONCAT if more than one record" do
    @d.literal(Sequel.join([:x, :y])).must_equal "CONCAT(`x`, `y`)"
    @d.literal(Sequel.join([:x, :y], ' ')).must_equal "CONCAT(`x`, ' ', `y`)"
    @d.literal(Sequel.join([Sequel.function(:x, :y), 1, Sequel.lit('z')], Sequel.subscript(:y, 1))).must_equal "CONCAT(x(`y`), `y`[1], '1', `y`[1], z)"
  end

  it "should handle string concatenation as simple string if just one record" do
    @d.literal(Sequel.join([:x])).must_equal "`x`"
    @d.literal(Sequel.join([:x], ' ')).must_equal "`x`"
  end
end

describe "MySQL::Dataset#calc_found_rows" do
  before do
    DB.create_table!(:items){Integer :a}
  end
  after do
    DB.drop_table?(:items)
  end

  it "should count matching rows disregarding LIMIT clause" do
    DB[:items].multi_insert([{:a => 1}, {:a => 1}, {:a => 2}])

    DB.synchronize do
      DB[:items].calc_found_rows.filter(:a => 1).limit(1).all.must_equal [{:a => 1}]
      DB.dataset.select(Sequel.function(:FOUND_ROWS).as(:rows)).all.must_equal [{:rows => 2 }]
    end
  end
end

if DB.adapter_scheme == :mysql or DB.adapter_scheme == :jdbc or DB.adapter_scheme == :mysql2
  describe "MySQL Stored Procedures" do
    before do
      DB.create_table(:items){Integer :id; Integer :value}
      @d = DB[:items]
    end
    after do
      DB.drop_table?(:items)
      DB.execute('DROP PROCEDURE test_sproc')
    end

    it "should be callable on the database object" do
      DB.execute_ddl('CREATE PROCEDURE test_sproc() BEGIN DELETE FROM items; END')
      DB[:items].delete
      DB[:items].insert(:value=>1)
      DB[:items].count.must_equal 1
      DB.call_sproc(:test_sproc)
      DB[:items].count.must_equal 0
    end

    # Mysql2 doesn't support stored procedures that return result sets, probably because
    # CLIENT_MULTI_RESULTS is not set.
    unless DB.adapter_scheme == :mysql2
      it "should be callable on the dataset object" do
        DB.execute_ddl('CREATE PROCEDURE test_sproc(a INTEGER) BEGIN SELECT *, a AS b FROM items; END')
        DB[:items].delete
        @d = DB[:items]
        @d.call_sproc(:select, :test_sproc, 3).must_equal []
        @d.insert(:value=>1)
        @d.call_sproc(:select, :test_sproc, 4).must_equal [{:id=>nil, :value=>1, :b=>4}]
        @d = @d.with_row_proc(proc{|r| r.keys.each{|k| r[k] *= 2 if r[k].is_a?(Integer)}; r})
        @d.call_sproc(:select, :test_sproc, 3).must_equal [{:id=>nil, :value=>2, :b=>6}]
      end

      it "should be callable on the dataset object with multiple arguments" do
        DB.execute_ddl('CREATE PROCEDURE test_sproc(a INTEGER, c INTEGER) BEGIN SELECT *, a AS b, c AS d FROM items; END')
        DB[:items].delete
        @d = DB[:items]
        @d.call_sproc(:select, :test_sproc, 3, 4).must_equal []
        @d.insert(:value=>1)
        @d.call_sproc(:select, :test_sproc, 4, 5).must_equal [{:id=>nil, :value=>1, :b=>4, :d=>5}]
        @d = @d.with_row_proc(proc{|r| r.keys.each{|k| r[k] *= 2 if r[k].is_a?(Integer)}; r})
        @d.call_sproc(:select, :test_sproc, 3, 4).must_equal [{:id=>nil, :value=>2, :b=>6, :d => 8}]
      end
    end

    it "should deal with nil values" do
      DB.execute_ddl('CREATE PROCEDURE test_sproc(i INTEGER, v INTEGER) BEGIN INSERT INTO items VALUES (i, v); END')
      DB[:items].delete
      DB.call_sproc(:test_sproc, :args=>[1, nil])
      DB[:items].all.must_equal [{:id=>1, :value=>nil}]
    end
  end
end

if DB.adapter_scheme == :mysql
  describe "MySQL bad date/time conversions" do
    after do
      DB.convert_invalid_date_time = false
    end

    it "should raise an exception when a bad date/time is used and convert_invalid_date_time is false" do
      DB.convert_invalid_date_time = false
      proc{DB["SELECT CAST('0000-00-00' AS date)"].single_value}.must_raise(Sequel::InvalidValue)
      proc{DB["SELECT CAST('0000-00-00 00:00:00' AS datetime)"].single_value}.must_raise(Sequel::InvalidValue)
      proc{DB["SELECT CAST('25:00:00' AS time)"].single_value}.must_raise(Sequel::InvalidValue)
    end

    it "should not use a nil value bad date/time is used and convert_invalid_date_time is nil or :nil" do
      DB.convert_invalid_date_time = nil
      DB["SELECT CAST('0000-00-00' AS date)"].single_value.must_be_nil
      DB["SELECT CAST('0000-00-00 00:00:00' AS datetime)"].single_value.must_be_nil
      DB["SELECT CAST('25:00:00' AS time)"].single_value.must_be_nil
      DB.convert_invalid_date_time = :nil
      DB["SELECT CAST('0000-00-00' AS date)"].single_value.must_be_nil
      DB["SELECT CAST('0000-00-00 00:00:00' AS datetime)"].single_value.must_be_nil
      DB["SELECT CAST('25:00:00' AS time)"].single_value.must_be_nil
    end

    it "should not use a nil value bad date/time is used and convert_invalid_date_time is :string" do
      DB.convert_invalid_date_time = :string
      DB["SELECT CAST('0000-00-00' AS date)"].single_value.must_equal '0000-00-00'
      DB["SELECT CAST('0000-00-00 00:00:00' AS datetime)"].single_value.must_equal '0000-00-00 00:00:00'
      DB["SELECT CAST('25:00:00' AS time)"].single_value.must_equal '25:00:00'
    end
  end

  describe "MySQL multiple result sets" do
    before do
      DB.create_table!(:a){Integer :a}
      DB.create_table!(:b){Integer :b}
      @ds = DB['SELECT * FROM a; SELECT * FROM b']
      DB[:a].insert(10)
      DB[:a].insert(15)
      DB[:b].insert(20)
      DB[:b].insert(25)
    end
    after do
      DB.drop_table?(:a, :b)
    end

    it "should combine all results by default" do
      @ds.all.must_equal [{:a=>10}, {:a=>15}, {:b=>20}, {:b=>25}]
    end

    it "should work with Database#run" do
      DB.run('SELECT * FROM a; SELECT * FROM b')
      DB.run('SELECT * FROM a; SELECT * FROM b')
    end

    it "should work with Database#run and other statements" do
      DB.run('UPDATE a SET a = 1; SELECT * FROM a; DELETE FROM b')
      DB[:a].select_order_map(:a).must_equal [1, 1]
      DB[:b].all.must_equal []
    end

    it "should split results returned into arrays if split_multiple_result_sets is used" do
      @ds.split_multiple_result_sets.all.must_equal [[{:a=>10}, {:a=>15}], [{:b=>20}, {:b=>25}]]
    end

    it "should have regular row_procs work when splitting multiple result sets" do
      @ds = @ds.with_row_proc(proc{|x| x[x.keys.first] *= 2; x})
      @ds.split_multiple_result_sets.all.must_equal [[{:a=>20}, {:a=>30}], [{:b=>40}, {:b=>50}]]
    end

    it "should use the columns from the first result set when splitting result sets" do
      @ds.split_multiple_result_sets.columns.must_equal [:a]
    end

    it "should not allow graphing a dataset that splits multiple statements" do
      proc{@ds.split_multiple_result_sets.graph(:b, :b=>:a)}.must_raise(Sequel::Error)
    end

    it "should not allow splitting a graphed dataset" do
      proc{DB[:a].graph(:b, :b=>:a).split_multiple_result_sets}.must_raise(Sequel::Error)
    end
  end
end

if DB.adapter_scheme == :mysql2
  describe "Mysql2 streaming" do
    before(:all) do
      DB.create_table!(:a){Integer :a}
      DB.transaction do
        1000.times do |i|
          DB[:a].insert(i)
        end
      end
      @ds = DB[:a].stream.order(:a)
    end
    after(:all) do
      DB.drop_table?(:a)
    end

    it "should correctly stream results" do
      @ds.map(:a).must_equal((0...1000).to_a)
    end

    it "should correctly handle early returning when streaming results" do
      3.times{@ds.each{|r| break r[:a]}.must_equal 0}
    end

    it "#paged_each should bypass streaming when :stream => false passed in" do
      DB[:a].order(:a).paged_each(:stream => false){|x| DB[:a].first; break}
    end
  end
end

describe "MySQL joined datasets" do
  before do
    @db = DB
    @db.create_table!(:a) do
      Integer :id
    end
    @db.create_table!(:b) do
      Integer :id
      Integer :a_id
    end
    @db[:a].insert(1)
    @db[:a].insert(2)
    @db[:b].insert(3, 1)
    @db[:b].insert(4, 1)
    @db[:b].insert(5, 2)
    @ds = @db[:a].join(:b, :a_id=>:id)
  end
  after do
    @db.drop_table?(:a, :b)
  end

  it "should support deletions from a single table" do
    @ds.where(Sequel[:a][:id]=>1).delete
    @db[:a].select_order_map(:id).must_equal [2]
    @db[:b].select_order_map(:id).must_equal [3, 4, 5]
  end

  it "should support deletions from multiple tables" do
    @ds.delete_from(:a, :b).where(Sequel[:a][:id]=>1).delete
    @db[:a].select_order_map(:id).must_equal [2]
    @db[:b].select_order_map(:id).must_equal [5]
  end
end
