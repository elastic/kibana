require_relative "spec_helper"

describe "Prepared Statements and Bound Arguments" do
  before do
    @db = DB
    @db.create_table!(:items) do
      primary_key :id
      integer :numb
    end
    @c = Class.new(Sequel::Model(:items))
    @ds = @db[:items]
    @ds.insert(:numb=>10)
    @pr = @ds.requires_placeholder_type_specifiers? ? proc{|i| :"#{i}__integer"} : proc{|i| i}
  end
  after do
    @db.drop_table?(:items)
  end
  
  it "should support bound variables when selecting" do
    @ds.filter(:numb=>:$n).call(:each, :n=>10){|h| h.must_equal(:id=>1, :numb=>10)}
    @ds.filter(:numb=>:$n).call(:select, :n=>10).must_equal [{:id=>1, :numb=>10}]
    @ds.filter(:numb=>:$n).call(:all, :n=>10).must_equal [{:id=>1, :numb=>10}]
    @ds.filter(:numb=>:$n).call(:first, :n=>10).must_equal(:id=>1, :numb=>10)
    @ds.select(:numb).filter(:numb=>:$n).call(:single_value, :n=>10).must_equal(10)
    @ds.filter(:numb=>:$n).call([:map, :numb], :n=>10).must_equal [10]
    @ds.filter(:numb=>:$n).call([:as_hash, :id, :numb], :n=>10).must_equal(1=>10)
    @ds.filter(:numb=>:$n).call([:to_hash, :id, :numb], :n=>10).must_equal(1=>10)
    @ds.filter(:numb=>:$n).call([:to_hash_groups, :id, :numb], :n=>10).must_equal(1=>[10])
  end
    
  it "should support blocks for each, select, all, and map when using bound variables" do
    a = []
    @ds.filter(:numb=>:$n).call(:each, :n=>10){|r| r[:numb] *= 2; a << r}; a.must_equal [{:id=>1, :numb=>20}]
    @ds.filter(:numb=>:$n).call(:select, :n=>10){|r| r[:numb] *= 2}.must_equal [{:id=>1, :numb=>20}]
    @ds.filter(:numb=>:$n).call(:all, :n=>10){|r| r[:numb] *= 2}.must_equal [{:id=>1, :numb=>20}]
    @ds.filter(:numb=>:$n).call([:map], :n=>10){|r| r[:numb] * 2}.must_equal [20]
  end
    
  it "should support binding variables before the call with #bind" do
    @ds.filter(:numb=>:$n).bind(:n=>10).call(:select).must_equal [{:id=>1, :numb=>10}]
    @ds.filter(:numb=>:$n).bind(:n=>10).call(:all).must_equal [{:id=>1, :numb=>10}]
    @ds.filter(:numb=>:$n).bind(:n=>10).call(:first).must_equal(:id=>1, :numb=>10)
    @ds.select(:numb).filter(:numb=>:$n).bind(:n=>10).call(:single_value).must_equal(10)
    
    @ds.bind(:n=>10).filter(:numb=>:$n).call(:select).must_equal [{:id=>1, :numb=>10}]
    @ds.bind(:n=>10).filter(:numb=>:$n).call(:all).must_equal [{:id=>1, :numb=>10}]
    @ds.bind(:n=>10).filter(:numb=>:$n).call(:first).must_equal(:id=>1, :numb=>10)
    @ds.bind(:n=>10).select(:numb).filter(:numb=>:$n).call(:single_value).must_equal(10)
  end
  
  it "should allow overriding variables specified with #bind" do
    @ds.filter(:numb=>:$n).bind(:n=>1).call(:select, :n=>10).must_equal [{:id=>1, :numb=>10}]
    @ds.filter(:numb=>:$n).bind(:n=>1).call(:all, :n=>10).must_equal [{:id=>1, :numb=>10}]
    @ds.filter(:numb=>:$n).bind(:n=>1).call(:first, :n=>10).must_equal(:id=>1, :numb=>10)
    @ds.select(:numb).filter(:numb=>:$n).bind(:n=>1).call(:single_value, :n=>10).must_equal(10)
    
    @ds.filter(:numb=>:$n).bind(:n=>1).bind(:n=>10).call(:select).must_equal [{:id=>1, :numb=>10}]
    @ds.filter(:numb=>:$n).bind(:n=>1).bind(:n=>10).call(:all).must_equal [{:id=>1, :numb=>10}]
    @ds.filter(:numb=>:$n).bind(:n=>1).bind(:n=>10).call(:first).must_equal(:id=>1, :numb=>10)
    @ds.select(:numb).filter(:numb=>:$n).bind(:n=>1).bind(:n=>10).call(:single_value).must_equal(10)
  end

  it "should support placeholder literal strings with call" do
    @ds.filter(Sequel.lit("numb = ?", :$n)).call(:select, :n=>10).must_equal [{:id=>1, :numb=>10}]
  end

  it "should support named placeholder literal strings and handle multiple named placeholders correctly with call" do
    @ds.filter(Sequel.lit("numb = :n", :n=>:$n)).call(:select, :n=>10).must_equal [{:id=>1, :numb=>10}]
    @ds.insert(:numb=>20)
    @ds.insert(:numb=>30)
    @ds.filter(Sequel.lit("numb > :n1 AND numb < :n2 AND numb = :n3", :n3=>:$n3, :n2=>:$n2, :n1=>:$n1)).call(:select, :n3=>20, :n2=>30, :n1=>10).must_equal [{:id=>2, :numb=>20}]
  end

  it "should support datasets with static sql and placeholders with call" do
    @db["SELECT * FROM items WHERE numb = ?", :$n].call(:select, :n=>10).must_equal [{:id=>1, :numb=>10}]
  end

  it "should support subselects with call" do
    @ds.filter(:id=>:$i).filter(:numb=>@ds.select(:numb).filter(:numb=>:$n)).filter(:id=>:$j).call(:select, :n=>10, :i=>1, :j=>1).must_equal [{:id=>1, :numb=>10}]
  end

  it "should support subselects with exists with call" do
    @ds.filter(:id=>:$i).filter(@ds.select(:numb).filter(:numb=>:$n).exists).filter(:id=>:$j).call(:select, :n=>10, :i=>1, :j=>1).must_equal [{:id=>1, :numb=>10}]
  end

  it "should support subselects with literal strings with call" do
    @ds.filter(:id=>:$i, :numb=>@ds.select(:numb).filter(Sequel.lit("numb = ?", :$n))).call(:select, :n=>10, :i=>1).must_equal [{:id=>1, :numb=>10}]
  end

  it "should support subselects with static sql and placeholders with call" do
    @ds.filter(:id=>:$i, :numb=>@db["SELECT numb FROM items WHERE numb = ?", :$n]).call(:select, :n=>10, :i=>1).must_equal [{:id=>1, :numb=>10}]
  end

  it "should support subselects of subselects with call" do
    @ds.filter(:id=>:$i).filter(:numb=>@ds.select(:numb).filter(:numb=>@ds.select(:numb).filter(:numb=>:$n))).filter(:id=>:$j).call(:select, :n=>10, :i=>1, :j=>1).must_equal [{:id=>1, :numb=>10}]
  end
  
  cspecify "should support using a bound variable for a limit and offset", [:jdbc, :db2] do
    @ds.insert(:numb=>20)
    ds = @ds.limit(:$n, :$n2).order(:id)
    ds.call(:select, :n=>1, :n2=>0).must_equal [{:id=>1, :numb=>10}]
    ds.call(:select, :n=>1, :n2=>1).must_equal [{:id=>2, :numb=>20}]
    ds.call(:select, :n=>1, :n2=>2).must_equal []
    ds.call(:select, :n=>2, :n2=>0).must_equal [{:id=>1, :numb=>10}, {:id=>2, :numb=>20}]
    ds.call(:select, :n=>2, :n2=>1).must_equal [{:id=>2, :numb=>20}]
  end

  it "should support bound variables with insert" do
    @ds.call(:insert, {:n=>20}, :numb=>:$n)
    @ds.count.must_equal 2
    @ds.order(:id).map(:numb).must_equal [10, 20]
  end

  it "should support bound variables with NULL values" do
    @ds.delete
    @ds.call(:insert, {:n=>nil}, :numb=>@pr[:$n])
    @ds.count.must_equal 1
    @ds.map(:numb).must_equal [nil]
  end

  it "should have insert return primary key value when using bound arguments" do
    @ds.call(:insert, {:n=>20}, :numb=>:$n).must_equal 2
    @ds.filter(:id=>2).first[:numb].must_equal 20
  end

  it "should support bound variables with insert_select" do
    @ds.call(:insert_select, {:n=>20}, :numb=>:$n).must_equal(:id=>2, :numb=>20)
    @ds.count.must_equal 2
    @ds.order(:id).map(:numb).must_equal [10, 20]
  end if DB.dataset.supports_insert_select?

  it "should support bound variables with insert returning" do
    @ds.returning.call(:insert, {:n=>20}, :numb=>:$n).must_equal([{:id=>2, :numb=>20}])
    @ds.count.must_equal 2
    @ds.order(:id).map(:numb).must_equal [10, 20]
  end if DB.dataset.supports_returning?(:insert)

  it "should support bound variables with update returning" do
    @ds.returning.call(:update, {:n=>20}, :numb=>:$n).must_equal([{:id=>1, :numb=>20}])
    @ds.count.must_equal 1
    @ds.order(:id).map(:numb).must_equal [20]
  end if DB.dataset.supports_returning?(:update)

  it "should support bound variables with delete returning" do
    @ds.where(:id=>:$id).returning.call(:delete, :id=>1).must_equal([{:id=>1, :numb=>10}])
    @ds.count.must_equal 0
  end if DB.dataset.supports_returning?(:delete)

  it "should support bound variables with delete" do
    @ds.filter(:numb=>:$n).call(:delete, :n=>10).must_equal 1
    @ds.count.must_equal 0
  end

  it "should support bound variables with update" do
    @ds.filter(:numb=>:$n).call(:update, {:n=>10, :nn=>20}, :numb=>Sequel.+(:numb, :$nn)).must_equal 1
    @ds.all.must_equal [{:id=>1, :numb=>30}]
  end
  
  it "should support prepared statements when selecting" do
    @ds.filter(:numb=>:$n).prepare(:each, :select_n)
    @db.call(:select_n, :n=>10){|h| h.must_equal(:id=>1, :numb=>10)}
    @ds.filter(:numb=>:$n).prepare(:select, :select_n)
    @db.call(:select_n, :n=>10).must_equal [{:id=>1, :numb=>10}]
    @ds.filter(:numb=>:$n).prepare(:all, :select_n)
    @db.call(:select_n, :n=>10).must_equal [{:id=>1, :numb=>10}]
    @ds.filter(:numb=>:$n).prepare(:first, :select_n)
    @db.call(:select_n, :n=>10).must_equal(:id=>1, :numb=>10)
    @ds.select(:numb).filter(:numb=>:$n).prepare(:single_value, :select_n)
    @db.call(:select_n, :n=>10).must_equal(10)
    @ds.filter(:numb=>:$n).prepare([:map, :numb], :select_n)
    @db.call(:select_n, :n=>10).must_equal [10]
    @ds.filter(:numb=>:$n).prepare([:as_hash, :id, :numb], :select_n)
    @db.call(:select_n, :n=>10).must_equal(1=>10)
    @ds.filter(:numb=>:$n).prepare([:to_hash, :id, :numb], :select_n)
    @db.call(:select_n, :n=>10).must_equal(1=>10)
  end

  it "should support blocks for each, select, all, and map when using prepared statements" do
    a = []
    @ds.filter(:numb=>:$n).prepare(:each, :select_n).call(:n=>10){|r| r[:numb] *= 2; a << r}; a.must_equal [{:id=>1, :numb=>20}]
    a = []
    @db.call(:select_n, :n=>10){|r| r[:numb] *= 2; a << r}; a.must_equal [{:id=>1, :numb=>20}]
    @ds.filter(:numb=>:$n).prepare(:select, :select_n).call(:n=>10){|r| r[:numb] *= 2}.must_equal [{:id=>1, :numb=>20}]
    @db.call(:select_n, :n=>10){|r| r[:numb] *= 2}.must_equal [{:id=>1, :numb=>20}]
    @ds.filter(:numb=>:$n).prepare(:all, :select_n).call(:n=>10){|r| r[:numb] *= 2}.must_equal [{:id=>1, :numb=>20}]
    @db.call(:select_n, :n=>10){|r| r[:numb] *= 2}.must_equal [{:id=>1, :numb=>20}]
    @ds.filter(:numb=>:$n).prepare([:map], :select_n).call(:n=>10){|r| r[:numb] *= 2}.must_equal [20]
    @db.call(:select_n, :n=>10){|r| r[:numb] *= 2}.must_equal [20]
  end
    
  it "should support prepared statements being called multiple times with different arguments" do
    @ds.filter(:numb=>:$n).prepare(:select, :select_n)
    @db.call(:select_n, :n=>10).must_equal [{:id=>1, :numb=>10}]
    @db.call(:select_n, :n=>0).must_equal []
    @db.call(:select_n, :n=>10).must_equal [{:id=>1, :numb=>10}]
  end

  it "should support placeholder literal strings with prepare" do
    @ds.filter(Sequel.lit("numb = ?", :$n)).prepare(:select, :seq_select).call(:n=>10).must_equal [{:id=>1, :numb=>10}]
  end

  it "should support named placeholder literal strings and handle multiple named placeholders correctly with prepare" do
    @ds.filter(Sequel.lit("numb = :n", :n=>:$n)).prepare(:select, :seq_select).call(:n=>10).must_equal [{:id=>1, :numb=>10}]
    @ds.insert(:numb=>20)
    @ds.insert(:numb=>30)
    @ds.filter(Sequel.lit("numb > :n1 AND numb < :n2 AND numb = :n3", :n3=>:$n3, :n2=>:$n2, :n1=>:$n1)).call(:select, :n3=>20, :n2=>30, :n1=>10).must_equal [{:id=>2, :numb=>20}]
  end

  it "should support datasets with static sql and placeholders with prepare" do
    @db["SELECT * FROM items WHERE numb = ?", :$n].prepare(:select, :seq_select).call(:n=>10).must_equal [{:id=>1, :numb=>10}]
  end

  it "should support subselects with prepare" do
    @ds.filter(:id=>:$i).filter(:numb=>@ds.select(:numb).filter(:numb=>:$n)).filter(:id=>:$j).prepare(:select, :seq_select).call(:n=>10, :i=>1, :j=>1).must_equal [{:id=>1, :numb=>10}]
  end

  it "should support subselects with exists with prepare" do
    @ds.filter(:id=>:$i).filter(@ds.select(:numb).filter(:numb=>:$n).exists).filter(:id=>:$j).prepare(:select, :seq_select).call(:n=>10, :i=>1, :j=>1).must_equal [{:id=>1, :numb=>10}]
  end

  it "should support subselects with literal strings with prepare" do
    @ds.filter(:id=>:$i, :numb=>@ds.select(:numb).filter(Sequel.lit("numb = ?", :$n))).prepare(:select, :seq_select).call(:n=>10, :i=>1).must_equal [{:id=>1, :numb=>10}]
  end

  it "should support subselects with static sql and placeholders with prepare" do
    @ds.filter(:id=>:$i, :numb=>@db["SELECT numb FROM items WHERE numb = ?", :$n]).prepare(:select, :seq_select).call(:n=>10, :i=>1).must_equal [{:id=>1, :numb=>10}]
  end

  it "should support subselects of subselects with prepare" do
    @ds.filter(:id=>:$i).filter(:numb=>@ds.select(:numb).filter(:numb=>@ds.select(:numb).filter(:numb=>:$n))).filter(:id=>:$j).prepare(:select, :seq_select).call(:n=>10, :i=>1, :j=>1).must_equal [{:id=>1, :numb=>10}]
  end
  
  cspecify "should support using a prepared_statement for a limit and offset", :db2 do
    @ds.insert(:numb=>20)
    ps = @ds.limit(:$n, :$n2).order(:id).prepare(:select, :seq_select)
    ps.call(:n=>1, :n2=>0).must_equal [{:id=>1, :numb=>10}]
    ps.call(:n=>1, :n2=>1).must_equal [{:id=>2, :numb=>20}]
    ps.call(:n=>1, :n2=>2).must_equal []
    ps.call(:n=>2, :n2=>0).must_equal [{:id=>1, :numb=>10}, {:id=>2, :numb=>20}]
    ps.call(:n=>2, :n2=>1).must_equal [{:id=>2, :numb=>20}]
  end

  it "should support prepared statements with insert" do
    @ds.prepare(:insert, :insert_n, :numb=>:$n)
    @db.call(:insert_n, :n=>20)
    @ds.count.must_equal 2
    @ds.order(:id).map(:numb).must_equal [10, 20]
  end

  it "should support prepared statements with NULL values" do
    @ds.delete
    @ds.prepare(:insert, :insert_n, :numb=>@pr[:$n])
    @db.call(:insert_n, :n=>nil)
    @ds.count.must_equal 1
    @ds.map(:numb).must_equal [nil]
  end

  it "should have insert return primary key value when using prepared statements" do
    @ds.prepare(:insert, :insert_n, :numb=>:$n)
    @db.call(:insert_n, :n=>20).must_equal 2
    @ds.filter(:id=>2).first[:numb].must_equal 20
  end

  it "should support prepared_statements with insert_select" do
    @ds.prepare(:insert_select, :insert_select_n, :numb=>:$n).call(:n=>20).must_equal(:id=>2, :numb=>20)
    @ds.count.must_equal 2
    @ds.order(:id).map(:numb).must_equal [10, 20]
  end if DB.dataset.supports_insert_select?

  it "should support bound variables with insert returning" do
    @ds.returning.prepare(:insert, :insert_rn, :numb=>:$n).call(:n=>20).must_equal([{:id=>2, :numb=>20}])
    @ds.count.must_equal 2
    @ds.order(:id).map(:numb).must_equal [10, 20]
  end if DB.dataset.supports_returning?(:insert)

  it "should support bound variables with update returning" do
    @ds.returning.prepare(:update, :update_rn, :numb=>:$n).call(:n=>20).must_equal([{:id=>1, :numb=>20}])
    @ds.count.must_equal 1
    @ds.order(:id).map(:numb).must_equal [20]
  end if DB.dataset.supports_returning?(:update)

  it "should support bound variables with delete returning" do
    @ds.where(:id=>:$id).returning.prepare(:delete, :delete_rn).call(:id=>1).must_equal([{:id=>1, :numb=>10}])
    @ds.count.must_equal 0
  end if DB.dataset.supports_returning?(:delete)

  it "should support prepared statements with delete" do
    @ds.filter(:numb=>:$n).prepare(:delete, :delete_n)
    @db.call(:delete_n, :n=>10).must_equal 1
    @ds.count.must_equal 0
  end

  it "should support prepared statements with update" do
    @ds.filter(:numb=>:$n).prepare(:update, :update_n, :numb=>Sequel.+(:numb, :$nn))
    @db.call(:update_n, :n=>10, :nn=>20).must_equal 1
    @ds.all.must_equal [{:id=>1, :numb=>30}]
  end
  
  it "model datasets should return model instances when using select, all, and first with bound variables" do
    @c.filter(:numb=>:$n).call(:select, :n=>10).must_equal [@c.load(:id=>1, :numb=>10)]
    @c.filter(:numb=>:$n).call(:all, :n=>10).must_equal [@c.load(:id=>1, :numb=>10)]
    @c.filter(:numb=>:$n).call(:first, :n=>10).must_equal @c.load(:id=>1, :numb=>10)
  end
  
  it "model datasets should return model instances when using select, all, and first with prepared statements" do
    @c.filter(:numb=>:$n).prepare(:select, :select_n1)
    @db.call(:select_n1, :n=>10).must_equal [@c.load(:id=>1, :numb=>10)]
    @c.filter(:numb=>:$n).prepare(:all, :select_n1)
    @db.call(:select_n1, :n=>10).must_equal [@c.load(:id=>1, :numb=>10)]
    @c.filter(:numb=>:$n).prepare(:first, :select_n1)
    @db.call(:select_n1, :n=>10).must_equal @c.load(:id=>1, :numb=>10)
  end
end

describe "Bound Argument Types" do
  before(:all) do
    @db = DB
    @db.create_table!(:items) do
      primary_key :id
      Date :d
      DateTime :dt
      File :file
      String :s
      Time :t
      Float :f
      TrueClass :b
    end
    @ds = @db[:items]
    @vs = {:d=>Date.civil(2010, 10, 11), :dt=>DateTime.civil(2010, 10, 12, 13, 14, 15), :f=>1.0, :s=>'str', :t=>Time.at(Time.now.to_i), :file=>Sequel::SQL::Blob.new('blob'), :b=>true}
  end
  before do
    @ds.delete
    @ds.insert(@vs)
  end
  after do
    Sequel.datetime_class = Time
  end
  after(:all) do
    @db.drop_table?(:items)
  end

  cspecify "should handle date type", [:tinytds], [:jdbc, :mssql], [:jdbc, :sqlite], :oracle do 
    @ds.filter(:d=>:$x).prepare(:first, :ps_date).call(:x=>@vs[:d])[:d].must_equal @vs[:d]
  end

  cspecify "should handle datetime type", [:mysql2], [:jdbc, :sqlite], [:tinytds], [:oracle] do
    Sequel.datetime_class = DateTime
    @ds.filter(:dt=>:$x).prepare(:first, :ps_datetime).call(:x=>@vs[:dt])[:dt].must_equal @vs[:dt]
  end

  cspecify "should handle datetime type with fractional seconds", [:jdbc, :sqlite], [:jdbc, :mysql], [:oracle] do
    Sequel.datetime_class = DateTime
    fract_time = DateTime.parse('2010-10-12 13:14:15.500000')
    @ds.prepare(:update, :ps_datetime_up, :dt=>:$x).call(:x=>fract_time)
    @ds.literal(@ds.filter(:dt=>:$x).prepare(:first, :ps_datetime).call(:x=>fract_time)[:dt]).must_equal @ds.literal(fract_time)
  end

  cspecify "should handle time type", [:jdbc, :sqlite] do
    @ds.filter(:t=>:$x).prepare(:first, :ps_time).call(:x=>@vs[:t])[:t].must_equal @vs[:t]
  end

  cspecify "should handle time type with fractional seconds", [:jdbc, :sqlite], [:jdbc, :mysql] do
    fract_time = @vs[:t] + 0.5
    @ds.prepare(:update, :ps_time_up, :t=>:$x).call(:x=>fract_time)
    @ds.literal(@ds.filter(:t=>:$x).prepare(:first, :ps_time).call(:x=>fract_time)[:t]).must_equal @ds.literal(fract_time)
  end

  cspecify "should handle blob type", [:odbc] do
    @ds.delete
    @ds.prepare(:insert, :ps_blob, {:file=>:$x}).call(:x=>@vs[:file])
    @ds.get(:file).must_equal @vs[:file]
  end

  cspecify "should handle blob type with special characters", [:odbc] do
    @ds.delete
    blob = Sequel.blob("\"'[]`a0 ")
    @ds.prepare(:insert, :ps_blob, {:file=>:$x}).call(:x=>blob)
    @ds.get(:file).must_equal blob
  end

  cspecify "should handle blob type with nil values", [:oracle], [:tinytds], [:jdbc, :mssql] do
    @ds.delete
    @ds.prepare(:insert, :ps_blob, {:file=>:$x}).call(:x=>nil)
    @ds.get(:file).must_be_nil
  end

  cspecify "should handle blob type with embedded zeros", [:odbc] do
    zero_blob = Sequel::SQL::Blob.new("a\0"*100)
    @ds.delete
    @ds.prepare(:insert, :ps_blob, {:file=>:$x}).call(:x=>zero_blob)
    @ds.get(:file).must_equal zero_blob
  end

  it "should handle float type" do
    @ds.filter(:f=>:$x).prepare(:first, :ps_float).call(:x=>@vs[:f])[:f].must_equal @vs[:f]
  end

  it "should handle string type" do
    @ds.filter(:s=>:$x).prepare(:first, :ps_string).call(:x=>@vs[:s])[:s].must_equal @vs[:s]
  end

  cspecify "should handle boolean type", [:jdbc, :sqlite], [:jdbc, :db2], :oracle do
    @ds.filter(:b=>:$x).prepare(:first, :ps_string).call(:x=>@vs[:b])[:b].must_equal @vs[:b]
  end
end
