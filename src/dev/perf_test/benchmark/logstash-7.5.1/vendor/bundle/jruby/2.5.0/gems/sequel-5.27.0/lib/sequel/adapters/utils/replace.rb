# frozen-string-literal: true

module Sequel
  class Dataset
    module Replace
      # Execute a REPLACE statement on the database (deletes any duplicate
      # rows before inserting).
      def replace(*values)
        execute_insert(replace_sql(*values))
      end

      # SQL statement for REPLACE
      def replace_sql(*values)
        clone(:replace=>true).insert_sql(*values)
      end

      # Replace multiple rows in a single query.
      def multi_replace(*values)
        clone(:replace=>true).multi_insert(*values)
      end

      # Databases using this module support REPLACE.
      def supports_replace?
        true
      end

      private

      # If this is an replace instead of an insert, use replace instead
      def insert_insert_sql(sql)
        sql << (@opts[:replace] ? 'REPLACE' : 'INSERT')
      end
    end
  end
end
