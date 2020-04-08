# frozen-string-literal: true
#
# The arbitrary_servers extension allows you to connect to arbitrary
# servers/shards that were not defined when you created the database.
# To use it, you first load the extension into the Database object:
#
#   DB.extension :arbitrary_servers
#
# Then you can pass arbitrary connection options for the server/shard
# to use as a hash:
#
#   DB[:table].server(host: '...', database: '...').all
#
# Because Sequel can never be sure that the connection will be reused,
# arbitrary connections are disconnected as soon as the outermost block
# that uses them exits.  So this example uses the same connection:
#
#   DB.transaction(server: {host: '...', database: '...'}) do |c|
#     DB.transaction(server: {host: '...', database: '...'}) do |c2|
#       # c == c2
#     end
#   end
#
# But this example does not:
#
#   DB.transaction(server: {host: '...', database: '...'}) do |c|
#   end
#   DB.transaction(server: {host: '...', database: '...'}) do |c2|
#     # c != c2
#   end
#
# You can use this extension in conjunction with the server_block
# extension:
#
#   DB.with_server(host: '...', database: '...') do
#     DB.synchronize do
#       # All of these use the host/database given to with_server
#       DB[:table].insert(c: 1)
#       DB[:table].update(c: 2)
#       DB.tables
#       DB[:table].all
#     end
#   end
#
# Anyone using this extension in conjunction with the server_block
# extension may want to do the following to so that you don't need
# to call synchronize separately:
#
#   def DB.with_server(*a)
#     super(*a){synchronize{yield}}
#   end
#
# Note that this extension only works with the sharded threaded connection
# pool.  If you are using the sharded single connection pool, you need
# to switch to the sharded threaded connection pool before using this
# extension.
#
# Related module: Sequel::ArbitraryServers

#
module Sequel
  module ArbitraryServers
    private

    # If server is a hash, create a new connection for
    # it, and cache it first by thread and then server.
    def acquire(thread, server)
      if server.is_a?(Hash)
        sync{@allocated[thread] ||= {}}[server] = make_new(server)
      else
        super
      end
    end
    
    # If server is a hash, the entry for it probably doesn't
    # exist in the @allocated hash, so check for existence to
    # avoid calling nil.[]
    def owned_connection(thread, server)
      if server.is_a?(Hash)
        if a = sync{@allocated[thread]}
          a[server]
        end
      else
        super
      end
    end

    # If server is a hash, return it directly.
    def pick_server(server)
      if server.is_a?(Hash)
        server
      else
        super
      end
    end

    # If server is a hash, delete the thread from the allocated
    # connections for that server.  Additionally, if this was the last thread
    # using that server, delete the server from the @allocated hash.
    def release(thread, conn, server)
      if server.is_a?(Hash)
        a = @allocated[thread]
        a.delete(server)
        @allocated.delete(thread) if a.empty?
        disconnect_connection(conn)
      else  
        super
      end
    end
  end

  Database.register_extension(:arbitrary_servers){|db| db.pool.extend(ArbitraryServers)}
end

