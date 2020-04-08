# frozen-string-literal: true

module Sequel
  class Database
    # ---------------------
    # :section: 8 - Methods related to database transactions
    # Database transactions make multiple queries atomic, so
    # that either all of the queries take effect or none of
    # them do.
    # ---------------------

    TRANSACTION_ISOLATION_LEVELS = {:uncommitted=>'READ UNCOMMITTED'.freeze,
      :committed=>'READ COMMITTED'.freeze,
      :repeatable=>'REPEATABLE READ'.freeze,
      :serializable=>'SERIALIZABLE'.freeze}.freeze
    
    # The default transaction isolation level for this database,
    # used for all future transactions.  For MSSQL, this should be set
    # to something if you ever plan to use the :isolation option to
    # Database#transaction, as on MSSQL if affects all future transactions
    # on the same connection.
    attr_accessor :transaction_isolation_level

    # If a transaction is not currently in process, yield to the block immediately.
    # Otherwise, add the block to the list of blocks to call after the currently
    # in progress transaction commits (and only if it commits).
    # Options:
    # :savepoint :: If currently inside a savepoint, only run this hook on transaction
    #               commit if all enclosing savepoints have been released.
    # :server :: The server/shard to use.
    def after_commit(opts=OPTS, &block)
      raise Error, "must provide block to after_commit" unless block
      synchronize(opts[:server]) do |conn|
        if h = _trans(conn)
          raise Error, "cannot call after_commit in a prepared transaction" if h[:prepare]
          if opts[:savepoint] && in_savepoint?(conn)
            add_savepoint_hook(conn, :after_commit, block)
          else
            add_transaction_hook(conn, :after_commit, block)
          end
        else
          yield
        end
      end
    end
    
    # If a transaction is not currently in progress, ignore the block.
    # Otherwise, add the block to the list of the blocks to call after the currently
    # in progress transaction rolls back (and only if it rolls back).
    # Options:
    # :savepoint :: If currently inside a savepoint, run this hook immediately when
    #               any enclosing savepoint is rolled back, which may be before the transaction
    #               commits or rollsback.
    # :server :: The server/shard to use.
    def after_rollback(opts=OPTS, &block)
      raise Error, "must provide block to after_rollback" unless block
      synchronize(opts[:server]) do |conn|
        if h = _trans(conn)
          raise Error, "cannot call after_rollback in a prepared transaction" if h[:prepare]
          if opts[:savepoint] && in_savepoint?(conn)
            add_savepoint_hook(conn, :after_rollback, block)
          else
            add_transaction_hook(conn, :after_rollback, block)
          end
        end
      end
    end

    # When exiting the transaction block through methods other than an exception
    # (e.g. normal exit, non-local return, or throw), set the current transaction
    # to rollback instead of committing.  This is designed for use in cases where
    # you want to preform a non-local return but also want to rollback instead of
    # committing.
    # Options:
    # :cancel :: Cancel the current rollback_on_exit setting, so exiting will commit instead
    #            of rolling back.
    # :savepoint :: Rollback only the current savepoint if inside a savepoint.
    #               Can also be an positive integer value to rollback that number of enclosing savepoints,
    #               up to and including the transaction itself.
    #               If the database does not support savepoints, this option is ignored and the entire
    #               transaction is affected.
    # :server :: The server/shard the transaction is being executed on.
    def rollback_on_exit(opts=OPTS)
      synchronize(opts[:server]) do |conn|
        raise Error, "Cannot call Sequel:: Database#rollback_on_exit! unless inside a transaction" unless h = _trans(conn)
        rollback = !opts[:cancel]

        if supports_savepoints?
          savepoints = h[:savepoints]

          if level = opts[:savepoint]
            level = 1 if level == true
            raise Error, "invalid :savepoint option to Database#rollback_on_exit: #{level.inspect}" unless level.is_a?(Integer)
            raise Error, "cannot pass nonpositive integer (#{level.inspect}) as :savepoint option to Database#rollback_on_exit" if level < 1
            level.times do |i|
              break unless savepoint = savepoints[-1 - i]
              savepoint[:rollback_on_exit] = rollback
            end
          else
            savepoints[0][:rollback_on_exit] = rollback
          end
        else
          h[:rollback_on_exit] = rollback
        end
      end

      nil
    end

    # Return true if already in a transaction given the options,
    # false otherwise.  Respects the :server option for selecting
    # a shard.
    def in_transaction?(opts=OPTS)
      synchronize(opts[:server]){|conn| !!_trans(conn)}
    end

    # Returns a proc that you can call to check if the transaction
    # has been rolled back.  The proc will return nil if the
    # transaction is still in progress, true if the transaction was
    # rolled back, and false if it was committed.  Raises an
    # Error if called outside a transaction.  Respects the :server
    # option for selecting a shard.
    def rollback_checker(opts=OPTS)
      synchronize(opts[:server]) do |conn|
        raise Error, "not in a transaction" unless t = _trans(conn)
        t[:rollback_checker] ||= proc{Sequel.synchronize{t[:rolled_back]}}
      end
    end

    # Starts a database transaction.  When a database transaction is used,
    # either all statements are successful or none of the statements are
    # successful.  Note that MySQL MyISAM tables do not support transactions.
    #
    # The following general options are respected:
    #
    # :auto_savepoint :: Automatically use a savepoint for Database#transaction calls
    #                    inside this transaction block.
    # :isolation :: The transaction isolation level to use for this transaction,
    #               should be :uncommitted, :committed, :repeatable, or :serializable,
    #               used if given and the database/adapter supports customizable
    #               transaction isolation levels.
    # :num_retries :: The number of times to retry if the :retry_on option is used.
    #                 The default is 5 times.  Can be set to nil to retry indefinitely,
    #                 but that is not recommended.
    # :before_retry :: Proc to execute before rertrying if the :retry_on option is used.
    #                  Called with two arguments: the number of retry attempts (counting
    #                  the current one) and the error the last attempt failed with.
    # :prepare :: A string to use as the transaction identifier for a
    #             prepared transaction (two-phase commit), if the database/adapter
    #             supports prepared transactions.
    # :retry_on :: An exception class or array of exception classes for which to
    #              automatically retry the transaction.  Can only be set if not inside
    #              an existing transaction.
    #              Note that this should not be used unless the entire transaction
    #              block is idempotent, as otherwise it can cause non-idempotent
    #              behavior to execute multiple times.
    # :rollback :: Can the set to :reraise to reraise any Sequel::Rollback exceptions
    #              raised, or :always to always rollback even if no exceptions occur
    #              (useful for testing).
    # :server :: The server to use for the transaction. Set to :default, :read_only, or
    #            whatever symbol you used in the connect string when naming your servers.
    # :savepoint :: Whether to create a new savepoint for this transaction,
    #               only respected if the database/adapter supports savepoints.  By
    #               default Sequel will reuse an existing transaction, so if you want to
    #               use a savepoint you must use this option.  If the surrounding transaction
    #               uses :auto_savepoint, you can set this to false to not use a savepoint.
    #               If the value given for this option is :only, it will only create a
    #               savepoint if it is inside a transaction.
    #
    # PostgreSQL specific options:
    #
    # :deferrable :: (9.1+) If present, set to DEFERRABLE if true or NOT DEFERRABLE if false.
    # :read_only :: If present, set to READ ONLY if true or READ WRITE if false.
    # :synchronous :: if non-nil, set synchronous_commit
    #                 appropriately.  Valid values true, :on, false, :off, :local (9.1+),
    #                 and :remote_write (9.2+).
    def transaction(opts=OPTS, &block)
      opts = Hash[opts]
      if retry_on = opts[:retry_on]
        tot_retries = opts.fetch(:num_retries, 5)
        num_retries = 0 unless tot_retries.nil?
        begin
          opts[:retry_on] = nil
          opts[:retrying] = true
          transaction(opts, &block)
        rescue *retry_on => e
          if num_retries
            num_retries += 1
            if num_retries <= tot_retries
              opts[:before_retry].call(num_retries, e) if opts[:before_retry]
              retry
            end
          else
            retry
          end
          raise
        end
      else
        synchronize(opts[:server]) do |conn|
          if opts[:savepoint] == :only
            if supports_savepoints?
              if _trans(conn)
                opts[:savepoint] = true
              else
                return yield(conn)
              end
            else
              opts[:savepoint] = false
            end
          end

          if already_in_transaction?(conn, opts)
            if opts[:rollback] == :always && !opts.has_key?(:savepoint)
              if supports_savepoints? 
                opts[:savepoint] = true
              else
                raise Sequel::Error, "cannot set :rollback=>:always transaction option if already inside a transaction"
              end
            end

            if opts[:savepoint] != false && (stack = _trans(conn)[:savepoints]) && stack.last[:auto_savepoint]
              opts[:savepoint] = true
            end

            unless opts[:savepoint]
              if opts[:retrying]
                raise Sequel::Error, "cannot set :retry_on options if you are already inside a transaction"
              end
              return yield(conn)
            end
          end

          _transaction(conn, opts, &block)
        end
      end
    end
    
    private
    
    # Internal generic transaction method.  Any exception raised by the given
    # block will cause the transaction to be rolled back.  If the exception is
    # not a Sequel::Rollback, the error will be reraised. If no exception occurs
    # inside the block, the transaction is commited.
    def _transaction(conn, opts=OPTS)
      rollback = opts[:rollback]
      begin
        add_transaction(conn, opts)
        begin_transaction(conn, opts)
        if rollback == :always
          begin
            ret = yield(conn)
          rescue Exception => e1
            raise e1
          ensure
            raise ::Sequel::Rollback unless e1
          end
        else
          yield(conn)
        end
      rescue Exception => e
        begin
          rollback_transaction(conn, opts)
        rescue Exception => e3
        end
        transaction_error(e, :conn=>conn, :rollback=>rollback)
        raise e3 if e3
        ret
      ensure
        begin
          committed = commit_or_rollback_transaction(e, conn, opts)
        rescue Exception => e2
          begin
            raise_error(e2, :classes=>database_error_classes, :conn=>conn)
          rescue Sequel::DatabaseError => e4
            begin
              rollback_transaction(conn, opts)
            ensure
              raise e4
            end
          end
        ensure
          remove_transaction(conn, committed)
        end
      end
    end

    # Synchronize access to the current transactions, returning the hash
    # of options for the current transaction (if any)
    def _trans(conn)
      Sequel.synchronize{@transactions[conn]}
    end

    # Add the current thread to the list of active transactions
    def add_transaction(conn, opts)
      hash = transaction_options(conn, opts)

      if supports_savepoints?
        if t = _trans(conn)
          t[:savepoints].push({:auto_savepoint=>opts[:auto_savepoint]})
          return
        else
          hash[:savepoints] = [{:auto_savepoint=>opts[:auto_savepoint]}]
          if (prep = opts[:prepare]) && supports_prepared_transactions?
            hash[:prepare] = prep
          end
        end
      elsif (prep = opts[:prepare]) && supports_prepared_transactions?
        hash[:prepare] = prep
      end

      Sequel.synchronize{@transactions[conn] = hash}
    end    

    # Set the given callable as a hook to be called. Type should be either
    # :after_commit or :after_rollback.
    def add_savepoint_hook(conn, type, block)
      savepoint = _trans(conn)[:savepoints].last
      (savepoint[type] ||= []) << block
    end

    # Set the given callable as a hook to be called. Type should be either
    # :after_commit or :after_rollback.
    def add_transaction_hook(conn, type, block)
      hooks = _trans(conn)[type] ||= []
      hooks << block
    end

    # Whether the given connection is already inside a transaction
    def already_in_transaction?(conn, opts)
      _trans(conn) && (!supports_savepoints? || !opts[:savepoint])
    end

    # Derive the transaction hash from the options passed to the transaction.
    # Meant to be overridden.
    def transaction_options(conn, opts)
      {}
    end

    # Issue query to begin a new savepoint.
    def begin_savepoint(conn, opts)
      log_connection_execute(conn, begin_savepoint_sql(savepoint_level(conn)-1))
    end

    # SQL to start a new savepoint
    def begin_savepoint_sql(depth)
      "SAVEPOINT autopoint_#{depth}"
    end

    # Start a new database transaction on the given connection
    def begin_new_transaction(conn, opts)
      log_connection_execute(conn, begin_transaction_sql)
      set_transaction_isolation(conn, opts)
    end

    # Start a new database transaction or a new savepoint on the given connection.
    def begin_transaction(conn, opts=OPTS)
      if in_savepoint?(conn)
        begin_savepoint(conn, opts)
      else
        begin_new_transaction(conn, opts)
      end
    end
    
    # SQL to BEGIN a transaction.
    def begin_transaction_sql
      'BEGIN'
    end

    # Whether to commit the current transaction. Thread.current.status is
    # checked because Thread#kill skips rescue blocks (so exception would be
    # nil), but the transaction should still be rolled back. On Ruby 1.9 (but
    # not 2.0+), the thread status will still be "run", so Thread#kill
    # will erroneously commit the transaction, and there isn't a workaround.
    def commit_or_rollback_transaction(exception, conn, opts)
      if exception
        false
      else
        if rollback_on_transaction_exit?(conn, opts)
          rollback_transaction(conn, opts)
          false
        else
          commit_transaction(conn, opts)
          true
        end
      end
    end
    
    # SQL to commit a savepoint
    def commit_savepoint_sql(depth)
      "RELEASE SAVEPOINT autopoint_#{depth}"
    end

    # Commit the active transaction on the connection
    def commit_transaction(conn, opts=OPTS)
      if supports_savepoints?
        depth = savepoint_level(conn)
        log_connection_execute(conn, depth > 1 ? commit_savepoint_sql(depth-1) : commit_transaction_sql)
      else
        log_connection_execute(conn, commit_transaction_sql)
      end
    end

    # SQL to COMMIT a transaction.
    def commit_transaction_sql
      'COMMIT'
    end
    
    # Method called on the connection object to execute SQL on the database,
    # used by the transaction code.
    def connection_execute_method
      :execute
    end

    # Which transaction errors to translate, blank by default.
    def database_error_classes
      []
    end

    # Whether the connection is currently inside a savepoint.
    def in_savepoint?(conn)
      supports_savepoints? && savepoint_level(conn) > 1
    end

    # Retrieve the savepoint hooks that should be run for the given
    # connection and commit status.
    def savepoint_hooks(conn, committed)
      if in_savepoint?(conn)
        _trans(conn)[:savepoints].last[committed ? :after_commit : :after_rollback]
      end
    end

    # Retrieve the transaction hooks that should be run for the given
    # connection and commit status.
    def transaction_hooks(conn, committed)
      unless in_savepoint?(conn)
        _trans(conn)[committed ? :after_commit : :after_rollback]
      end
    end

    # Remove the current thread from the list of active transactions
    def remove_transaction(conn, committed)
      if in_savepoint?(conn)
        savepoint_callbacks = savepoint_hooks(conn, committed)
        if committed
          savepoint_rollback_callbacks = savepoint_hooks(conn, false)
        end
      else
        callbacks = transaction_hooks(conn, committed)
      end

      if transaction_finished?(conn)
        h = _trans(conn)
        rolled_back = !committed
        Sequel.synchronize{h[:rolled_back] = rolled_back}
        Sequel.synchronize{@transactions.delete(conn)}
        callbacks.each(&:call) if callbacks
      elsif savepoint_callbacks || savepoint_rollback_callbacks
        if committed
          meth = in_savepoint?(conn) ? :add_savepoint_hook : :add_transaction_hook 

          if savepoint_callbacks
            savepoint_callbacks.each do |block|
              send(meth, conn, :after_commit, block)
            end
          end
          
          if savepoint_rollback_callbacks
            savepoint_rollback_callbacks.each do |block|
              send(meth, conn, :after_rollback, block)
            end
          end
        else
          savepoint_callbacks.each(&:call)
        end
      end
    end

    # SQL to rollback to a savepoint
    def rollback_savepoint_sql(depth)
      "ROLLBACK TO SAVEPOINT autopoint_#{depth}"
    end

    # Whether to rollback the transaction when exiting the transaction.
    def rollback_on_transaction_exit?(conn, opts)
      return true if Thread.current.status == 'aborting'
      h = _trans(conn)
      if supports_savepoints?
        h[:savepoints].last[:rollback_on_exit]
      else
        h[:rollback_on_exit]
      end
    end

    # Rollback the active transaction on the connection
    def rollback_transaction(conn, opts=OPTS)
      if supports_savepoints?
        depth = savepoint_level(conn)
        log_connection_execute(conn, depth > 1 ? rollback_savepoint_sql(depth-1) : rollback_transaction_sql)
      else
        log_connection_execute(conn, rollback_transaction_sql)
      end
    end

    # SQL to ROLLBACK a transaction.
    def rollback_transaction_sql
      'ROLLBACK'
    end
    
    # Set the transaction isolation level on the given connection
    def set_transaction_isolation(conn, opts)
      if supports_transaction_isolation_levels? and level = opts.fetch(:isolation, transaction_isolation_level)
        log_connection_execute(conn, set_transaction_isolation_sql(level))
      end
    end

    # SQL to set the transaction isolation level
    def set_transaction_isolation_sql(level)
      "SET TRANSACTION ISOLATION LEVEL #{TRANSACTION_ISOLATION_LEVELS[level]}"
    end

    # Current savepoint level.
    def savepoint_level(conn)
      _trans(conn)[:savepoints].length
    end

    # Raise a database error unless the exception is an Rollback.
    def transaction_error(e, opts=OPTS)
      if e.is_a?(Rollback)
        raise e if opts[:rollback] == :reraise
      else
        raise_error(e, opts.merge(:classes=>database_error_classes))
      end
    end

    # Finish a subtransaction.  If savepoints are supported, pops the current
    # tansaction off the savepoint stack.
    def transaction_finished?(conn)
      if supports_savepoints?
        stack = _trans(conn)[:savepoints]
        stack.pop
        stack.empty?
      else
        true
      end
    end
  end
end
