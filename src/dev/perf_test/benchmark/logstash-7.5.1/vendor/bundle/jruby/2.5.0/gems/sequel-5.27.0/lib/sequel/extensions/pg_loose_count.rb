# frozen-string-literal: true
#
# The pg_loose_count extension looks at the table statistics
# in the PostgreSQL system tables to get a fast approximate
# count of the number of rows in a given table:
#
#   DB.loose_count(:table) # => 123456
#
# It can also support schema qualified tables:
#
#   DB.loose_count(Sequel[:schema][:table]) # => 123456
#
# How accurate this count is depends on the number of rows
# added/deleted from the table since the last time it was
# analyzed.
# 
# To load the extension into the database:
#
#   DB.extension :pg_loose_count
#
# Related module: Sequel::Postgres::LooseCount

#
module Sequel
  module Postgres
    module LooseCount
      # Look at the table statistics for the given table to get
      # an approximate count of the number of rows.
      def loose_count(table)
        from(:pg_class).where(:oid=>regclass_oid(table)).get(Sequel.cast(:reltuples, Integer))
      end
    end
  end

  Database.register_extension(:pg_loose_count, Postgres::LooseCount)
end

