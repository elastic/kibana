# frozen-string-literal: true

# A connection pool allowing multi-threaded access to a pool of connections.
# This is the default connection pool used by Sequel.
class Sequel::ThreadedConnectionPool < Sequel::ConnectionPool
  USE_WAITER = true
  Sequel::Deprecation.deprecate_constant(self, :USE_WAITER)

  # The maximum number of connections this pool will create (per shard/server
  # if sharding).
  attr_reader :max_size
  
  # An array of connections that are available for use by the pool.
  # The calling code should already have the mutex before calling this.
  attr_reader :available_connections
  
  # A hash with thread keys and connection values for currently allocated connections.
  # The calling code should already have the mutex before calling this.
  attr_reader :allocated

  # The following additional options are respected:
  # :max_connections :: The maximum number of connections the connection pool
  #                     will open (default 4)
  # :pool_timeout :: The amount of seconds to wait to acquire a connection
  #                  before raising a PoolTimeoutError (default 5)
  def initialize(db, opts = OPTS)
    super
    @max_size = Integer(opts[:max_connections] || 4)
    raise(Sequel::Error, ':max_connections must be positive') if @max_size < 1
    @mutex = Mutex.new  
    @connection_handling = opts[:connection_handling]
    @available_connections = []
    @allocated = {}
    @timeout = Float(opts[:pool_timeout] || 5)
    @waiter = ConditionVariable.new
  end
  
  # Yield all of the available connections, and the one currently allocated to
  # this thread.  This will not yield connections currently allocated to other
  # threads, as it is not safe to operate on them.  This holds the mutex while
  # it is yielding all of the available connections, which means that until
  # the method's block returns, the pool is locked.
  def all_connections
    hold do |c|
      sync do
        yield c
        @available_connections.each{|conn| yield conn}
      end
    end
  end
  
  # Removes all connections currently available, optionally
  # yielding each connection to the given block. This method has the effect of 
  # disconnecting from the database, assuming that no connections are currently
  # being used.  If you want to be able to disconnect connections that are
  # currently in use, use the ShardedThreadedConnectionPool, which can do that.
  # This connection pool does not, for performance reasons. To use the sharded pool,
  # pass the <tt>servers: {}</tt> option when connecting to the database.
  # 
  # Once a connection is requested using #hold, the connection pool
  # creates new connections to the database.
  def disconnect(opts=OPTS)
    conns = nil
    sync do
      conns = @available_connections.dup
      @available_connections.clear
      @waiter.signal
    end
    conns.each{|conn| disconnect_connection(conn)}
  end
  
  # Chooses the first available connection, or if none are
  # available, creates a new connection.  Passes the connection to the supplied
  # block:
  # 
  #   pool.hold {|conn| conn.execute('DROP TABLE posts')}
  # 
  # Pool#hold is re-entrant, meaning it can be called recursively in
  # the same thread without blocking.
  #
  # If no connection is immediately available and the pool is already using the maximum
  # number of connections, Pool#hold will block until a connection
  # is available or the timeout expires.  If the timeout expires before a
  # connection can be acquired, a Sequel::PoolTimeout is raised.
  def hold(server=nil)
    t = Thread.current
    if conn = owned_connection(t)
      return yield(conn)
    end
    begin
      conn = acquire(t)
      yield conn
    rescue Sequel::DatabaseDisconnectError, *@error_classes => e
      if disconnect_error?(e)
        oconn = conn
        conn = nil
        disconnect_connection(oconn) if oconn
        sync do 
          @allocated.delete(t)
          @waiter.signal
        end
      end
      raise
    ensure
      if conn
        sync{release(t)}
        if @connection_handling == :disconnect
          disconnect_connection(conn)
        end
      end
    end
  end

  def pool_type
    :threaded
  end
  
  # The total number of connections opened, either available or allocated.
  # The calling code should not have the mutex before calling this.
  def size
    @mutex.synchronize{_size}
  end
  
  private

  # The total number of connections opened, either available or allocated.
  # The calling code should already have the mutex before calling this.
  def _size
    @allocated.length + @available_connections.length
  end

  # Assigns a connection to the supplied thread, if one
  # is available. The calling code should NOT already have the mutex when
  # calling this.
  #
  # This should return a connection is one is available within the timeout,
  # or nil if a connection could not be acquired within the timeout.
  def acquire(thread)
    if conn = assign_connection(thread)
      return conn
    end

    timeout = @timeout
    timer = Sequel.start_timer

    sync do
      @waiter.wait(@mutex, timeout)
      if conn = next_available
        return(@allocated[thread] = conn)
      end
    end

    until conn = assign_connection(thread)
      elapsed = Sequel.elapsed_seconds_since(timer)
      raise_pool_timeout(elapsed) if elapsed > timeout

      # :nocov:
      # It's difficult to get to this point, it can only happen if there is a race condition
      # where a connection cannot be acquired even after the thread is signalled by the condition variable
      sync do
        @waiter.wait(@mutex, timeout - elapsed)
        if conn = next_available
          return(@allocated[thread] = conn)
        end
      end
      # :nocov:
    end

    conn
  end

  # Assign a connection to the thread, or return nil if one cannot be assigned.
  # The caller should NOT have the mutex before calling this.
  def assign_connection(thread)
    # Thread safe as instance variable is only assigned to local variable
    # and not operated on outside mutex.
    allocated = @allocated
    do_make_new = false
    to_disconnect = nil

    sync do
      if conn = next_available
        return(allocated[thread] = conn)
      end

      if (n = _size) >= (max = @max_size)
        allocated.keys.each do |t|
          unless t.alive?
            (to_disconnect ||= []) << allocated.delete(t)
          end
        end
        n = nil
      end

      if (n || _size) < max
        do_make_new = allocated[thread] = true
      end
    end

    if to_disconnect
      to_disconnect.each{|dconn| disconnect_connection(dconn)}
    end

    # Connect to the database outside of the connection pool mutex,
    # as that can take a long time and the connection pool mutex
    # shouldn't be locked while the connection takes place.
    if do_make_new
      begin
        conn = make_new(:default)
        sync{allocated[thread] = conn}
      ensure
        unless conn
          sync{allocated.delete(thread)}
        end
      end
    end

    conn
  end

  # Return a connection to the pool of available connections, returns the connection.
  # The calling code should already have the mutex before calling this.
  def checkin_connection(conn)
    @available_connections << conn
    conn
  end

  # Return the next available connection in the pool, or nil if there
  # is not currently an available connection.  The calling code should already
  # have the mutex before calling this.
  def next_available
    case @connection_handling
    when :stack
      @available_connections.pop
    else
      @available_connections.shift
    end
  end

  # Returns the connection owned by the supplied thread,
  # if any. The calling code should NOT already have the mutex before calling this.
  def owned_connection(thread)
    sync{@allocated[thread]}
  end
  
  # Create the maximum number of connections immediately.  The calling code should
  # NOT have the mutex before calling this.
  def preconnect(concurrent = false)
    enum = (max_size - _size).times

    conns = if concurrent
      enum.map{Thread.new{make_new(:default)}}.map(&:value)
    else
      enum.map{make_new(:default)}
    end

    sync{conns.each{|conn| checkin_connection(conn)}}
  end

  # Raise a PoolTimeout error showing the current timeout, the elapsed time, and the
  # database's name (if any).
  def raise_pool_timeout(elapsed)
    name = db.opts[:name]
    raise ::Sequel::PoolTimeout, "timeout: #{@timeout}, elapsed: #{elapsed}#{", database name: #{name}" if name}"
  end
  
  # Releases the connection assigned to the supplied thread back to the pool.
  # The calling code should already have the mutex before calling this.
  def release(thread)
    conn = @allocated.delete(thread)

    unless @connection_handling == :disconnect
      checkin_connection(conn)
    end

    @waiter.signal
    nil
  end

  # Yield to the block while inside the mutex. The calling code should NOT
  # already have the mutex before calling this.
  def sync
    @mutex.synchronize{yield}
  end
end
