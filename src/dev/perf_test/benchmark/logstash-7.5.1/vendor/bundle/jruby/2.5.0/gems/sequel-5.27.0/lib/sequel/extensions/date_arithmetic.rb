# frozen-string-literal: true
#
# The date_arithmetic extension adds the ability to perform database-independent
# addition/substraction of intervals to/from dates and timestamps.
#
# First, you need to load the extension into the database:
#
#   DB.extension :date_arithmetic
#
# Then you can use the Sequel.date_add and Sequel.date_sub methods
# to return Sequel expressions:
#
#   add = Sequel.date_add(:date_column, years: 1, months: 2, days: 3)
#   sub = Sequel.date_sub(:date_column, hours: 1, minutes: 2, seconds: 3)
#
# In addition to specifying the interval as a hash, there is also
# support for specifying the interval as an ActiveSupport::Duration
# object:
#
#   require 'active_support/all'
#   add = Sequel.date_add(:date_column, 1.years + 2.months + 3.days)
#   sub = Sequel.date_sub(:date_column, 1.hours + 2.minutes + 3.seconds)
#
# By default, values are casted to the generic timestamp type for the
# database.  You can override the cast type using the :cast option:
#
#   add = Sequel.date_add(:date_column, {years: 1, months: 2, days: 3}, :cast=>:timestamptz)
#
# These expressions can be used in your datasets, or anywhere else that
# Sequel expressions are allowed:
#
#   DB[:table].select(add.as(:d)).where(sub > Sequel::CURRENT_TIMESTAMP)
#
# Related module: Sequel::SQL::DateAdd

#
module Sequel
  module SQL
    module Builders
      # Return a DateAdd expression, adding an interval to the date/timestamp expr.
      # Options:
      # :cast :: Cast to the specified type instead of the default if casting
      def date_add(expr, interval, opts=OPTS)
        DateAdd.new(expr, interval, opts)
      end

      # Return a DateAdd expression, adding the negative of the interval to
      # the date/timestamp expr.
      # Options:
      # :cast :: Cast to the specified type instead of the default if casting
      def date_sub(expr, interval, opts=OPTS)
        interval = if interval.is_a?(Hash)
          h = {}
          interval.each{|k,v| h[k] = -v unless v.nil?}
          h
        else
          -interval
        end
        DateAdd.new(expr, interval, opts)
      end
    end

    # The DateAdd class represents the addition of an interval to a
    # date/timestamp expression.
    class DateAdd < GenericExpression
      # These methods are added to datasets using the date_arithmetic
      # extension, for the purposes of correctly literalizing DateAdd
      # expressions for the appropriate database type.
      module DatasetMethods
        DURATION_UNITS = [:years, :months, :days, :hours, :minutes, :seconds].freeze
        DEF_DURATION_UNITS = DURATION_UNITS.zip(DURATION_UNITS.map{|s| s.to_s.freeze}).freeze
        MYSQL_DURATION_UNITS = DURATION_UNITS.zip(DURATION_UNITS.map{|s| Sequel.lit(s.to_s.upcase[0...-1]).freeze}).freeze
        MSSQL_DURATION_UNITS = DURATION_UNITS.zip(DURATION_UNITS.map{|s| Sequel.lit(s.to_s[0...-1]).freeze}).freeze
        H2_DURATION_UNITS = DURATION_UNITS.zip(DURATION_UNITS.map{|s| s.to_s[0...-1].freeze}).freeze
        DERBY_DURATION_UNITS = DURATION_UNITS.zip(DURATION_UNITS.map{|s| Sequel.lit("SQL_TSI_#{s.to_s.upcase[0...-1]}").freeze}).freeze
        ACCESS_DURATION_UNITS = DURATION_UNITS.zip(%w'yyyy m d h n s'.map(&:freeze)).freeze
        DB2_DURATION_UNITS = DURATION_UNITS.zip(DURATION_UNITS.map{|s| Sequel.lit(s.to_s).freeze}).freeze

        # Append the SQL fragment for the DateAdd expression to the SQL query.
        def date_add_sql_append(sql, da)
          if defined?(super)
            return super
          end

          h = da.interval
          expr = da.expr
          cast_type = da.cast_type || Time

          cast = case db_type = db.database_type
          when :postgres
            interval = String.new
            each_valid_interval_unit(h, DEF_DURATION_UNITS) do |value, sql_unit|
              interval << "#{value} #{sql_unit} "
            end
            if interval.empty?
              return literal_append(sql, Sequel.cast(expr, cast_type))
            else
              return complex_expression_sql_append(sql, :+, [Sequel.cast(expr, cast_type), Sequel.cast(interval, :interval)])
            end
          when :sqlite
            args = [expr]
            each_valid_interval_unit(h, DEF_DURATION_UNITS) do |value, sql_unit|
              args << "#{value} #{sql_unit}"
            end
            return function_sql_append(sql, Sequel.function(:datetime, *args))
          when :mysql, :hsqldb
            if db_type == :hsqldb
              # HSQLDB requires 2.2.9+ for the DATE_ADD function
              expr = Sequel.cast(expr, cast_type)
            end
            each_valid_interval_unit(h, MYSQL_DURATION_UNITS) do |value, sql_unit|
              expr = Sequel.function(:DATE_ADD, expr, Sequel.lit(["INTERVAL ", " "], value, sql_unit))
            end
          when :mssql, :h2, :access, :sqlanywhere
            units = case db_type
            when :mssql, :sqlanywhere
              MSSQL_DURATION_UNITS
            when :h2
              H2_DURATION_UNITS
            when :access
              ACCESS_DURATION_UNITS
            end
            each_valid_interval_unit(h, units) do |value, sql_unit|
              expr = Sequel.function(:DATEADD, sql_unit, value, expr)
            end
          when :derby
            if expr.is_a?(Date) && !expr.is_a?(DateTime)
              # Work around for https://issues.apache.org/jira/browse/DERBY-896
              expr = Sequel.cast_string(expr) + ' 00:00:00'
            end
            each_valid_interval_unit(h, DERBY_DURATION_UNITS) do |value, sql_unit|
              expr = Sequel.lit(["{fn timestampadd(#{sql_unit}, ", ", timestamp(", "))}"], value, expr)
            end
          when :oracle
            each_valid_interval_unit(h, MYSQL_DURATION_UNITS) do |value, sql_unit|
              expr = Sequel.+(expr, Sequel.lit(["INTERVAL ", " "], value.to_s, sql_unit))
            end
          when :db2
            expr = Sequel.cast(expr, cast_type)
            each_valid_interval_unit(h, DB2_DURATION_UNITS) do |value, sql_unit|
              expr = Sequel.+(expr, Sequel.lit(["", " "], value, sql_unit))
            end
            false
          else
            raise Error, "date arithmetic is not implemented on #{db.database_type}"
          end

          if cast
            expr = Sequel.cast(expr, cast_type)
          end

          literal_append(sql, expr)
        end

        private

        # Yield the value in the interval for each of the units
        # present in the interval, along with the SQL fragment
        # representing the unit name.  Returns false if any
        # values were yielded, true otherwise
        def each_valid_interval_unit(interval, units)
          cast = true
          units.each do |unit, sql_unit|
            if (value = interval[unit]) && value != 0
              cast = false
              yield value, sql_unit
            end
          end
          cast
        end
      end

      # The expression that the interval is being added to.
      attr_reader :expr

      # The interval added to the expression, as a hash with
      # symbol keys.
      attr_reader :interval

      # The type to cast the expression to.  nil if not overridden, in which cast
      # the generic timestamp type for the database will be used.
      attr_reader :cast_type

      # Supports two types of intervals:
      # Hash :: Used directly, but values cannot be plain strings.
      # ActiveSupport::Duration :: Converted to a hash using the interval's parts.
      def initialize(expr, interval, opts=OPTS)
        @expr = expr
        @interval = if interval.is_a?(Hash)
          interval.each_value do |v|
             # Attempt to prevent SQL injection by users who pass untrusted strings
             # as interval values. 
             if v.is_a?(String) && !v.is_a?(LiteralString)
               raise Sequel::InvalidValue, "cannot provide String value as interval part: #{v.inspect}"
             end
          end
          Hash[interval]
        else
          h = Hash.new(0)
          interval.parts.each{|unit, value| h[unit] += value}
          Hash[h]
        end

        @interval.freeze
        @cast_type = opts[:cast] if opts[:cast]
        freeze
      end

      to_s_method :date_add_sql
    end
  end

  Dataset.register_extension(:date_arithmetic, SQL::DateAdd::DatasetMethods)
end
