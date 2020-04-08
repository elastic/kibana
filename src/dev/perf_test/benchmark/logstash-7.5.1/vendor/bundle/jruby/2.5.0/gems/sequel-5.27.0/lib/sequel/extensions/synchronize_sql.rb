# frozen-string-literal: true
#
# The synchronize_sql extension checks out a connection from the pool while
# generating an SQL string.  In cases where a connection is necessary
# in order to properly escape input, and multiple inputs in the query need
# escaping, this can result in fewer connection checkouts and better
# overall performance. In other cases this results in a performance decrease
# because a connection is checked out and either not used or kept checked out
# longer than necessary.
#
# The adapters where this extension may improve performance include amalgalite,
# mysql2, postgres, jdbc/postgresql, and tinytds. In these adapters, escaping
# strings requires a connection object for as proper escaping requires calling
# an escaping method on the connection object.
#
# This extension is most helpful when dealing with queries with lots of
# strings that need escaping (e.g. IN queries with long lists).  By default,
# a connection will be checked out and back in for each string to be escaped,
# which under high contention can cause the query to spend longer generating
# the SQL string than the actual pool timeout (since every individual checkout
# will take less than the timeout, but the sum of all of them can be greater).
#
# This extension is unnecessary and will decrease performance if the single
# threaded connection pool is used.

#
module Sequel
  class Dataset
    module SynchronizeSQL
      %w'insert select update delete'.each do |type|
        define_method(:"#{type}_sql") do |*args|
          if @opts[:sql].is_a?(String)
            return super(*args)
          end

          db.synchronize(@opts[:server]) do
            super(*args)
          end
        end
      end
    end

    register_extension(:synchronize_sql, SynchronizeSQL)
  end
end
