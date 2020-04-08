SEQUEL_ADAPTER_TEST = :mssql

require_relative 'spec_helper'

describe "A MSSQL database" do
  before do
    @db = DB
  end

  it "should be able to read fractional part of timestamp" do
    rs = @db["select getutcdate() as full_date, cast(round(datepart(millisecond, getutcdate()), 0) as int) as milliseconds"].first
    rs[:milliseconds].must_be_close_to(rs[:full_date].usec/1000, 2)
  end

  it "should be able to write fractional part of timestamp" do
    t = Time.utc(2001, 12, 31, 23, 59, 59, 996000)
    (t.usec/1000).must_equal @db["select cast(round(datepart(millisecond, ?), 0) as int) as milliseconds", t].get
  end
  
  it "should not raise an error when getting the server version" do
    @db.server_version
    @db.dataset.server_version
  end
end
  
describe "A MSSQL database" do
  before do
    @db = DB
    @db.create_table! :test3 do
      Integer :value
      Time :time
    end
  end
  after do
    @db.drop_table?(:test3)
  end

  it "should work with NOLOCK" do
    @db.transaction{@db[:test3].nolock.all.must_equal []}
  end
end

describe "MSSQL decimal locale handling" do
  before do
    @locale = WIN32OLE.locale
    @decimal = BigDecimal('1234.56')
  end
  after do
    WIN32OLE.locale = @locale
  end

  it "should work with current locale" do
    DB.get(Sequel.cast(@decimal, 'decimal(16,4)').as(:v)).must_equal @decimal
  end

  it "should work with 1031 locale" do
    WIN32OLE.locale = 1031
    DB.get(Sequel.cast(@decimal, 'decimal(16,4)').as(:v)).must_equal @decimal
  end

  it "should work with 1033 locale" do
    WIN32OLE.locale = 1033
    DB.get(Sequel.cast(@decimal, 'decimal(16,4)').as(:v)).must_equal @decimal
  end
end if DB.adapter_scheme == :ado

describe "MSSQL" do
  before(:all) do
    @db = DB
    @db.create_table!(:test3){Integer :v3}
    @db.create_table!(:test4){Integer :v4}
    @db[:test3].import([:v3], [[1], [2]])
    @db[:test4].import([:v4], [[1], [3]])
  end
  after(:all) do
    @db.drop_table?(:test3, :test4)
  end

  it "should should support CROSS APPLY" do
    @db[:test3].cross_apply(@db[:test4].where(Sequel[:test3][:v3]=>Sequel[:test4][:v4])).select_order_map([:v3, :v4]).must_equal [[1,1]]
  end

  it "should should support OUTER APPLY" do
    @db[:test3].outer_apply(@db[:test4].where(Sequel[:test3][:v3]=>Sequel[:test4][:v4])).select_order_map([:v3, :v4]).must_equal [[1,1], [2, nil]]
  end

  cspecify "should handle time values with fractional seconds", [:ado] do
    # ado: Returns nil values
    t = Sequel::SQLTime.create(10, 20, 30, 999900)
    v = @db.get(Sequel.cast(t, 'time'))
    v = Sequel.string_to_time(v) if v.is_a?(String)
    pr = lambda{|x| [:hour, :min, :sec, :usec].map{|m| x.send(m)}}
    pr[v].must_equal(pr[t])
  end

  cspecify "should get datetimeoffset values as Time with fractional seconds", [:odbc], [:ado], [:tinytds, proc{|db| TinyTds::VERSION < '0.9'}] do
    # odbc: Returns string rounded to nearest second
    # ado: Returns nil values
    # tiny_tds < 0.9: Returns wrong value for hour
    t = Time.local(2010, 11, 12, 10, 20, 30, 999000)
    v = @db.get(Sequel.cast(t, 'datetimeoffset'))
    v = Sequel.string_to_datetime(v) if v.is_a?(String)
    pr = lambda{|x| [:year, :month, :day, :hour, :min, :sec, :usec].map{|m| x.send(m)}}
    pr[v].must_equal(pr[t])
  end
end

# This spec is currently disabled as the SQL Server 2008 R2 Express doesn't support
# full text searching.  Even if full text searching is supported,
# you may need to create a full text catalog on the database first via:
#   CREATE FULLTEXT CATALOG ftscd AS DEFAULT
describe "MSSQL full_text_search" do
  before do
    @db = DB
    @db.drop_table?(:posts)
  end
  after do
    @db.drop_table?(:posts)
  end
  
  it "should support fulltext indexes and full_text_search" do
    log do
      @db.create_table(:posts){Integer :id, :null=>false; String :title; String :body; index :id, :name=>:fts_id_idx, :unique=>true; full_text_index :title, :key_index=>:fts_id_idx; full_text_index [:title, :body], :key_index=>:fts_id_idx}
      @db[:posts].insert(:title=>'ruby rails', :body=>'y')
      @db[:posts].insert(:title=>'sequel', :body=>'ruby')
      @db[:posts].insert(:title=>'ruby scooby', :body=>'x')

      @db[:posts].full_text_search(:title, 'rails').all.must_equal [{:title=>'ruby rails', :body=>'y'}]
      @db[:posts].full_text_search([:title, :body], ['sequel', 'ruby']).all.must_equal [{:title=>'sequel', :body=>'ruby'}]

      @db[:posts].full_text_search(:title, :$n).call(:select, :n=>'rails').must_equal [{:title=>'ruby rails', :body=>'y'}]
      @db[:posts].full_text_search(:title, :$n).prepare(:select, :fts_select).call(:n=>'rails').must_equal [{:title=>'ruby rails', :body=>'y'}]
    end
  end
end if false

describe "MSSQL Dataset#output" do
  before(:all) do
    @db = DB
    @db.create_table!(:items){String :name; Integer :value}
    @db.create_table!(:out){String :name; Integer :value}
    @ds = @db[:items]
  end
  after do
    @ds.delete
    @db[:out].delete
  end
  after(:all) do
    @db.drop_table?(:items, :out)
  end

  it "should handle OUTPUT clauses without INTO for DELETE statements" do
    @ds.insert(:name=>'a', :value=>1)
    @ds.output(nil, [Sequel[:deleted][:name], Sequel[:deleted][:value]]).with_sql(:delete_sql).all.must_equal [{:name=>"a", :value=>1}]
    @ds.insert(:name=>'a', :value=>1)
    @ds.output(nil, [Sequel[:deleted][:name]]).with_sql(:delete_sql).all.must_equal [{:name=>"a"}]
    @ds.insert(:name=>'a', :value=>1)
    @ds.output(nil, [Sequel::SQL::ColumnAll.new(:deleted)]).with_sql(:delete_sql).all.must_equal [{:name=>"a", :value=>1}]
  end
  
  it "should handle OUTPUT clauses with INTO for DELETE statements" do
    @ds.insert(:name=>'a', :value=>1)
    @ds.output(:out, {:name => Sequel[:deleted][:name], :value => Sequel[:deleted][:value]}).delete
    @db[:out].all.must_equal [{:name=>"a", :value=>1}]
  end

  it "should handle OUTPUT clauses without INTO for INSERT statements" do
    @ds.output(nil, [Sequel[:inserted][:name], Sequel[:inserted][:value]]).with_sql(:insert_sql, :name => "name", :value => 1).all.must_equal [{:name=>"name", :value=>1}]
    @ds.all.must_equal [{:name=>"name", :value=>1}]
  end

  it "should handle OUTPUT clauses with INTO for INSERT statements" do
    @ds.output(:out, {:name => Sequel[:inserted][:name], :value => Sequel[:inserted][:value]}).insert(:name => "name", :value => 1)
    @db[:out].all.must_equal [{:name=>"name", :value=>1}]
  end

  it "should handle OUTPUT clauses without INTO for UPDATE statements" do
    @ds.insert(:name=>'a', :value=>1)
    @ds.output(nil, [Sequel[:inserted][:name], Sequel[:deleted][:value]]).with_sql(:update_sql, :value => 2).all.must_equal [{:name=>"a", :value=>1}]
    @ds.all.must_equal [{:name=>"a", :value=>2}]
    @ds.output(nil, [Sequel[:inserted][:name]]).with_sql(:update_sql, :value => 3).all.must_equal [{:name=>"a"}]
    @ds.all.must_equal [{:name=>"a", :value=>3}]
    @ds.output(nil, [Sequel::SQL::ColumnAll.new(:inserted)]).with_sql(:update_sql, :value => 4).all.must_equal [{:name=>"a", :value=>4}]
  end

  it "should handle OUTPUT clauses with INTO for UPDATE statements" do
    @ds.insert(:name=>'a', :value=>1)
    @ds.output(:out, {:name => Sequel[:inserted][:name], :value => Sequel[:deleted][:value]}).update(:value => 2)
    @db[:out].all.must_equal [{:name=>"a", :value=>1}]
  end

  it "should execute OUTPUT clauses in DELETE statements" do
    @ds.insert(:name => "name", :value => 1)
    @ds.output(:out, [Sequel[:deleted][:name], Sequel[:deleted][:value]]).delete
    @db[:out].all.must_equal [{:name => "name", :value => 1}]
    @ds.insert(:name => "name", :value => 2)
    @ds.output(:out, {:name => Sequel[:deleted][:name], :value => Sequel[:deleted][:value]}).delete
    @db[:out].all.must_equal [{:name => "name", :value => 1}, {:name => "name", :value => 2}]
  end

  it "should execute OUTPUT clauses in INSERT statements" do
    @ds.output(:out, [Sequel[:inserted][:name], Sequel[:inserted][:value]]).insert(:name => "name", :value => 1)
    @db[:out].all.must_equal [{:name => "name", :value => 1}]
    @ds.output(:out, {:name => Sequel[:inserted][:name], :value => Sequel[:inserted][:value]}).insert(:name => "name", :value => 2)
    @db[:out].all.must_equal [{:name => "name", :value => 1}, {:name => "name", :value => 2}]
  end

  it "should execute OUTPUT clauses in UPDATE statements" do
    @ds.insert(:name => "name", :value => 1)
    @ds.output(:out, [Sequel[:inserted][:name], Sequel[:deleted][:value]]).update(:value => 2)
    @db[:out].all.must_equal [{:name => "name", :value => 1}]
    @ds.output(:out, {:name => Sequel[:inserted][:name], :value => Sequel[:deleted][:value]}).update(:value => 3)
    @db[:out].all.must_equal [{:name => "name", :value => 1}, {:name => "name", :value => 2}]
  end
end

describe "MSSQL dataset using #with and #with_recursive" do
  before(:all) do
    @db = DB
    @ds = DB[:x]
    @ds1 = @ds.with(:t, @db[:x])
    @ds2 = @ds.with_recursive(:t, @db[:x], @db[:t].where(false))
    @db.create_table!(:x){Integer :v; Integer :y}
  end
  before do
    @db[:x].insert(:v=>1, :y=>2)
  end
  after do
    @db[:x].delete
  end
  after(:all) do
    @db.drop_table?(:x)
  end

  it "should handle CTEs in UPDATE queries" do
    @ds1.update(:v => @db[:t].select(:y))
    @ds.all.must_equal [{:v=>2, :y=>2}]
    @ds2.update(:v => Sequel.+(@db[:t].select(:y), 1))
    @ds.all.must_equal [{:v=>3, :y=>2}]
  end

  it "should handle CTEs in DELETE queries" do
    @ds1.where(@db[:t].select(:y)=>1).delete
    @ds.all.must_equal [{:v=>1, :y=>2}]
    @ds1.where(@db[:t].select(:y)=>2).delete
    @ds.all.must_equal []

    @db[:x].insert(:v=>1, :y=>2)
    @ds2.where(@db[:t].select(:y)=>1).delete
    @ds.all.must_equal [{:v=>1, :y=>2}]
    @ds2.where(@db[:t].select(:y)=>2).delete
    @ds.all.must_equal []
  end

  it "should handle CTEs in INSERT queries" do
    @ds1.insert(:v => @db[:t].select(:y), :y => @db[:t].select(:v))
    @ds.select_order_map([:v, :y]).must_equal [[1, 2], [2, 1]]
    @ds1.insert(:v => Sequel.+(@db[:t].where(:v=>1).select(:y), 2), :y => Sequel.+(@db[:t].where(:y=>1).select(:v), 3))
    @ds.select_order_map([:v, :y]).must_equal [[1, 2], [2, 1], [4, 5]]
  end

  it "should handle WITH clause on joined dataset" do
    @ds.cross_join(@ds1.select(Sequel[:v].as(:v1), Sequel[:y].as(:y1))).all.must_equal [{:v=>1, :y=>2, :v1=>1, :y1=>2}]
    @ds.cross_join(@ds2.select(Sequel[:v].as(:v1), Sequel[:y].as(:y1))).all.must_equal [{:v=>1, :y=>2, :v1=>1, :y1=>2}]
  end
end

describe "MSSQL::Dataset#import" do
  before do
    @db = DB
    @ds = @db[:test]
  end
  after do
    @db.drop_table?(:test)
  end
  
  it "#import should work correctly with an arbitrary output value" do
    @db.create_table!(:test){primary_key :x; Integer :y}
    @ds.output(nil, [Sequel[:inserted][:y], Sequel[:inserted][:x]]).import([:y], [[3], [4]]).must_equal [{:y=>3, :x=>1}, {:y=>4, :x=>2}]
    @ds.all.must_equal [{:x=>1, :y=>3}, {:x=>2, :y=>4}]
  end

  it "should handle WITH statements" do
    @db.create_table!(:test){Integer :x; Integer :y}
    @db[:testx].with(:testx, @db[:test]).import([:x, :y], [[1, 2], [3, 4], [5, 6]], :slice => 2)
    @ds.select_order_map([:x, :y]).must_equal [[1, 2], [3, 4], [5, 6]]
  end
end

describe "MSSQL joined datasets" do
  before do
    @db = DB
    @db.create_table!(:a){Integer :v}
    @db[:a].insert(:v=>1)
  end
  after do
    @db.drop_table?(:a)
  end

  it "should handle DELETE statements" do
    @db[:a].inner_join(Sequel[:a].as(:b), :v=>:v).delete.must_equal 1
    @db[:a].empty?.must_equal true
  end

  it "should handle UPDATE statements" do
    @db[:a].inner_join(Sequel[:a].as(:b), :v=>:v).update(:v=>2).must_equal 1
    @db[:a].all.must_equal [{:v=>2}]
  end
end

describe "Offset support" do
  before do
    @db = DB
    @db.create_table!(:i){Integer :id; Integer :parent_id}
    @ds = @db[:i].order(:id)
    @hs = []
    @ds = @ds.with_row_proc(proc{|r| @hs << r.dup; r[:id] *= 2; r[:parent_id] *= 3; r})
    @ds.import [:id, :parent_id], [[1,nil],[2,nil],[3,1],[4,1],[5,3],[6,5]]
  end
  after do
    @db.drop_table?(:i)
  end
  
  it "should return correct rows" do
    @ds.limit(2, 2).all.must_equal [{:id=>6, :parent_id=>3}, {:id=>8, :parent_id=>3}]
  end
  
  it "should not include offset column in hashes passed to row_proc" do
    @ds.limit(2, 2).all
    @hs.must_equal [{:id=>3, :parent_id=>1}, {:id=>4, :parent_id=>1}]
  end
end

describe "Update/Delete on limited datasets" do
  before do
    @db = DB
    @db.create_table!(:i){Integer :id}
    @ds = @db[:i]
    @ds.import [:id], [[1], [2]]
  end
  after do
    @db.drop_table?(:i)
  end
  
  it "should handle deletes and updates on limited datasets" do
    @ds.limit(1).update(:id=>Sequel[:id]+10)
    [[2, 11], [1, 12]].must_include @ds.select_order_map(:id)
    @ds.limit(1).delete
    [[1], [2]].must_include @ds.select_order_map(:id)
  end
  
  it "should raise error for updates on ordered, limited datasets" do
  end

  it "should raise error for updates and deletes on datasets with offsets or limits with orders" do
    proc{@ds.offset(1).delete}.must_raise Sequel::InvalidOperation
    proc{@ds.offset(1).update(:id=>Sequel[:id]+10)}.must_raise Sequel::InvalidOperation
    proc{@ds.limit(1, 1).delete}.must_raise Sequel::InvalidOperation
    proc{@ds.limit(1, 1).update(:id=>Sequel[:id]+10)}.must_raise Sequel::InvalidOperation
    proc{@ds.order(:id).limit(1).update(:id=>Sequel[:id]+10)}.must_raise Sequel::InvalidOperation
    proc{@ds.order(:id).limit(1).delete}.must_raise Sequel::InvalidOperation
  end
end if DB.dataset.send(:is_2012_or_later?)

describe "Common Table Expressions" do
  before do
    @db = DB
    @db.create_table!(:i1){Integer :id; Integer :parent_id}
    @db.create_table!(:i2){Integer :id; Integer :parent_id}
    @ds = @db[:i1]
    @ds2 = @db[:i2]
    @ds.import [:id, :parent_id], [[1,nil],[2,nil],[3,1],[4,1],[5,3],[6,5]]
  end
  after do
    @db.drop_table?(:i1, :i2)
  end

  it "using #with should be able to update" do
    @ds.insert(:id=>1)
    @ds2.insert(:id=>2, :parent_id=>1)
    @ds2.insert(:id=>3, :parent_id=>2)
    @ds.with(:t, @ds2).filter(:id => @db[:t].select(:id)).update(:parent_id => @db[:t].filter(:id => Sequel[:i1][:id]).select(:parent_id).limit(1))
    @ds[:id => 1].must_equal(:id => 1, :parent_id => nil)
    @ds[:id => 2].must_equal(:id => 2, :parent_id => 1)
    @ds[:id => 3].must_equal(:id => 3, :parent_id => 2)
    @ds[:id => 4].must_equal(:id => 4, :parent_id => 1)
  end

  it "using #with_recursive should be able to update" do
    ds = @ds.with_recursive(:t, @ds.filter(:parent_id=>1).or(:id => 1), @ds.join(:t, :i=>:parent_id).select(Sequel[:i1][:id], Sequel[:i1][:parent_id]), :args=>[:i, :pi])
    ds.exclude(:id => @db[:t].select(:i)).update(:parent_id => 1)
    @ds[:id => 1].must_equal(:id => 1, :parent_id => nil)
    @ds[:id => 2].must_equal(:id => 2, :parent_id => 1)
    @ds[:id => 5].must_equal(:id => 5, :parent_id => 3)
  end

  it "using #with should be able to insert" do
    @ds2.insert(:id=>7)
    @ds.with(:t, @ds2).insert(@db[:t])
    @ds[:id => 7].must_equal(:id => 7, :parent_id => nil)
  end

  it "using #with_recursive should be able to insert" do
    ds = @ds2.with_recursive(:t, @ds.filter(:parent_id=>1), @ds.join(:t, :i=>:parent_id).select(Sequel[:i1][:id], Sequel[:i1][:parent_id]), :args=>[:i, :pi])
    ds.insert @db[:t]
    @ds2.all.must_equal [{:id => 3, :parent_id => 1}, {:id => 4, :parent_id => 1}, {:id => 5, :parent_id => 3}, {:id => 6, :parent_id => 5}]
  end

  it "using #with should be able to delete" do
    @ds2.insert(:id=>6)
    @ds2.insert(:id=>5)
    @ds2.insert(:id=>4)
    @ds.with(:t, @ds2).filter(:id => @db[:t].select(:id)).delete
    @ds.all.must_equal [{:id => 1, :parent_id => nil}, {:id => 2, :parent_id => nil}, {:id => 3, :parent_id => 1}]
  end

  it "using #with_recursive should be able to delete" do
    @ds.insert(:id=>7, :parent_id=>2)
    ds = @ds.with_recursive(:t, @ds.filter(:parent_id=>1), @ds.join(:t, :i=>:parent_id).select(Sequel[:i1][:id], Sequel[:i1][:parent_id]), :args=>[:i, :pi])
    ds.filter(Sequel[:i1][:id] => @db[:t].select(:i)).delete
    @ds.all.must_equal [{:id => 1, :parent_id => nil}, {:id => 2, :parent_id => nil}, {:id => 7, :parent_id => 2}]
  end

  it "using #with should be able to import" do
    @ds2.insert(:id=>7)
    @ds.with(:t, @ds2).import [:id, :parent_id], @db[:t].select(:id, :parent_id)
    @ds[:id => 7].must_equal(:id => 7, :parent_id => nil)
  end

  it "using #with_recursive should be able to import" do
    ds = @ds2.with_recursive(:t, @ds.filter(:parent_id=>1), @ds.join(:t, :i=>:parent_id).select(Sequel[:i1][:id], Sequel[:i1][:parent_id]), :args=>[:i, :pi])
    ds.import [:id, :parent_id], @db[:t].select(:i, :pi)
    @ds2.all.must_equal [{:id => 3, :parent_id => 1}, {:id => 4, :parent_id => 1}, {:id => 5, :parent_id => 3}, {:id => 6, :parent_id => 5}]
  end
end

describe "MSSSQL::Dataset#insert" do
  before do
    @db = DB
    @db.create_table!(:test5){primary_key :xid; Integer :value}
    @db.create_table! :test4 do
      String :name, :size => 20
      column :value, 'varbinary(max)'
    end
    @ds = @db[:test5]
  end
  after do
    @db.drop_table?(:test5, :test4)
  end

  it "should have insert_select return nil if disable_insert_output is used" do
    @ds.disable_insert_output.insert_select(:value=>10).must_be_nil
  end
  
  it "should have insert_select return nil if the server version is not 2005+" do
    @ds = @ds.with_extend do
      def server_version() 8000760 end
    end
    @ds.insert_select(:value=>10).must_be_nil
  end

  it "should have insert_select insert the record and return the inserted record" do
    h = @ds.insert_select(:value=>10)
    h[:value].must_equal 10
    @ds.first(:xid=>h[:xid])[:value].must_equal 10
  end

  cspecify "should allow large text and binary values", [:odbc] do
    blob = Sequel::SQL::Blob.new("0" * (65*1024))
    @db[:test4].insert(:name => 'max varbinary test', :value => blob)
    b = @db[:test4].where(:name => 'max varbinary test').get(:value)
    b.length.must_equal blob.length
    b.must_equal blob
  end

  it "should play nicely with simple_select_all?" do
    DB[:test4].disable_insert_output.send(:simple_select_all?).must_equal true
  end
end

describe "MSSSQL::Dataset#into" do
  before do
    @db = DB
    @db.drop_table?(:t, :new)
  end
  after do
    @db.drop_table?(:t, :new)
  end

  it "should select rows into a new table" do
    @db.create_table!(:t) {Integer :id; String :value}
    @db[:t].insert(:id => 1, :value => "test")
    @db[:t].into(:new).with_sql(:select_sql).insert
    @db[:new].all.must_equal [{:id => 1, :value => "test"}]
  end
end

describe "A MSSQL database" do
  before do
    @db = DB
  end
  after do
    @db.drop_table?(:a)
  end
  
  it "should handle many existing types for set_column_allow_null" do
    @db.create_table!(:a){column :a, 'integer'}
    @db.alter_table(:a){set_column_allow_null :a, false}
    @db.create_table!(:a){column :a, 'decimal(24, 2)'}
    @db.alter_table(:a){set_column_allow_null :a, false}
    @db.schema(:a).first.last[:column_size].must_equal 24
    @db.schema(:a).first.last[:scale].must_equal 2
    @db.create_table!(:a){column :a, 'decimal(10)'}
    @db.schema(:a).first.last[:column_size].must_equal 10
    @db.schema(:a).first.last[:scale].must_equal 0
    @db.alter_table(:a){set_column_allow_null :a, false}
    @db.create_table!(:a){column :a, 'nchar(2)'}
    @db.alter_table(:a){set_column_allow_null :a, false}
    s = @db.schema(:a).first.last
    (s[:max_chars] || s[:column_size]).must_equal 2
  end
end

describe "MSSQL::Database#rename_table" do
  it "should work on non-schema bound tables which need escaping" do
    DB.create_table! :'foo bar' do
      text :name
    end
    DB.rename_table 'foo bar', 'foo'
    DB.drop_table :foo
  end
  
  it "should work on schema bound tables within the same schema" do
    DB.execute(<<-SQL)
      IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'MY')
        EXECUTE sp_executesql N'create schema MY'
    SQL
    DB.create_table! Sequel[:MY][:foo] do
      text :name
    end
    DB.rename_table Sequel[:MY][:foo], Sequel[:MY][:bar]
    DB.rename_table Sequel[:MY][:bar], :foo
    DB.drop_table Sequel[:MY][:foo]
  end
end

describe "MSSQL::Dataset#count" do
  it "should work with a distinct query with an order clause" do
    DB.create_table!(:items){String :name; Integer :value}
    DB[:items].insert(:name => "name", :value => 1)
    DB[:items].insert(:name => "name", :value => 1)
    DB[:items].select(:name, :value).distinct.order(:name).count.must_equal 1
    DB[:items].select(:name, :value).group(:name, :value).order(:name).count.must_equal 1
  end
end

describe "MSSQL::Database#create_table" do
  it "should support collate with various other column options" do
    DB.create_table!(:items){ String :name, :size => 128, :collate => :sql_latin1_general_cp1_ci_as, :default => 'foo', :null => false, :unique => true}
    DB[:items].insert
    DB[:items].select_map(:name).must_equal ["foo"]
  end
end

describe "MSSQL::Database#mssql_unicode_strings = false" do
  before do
    DB.mssql_unicode_strings = false
  end
  after do
    DB.drop_table?(:items)
    DB.mssql_unicode_strings = true
  end

  it "should work correctly" do
    DB.create_table!(:items){String :name}
    DB[:items].mssql_unicode_strings.must_equal false
    DB[:items].insert(:name=>'foo')
    DB[:items].select_map(:name).must_equal ['foo']
  end

  it "should be overridable at the dataset level" do
    DB.create_table!(:items){String :name}
    ds = DB[:items]
    ds.mssql_unicode_strings.must_equal false
    ds1 = ds.with_mssql_unicode_strings(true)
    ds.mssql_unicode_strings.must_equal false
    ds1.mssql_unicode_strings.must_equal true
    ds1.insert(:name=>'foo')
    ds1.select_map(:name).must_equal ['foo']
  end
end

describe "A MSSQL database adds index with include" do
  before :all do
    @table_name = :test_index_include
    @db = DB
    @db.create_table! @table_name do
      integer :col1
      integer :col2
      integer :col3
    end
  end

  after :all do
    @db.drop_table? @table_name
  end

  it "should be able add index with include" do
    @db.alter_table @table_name do
      add_index [:col1], :include => [:col2,:col3]
    end
    @db.indexes(@table_name).keys.must_include(:"#{@table_name}_col1_index")
  end
end

describe "MSSQL set_column_allow_null" do
  before do
    @db = DB
  end
  after do
    @db.drop_table?(:test3)
  end

  it "should work with nvarchar(MAX) columns" do
    @db.create_table!(:test3) do
      column :t, 'nvarchar(MAX)'
    end
    @db.alter_table(:test3) do
      set_column_not_null :t
    end
  end

  it "should work with text columns" do
    @db.create_table!(:test3) do
      column :t, 'text'
    end
    @db.alter_table(:test3) do
      set_column_not_null :t
    end
  end
end

describe "MSSQL::Database#drop_column with a schema" do
  before do
    DB.run "create schema test" rescue nil
  end
  after do
    DB.drop_table(Sequel[:test][:items])
    DB.run "drop schema test" rescue nil
  end

  it "drops columns with a default value" do
    DB.create_table!(Sequel[:test][:items]){ Integer :id; String :name, :default => 'widget' }
    DB.drop_column(Sequel[:test][:items], :name)
    DB[Sequel[:test][:items]].columns.must_equal [:id]
  end
end

describe "Database#foreign_key_list" do
  before(:all) do
    DB.create_table! :items do
      primary_key :id
      Integer     :sku
    end
    DB.create_table! :prices do
      Integer     :item_id
      datetime    :valid_from
      float       :price
      primary_key [:item_id, :valid_from]
      foreign_key [:item_id], :items, :key => :id, :name => :fk_prices_items
    end
    DB.create_table! :sales do
      Integer  :id
      Integer  :price_item_id
      datetime :price_valid_from
      foreign_key [:price_item_id, :price_valid_from], :prices, :key => [:item_id, :valid_from], :name => :fk_sales_prices, :on_delete => :cascade
    end
  end
  after(:all) do
    DB.drop_table :sales
    DB.drop_table :prices
    DB.drop_table :items
  end
  it "should support typical foreign keys" do
    DB.foreign_key_list(:prices).must_equal [{:name      => :fk_prices_items, 
                                                   :table     => :items, 
                                                   :columns   => [:item_id], 
                                                   :key       => [:id], 
                                                   :on_update => :no_action, 
                                                   :on_delete => :no_action }]
  end
  it "should support a foreign key with multiple columns" do
    DB.foreign_key_list(:sales).must_equal [{:name      => :fk_sales_prices, 
                                                  :table     => :prices, 
                                                  :columns   => [:price_item_id, :price_valid_from], 
                                                  :key       => [:item_id, :valid_from], 
                                                  :on_update => :no_action, 
                                                  :on_delete => :cascade }]
  end

  describe "with multiple schemas" do
    before(:all) do
      DB.execute_ddl "create schema vendor"
      DB.create_table! Sequel[:vendor][:vendors] do
        primary_key :id
        varchar     :name
      end
      DB.create_table! Sequel[:vendor][:mapping] do
        Integer :vendor_id
        Integer :item_id
        foreign_key [:vendor_id], Sequel[:vendor][:vendors], :name => :fk_mapping_vendor
        foreign_key [:item_id], :items, :name => :fk_mapping_item
      end
    end
    after(:all) do
      DB.drop_table? Sequel[:vendor][:mapping]
      DB.drop_table? Sequel[:vendor][:vendors]
      DB.execute_ddl "drop schema vendor"
    end
    it "should support mixed schema bound tables" do
 DB.foreign_key_list(Sequel[:vendor][:mapping]).sort_by{|h| h[:name].to_s}.must_equal [{:name => :fk_mapping_item, :table => :items, :columns => [:item_id], :key => [:id], :on_update => :no_action, :on_delete => :no_action }, {:name => :fk_mapping_vendor, :table => Sequel.qualify(:vendor, :vendors), :columns => [:vendor_id], :key => [:id], :on_update => :no_action, :on_delete => :no_action }]
    end
  end
end

describe "MSSQL optimistic locking plugin" do
  before do
    @db = DB
    @db.create_table! :items do
      primary_key :id
      String :name, :size => 20
      column :timestamp, 'timestamp'
    end
   end
  after do
    @db.drop_table?(:items)
  end

  it "should not allow stale updates" do
    c = Class.new(Sequel::Model(:items))
    c.plugin :mssql_optimistic_locking
    o = c.create(:name=>'test')
    o2 = c.first
    ts = o.timestamp
    ts.wont_equal nil
    o.name = 'test2'
    o.save
    o.timestamp.wont_equal ts
    proc{o2.save}.must_raise(Sequel::NoExistingObject)
  end
end unless DB.adapter_scheme == :odbc

describe "MSSQL Stored Procedure support" do
  before do
    @db = DB
    @now = DateTime.now.to_s
    @db.execute('CREATE PROCEDURE dbo.SequelTest
      (@Input varchar(25), @IntegerInput int, @Output varchar(25) OUTPUT, @IntegerOutput int OUTPUT) AS
      BEGIN SET @Output = @Input SET @IntegerOutput = @IntegerInput RETURN @IntegerInput END')
  end
  after do
    @db.execute('DROP PROCEDURE dbo.SequelTest')
  end

  describe "with unnamed parameters" do
    it "should return a hash of output variables" do
      r = @db.call_mssql_sproc(:SequelTest, {:args => [@now, 1, :output, :output]})
      r.must_be_kind_of(Hash)
      r.values_at(:var2, :var3).must_equal [@now, '1']
    end

    it "should support typed output variables" do
      @db.call_mssql_sproc(:SequelTest, {:args => [@now, 1, :output, [:output, 'int']]})[:var3].must_equal 1
    end

    it "should support named output variables" do
      @db.call_mssql_sproc(:SequelTest, {:args => [@now, 1, [:output, nil, 'output'], :output]})[:output].must_equal @now
    end

    it "should return the number of Affected Rows" do
      @db.call_mssql_sproc(:SequelTest, {:args => [@now, 1, :output, :output]})[:numrows].must_equal 1
    end

    it "should return the Result Code" do
      @db.call_mssql_sproc(:SequelTest, {:args => [@now, 1, :output, :output]})[:result].must_equal 1
    end
  end

  describe "with named parameters" do
    it "should return a hash of output variables" do
      r = @db.call_mssql_sproc(:SequelTest, :args => {
        'Input' => @now,
        'IntegerInput' => 1,
        'Output' => [:output, nil, 'output'],
        'IntegerOutput' => [:output, nil, 'integer_output']
      })
      r.must_be_kind_of(Hash)
      r.values_at(:output, :integer_output).must_equal [@now, '1']
    end

    it "should support typed output variables" do
      @db.call_mssql_sproc(:SequelTest, :args => {
        'Input' => @now,
        'IntegerInput' => 1,
        'Output' => [:output, nil, 'output'],
        'IntegerOutput' => [:output, 'int', 'integer_output']
      })[:integer_output].must_equal 1
    end

    it "should return the number of Affected Rows" do
      @db.call_mssql_sproc(:SequelTest, :args => {
        'Input' => @now,
        'IntegerInput' => 1,
        'Output' => [:output, nil, 'output'],
        'IntegerOutput' => [:output, nil, 'integer_output']
      })[:numrows].must_equal 1
    end

    it "should return the Result Code" do
      @db.call_mssql_sproc(:SequelTest, :args => {
        'Input' => @now,
        'IntegerInput' => 1,
        'Output' => [:output, nil, 'output'],
        'IntegerOutput' => [:output, nil, 'integer_output']
      })[:result].must_equal 1
    end
  end
end unless DB.adapter_scheme == :odbc
