# frozen-string-literal: true
#
# The schema_caching extension adds a few methods to Sequel::Database
# that make it easy to dump the parsed schema information to a file,
# and load it from that file.  Loading the schema information from a
# dumped file is faster than parsing it from the database, so this
# can save bootup time for applications with large numbers of models.
#
# Basic usage in application code:
#
#   DB = Sequel.connect('...')
#   DB.extension :schema_caching
#   DB.load_schema_cache('/path/to/schema.dump')
#
#   # load model files
#
# Then, whenever the database schema is modified, write a new cached
# file.  You can do that with <tt>bin/sequel</tt>'s -S option:
#
#   bin/sequel -S /path/to/schema.dump postgres://...
#
# Alternatively, if you don't want to dump the schema information for
# all tables, and you don't worry about race conditions, you can
# choose to use the following in your application code:
#
#   DB = Sequel.connect('...')
#   DB.extension :schema_caching
#   DB.load_schema_cache?('/path/to/schema.dump')
#
#   # load model files
#
#   DB.dump_schema_cache?('/path/to/schema.dump')
#
# With this method, you just have to delete the schema dump file if
# the schema is modified, and the application will recreate it for you
# using just the tables that your models use.
#
# Note that it is up to the application to ensure that the dumped
# cached schema reflects the current state of the database.  Sequel
# does no checking to ensure this, as checking would take time and the
# purpose of this code is to take a shortcut.
#
# The cached schema is dumped in Marshal format, since it is the fastest
# and it handles all ruby objects used in the schema hash.  Because of this,
# you should not attempt to load the schema from a untrusted file.
#
# Related module: Sequel::SchemaCaching

#
module Sequel
  module SchemaCaching
    # Dump the cached schema to the filename given in Marshal format.
    def dump_schema_cache(file)
      sch = {}
      @schemas.each do |k,v|
        sch[k] = v.map do |c, h|
          h = Hash[h]
          h.delete(:callable_default)
          [c, h]
        end
      end
      File.open(file, 'wb'){|f| f.write(Marshal.dump(sch))}
      nil
    end

    # Dump the cached schema to the filename given unless the file
    # already exists.
    def dump_schema_cache?(file)
      dump_schema_cache(file) unless File.exist?(file)
    end

    # Replace the schema cache with the data from the given file, which
    # should be in Marshal format.
    def load_schema_cache(file)
      @schemas = Marshal.load(File.read(file))
      @schemas.each_value{|v| schema_post_process(v)}
      nil
    end

    # Replace the schema cache with the data from the given file if the
    # file exists.
    def load_schema_cache?(file)
      load_schema_cache(file) if File.exist?(file)
    end
  end

  Database.register_extension(:schema_caching, SchemaCaching)
end
