require_relative "spec_helper"

describe "server_logging extension" do
  before do
    @o = Object.new
    def @o.logs; @logs || []; end
    def @o.log; logs.length.must_equal 1; logs.first.length.must_equal 1; logs.shift.first; end
    def @o.to_ary; [self]; end
    def @o.method_missing(m, *args); (@logs ||= []) << args; end
    @db = Sequel::mock(:test=>false, :servers=>{:read_only=>{}, :b=>{}}, :logger=>@o).extension(:server_logging)
  end

  it "should include shard when logging" do
    @db[:a].all
    @o.log.must_include "server: read_only) SELECT * FROM a"
    @db[:a].insert
    @o.log.must_include "server: default) INSERT INTO a DEFAULT VALUES"
    @db[:a].server(:b).all
    @o.log.must_include "server: b) SELECT * FROM a"
  end

  it "should not include shard when not logging connection info" do
    @db.log_connection_info = false
    @db[:a].all
    log = @o.log
    log.wont_include "server: read_only) SELECT * FROM a"
    log.must_include "SELECT * FROM a"
  end

  it "should not turn on logging connction info if it was turned off" do
    @db.log_connection_info = false
    @db.extension :server_logging
    @db[:a].all
    log = @o.log
    log.wont_include "server: read_only) SELECT * FROM a"
    log.must_include "SELECT * FROM a"
  end

  it "should remove mapping when disconnecting" do
    c = @db.synchronize{|c1| c1}
    @db.disconnect
    @db.send(:log_connection_execute, c, "SELECT * FROM a")
    @o.log.must_include "server: ) SELECT * FROM a"
  end
end
