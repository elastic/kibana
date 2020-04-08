# frozen-string-literal: true

require_relative 'threaded'

# The slowest and most advanced connection, dealing with both multi-threaded
# access and configurations with multiple shards/servers.
#
# In addition, this pool subclass also handles scheduling in-use connections
# to be removed from the pool when they are returned to it.
class Sequel::ShardedThreadedConnectionPool < Sequel::ThreadedConnectionPool
  # The following additional options are respected:
  # :servers :: A hash of servers to use.  Keys should be symbols.  If not
  #             present, will use a single :default server.
  # :servers_hash :: The base hash to use for the servers.  By default,
  #                  Sequel uses Hash.new(:default).  You can use a hash with a default proc
  #                  that raises an error if you want to catch all cases where a nonexistent
  #                  server is used.
  def initialize(db, opts = OPTS)
    super
    @available_connections = {}
    @connections_to_remove = []
    @connections_to_disconnect = []
    @servers = opts.fetch(:servers_hash, Hash.new(:default))
    remove_instance_variable(:@waiter)
    @waiters = {}

    add_servers([:default])
    add_servers(opts[:servers].keys) if opts[:servers]
  end
  
  # Adds new servers to the connection pool.  Allows for dynamic expansion of the potential replicas/shards
  # at runtime. +servers+ argument should be an array of symbols. 
  def add_servers(servers)
    sync do
      servers.each do |server|
        unless @servers.has_key?(server)
          @servers[server] = server
          @available_connections[server] = []
          @allocated[server] = {}
          @waiters[server] = ConditionVariable.new
        end
      end
    end
  end
  
  # A hash of connections currently being used for the given server, key is the
  # Thread, value is the connection.  Nonexistent servers will return nil.  Treat
  # this as read only, do not modify the resulting object.
  # The calling code should already have the mutex before calling this.
  def allocated(server=:default)
    @allocated[server]
  end
  
  # Yield all of the available connections, and the ones currently allocated to
  # this thread.  This will not yield connections currently allocated to other
  # threads, as it is not safe to operate on them.  This holds the mutex while
  # it is yielding all of the connections, which means that until
  # the method's block returns, the pool is locked.
  def all_connections
    t = Thread.current
    sync do
      @allocated.values.each do |threads|
        threads.each do |thread, conn|
          yield conn if t == thread
        end
      end
      @available_connections.values.each{|v| v.each{|c| yield c}}
    end
  end
  
  # An array of connections opened but not currently used, for the given
  # server. Nonexistent servers will return nil. Treat this as read only, do
  # not modify the resulting object.
  # The calling code should already have the mutex before calling this.
  def available_connections(server=:default)
    @available_connections[server]
  end
  
  # The total number of connections opened for the given server.
  # Nonexistent servers will return the created count of the default server.
  # The calling code should NOT have the mutex before calling this.
  def size(server=:default)
    @mutex.synchronize{_size(server)}
  end
  
  # Removes all connections currently available on all servers, optionally
  # yielding each connection to the given block. This method has the effect of 
  # disconnecting from the database, assuming that no connections are currently
  # being used.  If connections are being used, they are scheduled to be
  # disconnected as soon as they are returned to the pool.
  # 
  # Once a connection is requested using #hold, the connection pool
  # creates new connections to the database. Options:
  # :server :: Should be a symbol specifing the server to disconnect from,
  #            or an array of symbols to specify multiple servers.
  def disconnect(opts=OPTS)
    (opts[:server] ? Array(opts[:server]) : sync{@servers.keys}).each do |s|
      if conns = sync{disconnect_server_connections(s)}
        disconnect_connections(conns)
      end
    end
  end
  
  def freeze
    @servers.freeze
    super
  end
  
  # Chooses the first available connection to the given server, or if none are
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
  def hold(server=:default)
    server = pick_server(server)
    t = Thread.current
    if conn = owned_connection(t, server)
      return yield(conn)
    end
    begin
      conn = acquire(t, server)
      yield conn
    rescue Sequel::DatabaseDisconnectError, *@error_classes => e
      sync{@connections_to_remove << conn} if conn && disconnect_error?(e)
      raise
    ensure
      sync{release(t, conn, server)} if conn
      while dconn = sync{@connections_to_disconnect.shift}
        disconnect_connection(dconn)
      end
    end
  end

  # Remove servers from the connection pool. Similar to disconnecting from all given servers,
  # except that after it is used, future requests for the server will use the
  # :default server instead.
  def remove_servers(servers)
    conns = nil
    sync do
      raise(Sequel::Error, "cannot remove default server") if servers.include?(:default)
      servers.each do |server|
        if @servers.include?(server)
          conns = disconnect_server_connections(server)
          @waiters.delete(server)
          @available_connections.delete(server)
          @allocated.delete(server)
          @servers.delete(server)
        end
      end
    end

    if conns
      disconnect_connections(conns)
    end
  end

  # Return an array of symbols for servers in the connection pool.
  def servers
    sync{@servers.keys}
  end

  def pool_type
    :sharded_threaded
  end
  
  private

  # The total number of connections opened for the given server.
  # The calling code should already have the mutex before calling this.
  def _size(server)
    server = @servers[server]
    @allocated[server].length + @available_connections[server].length
  end
  
  # Assigns a connection to the supplied thread, if one
  # is available. The calling code should NOT already have the mutex when
  # calling this.
  #
  # This should return a connection is one is available within the timeout,
  # or nil if a connection could not be acquired within the timeout.
  def acquire(thread, server)
    if conn = assign_connection(thread, server)
      return conn
    end

    timeout = @timeout
    timer = Sequel.start_timer

    sync do
      @waiters[server].wait(@mutex, timeout)
      if conn = next_available(server)
        return(allocated(server)[thread] = conn)
      end
    end

    until conn = assign_connection(thread, server)
      elapsed = Sequel.elapsed_seconds_since(timer)
      raise_pool_timeout(elapsed, server) if elapsed > timeout

      # :nocov:
      # It's difficult to get to this point, it can only happen if there is a race condition
      # where a connection cannot be acquired even after the thread is signalled by the condition variable
      sync do
        @waiters[server].wait(@mutex, timeout - elapsed)
        if conn = next_available(server)
          return(allocated(server)[thread] = conn)
        end
      end
      # :nocov:
    end

    conn
  end

  # Assign a connection to the thread, or return nil if one cannot be assigned.
  # The caller should NOT have the mutex before calling this.
  def assign_connection(thread, server)
    alloc = nil

    do_make_new = false
    sync do
      alloc = allocated(server)
      if conn = next_available(server)
        alloc[thread] = conn
        return conn
      end

      if (n = _size(server)) >= (max = @max_size)
        alloc.to_a.each do |t,c|
          unless t.alive?
            remove(t, c, server)
          end
        end
        n = nil
      end

      if (n || _size(server)) < max
        do_make_new = alloc[thread] = true
      end
    end

    # Connect to the database outside of the connection pool mutex,
    # as that can take a long time and the connection pool mutex
    # shouldn't be locked while the connection takes place.
    if do_make_new
      begin
        conn = make_new(server)
        sync{alloc[thread] = conn}
      ensure
        unless conn
          sync{alloc.delete(thread)}
        end
      end
    end

    conn
  end

  # Return a connection to the pool of available connections for the server,
  # returns the connection. The calling code should already have the mutex
  # before calling this.
  def checkin_connection(server, conn)
    available_connections(server) << conn
    @waiters[server].signal
    conn
  end

  # Clear the array of available connections for the server, returning an array
  # of previous available connections that should be disconnected (or nil if none should be).
  # Mark any allocated connections to be removed when they are checked back in. The calling
  # code should already have the mutex before calling this.
  def disconnect_server_connections(server)
    @connections_to_remove.concat(allocated(server).values)

    if dis_conns = available_connections(server)
      conns = dis_conns.dup
      dis_conns.clear
      @waiters[server].signal
    end
    conns
  end

  # Disconnect all available connections immediately, and schedule currently allocated connections for disconnection
  # as soon as they are returned to the pool. The calling code should NOT
  # have the mutex before calling this.
  def disconnect_connections(conns)
    conns.each{|conn| disconnect_connection(conn)}
  end

  # Return the next available connection in the pool for the given server, or nil
  # if there is not currently an available connection for the server.
  # The calling code should already have the mutex before calling this.
  def next_available(server)
    case @connection_handling
    when :stack
      available_connections(server).pop
    else
      available_connections(server).shift
    end
  end
  
  # Returns the connection owned by the supplied thread for the given server,
  # if any. The calling code should NOT already have the mutex before calling this.
  def owned_connection(thread, server)
    sync{@allocated[server][thread]}
  end

  # If the server given is in the hash, return it, otherwise, return the default server.
  def pick_server(server)
    sync{@servers[server]}
  end
  
  # Create the maximum number of connections immediately.  The calling code should
  # NOT have the mutex before calling this.
  def preconnect(concurrent = false)
    conn_servers = @servers.keys.map!{|s| Array.new(max_size - _size(s), s)}.flatten!

    if concurrent
      conn_servers.map!{|s| Thread.new{[s, make_new(s)]}}.map!(&:value)
    else
      conn_servers.map!{|s| [s, make_new(s)]}
    end

    sync{conn_servers.each{|s, conn| checkin_connection(s, conn)}}
  end

  # Raise a PoolTimeout error showing the current timeout, the elapsed time, the server
  # the connection attempt was made to, and the database's name (if any).
  def raise_pool_timeout(elapsed, server)
    name = db.opts[:name]
    raise ::Sequel::PoolTimeout, "timeout: #{@timeout}, elapsed: #{elapsed}, server: #{server}#{", database name: #{name}" if name}"
  end
  
  # Releases the connection assigned to the supplied thread and server. If the
  # server or connection given is scheduled for disconnection, remove the
  # connection instead of releasing it back to the pool.
  # The calling code should already have the mutex before calling this.
  def release(thread, conn, server)
    if @connections_to_remove.include?(conn)
      remove(thread, conn, server)
    else
      conn = allocated(server).delete(thread)

      if @connection_handling == :disconnect
        @connections_to_disconnect << conn
      else
        checkin_connection(server, conn)
      end
    end

    if waiter = @waiters[server]
      waiter.signal
    end
  end

  # Removes the currently allocated connection from the connection pool. The
  # calling code should already have the mutex before calling this.
  def remove(thread, conn, server)
    @connections_to_remove.delete(conn)
    allocated(server).delete(thread) if @servers.include?(server)
    @connections_to_disconnect << conn
  end
end
