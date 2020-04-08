# frozen-string-literal: true

# A ShardedSingleConnectionPool is a single threaded connection pool that
# works with multiple shards/servers.
class Sequel::ShardedSingleConnectionPool < Sequel::ConnectionPool
  # The single threaded pool takes the following options:
  #
  # :servers :: A hash of servers to use.  Keys should be symbols.  If not
  #             present, will use a single :default server.
  # :servers_hash :: The base hash to use for the servers.  By default,
  #                  Sequel uses Hash.new(:default).  You can use a hash with a default proc
  #                  that raises an error if you want to catch all cases where a nonexistent
  #                  server is used.
  def initialize(db, opts=OPTS)
    super
    @conns = {}
    @servers = opts.fetch(:servers_hash, Hash.new(:default))
    add_servers([:default])
    add_servers(opts[:servers].keys) if opts[:servers]
  end
  
  # Adds new servers to the connection pool. Primarily used in conjunction with primary/replica
  # or sharded configurations. Allows for dynamic expansion of the potential replicas/shards
  # at runtime. +servers+ argument should be an array of symbols. 
  def add_servers(servers)
    servers.each{|s| @servers[s] = s}
  end

  # Yield all of the currently established connections
  def all_connections
    @conns.values.each{|c| yield c}
  end
  
  # The connection for the given server.
  def conn(server=:default)
    @conns[@servers[server]]
  end
  
  # Disconnects from the database. Once a connection is requested using
  # #hold, the connection is reestablished. Options:
  # :server :: Should be a symbol specifing the server to disconnect from,
  #            or an array of symbols to specify multiple servers.
  def disconnect(opts=OPTS)
    (opts[:server] ? Array(opts[:server]) : servers).each{|s| disconnect_server(s)}
  end

  def freeze
    @servers.freeze
    super
  end
  
  # Yields the connection to the supplied block for the given server.
  # This method simulates the ConnectionPool#hold API.
  def hold(server=:default)
    begin
      server = pick_server(server)
      yield(@conns[server] ||= make_new(server))
    rescue Sequel::DatabaseDisconnectError, *@error_classes => e
      disconnect_server(server) if disconnect_error?(e)
      raise
    end
  end
  
  # The ShardedSingleConnectionPool always has a maximum size of 1.
  def max_size
    1
  end
  
  # Remove servers from the connection pool. Similar to disconnecting from all given servers,
  # except that after it is used, future requests for the server will use the
  # :default server instead.
  def remove_servers(servers)
    raise(Sequel::Error, "cannot remove default server") if servers.include?(:default)
    servers.each do |server|
      disconnect_server(server)
      @servers.delete(server)
    end
  end
  
  # Return an array of symbols for servers in the connection pool.
  def servers
    @servers.keys
  end
  
  # The number of different shards/servers this pool is connected to.
  def size
    @conns.length
  end
  
  def pool_type
    :sharded_single
  end
  
  private
  
  # Disconnect from the given server, if connected.
  def disconnect_server(server)
    if conn = @conns.delete(server)
      disconnect_connection(conn)
    end
  end

  # If the server given is in the hash, return it, otherwise, return the default server.
  def pick_server(server)
    @servers[server]
  end
  
  # Make sure there is a valid connection for each server.
  def preconnect(concurrent = nil)
    servers.each{|s| hold(s){}}
  end
end
