require_relative "spec_helper"

with_server_specs = shared_description do
  it "should set the default server to use in the block" do
    @db.with_server(:a){@db[:t].all}
    @db.sqls.must_equal ["SELECT * FROM t -- a"]
    @db.with_server(:b){@db[:t].all}
    @db.sqls.must_equal ["SELECT * FROM t -- b"]
  end

  it "should set the default server to use in the block" do
    @db.with_server(:a, :b){@db[:t].all}
    @db.sqls.must_equal ["SELECT * FROM t -- b"]
    @db.with_server(:a, :b){@db[:t].insert}
    @db.sqls.must_equal ["INSERT INTO t DEFAULT VALUES -- a"]
  end

  it "should have no affect after the block" do
    @db.with_server(:a){@db[:t].all}
    @db.sqls.must_equal ["SELECT * FROM t -- a"]
    @db[:t].all
    @db.sqls.must_equal ["SELECT * FROM t"]
  end

  it "should not override specific server inside the block" do
    @db.with_server(:a){@db[:t].server(:b).all}
    @db.sqls.must_equal ["SELECT * FROM t -- b"]
  end

  it "should work correctly when blocks are nested" do
    @db[:t].all
    @db.with_server(:a) do
      @db[:t].all
      @db.with_server(:b){@db[:t].all}
      @db[:t].all
    end
    @db[:t].all
    @db.sqls.must_equal ["SELECT * FROM t", "SELECT * FROM t -- a", "SELECT * FROM t -- b", "SELECT * FROM t -- a", "SELECT * FROM t"]
  end

  it "should work correctly for inserts/updates/deletes" do
    @db.with_server(:a) do
      @db[:t].insert
      @db[:t].update(:a=>1)
      @db[:t].delete
    end
    @db.sqls.must_equal ["INSERT INTO t DEFAULT VALUES -- a", "UPDATE t SET a = 1 -- a", "DELETE FROM t -- a"]
  end
end

describe "Database#with_server single threaded" do
  before do
    @db = Sequel.mock(:single_threaded=>true, :servers=>{:a=>{}, :b=>{}})
    @db.extension :server_block
  end

  include with_server_specs
end

describe "Database#with_server multi threaded" do
  before do
    @db = Sequel.mock(:servers=>{:a=>{}, :b=>{}, :c=>{}, :d=>{}})
    @db.extension :server_block
  end

  include with_server_specs

  it "should respect multithreaded access" do
    q, q1 = Queue.new, Queue.new
    
    t = nil
    @db[:t].all
    @db.with_server(:a) do
      @db[:t].all
      t = Thread.new do
        @db[:t].all
        @db.with_server(:c) do
          @db[:t].all
          @db.with_server(:d){@db[:t].all}
          q.push nil
          q1.pop
          @db[:t].all
        end
        @db[:t].all
      end
      q.pop
      @db.with_server(:b){@db[:t].all}
      @db[:t].all
    end
    @db[:t].all
    q1.push nil
    t.join
    @db.sqls.must_equal ["SELECT * FROM t", "SELECT * FROM t -- a", "SELECT * FROM t", "SELECT * FROM t -- c", "SELECT * FROM t -- d",
      "SELECT * FROM t -- b", "SELECT * FROM t -- a", "SELECT * FROM t", "SELECT * FROM t -- c", "SELECT * FROM t"]
  end
end

describe "Database#with_server with invalid servers" do
  def sqls(server)
    @db.with_server(server) do
      @db[:t].all
      @db[:t].insert
      @db[:t].update(:a=>1)
      @db[:t].delete
    end
    @db.sqls
  end

  it "when single threaded and no servers_hash" do
    @db = Sequel.mock(:single_threaded=>true, :servers=>{:a=>{}}).extension(:server_block)
    sqls(:a).must_equal ["SELECT * FROM t -- a", "INSERT INTO t DEFAULT VALUES -- a", "UPDATE t SET a = 1 -- a", "DELETE FROM t -- a"]
    sqls(:c).must_equal ["SELECT * FROM t", "INSERT INTO t DEFAULT VALUES", "UPDATE t SET a = 1", "DELETE FROM t"]
  end

  it "when multi-threaded and no servers_hash" do
    @db = Sequel.mock(:servers=>{:a=>{}}).extension(:server_block)
    sqls(:a).must_equal ["SELECT * FROM t -- a", "INSERT INTO t DEFAULT VALUES -- a", "UPDATE t SET a = 1 -- a", "DELETE FROM t -- a"]
    sqls(:c).must_equal ["SELECT * FROM t", "INSERT INTO t DEFAULT VALUES", "UPDATE t SET a = 1", "DELETE FROM t"]
  end

  it "when single threaded and servers_hash" do
    @db = Sequel.mock(:single_threaded=>true, :servers=>{:a=>{}, :b=>{}}, :servers_hash=>Hash.new{|_,k| raise}.merge!(:c=>:b)).extension(:server_block)
    sqls(:a).must_equal ["SELECT * FROM t -- a", "INSERT INTO t DEFAULT VALUES -- a", "UPDATE t SET a = 1 -- a", "DELETE FROM t -- a"]
    sqls(:c).must_equal ["SELECT * FROM t -- b", "INSERT INTO t DEFAULT VALUES -- b", "UPDATE t SET a = 1 -- b", "DELETE FROM t -- b"]
    proc{sqls(:d)}.must_raise(RuntimeError)
  end

  it "when multi-threaded and servers_hash" do
    @db = Sequel.mock(:servers=>{:a=>{}, :b=>{}}, :servers_hash=>Hash.new{|_,k| raise}.merge!(:c=>:b)).extension(:server_block)
    sqls(:a).must_equal ["SELECT * FROM t -- a", "INSERT INTO t DEFAULT VALUES -- a", "UPDATE t SET a = 1 -- a", "DELETE FROM t -- a"]
    sqls(:c).must_equal ["SELECT * FROM t -- b", "INSERT INTO t DEFAULT VALUES -- b", "UPDATE t SET a = 1 -- b", "DELETE FROM t -- b"]
    proc{sqls(:d)}.must_raise(RuntimeError)
  end
end

