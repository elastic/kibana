require_relative "spec_helper"

connection_expiration_specs = shared_description do
  describe "connection expiration" do
    before do
      @m = Module.new do
        def disconnect_connection(conn)
          @sqls << 'disconnect'
        end
      end
      @db.extend @m
      @db.extension(:connection_expiration)
      @db.pool.connection_expiration_timeout = 2
    end

    it "should still allow new connections" do
      @db.synchronize{|c| c}.must_be_kind_of(Sequel::Mock::Connection)
    end

    it "should not override connection_expiration_timeout when loading extension" do
      @db.extension(:connection_expiration)
      @db.pool.connection_expiration_timeout.must_equal 2
    end

    it "should handle Database#disconnect calls while the connection is checked out" do
      @db.synchronize{|c| @db.disconnect}
    end

    it "should handle disconnected connections" do
      proc{@db.synchronize{|c| raise Sequel::DatabaseDisconnectError}}.must_raise Sequel::DatabaseDisconnectError
      @db.sqls.must_equal ['disconnect']
    end

    it "should handle :connection_handling => :disconnect setting" do
      @db = Sequel.mock(@db.opts.merge(:connection_handling => :disconnect))
      @db.extend @m
      @db.extension(:connection_expiration)
      @db.synchronize{}
      @db.sqls.must_equal ['disconnect']
    end

    it "should only expire if older than timeout" do
      c1 = @db.synchronize{|c| c}
      @db.sqls.must_equal []
      @db.synchronize{|c| c}.must_be_same_as(c1)
      @db.sqls.must_equal []
    end

    it "should disconnect connection if expired" do
      c1 = @db.synchronize{|c| c}
      @db.sqls.must_equal []
      simulate_sleep(c1)
      c2 = @db.synchronize{|c| c}
      @db.sqls.must_equal ['disconnect']
      c2.wont_be_same_as(c1)
    end

    it "should disconnect only expired connections among multiple" do
      c1, c2 = multiple_connections

      # Expire c1 only.
      simulate_sleep(c1)
      simulate_sleep(c2, 1)
      c1, c2 = multiple_connections

      c3 = @db.synchronize{|c| c}
      @db.sqls.must_equal ['disconnect']
      c3.wont_be_same_as(c1)
      c3.must_be_same_as(c2)
    end

    it "should disconnect connections repeatedly if they are expired" do
      c1, c2 = multiple_connections

      simulate_sleep(c1)
      simulate_sleep(c2)

      c3 = @db.synchronize{|c| c}
      @db.sqls.must_equal ['disconnect', 'disconnect']
      c3.wont_be_same_as(c1)
      c3.wont_be_same_as(c2)
    end

    it "should not leak connection references to expiring connections" do
      c1 = @db.synchronize{|c| c}
      simulate_sleep(c1)
      c2 = @db.synchronize{|c| c}
      c2.wont_be_same_as(c1)
      @db.pool.instance_variable_get(:@connection_expiration_timestamps).must_include(c2)
      @db.pool.instance_variable_get(:@connection_expiration_timestamps).wont_include(c1)
    end

    it "should not leak connection references during disconnect" do
      multiple_connections
      @db.pool.instance_variable_get(:@connection_expiration_timestamps).size.must_equal 2
      @db.disconnect
      @db.pool.instance_variable_get(:@connection_expiration_timestamps).size.must_equal 0
    end

    it "should not vary expiration timestamps by default" do
      c1 = @db.synchronize{|c| c}
      @db.pool.instance_variable_get(:@connection_expiration_timestamps)[c1].last.must_equal 2
    end

    it "should support #connection_expiration_random_delay to vary expiration timestamps" do
      @db.pool.connection_expiration_random_delay = 1
      c1 = @db.synchronize{|c| c}
      @db.pool.instance_variable_get(:@connection_expiration_timestamps)[c1].last.wont_equal 2
    end

    def multiple_connections
      q, q1 = Queue.new, Queue.new
      c1 = nil
      c2 = nil
      @db.synchronize do |c|
        Thread.new do
          @db.synchronize do |cc|
            c2 = cc
          end
          q1.pop
          q.push nil
        end
        q1.push nil
        q.pop
        c1 = c
      end
      [c1, c2]
    end

    # Set the timestamp back in time to simulate sleep / passage of time.
    def simulate_sleep(conn, sleep_time = 3)
      timestamps = @db.pool.instance_variable_get(:@connection_expiration_timestamps)
      timer, max = timestamps[conn]
      timestamps[conn] = [timer - sleep_time, max]
      @db.pool.instance_variable_set(:@connection_expiration_timestamps, timestamps)
    end
  end
end

describe "Sequel::ConnectionExpiration with threaded pool" do
  before do
    @db = Sequel.mock(:test=>false)
  end
  include connection_expiration_specs
end
describe "Sequel::ConnectionExpiration with sharded threaded pool" do
  before do
    @db = Sequel.mock(:test=>false, :servers=>{})
  end
  include connection_expiration_specs
end
