# frozen-string-literal: true
#
# The connection_validator extension modifies a database's
# connection pool to validate that connections checked out
# from the pool are still valid, before yielding them for
# use.  If it detects an invalid connection, it removes it
# from the pool and tries the next available connection,
# creating a new connection if no available connection is
# valid.  Example of use:
#
#   DB.extension(:connection_validator)
#
# As checking connections for validity involves issuing a
# query, which is potentially an expensive operation,
# the validation checks are only run if the connection has
# been idle for longer than a certain threshold. By default,
# that threshold is 3600 seconds (1 hour), but it can be
# modified by the user, set to -1 to always validate
# connections on checkout:
#
#   DB.pool.connection_validation_timeout = -1
#
# Note that if you set the timeout to validate connections
# on every checkout, you should probably manually control
# connection checkouts on a coarse basis, using
# Database#synchronize.  In a web application, the optimal
# place for that would be a rack middleware.  Validating
# connections on every checkout without setting up coarse
# connection checkouts will hurt performance, in some cases
# significantly.  Note that setting up coarse connection
# checkouts reduces the concurrency level acheivable.  For
# example, in a web application, using Database#synchronize
# in a rack middleware will limit the number of concurrent
# web requests to the number to connections in the database
# connection pool.
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
# Related module: Sequel::ConnectionValidator

#
module Sequel
  module ConnectionValidator
    class Retry < Error; end
    Sequel::Deprecation.deprecate_constant(self, :Retry)

    # The number of seconds that need to pass since
    # connection checkin before attempting to validate
    # the connection when checking it out from the pool.
    # Defaults to 3600 seconds (1 hour).
    attr_accessor :connection_validation_timeout

    # Initialize the data structures used by this extension.
    def self.extended(pool)
      pool.instance_exec do
        sync do
          @connection_timestamps ||= {}
          @connection_validation_timeout ||= 3600
        end
      end

      # Make sure the valid connection SQL query is precached,
      # otherwise it's possible it will happen at runtime. While
      # it should work correctly at runtime, it's better to avoid
      # the possibility of failure altogether.
      pool.db.send(:valid_connection_sql)
    end

    private

    # Record the time the connection was checked back into the pool.
    def checkin_connection(*)
      conn = super
      @connection_timestamps[conn] = Sequel.start_timer
      conn
    end

    # Clean up timestamps during disconnect.
    def disconnect_connection(conn)
      sync{@connection_timestamps.delete(conn)}
      super
    end

    # When acquiring a connection, if it has been
    # idle for longer than the connection validation timeout,
    # test the connection for validity.  If it is not valid,
    # disconnect the connection, and retry with a new connection.
    def acquire(*a)
      conn = nil

      1.times do
        if (conn = super) &&
           (timer = sync{@connection_timestamps.delete(conn)}) &&
           Sequel.elapsed_seconds_since(timer) > @connection_validation_timeout &&
           !db.valid_connection?(conn)

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

  Database.register_extension(:connection_validator){|db| db.pool.extend(ConnectionValidator)}
end

