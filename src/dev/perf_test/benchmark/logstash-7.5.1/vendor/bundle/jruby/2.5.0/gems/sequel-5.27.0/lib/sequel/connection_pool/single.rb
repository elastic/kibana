# frozen-string-literal: true

# This is the fastest connection pool, since it isn't a connection pool at all.
# It is just a wrapper around a single connection that uses the connection pool
# API.
class Sequel::SingleConnectionPool < Sequel::ConnectionPool  
  def initialize(db, opts=OPTS)
    super
    @conn = []
  end

  # Yield the connection if one has been made.
  def all_connections
    yield @conn.first if @conn
  end

  # Disconnect the connection from the database.
  def disconnect(opts=nil)
    return unless c = @conn.first
    disconnect_connection(c)
    @conn.clear
    nil
  end

  # Yield the connection to the block.
  def hold(server=nil)
    begin
      unless c = @conn.first
        @conn.replace([c = make_new(:default)])
      end
      yield c
    rescue Sequel::DatabaseDisconnectError, *@error_classes => e
      disconnect if disconnect_error?(e)
      raise
    end
  end

  # The SingleConnectionPool always has a maximum size of 1.
  def max_size
    1
  end
  
  def pool_type
    :single
  end
  
  # The SingleConnectionPool always has a size of 1 if connected
  # and 0 if not.
  def size
    @conn.empty? ? 0 : 1
  end

  private

  # Make sure there is a valid connection.
  def preconnect(concurrent = nil)
    hold{}
  end
end
