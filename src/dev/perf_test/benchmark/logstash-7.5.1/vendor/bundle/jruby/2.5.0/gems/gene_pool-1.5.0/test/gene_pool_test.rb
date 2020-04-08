require_relative 'test_helper.rb'
require 'stringio'
require 'logger'
require 'timeout'

# Increase visibility
class GenePool
  attr_reader :checked_out, :with_map
end

class MyTimeoutError < RuntimeError; end

class DummyConnection
  attr_reader :count
  def initialize(count, sleep_time=nil)
    sleep sleep_time if sleep_time
    @count = count
    @closed = false
    @other_closed = false
  end

  def to_s
    @count.to_s
  end

  def fail_on(*counts)
    raise Exception.new("Dummy exception on count #{@count}") if counts.include?(@count)
  end

  def close
    @closed = true
  end

  def closed?
    @closed
  end

  def other_close
    @other_closed = true
  end

  def other_closed?
    @other_closed
  end

  def send(msg, flags)
    # override Object#send ( to simulate e.g. BasicSocket#send )
  end
end

class GenePoolTest < Minitest::Test
  describe 'on default setup' do
    before do
      @gene_pool = GenePool.new { Object.new }
    end

    it 'have default options set' do
      assert_equal 'GenePool', @gene_pool.name
      assert_equal 1,          @gene_pool.pool_size
      assert_equal 5.0,        @gene_pool.warn_timeout
      assert                   @gene_pool.logger
    end
  end

  describe GenePool do
    before do
      #@stringio = StringIO.new
      #@logger = Logger.new($stdout)
      #@logger = Logger.new(@stringio)
      # Override sleep in individual tests
      @sleep = nil
      counter = 0
      mutex = Mutex.new
      @gene_pool = GenePool.new(:name         => 'TestGenePool',
                                :pool_size    => 10,
                                #:logger       => @logger,
                                :warn_timeout => 2.0) do
        count = nil
        mutex.synchronize do
          count = counter += 1
        end
        DummyConnection.new(count, @sleep)
      end
    end

    it 'have options set' do
      assert_equal 'TestGenePool', @gene_pool.name
      assert_equal 10,             @gene_pool.pool_size
      assert_equal 2.0,            @gene_pool.warn_timeout
      #assert_same  @logger,        @gene_pool.logger
    end

    it 'create 1 connection' do
      (1..3).each do |i|
        @gene_pool.with_connection do |conn|
          assert_equal conn.count, 1
          assert_equal 1,         @gene_pool.connections.size
          assert_equal 1,         @gene_pool.checked_out.size
          assert_same  conn,      @gene_pool.connections[0]
          assert_same  conn,      @gene_pool.checked_out[0]
        end
        assert_equal 0, @gene_pool.checked_out.size
      end
    end

    it 'create 2 connections' do
      conn1 = @gene_pool.checkout
      (1..3).each do |i|
        @gene_pool.with_connection do |conn2|
          assert_equal 1, conn1.count
          assert_equal 2, conn2.count
          assert_equal 2, @gene_pool.connections.size
          assert_equal 2, @gene_pool.checked_out.size
          assert_same  conn1, @gene_pool.connections[0]
          assert_same  conn1, @gene_pool.checked_out[0]
          assert_same  conn2, @gene_pool.connections[1]
          assert_same  conn2, @gene_pool.checked_out[1]
        end
        assert_equal 1, @gene_pool.checked_out.size
      end
      @gene_pool.checkin(conn1)
      assert_equal 0, @gene_pool.checked_out.size
    end

    it 'be able to reset multiple times' do
      @gene_pool.with_connection do |conn1|
        conn2 = @gene_pool.renew(conn1)
        conn3 = @gene_pool.renew(conn2)
        assert_equal 1, conn1.count
        assert_equal 2, conn2.count
        assert_equal 3, conn3.count
        assert_equal 1, @gene_pool.connections.size
        assert_equal 1, @gene_pool.checked_out.size
      end
      assert_equal 1, @gene_pool.connections.size
      assert_equal 0, @gene_pool.checked_out.size
    end

    it 'be able to remove connection' do
      @gene_pool.with_connection do |conn|
        @gene_pool.remove(conn)
        assert_equal 0, @gene_pool.connections.size
        assert_equal 0, @gene_pool.checked_out.size
      end
      assert_equal 0, @gene_pool.connections.size
      assert_equal 0, @gene_pool.checked_out.size
    end

    it 'be able to remove multiple connections' do
      @gene_pool.with_connection do |conn1|
        @gene_pool.with_connection do |conn2|
          @gene_pool.with_connection do |conn3|
            @gene_pool.remove(conn1)
            @gene_pool.remove(conn3)
            assert_equal 1, @gene_pool.connections.size
            assert_equal 1, @gene_pool.checked_out.size
            assert_same  conn2, @gene_pool.checked_out[0]
            assert_same  conn2, @gene_pool.connections[0]
          end
          assert_equal 1, @gene_pool.connections.size
          assert_equal 1, @gene_pool.checked_out.size
        end
        assert_equal 1, @gene_pool.connections.size
        assert_equal 0, @gene_pool.checked_out.size
      end
      assert_equal 1, @gene_pool.connections.size
      assert_equal 0, @gene_pool.checked_out.size
    end

    it 'handle aborted connection' do
      @gene_pool.with_connection do |conn1|
        @sleep = 2
        assert_raises RuntimeError do
          Timeout.timeout(1, RuntimeError) do
            @gene_pool.with_connection { |conn2| }
          end
        end
        assert_equal 1, @gene_pool.connections.size
        assert_equal 1, @gene_pool.checked_out.size
      end
      assert_equal 1, @gene_pool.connections.size
      assert_equal 0, @gene_pool.checked_out.size
      # Do another test just to be sure nothings hosed
      @sleep = nil
      @gene_pool.with_connection do |conn1|
        assert_equal 1, conn1.count
        @gene_pool.with_connection do |conn2|
          assert_equal 3, conn2.count
        end
      end
    end

    it 'not allow more than pool_size connections' do
      conns = []
      pool_size = @gene_pool.pool_size
      (1..pool_size).each do |i|
        c = @gene_pool.checkout
        conns << c
        assert_equal i, c.count
        assert_equal i, @gene_pool.connections.size
        assert_equal i, @gene_pool.checked_out.size
        assert_equal conns, @gene_pool.connections
      end
      assert_raises RuntimeError do
        Timeout.timeout(1, RuntimeError) do
          @gene_pool.checkout
        end
      end
      (1..pool_size).each do |i|
        @gene_pool.checkin(conns[i-1])
        assert_equal pool_size,   @gene_pool.connections.size
        assert_equal pool_size-i, @gene_pool.checked_out.size
      end
    end

    it 'handle thread contention' do
      conns = []
      pool_size = @gene_pool.pool_size
      # Do it with new connections and old connections
      (1..2).each do |n|
        (1..pool_size).each do |i|
          Thread.new do
            c = @gene_pool.checkout
            conns[i-1] = c
          end
        end
        # Let the threads complete
        sleep 1
        assert_equal pool_size,   @gene_pool.connections.size
        assert_equal pool_size,   @gene_pool.checked_out.size
        (1..pool_size).each do |i|
          Thread.new do
            @gene_pool.checkin(conns[i-1])
          end
        end
        sleep 1
        assert_equal pool_size, @gene_pool.connections.size
        assert_equal 0,         @gene_pool.checked_out.size
      end
      ival_conns = []
      @gene_pool.each { |conn| ival_conns << conn.count }
      ival_conns.sort!
      assert_equal (1..pool_size).to_a, ival_conns
    end

    it 'be able to auto-retry connection' do
      conns = []
      @gene_pool.with_connection_auto_retry do |conn|
        conns << conn
        conn.fail_on(1)
        assert_equal 1, @gene_pool.connections.size
        assert_equal 1, @gene_pool.checked_out.size
        assert_equal 2, conn.count
      end
      @gene_pool.with_connection_auto_retry do |conn|
        conns << conn
        assert_equal 1, @gene_pool.connections.size
        assert_equal 1, @gene_pool.checked_out.size
      end
      assert conns[0].closed?
      assert !conns[1].closed?
      assert_same conns[1], conns[2]
      assert_equal 1, @gene_pool.connections.size
      assert_equal 0, @gene_pool.checked_out.size
    end

    it 'fail with auto-retry on double failure' do
      e = assert_raises Exception do
        @gene_pool.with_connection_auto_retry do |conn|
          conn.fail_on(1,2)
        end
      end
      assert_match %r%Dummy exception%, e.message
      assert_equal 0, @gene_pool.connections.size
      assert_equal 0, @gene_pool.checked_out.size
      @gene_pool.with_connection do |conn|
        assert_equal 3, conn.count
      end
    end

    it 'not auto-retry on timeout' do
      assert_raises RuntimeError do
        Timeout.timeout(1, RuntimeError) do
          @gene_pool.with_connection_auto_retry do |conn|
            sleep 2
            assert false, true
          end
        end
      end
      assert_equal 0, @gene_pool.connections.size
      assert_equal 0, @gene_pool.checked_out.size
      @sleep = 0
      @gene_pool.with_connection_auto_retry do |conn|
        assert_equal 2, conn.count
        assert_equal 1, @gene_pool.checked_out.size
      end
      assert_equal 1, @gene_pool.connections.size
      assert_equal 0, @gene_pool.checked_out.size
    end

    it 'allow cleanup of idle connections' do
      conn1 = @gene_pool.checkout
      conn2 = @gene_pool.checkout
      @gene_pool.checkin(conn1)
      sleep 2
      @gene_pool.checkin(conn2)
      assert_equal 2, @gene_pool.connections.size
      assert_equal 0, @gene_pool.checked_out.size
      @gene_pool.remove_idle(1)
      assert_equal 1, @gene_pool.connections.size
      assert conn1.closed?
      assert !conn2.closed?
    end
  end

  describe 'idle timeout' do
    before do
      # Override sleep in individual tests
      @sleep = nil
      counter = 0
      mutex = Mutex.new
      @gene_pool = GenePool.new(:name         => 'TestGenePool',
                                :pool_size    => 10,
                                :idle_timeout => 2.0) do
        count = nil
        mutex.synchronize do
          count = counter += 1
        end
        DummyConnection.new(count, @sleep)
      end
    end

    it 'create a new connection if we pass the idle timeout' do
      conn1, conn2, conn3 = nil
      @gene_pool.with_connection { |conn| conn1 = conn }
      @gene_pool.with_connection { |conn| conn2 = conn }
      assert_equal 1, @gene_pool.connections.size
      sleep 3
      @gene_pool.with_connection { |conn| conn3 = conn }
      assert_equal 1, @gene_pool.connections.size
      assert_same conn1, conn2
      assert_equal 1, conn1.count
      assert_equal 2, conn3.count
      assert conn1.closed?
      assert !conn3.closed?
    end
  end

  describe 'close_proc' do
    it 'default to close if not specified' do
      @gene_pool = GenePool.new do
        DummyConnection.new(0, 0)
      end
      conn = nil
      @gene_pool.with_connection { |c| conn = c }
      @gene_pool.remove_idle(0)
      assert conn.closed?
      assert !conn.other_closed?
    end

    it 'allow symbol to execute a different method from close' do
      @gene_pool = GenePool.new(:close_proc => :other_close) do
        DummyConnection.new(0, 0)
      end
      conn = nil
      @gene_pool.with_connection { |c| conn = c }
      @gene_pool.remove_idle(0)
      assert !conn.closed?
      assert conn.other_closed?
    end

    it 'allow nil so it does not execute a close' do
      @gene_pool = GenePool.new(:close_proc => nil) do
        DummyConnection.new(0, 0)
      end
      conn = nil
      @gene_pool.with_connection { |c| conn = c }
      @gene_pool.remove_idle(0)
      assert !conn.closed?
      assert !conn.other_closed?
    end

    it 'allow proc that gets executed on close' do
      foo = 1
      close_conn = nil
      my_close = lambda do |conn|
        close_conn = conn
        foo = 2
      end
      @gene_pool = GenePool.new(:close_proc => my_close) do
        DummyConnection.new(0, 0)
      end
      conn = nil
      @gene_pool.with_connection { |c| conn = c }
      @gene_pool.remove_idle(0)
      assert !conn.closed?
      assert !conn.other_closed?
      assert_same conn, close_conn
      assert_equal 2, foo
    end
  end

  describe 'timeout' do
    before do
      @timeout_classes = [nil, MyTimeoutError]
      @gene_pools = @timeout_classes.map do |timeout_class|
        GenePool.new(:name          => 'TestGenePool',
                     :pool_size     => 2,
                     :close_proc    => nil,
                     :timeout       => 1.0,
                     :timeout_class => timeout_class) do
          Object.new
        end
      end
    end

    it 'timeout when the timeout period has expired' do
      @gene_pools.each_with_index do |gene_pool, class_index|
        pool_size = gene_pool.pool_size
        # Do it with new connections and old connections
        (1..2).each do |n|
          (1..pool_size).each do |i|
            Thread.new do
              gene_pool.with_connection do |c|
                sleep(2)
              end
            end
          end
          # Let the threads get the connections
          sleep(0.1)
          start_time = Time.now
          timeout_class = @timeout_classes[class_index] || Timeout::Error
          assert_raises timeout_class do
            gene_pool.with_connection { |c| }
            puts "No timeout after #{Time.now - start_time} seconds"
          end
          puts "#{Time.now-start_time} should be around 1.0"
          assert_equal pool_size, gene_pool.connections.size
          assert_equal pool_size, gene_pool.checked_out.size
          # Let the threads complete so we can do it again
          sleep 2
          assert_equal pool_size, gene_pool.connections.size
          assert_equal 0,         gene_pool.checked_out.size
        end
      end
    end
  end
end
