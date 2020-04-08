# frozen-string-literal: true
#
# The index_caching extension adds a few methods to Sequel::Database
# that make it easy to dump information about database indexes to a file,
# and load it from that file.  Loading index information from a
# dumped file is faster than parsing it from the database, so this
# can save bootup time for applications with large numbers of index.
#
# Basic usage in application code:
#
#   DB = Sequel.connect('...')
#   DB.extension :index_caching
#   DB.load_index_cache('/path/to/index_cache.dump')
#
#   # load model files
#
# Then, whenever database indicies are modified, write a new cached
# file.  You can do that with <tt>bin/sequel</tt>'s -X option:
#
#   bin/sequel -X /path/to/index_cache.dump postgres://...
#
# Alternatively, if you don't want to dump the index information for
# all tables, and you don't worry about race conditions, you can
# choose to use the following in your application code:
#
#   DB = Sequel.connect('...')
#   DB.extension :index_caching
#   DB.load_index_cache?('/path/to/index_cache.dump')
#
#   # load model files
#
#   DB.dump_index_cache?('/path/to/index_cache.dump')
#
# With this method, you just have to delete the index dump file if
# the schema is modified, and the application will recreate it for you
# using just the tables that your models use.
#
# Note that it is up to the application to ensure that the dumped
# index cache reflects the current state of the database.  Sequel
# does no checking to ensure this, as checking would take time and the
# purpose of this code is to take a shortcut.
#
# The index cache is dumped in Marshal format, since it is the fastest
# and it handles all ruby objects used in the indexes hash.  Because of this,
# you should not attempt to load from an untrusted file.
#
# Related module: Sequel::IndexCaching

#
module Sequel
  module IndexCaching
    # Set index cache to the empty hash.
    def self.extended(db)
      db.instance_variable_set(:@indexes, {})
    end
    
    # Remove the index cache for the given schema name
    def remove_cached_schema(table)
      k = quote_schema_table(table)
      Sequel.synchronize{@indexes.delete(k)}
      super
    end
    
    # Dump the index cache to the filename given in Marshal format.
    def dump_index_cache(file)
      File.open(file, 'wb'){|f| f.write(Marshal.dump(@indexes))}
      nil
    end

    # Dump the index cache to the filename given unless the file
    # already exists.
    def dump_index_cache?(file)
      dump_index_cache(file) unless File.exist?(file)
    end

    # Replace the index cache with the data from the given file, which
    # should be in Marshal format.
    def load_index_cache(file)
      @indexes = Marshal.load(File.read(file))
      nil
    end

    # Replace the index cache with the data from the given file if the
    # file exists.
    def load_index_cache?(file)
      load_index_cache(file) if File.exist?(file)
    end

    # If no options are provided and there is cached index information for
    # the table, return the cached information instead of querying the
    # database.
    def indexes(table, opts=OPTS)
      return super unless opts.empty?

      quoted_name = literal(table)
      if v = Sequel.synchronize{@indexes[quoted_name]}
        return v
      end

      result = super
      Sequel.synchronize{@indexes[quoted_name] = result}
      result
    end
  end

  Database.register_extension(:index_caching, IndexCaching)
end
