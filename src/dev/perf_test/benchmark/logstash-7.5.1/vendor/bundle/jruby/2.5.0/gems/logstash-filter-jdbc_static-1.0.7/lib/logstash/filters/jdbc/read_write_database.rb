# encoding: utf-8
require_relative "basic_database"

module LogStash module Filters module Jdbc
  class ReadWriteDatabase < BasicDatabase
    def repopulate_all(loaders)
      case loaders.size
        when 1
          fill_local_table(loaders.first)
        when 2
          fill_local_table(loaders.first)
          fill_local_table(loaders.last)
        else
          loaders.each do |loader|
            fill_local_table(loader)
          end
      end
    end

    alias populate_all repopulate_all

    def fetch(statement, parameters)
      @rwlock.readLock().lock()
      # any exceptions should bubble up because we need to set failure tags etc.
      @db[statement, parameters].all
    ensure
      @rwlock.readLock().unlock()
    end

    def build_db_object(db_object)
      begin
        @rwlock.writeLock().lock()
        db_object.build(@db)
        if db_object.index_columns.empty?
          logger.warn("local_db_object '#{db_object.name}': `index_columns` is optional but on larger datasets consider adding an index on the lookup column, it will improve performance")
        end
      rescue *CONNECTION_ERRORS => err
        # we do not raise an error when there is a connection error, we hope that the connection works next time
        logger.error("Connection error when initialising lookup db", :db_object => db_object.inspect, :exception => err.message, :backtrace => err.backtrace.take(8))
      rescue ::Sequel::Error => err
        msg = "Exception when initialising lookup db for db object: #{db_object}"
        logger.error(msg, :exception => err.message, :backtrace => err.backtrace.take(8))
        raise wrap_error(LoaderJdbcException, err, msg)
      ensure
        @rwlock.writeLock().unlock()
      end
    end

    def post_create(connection_string, driver_class, driver_library, user, password)
      mutated_connection_string = connection_string.sub("____", unique_db_name)
      verify_connection(mutated_connection_string, driver_class, driver_library, user, password)
      connect("Connection error when connecting to lookup db")
    end

    private

    def fill_local_table(loader)
      begin
        @rwlock.writeLock().lock()
        start = Time.now.to_f
        records = loader.fetch
        records_size = records.size
        return if records_size.zero?
        logger.info("loader #{loader.id}, fetched #{records_size} records in: #{(Time.now.to_f - start).round(3)} seconds")
        start = Time.now.to_f
        import_file = ::File.join(loader.staging_directory, loader.table.to_s)
        ::File.open(import_file, "w") do |fd|
          dataset = @db[loader.table]
          records.each do |hash|
            array = hash.values.map {|val| dataset.literal(val) }
            fd.puts(array.join(", "))
          end
          fd.fsync
        end
        logger.info("loader #{loader.id}, saved fetched records to import file in: #{(Time.now.to_f - start).round(3)} seconds")
        start = Time.now.to_f
        import_cmd = "CALL SYSCS_UTIL.SYSCS_IMPORT_TABLE (null,'#{loader.table.upcase}','#{import_file}',null,'''',null,1)"
        @db.execute_ddl(import_cmd)
        FileUtils.rm_f(import_file)
        logger.info("loader #{loader.id}, imported all fetched records in: #{(Time.now.to_f - start).round(3)} seconds")
      rescue *CONNECTION_ERRORS => err
        # we do not raise an error when there is a connection error, we hope that the connection works next time
        logger.error("Connection error when filling lookup db from loader #{loader.id}, query results", :exception => err.message, :backtrace => err.backtrace.take(8))
      rescue => err
        # In theory all exceptions in Sequel should be wrapped in Sequel::Error
        # There are cases where exceptions occur in unprotected ensure sections
        msg = "Exception when filling lookup db from loader #{loader.id}, query results, original exception: #{err.class}, original message: #{err.message}"
        logger.error(msg, :backtrace => err.backtrace.take(16))
        raise wrap_error(LoaderJdbcException, err, msg)
      ensure
        @rwlock.writeLock().unlock()
      end
    end

    def post_initialize()
      super
      # get a fair reentrant read write lock
      @rwlock = java.util.concurrent.locks.ReentrantReadWriteLock.new(true)
    end
  end
end end end
