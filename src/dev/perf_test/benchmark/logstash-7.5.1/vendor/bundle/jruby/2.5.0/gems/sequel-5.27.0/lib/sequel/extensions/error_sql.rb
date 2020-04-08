# frozen-string-literal: true
#
# The error_sql extension adds a DatabaseError#sql method
# that you can use to get the sql that caused the error
# to be raised.
#
#   begin
#     DB.run "Invalid SQL"
#   rescue => e
#     puts e.sql # "Invalid SQL"
#   end
#
# On some databases, the error message contains part or all
# of the SQL used, but on other databases, none of the SQL
# used is displayed in the error message, so it can be
# difficult to track down what is causing the error without
# using a logger.  This extension should hopefully make
# debugging easier on databases that have bad error
# messages.
#
# This extension may not work correctly in the following cases:
#
# * log_connection_yield is not used when executing the query.
# * The underlying exception is frozen or reused.
# * The underlying exception doesn't correctly record instance
#   variables set on it (seems to happen on JRuby when underlying
#   exception objects are Java exceptions).
#
# To load the extension into the database:
#
#   DB.extension :error_sql
#
# Related module: Sequel::ErrorSQL

#
module Sequel
  class DatabaseError
    # Get the SQL code that caused this error to be raised.
    def sql
      # We store the error SQL in the wrapped exception instead of the
      # current exception, since when the error SQL is originally associated
      # with the wrapped exception, the current exception doesn't exist.  It's
      # possible to copy the error SQL into the current exception, but there
      # doesn't seem to be a reason to do that.
      wrapped_exception.instance_variable_get(:@sequel_error_sql) if wrapped_exception
    end
  end

  module ErrorSQL
    # Store the SQL related to the exception with the exception, so it
    # is available for DatabaseError#sql later.
    def log_exception(exception, message)
      exception.instance_variable_set(:@sequel_error_sql, message)
      super
    end

    # If there are no loggers for this database and an exception is raised
    # store the SQL related to the exception with the exception, so it
    # is available for DatabaseError#sql later.
    def log_connection_yield(sql, conn, args=nil)
      if @loggers.empty?
        begin
          yield
        rescue => e
          sql = "#{connection_info(conn) if conn && log_connection_info}#{sql}#{"; #{args.inspect}" if args}"
          e.instance_variable_set(:@sequel_error_sql, sql)
          raise
        end
      else
        super
      end
    end
  end

  Database.register_extension(:error_sql, ErrorSQL)
end
