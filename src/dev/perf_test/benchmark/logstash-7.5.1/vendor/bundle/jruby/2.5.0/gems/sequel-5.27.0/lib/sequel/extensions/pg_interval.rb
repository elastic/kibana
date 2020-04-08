# frozen-string-literal: true
#
# The pg_interval extension adds support for PostgreSQL's interval type.
#
# This extension integrates with Sequel's native postgres and jdbc/postgresql
# adapters, so that when interval type values are retrieved, they are parsed and returned
# as instances of ActiveSupport::Duration.
#
# In addition to the parser, this extension adds literalizers for
# ActiveSupport::Duration that use the standard Sequel literalization
# callbacks, so they work on all adapters.
#
# To use this extension, load it into the Database instance:
#
#   DB.extension :pg_interval
#
# This extension integrates with the pg_array extension.  If you plan
# to use arrays of interval types, load the pg_array extension before the
# pg_interval extension:
#
#   DB.extension :pg_array, :pg_interval
#
# The parser this extension uses requires that IntervalStyle for PostgreSQL
# is set to postgres (the default setting).  If IntervalStyle is changed from
# the default setting, the parser will probably not work.  The parser used is
# very simple, and is only designed to parse PostgreSQL's default output
# format, it is not designed to support all input formats that PostgreSQL
# supports.
#
# See the {schema modification guide}[rdoc-ref:doc/schema_modification.rdoc]
# for details on using interval columns in CREATE/ALTER TABLE statements.
#
# Related module: Sequel::Postgres::IntervalDatabaseMethods

require 'active_support/duration'

module Sequel
  module Postgres
    module IntervalDatabaseMethods
      DURATION_UNITS = [:years, :months, :weeks, :days, :hours, :minutes, :seconds].freeze

      # Return an unquoted string version of the duration object suitable for
      # use as a bound variable.
      def self.literal_duration(duration)
        h = Hash.new(0)
        duration.parts.each{|unit, value| h[unit] += value}
        s = String.new

        DURATION_UNITS.each do |unit|
          if (v = h[unit]) != 0
            s << "#{v.is_a?(Integer) ? v : sprintf('%0.6f', v)} #{unit} "
          end
        end

        if s.empty?
          '0'
        else
          s
        end
      end

      # Creates callable objects that convert strings into ActiveSupport::Duration instances.
      class Parser
        # Parse the interval input string into an ActiveSupport::Duration instance.
        def call(string)
          raise(InvalidValue, "invalid or unhandled interval format: #{string.inspect}") unless matches = /\A([+-]?\d+ years?\s?)?([+-]?\d+ mons?\s?)?([+-]?\d+ days?\s?)?(?:(?:([+-])?(\d{2,10}):(\d\d):(\d\d(\.\d+)?))|([+-]?\d+ hours?\s?)?([+-]?\d+ mins?\s?)?([+-]?\d+(\.\d+)? secs?\s?)?)?\z/.match(string)

          value = 0
          parts = []

          if v = matches[1]
            v = v.to_i
            value += 31557600 * v
            parts << [:years, v]
          end
          if v = matches[2]
            v = v.to_i
            value += 2592000 * v
            parts << [:months, v]
          end
          if v = matches[3]
            v = v.to_i
            value += 86400 * v
            parts << [:days, v]
          end
          if matches[5]
            seconds = matches[5].to_i * 3600 + matches[6].to_i * 60
            seconds += matches[8] ? matches[7].to_f : matches[7].to_i
            seconds *= -1 if matches[4] == '-'
            value += seconds
            parts << [:seconds, seconds]
          elsif matches[9] || matches[10] || matches[11]
            seconds = 0
            if v = matches[9]
              seconds += v.to_i * 3600
            end
            if v = matches[10]
              seconds += v.to_i * 60
            end
            if v = matches[11]
              seconds += matches[12] ? v.to_f : v.to_i
            end
            value += seconds
            parts << [:seconds, seconds]
          end

          ActiveSupport::Duration.new(value, parts)
        end
      end

      # Single instance of Parser used for parsing, to save on memory (since the parser has no state).
      PARSER = Parser.new

      # Reset the conversion procs if using the native postgres adapter,
      # and extend the datasets to correctly literalize ActiveSupport::Duration values.
      def self.extended(db)
        db.instance_exec do
          extend_datasets(IntervalDatasetMethods)
          add_conversion_proc(1186, Postgres::IntervalDatabaseMethods::PARSER)
          if respond_to?(:register_array_type)
            register_array_type('interval', :oid=>1187, :scalar_oid=>1186)
          end
          @schema_type_classes[:interval] = ActiveSupport::Duration
        end
      end

      # Handle ActiveSupport::Duration values in bound variables.
      def bound_variable_arg(arg, conn)
        case arg
        when ActiveSupport::Duration
          IntervalDatabaseMethods.literal_duration(arg)
        else
          super
        end
      end

      private

      # Handle arrays of interval types in bound variables.
      def bound_variable_array(a)
        case a
        when ActiveSupport::Duration
          "\"#{IntervalDatabaseMethods.literal_duration(a)}\""
        else
          super
        end
      end

      # Set the :ruby_default value if the default value is recognized as an interval.
      def schema_post_process(_)
        super.each do |a|
          h = a[1]
          if h[:type] == :interval && h[:default] =~ /\A'([\w ]+)'::interval\z/
            h[:ruby_default] = PARSER.call($1)
          end
        end
      end

      # Typecast value correctly to an ActiveSupport::Duration instance.
      # If already an ActiveSupport::Duration, return it. 
      # If a numeric argument is given, assume it represents a number
      # of seconds, and create a new ActiveSupport::Duration instance
      # representing that number of seconds.
      # If a String, assume it is in PostgreSQL interval output format
      # and attempt to parse it.
      def typecast_value_interval(value)
        case value
        when ActiveSupport::Duration
          value
        when Numeric
          ActiveSupport::Duration.new(value, [[:seconds, value]])
        when String
          PARSER.call(value)
        else
          raise Sequel::InvalidValue, "invalid value for interval type: #{value.inspect}"
        end
      end
    end

    module IntervalDatasetMethods
      # Handle literalization of ActiveSupport::Duration objects, treating them as
      # PostgreSQL intervals.
      def literal_other_append(sql, v)
        case v
        when ActiveSupport::Duration
          literal_append(sql, IntervalDatabaseMethods.literal_duration(v))
          sql << '::interval'
        else
          super
        end
      end
    end
  end

  Database.register_extension(:pg_interval, Postgres::IntervalDatabaseMethods)
end
