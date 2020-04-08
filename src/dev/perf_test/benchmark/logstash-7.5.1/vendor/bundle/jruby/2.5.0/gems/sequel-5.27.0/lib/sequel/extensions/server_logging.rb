# frozen-string-literal: true
#
# The server_logging extension makes the logger include the server/shard
# the query was issued on.  This makes it easier to use the logs when
# using sharding.
#
# Example:
#
#   DB.opts[:server]
#   # {:read_only=>{}, :b=>{}}
#   DB.extension :server_logging
#   DB[:a].all
#   # (0.000005s) (conn: 1014942550, server: read_only) SELECT * FROM a
#   DB[:a].server(:b).all
#   # (0.000004s) (conn: 997304100, server: b) SELECT * FROM a
#   DB[:a].insert
#   # (0.000004s) (conn: 1014374750, server: default) INSERT INTO a DEFAULT VALUES
#
# In order for the server/shard to be correct for all connections, you need to
# use this before connections to the database are made, or you need to call
# <tt>Database#disconnect</tt> after loading this extension.
#
# Related module: Sequel::ServerLogging

#
module Sequel
  module ServerLogging
    # Initialize the hash mapping connections to shards, and turn on logging
    # of connection info unless it has specifically been turned off.
    def self.extended(db)
      db.instance_exec do
        @server_connection_map ||= {}
        self.log_connection_info = true if log_connection_info.nil?
      end
    end

    # When setting up a new connection, associate the connection with the
    # shard.
    def connect(server)
      conn = super
      Sequel.synchronize{@server_connection_map[conn] = server}
      conn
    end

    # When disconnecting a connection, remove the related connection from the mapping.
    def disconnect_connection(conn)
      super
    ensure
      Sequel.synchronize{@server_connection_map.delete(conn)}
    end

    private

    # Include the server with the connection's id.
    def connection_info(conn)
      "(conn: #{conn.__id__}, server: #{Sequel.synchronize{@server_connection_map[conn]}}) "
    end
  end

  Database.register_extension(:server_logging, ServerLogging)
end
