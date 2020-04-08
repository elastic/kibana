# frozen-string-literal: true

module Sequel
  module JDBC
    module Transactions
      def freeze
        supports_savepoints?
        super
      end

      # Check the JDBC DatabaseMetaData for savepoint support
      def supports_savepoints?
        return @supports_savepoints if defined?(@supports_savepoints)
        @supports_savepoints = synchronize{|c| c.getMetaData.supports_savepoints}
      end

      # Check the JDBC DatabaseMetaData for support for serializable isolation,
      # since that's the value most people will use.
      def supports_transaction_isolation_levels?
        synchronize{|conn| conn.getMetaData.supportsTransactionIsolationLevel(JavaSQL::Connection::TRANSACTION_SERIALIZABLE)}
      end

      private

      JDBC_TRANSACTION_ISOLATION_LEVELS = {:uncommitted=>JavaSQL::Connection::TRANSACTION_READ_UNCOMMITTED,
        :committed=>JavaSQL::Connection::TRANSACTION_READ_COMMITTED,
        :repeatable=>JavaSQL::Connection::TRANSACTION_REPEATABLE_READ,
        :serializable=>JavaSQL::Connection::TRANSACTION_SERIALIZABLE}.freeze

      # Set the transaction isolation level on the given connection using
      # the JDBC API.
      def set_transaction_isolation(conn, opts)
        level = opts.fetch(:isolation, transaction_isolation_level)
        if (jdbc_level = JDBC_TRANSACTION_ISOLATION_LEVELS[level]) &&
            conn.getMetaData.supportsTransactionIsolationLevel(jdbc_level)
          _trans(conn)[:original_jdbc_isolation_level] = conn.getTransactionIsolation
          log_connection_yield("Transaction.isolation_level = #{level}", conn){conn.setTransactionIsolation(jdbc_level)}
        end
      end

      # Most JDBC drivers that support savepoints support releasing them.
      def supports_releasing_savepoints?
        true
      end

      # JDBC savepoint object for the current savepoint for the connection.
      def savepoint_obj(conn)
        _trans(conn)[:savepoints][-1][:obj]
      end

      # Use JDBC connection's setAutoCommit to false to start transactions
      def begin_transaction(conn, opts=OPTS)
        if in_savepoint?(conn)
          _trans(conn)[:savepoints][-1][:obj] = log_connection_yield('Transaction.savepoint', conn){conn.set_savepoint}
        else
          log_connection_yield('Transaction.begin', conn){conn.setAutoCommit(false)}
          set_transaction_isolation(conn, opts)
        end
      end
      
      # Use JDBC connection's commit method to commit transactions
      def commit_transaction(conn, opts=OPTS)
        if in_savepoint?(conn)
          if supports_releasing_savepoints?
            log_connection_yield('Transaction.release_savepoint', conn){conn.release_savepoint(savepoint_obj(conn))}
          end
        else
          log_connection_yield('Transaction.commit', conn){conn.commit}
        end
      end
      
      # Use JDBC connection's setAutoCommit to true to enable non-transactional behavior
      def remove_transaction(conn, committed)
        if jdbc_level = _trans(conn)[:original_jdbc_isolation_level]
          log_connection_yield("Transaction.restore_isolation_level", conn){conn.setTransactionIsolation(jdbc_level)}
        end
        unless in_savepoint?(conn)
          conn.setAutoCommit(true)
        end
      ensure
        super
      end
      
      # Use JDBC connection's rollback method to rollback transactions
      def rollback_transaction(conn, opts=OPTS)
        if in_savepoint?(conn)
          log_connection_yield('Transaction.rollback_savepoint', conn){conn.rollback(savepoint_obj(conn))}
        else
          log_connection_yield('Transaction.rollback', conn){conn.rollback}
        end
      end
    end
  end
end

