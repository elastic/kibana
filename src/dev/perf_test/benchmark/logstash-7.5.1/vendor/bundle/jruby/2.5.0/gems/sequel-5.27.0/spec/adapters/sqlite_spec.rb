SEQUEL_ADAPTER_TEST = :sqlite

require_relative 'spec_helper'

describe "An SQLite database" do
  before do
    @db = DB
  end
  after do
    @db.drop_table?(:fk)
    @db.use_timestamp_timezones = false
    Sequel.datetime_class = Time
  end

  it "should support casting to Date by using the date function" do
    @db.get(Sequel.cast('2012-10-20 11:12:13', Date)).must_equal '2012-10-20'
  end
  
  it "should support casting to Time or DateTime by using the datetime function" do
    @db.get(Sequel.cast('2012-10-20', Time)).must_equal '2012-10-20 00:00:00'
    @db.get(Sequel.cast('2012-10-20', DateTime)).must_equal '2012-10-20 00:00:00'
  end
  
  it "should provide the SQLite version as an integer" do
    @db.sqlite_version.must_be_kind_of(Integer)
  end
  
  it "should support a use_timestamp_timezones setting" do
    @db.use_timestamp_timezones = true
    @db.create_table!(:fk){Time :time}
    @db[:fk].insert(Time.now)
    @db[:fk].get(Sequel.cast(:time, String)).must_match(/[-+]\d\d\d\d\z/)
    @db.use_timestamp_timezones = false
    @db[:fk].delete
    @db[:fk].insert(Time.now)
    @db[:fk].get(Sequel.cast(:time, String)).wont_match(/[-+]\d\d\d\d\z/)
  end
  
  it "should provide a list of existing tables" do
    @db.drop_table?(:fk)
    @db.tables.must_be_kind_of(Array)
    @db.tables.wont_include(:fk)
    @db.create_table!(:fk){String :name}
    @db.tables.must_include(:fk)
  end

  cspecify "should support timestamps and datetimes and respect datetime_class", [:jdbc] do
    @db.create_table!(:fk){timestamp :t; datetime :d}
    @db.use_timestamp_timezones = true
    t1 = Time.at(1)
    @db[:fk].insert(:t => t1, :d => t1)
    @db[:fk].map(:t).must_equal [t1]
    @db[:fk].map(:d).must_equal [t1]
    Sequel.datetime_class = DateTime
    t2 = Sequel.string_to_datetime(t1.iso8601)
    @db[:fk].map(:t).must_equal [t2]
    @db[:fk].map(:d).must_equal [t2]
  end
  
  it "should support sequential primary keys" do
    @db.create_table!(:fk) {primary_key :id; text :name}
    @db[:fk].insert(:name => 'abc')
    @db[:fk].insert(:name => 'def')
    @db[:fk].insert(:name => 'ghi')
    @db[:fk].order(:name).all.must_equal [
      {:id => 1, :name => 'abc'},
      {:id => 2, :name => 'def'},
      {:id => 3, :name => 'ghi'}
    ]
  end
  
  it "should correctly parse the schema" do
    @db.create_table!(:fk) {timestamp :t}
    @db.schema(:fk, :reload=>true).must_equal [[:t, {:type=>:datetime, :allow_null=>true, :default=>nil, :ruby_default=>nil, :db_type=>"timestamp", :primary_key=>false}]]
  end

  it "should handle and return BigDecimal values for numeric columns" do
    DB.create_table!(:fk){numeric :d}
    d = DB[:fk]
    d.insert(:d=>BigDecimal('80.0'))
    d.insert(:d=>BigDecimal('NaN'))
    d.insert(:d=>BigDecimal('Infinity'))
    d.insert(:d=>BigDecimal('-Infinity'))
    ds = d.all
    ds.shift.must_equal(:d=>BigDecimal('80.0'))
    ds.map{|x| x[:d].to_s}.must_equal %w'NaN Infinity -Infinity'
    DB
  end
end

describe "SQLite temporary views" do
  before do
    @db = DB
    @db.drop_view(:items) rescue nil
    @db.create_table!(:items){Integer :number}
    @db[:items].insert(10)
    @db[:items].insert(20)
  end
  after do
    @db.drop_table?(:items)
  end

  it "should be supported" do
    @db.create_view(:items_view, @db[:items].where(:number=>10),  :temp=>true)
    @db[:items_view].map(:number).must_equal [10]
    @db.disconnect
    lambda{@db[:items_view].map(:number)}.must_raise(Sequel::DatabaseError)
  end
end
    
describe "SQLite VALUES support" do
  before do
    @db = DB
  end

  it "should create a dataset using the VALUES clause via #values" do
    @db.values([[1, 2], [3, 4]]).map([:column1, :column2]).must_equal [[1, 2], [3, 4]]
  end

  it "should support VALUES with unions" do
    @db.values([[1]]).union(@db.values([[3]])).map(&:values).map(&:first).must_equal [1, 3]
  end

  it "should support VALUES in CTEs" do
    @db[:a].cross_join(:b).with(:a, @db.values([[1, 2]]), :args=>[:c1, :c2]).with(:b, @db.values([[3, 4]]), :args=>[:c3, :c4]).map([:c1, :c2, :c3, :c4]).must_equal [[1, 2, 3, 4]]
  end
end if DB.sqlite_version >= 30803

describe "SQLite type conversion" do
  before do
    @db = DB
    @integer_booleans = @db.integer_booleans
    @db.integer_booleans = true
    @ds = @db[:items]
    @db.drop_table?(:items)
  end
  after do
    @db.integer_booleans = @integer_booleans
    Sequel.datetime_class = Time
    @db.drop_table?(:items)
  end
  
  it "should handle integers in boolean columns" do
    @db.create_table(:items){TrueClass :a}
    @db[:items].insert(false)
    @db[:items].select_map(:a).must_equal [false]
    @db[:items].select_map(Sequel.expr(:a)+:a).must_equal [0]
    @db[:items].update(:a=>true)
    @db[:items].select_map(:a).must_equal [true]
    @db[:items].select_map(Sequel.expr(:a)+:a).must_equal [2]
  end
  
  it "should handle integers/floats/strings/decimals in numeric/decimal columns" do
    @db.create_table(:items){Numeric :a}
    @db[:items].insert(100)
    @db[:items].select_map(:a).must_equal [BigDecimal('100')]
    @db[:items].get(:a).must_be_kind_of(BigDecimal)

    @db[:items].update(:a=>100.1)
    @db[:items].select_map(:a).must_equal [BigDecimal('100.1')]
    @db[:items].get(:a).must_be_kind_of(BigDecimal)

    @db[:items].update(:a=>'100.1')
    @db[:items].select_map(:a).must_equal [BigDecimal('100.1')]
    @db[:items].get(:a).must_be_kind_of(BigDecimal)

    @db[:items].update(:a=>BigDecimal('100.1'))
    @db[:items].select_map(:a).must_equal [BigDecimal('100.1')]
    @db[:items].get(:a).must_be_kind_of(BigDecimal)
  end

  it "should handle integer/float date columns as julian date" do
    @db.create_table(:items){Date :a}
    i = 2455979
    @db[:items].insert(i)
    @db[:items].first.must_equal(:a=>Date.jd(i))
    @db[:items].update(:a=>2455979.1)
    @db[:items].first.must_equal(:a=>Date.jd(i))
  end

  it "should handle integer/float time columns as seconds" do
    @db.create_table(:items){Time :a, :only_time=>true}
    @db[:items].insert(3661)
    @db[:items].first.must_equal(:a=>Sequel::SQLTime.create(1, 1, 1))
    @db[:items].update(:a=>3661.000001)
    @db[:items].first.must_equal(:a=>Sequel::SQLTime.create(1, 1, 1, 1))
  end

  it "should handle integer datetime columns as unix timestamp" do
    @db.create_table(:items){DateTime :a}
    i = 1329860756
    @db[:items].insert(i)
    @db[:items].first.must_equal(:a=>Time.at(i))
    Sequel.datetime_class = DateTime
    @db[:items].first.must_equal(:a=>DateTime.strptime(i.to_s, '%s'))
  end

  it "should handle float datetime columns as julian date" do
    @db.create_table(:items){DateTime :a}
    i = 2455979.5
    @db[:items].insert(i)
    @db[:items].first.must_equal(:a=>Time.at(1329825600))
    Sequel.datetime_class = DateTime
    @db[:items].first.must_equal(:a=>DateTime.jd(2455979.5))
  end

  it "should handle integer/float blob columns" do
    @db.create_table(:items){File :a}
    @db[:items].insert(1)
    @db[:items].first.must_equal(:a=>Sequel::SQL::Blob.new('1'))
    @db[:items].update(:a=>'1.1')
    @db[:items].first.must_equal(:a=>Sequel::SQL::Blob.new(1.1.to_s))
  end
end if DB.adapter_scheme == :sqlite

describe "An SQLite dataset" do
  before do
    @d = DB.dataset
  end
  
  it "should raise errors if given a regexp pattern match" do
    proc{@d.literal(Sequel.expr(:x).like(/a/))}.must_raise(Sequel::InvalidOperation)
    proc{@d.literal(~Sequel.expr(:x).like(/a/))}.must_raise(Sequel::InvalidOperation)
    proc{@d.literal(Sequel.expr(:x).like(/a/i))}.must_raise(Sequel::InvalidOperation)
    proc{@d.literal(~Sequel.expr(:x).like(/a/i))}.must_raise(Sequel::InvalidOperation)
  end
end

describe "SQLite::Dataset#delete" do
  before do
    DB.create_table! :items do
      primary_key :id
      String :name
      Float :value
    end
    @d = DB[:items]
    @d.delete # remove all records
    @d.insert(:name => 'abc', :value => 1.23)
    @d.insert(:name => 'def', :value => 4.56)
    @d.insert(:name => 'ghi', :value => 7.89)
  end
  after do
    DB.drop_table?(:items)
  end
  
  it "should return the number of records affected when filtered" do
    @d.count.must_equal 3
    @d.filter{value < 3}.delete.must_equal 1
    @d.count.must_equal 2

    @d.filter{value < 3}.delete.must_equal 0
    @d.count.must_equal 2
  end
  
  it "should return the number of records affected when unfiltered" do
    @d.count.must_equal 3
    @d.delete.must_equal 3
    @d.count.must_equal 0

    @d.delete.must_equal 0
  end
end

describe "SQLite::Dataset#update" do
  before do
    DB.create_table! :items do
      primary_key :id
      String :name
      Float :value
    end
    @d = DB[:items]
    @d.delete # remove all records
    @d.insert(:name => 'abc', :value => 1.23)
    @d.insert(:name => 'def', :value => 4.56)
    @d.insert(:name => 'ghi', :value => 7.89)
  end
  
  it "should return the number of records affected" do
    @d.filter(:name => 'abc').update(:value => 2).must_equal 1
    
    @d.update(:value => 10).must_equal 3
    
    @d.filter(:name => 'xxx').update(:value => 23).must_equal 0
  end
end

describe "SQLite::Dataset#insert_conflict" do
  before(:all) do
    DB.create_table! :ic_test do
      primary_key :id
      String :name
    end
  end

  after(:each) do
    DB[:ic_test].delete
  end

  after(:all) do
    DB.drop_table?(:ic_test)
  end

  it "Dataset#insert_ignore and insert_constraint should ignore uniqueness violations" do
    DB[:ic_test].insert(:id => 1, :name => "one")
    proc {DB[:ic_test].insert(:id => 1, :name => "one")}.must_raise Sequel::ConstraintViolation

    DB[:ic_test].insert_ignore.insert(:id => 1, :name => "one")
    DB[:ic_test].all.must_equal([{:id => 1, :name => "one"}])

    DB[:ic_test].insert_conflict(:ignore).insert(:id => 1, :name => "one")
    DB[:ic_test].all.must_equal([{:id => 1, :name => "one"}])
  end

  it "Dataset#insert_constraint should handle replacement" do
    DB[:ic_test].insert(:id => 1, :name => "one")

    DB[:ic_test].insert_conflict(:replace).insert(:id => 1, :name => "two")
    DB[:ic_test].all.must_equal([{:id => 1, :name => "two"}])
  end
end

describe "SQLite dataset" do
  before do
    DB.create_table! :test do
      primary_key :id
      String :name
      Float :value
    end
    DB.create_table! :items do
      primary_key :id
      String :name
      Float :value
    end
    @d = DB[:items]
    @d.insert(:name => 'abc', :value => 1.23)
    @d.insert(:name => 'def', :value => 4.56)
    @d.insert(:name => 'ghi', :value => 7.89)
  end
  after do
    DB.drop_table?(:test, :items)
  end
  
  it "should be able to insert from a subquery" do
    DB[:test].insert(@d)
    DB[:test].count.must_equal 3
    DB[:test].select(:name, :value).order(:value).to_a.must_equal \
      @d.select(:name, :value).order(:value).to_a
  end
    
  it "should support #explain" do
    DB[:test].explain.must_be_kind_of(String)
  end
  
  it "should have #explain work when identifier_output_method is modified" do
    DB[:test].with_identifier_output_method(:upcase).explain.must_be_kind_of(String)
  end if IDENTIFIER_MANGLING
end

describe "A SQLite database" do
  before do
    @db = DB
    @db.create_table! :test2 do
      text :name
      integer :value
    end
  end
  after do
    @db.drop_table?(:test, :test2, :test3, :test3_backup0, :test3_backup1, :test3_backup2)
  end

  it "should support add_column operations" do
    @db.add_column :test2, :xyz, :text
    
    @db[:test2].columns.must_equal [:name, :value, :xyz]
    @db[:test2].insert(:name => 'mmm', :value => 111, :xyz=>'000')
    @db[:test2].first.must_equal(:name => 'mmm', :value => 111, :xyz=>'000')
  end
  
  it "should support drop_column operations" do
    @db.drop_column :test2, :value
    @db[:test2].columns.must_equal [:name]
    @db[:test2].insert(:name => 'mmm')
    @db[:test2].first.must_equal(:name => 'mmm')
  end
  
  it "should support drop_column operations in a transaction" do
    @db.transaction{@db.drop_column :test2, :value}
    @db[:test2].columns.must_equal [:name]
    @db[:test2].insert(:name => 'mmm')
    @db[:test2].first.must_equal(:name => 'mmm')
  end

  it "should keep a composite primary key when dropping columns" do
    @db.create_table!(:test2){Integer :a; Integer :b; Integer :c; primary_key [:a, :b]}
    @db.drop_column :test2, :c
    @db[:test2].columns.must_equal [:a, :b]
    @db[:test2].insert(:a=>1, :b=>2)
    @db[:test2].insert(:a=>2, :b=>3)
    proc{@db[:test2].insert(:a=>2, :b=>3)}.must_raise(Sequel::UniqueConstraintViolation, Sequel::ConstraintViolation, Sequel::DatabaseError)
  end

  it "should keep column attributes when dropping a column" do
    @db.create_table! :test3 do
      primary_key :id
      text :name
      integer :value
    end

    # This lame set of additions and deletions are to test that the primary keys
    # don't get messed up when we recreate the database.
    @db[:test3].insert( :name => "foo", :value => 1)
    @db[:test3].insert( :name => "foo", :value => 2)
    @db[:test3].insert( :name => "foo", :value => 3)
    @db[:test3].filter(:id => 2).delete

    @db.drop_column :test3, :value

    @db['PRAGMA table_info(?)', :test3][:id][:pk].to_i.must_equal 1
    @db[:test3].select(:id).all.must_equal [{:id => 1}, {:id => 3}]
  end

  it "should keep foreign keys when dropping a column" do
    @db.create_table! :test do
      primary_key :id
      String :name
      Integer :value
    end
    @db.create_table! :test3 do
      String :name
      Integer :value
      foreign_key :test_id, :test, :on_delete => :set_null, :on_update => :cascade
    end

    @db[:test3].insert(:name => "abc", :test_id => @db[:test].insert(:name => "foo", :value => 3))
    @db[:test3].insert(:name => "def", :test_id => @db[:test].insert(:name => "bar", :value => 4))

    @db.drop_column :test3, :value

    @db[:test].filter(:name => 'bar').delete
    @db[:test3][:name => 'def'][:test_id].must_be_nil

    @db[:test].filter(:name => 'foo').update(:id=>100)
    @db[:test3][:name => 'abc'][:test_id].must_equal 100
  end

  it "should support rename_column operations" do
    @db[:test2].delete
    @db.add_column :test2, :xyz, :text
    @db[:test2].insert(:name => 'mmm', :value => 111, :xyz => 'qqqq')

    @db[:test2].columns.must_equal [:name, :value, :xyz]
    @db.rename_column :test2, :xyz, :zyx, :type => :text
    @db[:test2].columns.must_equal [:name, :value, :zyx]
    @db[:test2].first[:zyx].must_equal 'qqqq'
    @db[:test2].count.must_equal 1
  end
  
  it "should preserve defaults when dropping or renaming columns" do
    @db.create_table! :test3 do
      String :s, :default=>'a'
      Integer :i
    end

    @db[:test3].insert
    @db[:test3].first[:s].must_equal 'a'
    @db[:test3].delete
    @db.drop_column :test3, :i
    @db[:test3].insert
    @db[:test3].first[:s].must_equal 'a'
    @db[:test3].delete
    @db.rename_column :test3, :s, :t
    @db[:test3].insert
    @db[:test3].first[:t].must_equal 'a'
    @db[:test3].delete
  end


  it "should preserve autoincrement after table modification" do
    @db.create_table!(:test2) do
      primary_key :id
      Integer :val, :null => false
    end
    @db.rename_column(:test2, :val, :value)

    t = @db[:test2]
    id1 = t.insert(:value=>1)
    t.delete
    id2 = t.insert(:value=>1)
    id2.must_be :>, id1
  end
  
  it "should handle quoted tables when dropping or renaming columns" do
    table_name = "T T"
    @db.drop_table?(table_name)
    @db.create_table! table_name do
      Integer :"s s"
      Integer :"i i"
    end

    @db.from(table_name).insert(:"s s"=>1, :"i i"=>2)
    @db.from(table_name).all.must_equal [{:"s s"=>1, :"i i"=>2}]
    @db.drop_column table_name, :"i i"
    @db.from(table_name).all.must_equal [{:"s s"=>1}]
    @db.rename_column table_name, :"s s", :"t t"
    @db.from(table_name).all.must_equal [{:"t t"=>1}]
    @db.drop_table?(table_name)
  end
  
  it "should choose a temporary table name that isn't already used when dropping or renaming columns" do
    @db.tables.each{|t| @db.drop_table(t) if t.to_s =~ /test3/}
    @db.create_table :test3 do
      Integer :h
      Integer :i
    end
    @db.create_table :test3_backup0 do
      Integer :j
    end
    @db.create_table :test3_backup1 do
      Integer :k
    end

    @db[:test3].columns.must_equal [:h, :i]
    @db[:test3_backup0].columns.must_equal [:j]
    @db[:test3_backup1].columns.must_equal [:k]
    @db.drop_column(:test3, :i)
    @db[:test3].columns.must_equal [:h]
    @db[:test3_backup0].columns.must_equal [:j]
    @db[:test3_backup1].columns.must_equal [:k]

    @db.create_table :test3_backup2 do
      Integer :l
    end

    @db.rename_column(:test3, :h, :i)
    @db[:test3].columns.must_equal [:i]
    @db[:test3_backup0].columns.must_equal [:j]
    @db[:test3_backup1].columns.must_equal [:k]
    @db[:test3_backup2].columns.must_equal [:l]
  end
  
  it "should support add_index" do
    @db.add_index :test2, :value, :unique => true
    @db.add_index :test2, [:name, :value]
  end
  
  it "should support drop_index" do
    @db.add_index :test2, :value, :unique => true
    @db.drop_index :test2, :value
  end

  it "should keep applicable indexes when emulating schema methods" do
    @db.create_table!(:test3){Integer :a; Integer :b}
    @db.add_index :test3, :a
    @db.add_index :test3, :b
    @db.add_index :test3, [:b, :a]
    @db.drop_column :test3, :b
    @db.indexes(:test3)[:test3_a_index].must_equal(:unique=>false, :columns=>[:a])
  end

  it "should have support for various #transaction modes" do
    @db.transaction(:mode => :immediate){}
    @db.transaction(:mode => :exclusive){}
    @db.transaction(:mode => :deferred){}
    @db.transaction{}

    @db.transaction_mode.must_be_nil
    @db.transaction_mode = :immediate
    @db.transaction_mode.must_equal :immediate
    @db.transaction{}
    @db.transaction(:mode => :exclusive){}
    proc {@db.transaction_mode = :invalid}.must_raise(Sequel::Error)
    @db.transaction_mode.must_equal :immediate
    proc {@db.transaction(:mode => :invalid) {}}.must_raise(Sequel::Error)
  end

  it "should keep unique constraints when copying tables" do
    @db.alter_table(:test2){add_unique_constraint :name}
    @db.alter_table(:test2){drop_column :value}
    @db[:test2].insert(:name=>'a')
    proc{@db[:test2].insert(:name=>'a')}.must_raise(Sequel::ConstraintViolation, Sequel::UniqueConstraintViolation)
  end

  it "should not ignore adding new constraints when adding not null constraints" do
    @db.alter_table :test2 do
      set_column_not_null :value
      add_constraint(:value_range1, :value => 3..5)
      add_constraint(:value_range2, :value => 0..9)
    end

    @db[:test2].insert(:value => 4)
    proc{@db[:test2].insert(:value => 1)}.must_raise(Sequel::ConstraintViolation)
    proc{@db[:test2].insert(:value => nil)}.must_raise(Sequel::ConstraintViolation)
    @db[:test2].select_order_map(:value).must_equal [4]
  end

  it "should show unique constraints in Database#indexes" do
    @db.alter_table(:test2){add_unique_constraint :name}
    @db.indexes(:test2).values.first[:columns].must_equal [:name]
  end if DB.sqlite_version >= 30808
end

describe "SQLite", 'INSERT ON CONFLICT' do
  before(:all) do
    @db = DB
    @db.create_table!(:ic_test){Integer :a; Integer :b; Integer :c; TrueClass :c_is_unique, :default=>false; unique :a, :name=>:ic_test_a_uidx; unique [:b, :c], :name=>:ic_test_b_c_uidx; index [:c], :where=>:c_is_unique, :unique=>true}
    @ds = @db[:ic_test]
  end
  before do
    @ds.delete
  end
  after(:all) do
    @db.drop_table?(:ic_test)
  end

  it "Dataset#insert_ignore and insert_conflict should ignore uniqueness violations" do
    @ds.insert(1, 2, 3, false)
    @ds.insert(10, 11, 3, true)
    proc{@ds.insert(1, 3, 4, false)}.must_raise Sequel::UniqueConstraintViolation
    proc{@ds.insert(11, 12, 3, true)}.must_raise Sequel::UniqueConstraintViolation
    @ds.insert_ignore.insert(1, 3, 4, false)
    @ds.insert_conflict.insert(1, 3, 4, false)
    @ds.insert_conflict.insert(11, 12, 3, true)
    @ds.insert_conflict(:target=>:a).insert(1, 3, 4, false)
    @ds.insert_conflict(:target=>:c, :conflict_where=>:c_is_unique).insert(11, 12, 3, true)
    @ds.all.must_equal [{:a=>1, :b=>2, :c=>3, :c_is_unique=>false}, {:a=>10, :b=>11, :c=>3, :c_is_unique=>true}]
  end unless DB.adapter_scheme == :amalgalite

  it "Dataset#insert_ignore and insert_conflict should work with multi_insert/import" do
    @ds.insert(1, 2, 3, false)
    @ds.insert_ignore.multi_insert([{:a=>1, :b=>3, :c=>4}])
    @ds.insert_ignore.import([:a, :b, :c], [[1, 3, 4]])
    @ds.all.must_equal [{:a=>1, :b=>2, :c=>3, :c_is_unique=>false}]
    @ds.insert_conflict(:target=>:a, :update=>{:b=>3}).import([:a, :b, :c], [[1, 3, 4]])
    @ds.all.must_equal [{:a=>1, :b=>3, :c=>3, :c_is_unique=>false}]
    @ds.insert_conflict(:target=>:a, :update=>{:b=>4}).multi_insert([{:a=>1, :b=>5, :c=>6}])
    @ds.all.must_equal [{:a=>1, :b=>4, :c=>3, :c_is_unique=>false}]
    end

  it "Dataset#insert_conflict should handle upserts" do
    @ds.insert(1, 2, 3, false)
    @ds.insert_conflict(:target=>:a, :update=>{:b=>3}).insert(1, 3, 4, false)
    @ds.all.must_equal [{:a=>1, :b=>3, :c=>3, :c_is_unique=>false}]
    @ds.insert_conflict(:target=>[:b, :c], :update=>{:c=>5}).insert(5, 3, 3, false)
    @ds.all.must_equal [{:a=>1, :b=>3, :c=>5, :c_is_unique=>false}]
    @ds.insert_conflict(:target=>:a, :update=>{:b=>4}).insert(1, 3, nil, false)
    @ds.all.must_equal [{:a=>1, :b=>4, :c=>5, :c_is_unique=>false}]
    @ds.insert_conflict(:target=>:a, :update=>{:b=>5}, :update_where=>{Sequel[:ic_test][:b]=>4}).insert(1, 3, 4, false)
    @ds.all.must_equal [{:a=>1, :b=>5, :c=>5, :c_is_unique=>false}]
    @ds.insert_conflict(:target=>:a, :update=>{:b=>6}, :update_where=>{Sequel[:ic_test][:b]=>4}).insert(1, 3, 4, false)
    @ds.all.must_equal [{:a=>1, :b=>5, :c=>5, :c_is_unique=>false}]
  end
end if DB.sqlite_version >= 32400
