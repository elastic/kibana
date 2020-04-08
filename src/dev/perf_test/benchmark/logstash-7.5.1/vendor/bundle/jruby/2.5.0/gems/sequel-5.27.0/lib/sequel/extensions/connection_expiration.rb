# frozen-string-literal: true
#
# The connection_expiration extension modifies a database's
# connection pool to validate that connections checked out
# from the pool are not expired, before yielding them for
# use.  If it detects an expired connection, it removes it
# from the pool and tries the next available connection,
# creating a new connection if no available connection is
# unexpired.  Example of use:
#
#   DB.extension(:connection_expiration)
#
# The default connection timeout is 14400 seconds (4 hours).
# To override it:
#
#   DB.pool.connection_expiration_timeout = 3600 # 1 hour
#
# Note that this extension only affects the default threaded
# and the sharded threaded connection pool.  The single
# threaded and sharded single threaded connection pools are
# not affected.  As the only reason to use the single threaded
# pools is for speed, and this extension makes the connection
# pool slower, there's not much point in modifying this
# extension to work with the single threaded pools.  The
# threaded pools work fine even in single threaded code, so if
# you are currently using a single threaded pool and want to
# use this extension, switch to using a threaded pool.
#
# Related module: Sequel::ConnectionExpiration

#
module Sequel
  module ConnectionExpiration
    class Retry < Error; end
    Sequel::Deprecation.deprecate_constant(self, :Retry)

    # The number of seconds that need to pass since
    # connection creation before expiring a connection.
    # Defaults to 14400 seconds (4 hours).
    attr_accessor :connection_expiration_timeout

    # The maximum number of seconds that will be added as a random delay to the expiration timeout
    # Defaults to 0 seconds (no random delay).
    attr_accessor :connection_expiration_random_delay

    # Initialize the data structures used by this extension.
    def self.extended(pool)
      pool.instance_exec do
        sync do
          @connection_expiration_timestamps ||= {}
          @connection_expiration_timeout ||= 14400
          @connection_expiration_random_delay ||= 0
        end
      end
    end

    private

    # Clean up expiration timestamps during disconnect.
    def disconnect_connection(conn)
      sync{@connection_expiration_timestamps.delete(conn)}
      super
    end

    # Record the time the connection was created.
    def make_new(*)
      conn = super
      @connection_expiration_timestamps[conn] = [Sequel.start_timer, @connection_expiration_timeout + (rand * @connection_expiration_random_delay)].freeze
      conn
    end

    # When acquiring a connection, check if the connection is expired.
    # If it is expired, disconnect the connection, and retry with a new
    # connection.
    def acquire(*a)
      conn = nil
      1.times do
        if (conn = super) &&
           (cet = sync{@connection_expiration_timestamps[conn]}) &&
           Sequel.elapsed_seconds_since(cet[0]) > cet[1]

          if pool_type == :sharded_threaded
            sync{allocated(a.last).delete(Thread.current)}
          else
            sync{@allocated.delete(Thread.current)}
          end

          disconnect_connection(conn)
          redo
        end
      end

      conn
    end
  end

  Database.register_extension(:connection_expiration){|db| db.pool.extend(ConnectionExpiration)}
end

