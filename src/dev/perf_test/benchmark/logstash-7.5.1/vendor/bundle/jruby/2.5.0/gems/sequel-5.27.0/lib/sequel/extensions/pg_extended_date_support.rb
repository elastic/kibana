# frozen-string-literal: true
#
# The pg_extended_date_support extension allows support
# for BC dates/timestamps by default, and infinite
# dates/timestamps if configured.  Without this extension,
# BC and infinite dates/timestamps will be handled incorrectly
# or raise an error.  This behavior isn't the default because
# it can hurt performance, and few users need support for BC
# and infinite dates/timestamps.
#
# To load the extension into the database:
#
#   DB.extension :pg_extended_date_support
#
# To enable support for infinite dates/timestamps:
#
#   DB.convert_infinite_timestamps = 'string' # or 'nil' or 'float'
#
# Related module: Sequel::Postgres::ExtendedDateSupport

#
module Sequel
  module Postgres
    module ExtendedDateSupport
      DATE_YEAR_1 = Date.new(1)
      DATETIME_YEAR_1 = DateTime.new(1)
      TIME_YEAR_1 = Time.at(-62135596800).utc
      INFINITE_TIMESTAMP_STRINGS = ['infinity'.freeze, '-infinity'.freeze].freeze
      INFINITE_DATETIME_VALUES = ([PLUS_INFINITY, MINUS_INFINITY] + INFINITE_TIMESTAMP_STRINGS).freeze
      PLUS_DATE_INFINITY = Date::Infinity.new
      MINUS_DATE_INFINITY = -PLUS_DATE_INFINITY

      # Add dataset methods and update the conversion proces for dates and timestamps.
      def self.extended(db)
        db.extend_datasets(DatasetMethods)
        procs = db.conversion_procs
        procs[1082] = ::Sequel.method(:string_to_date)
        procs[1184] = procs[1114] = db.method(:to_application_timestamp)
      end

      # Whether infinite timestamps/dates should be converted on retrieval.  By default, no
      # conversion is done, so an error is raised if you attempt to retrieve an infinite
      # timestamp/date.  You can set this to :nil to convert to nil, :string to leave
      # as a string, or :float to convert to an infinite float.
      attr_reader :convert_infinite_timestamps

      # Set whether to allow infinite timestamps/dates.  Make sure the
      # conversion proc for date reflects that setting.
      def convert_infinite_timestamps=(v)
        @convert_infinite_timestamps = case v
        when Symbol
          v
        when 'nil'
          :nil
        when 'string'
          :string
        when 'date'
          :date
        when 'float'
          :float
        when String, true
          typecast_value_boolean(v)
        else
          false
        end

        pr = old_pr = Sequel.method(:string_to_date)
        if @convert_infinite_timestamps
          pr = lambda do |val|
            case val
            when *INFINITE_TIMESTAMP_STRINGS
              infinite_timestamp_value(val)
            else
              old_pr.call(val)
            end
          end
        end
        add_conversion_proc(1082, pr)
      end

      # Handle BC dates in timestamps by moving the BC from after the time to
      # after the date, to appease ruby's date parser.
      # If convert_infinite_timestamps is true and the value is infinite, return an appropriate
      # value based on the convert_infinite_timestamps setting.
      def to_application_timestamp(value)
        if value.is_a?(String) && (m = value.match(/((?:[-+]\d\d:\d\d)(:\d\d)?)?( BC)?\z/)) && (m[2] || m[3])
          if m[3]
            value = value.sub(' BC', '').sub(' ', ' BC ')
            conv = defined?(JRUBY_VERSION) && JRUBY_VERSION == '9.2.0.0'
          end
          if m[2] || conv
            dt = DateTime.parse(value)
            if conv
              # :nocov:
              if Sequel.datetime_class == DateTime
                dt >>= 12
              else
                dt >>= 24
              end
              # :nocov:
            end
            unless Sequel.datetime_class == DateTime
              dt = dt.to_time
              if conv && (timezone == nil || timezone == :local) && !m[1]
                # :nocov:
                dt = Sequel.send(:convert_input_timestamp, dt.strftime("%F %T.%6N"), :local)
                # :nocov:
              end
            end
            Sequel.convert_output_timestamp(dt, Sequel.application_timezone)
          else
            super(value)
          end
        elsif convert_infinite_timestamps
          case value
          when *INFINITE_TIMESTAMP_STRINGS
            infinite_timestamp_value(value)
          else
            super
          end
        else
          super
        end
      end

      private
      
      # Return an appropriate value for the given infinite timestamp string.
      def infinite_timestamp_value(value)
        case convert_infinite_timestamps
        when :nil
          nil
        when :string
          value
        when :date
          value == 'infinity' ? PLUS_DATE_INFINITY : MINUS_DATE_INFINITY
        else
          value == 'infinity' ? PLUS_INFINITY : MINUS_INFINITY
        end
      end
      
      # If the value is an infinite value (either an infinite float or a string returned by
      # by PostgreSQL for an infinite date), return it without converting it if
      # convert_infinite_timestamps is set.
      def typecast_value_date(value)
        if convert_infinite_timestamps
          case value
          when *INFINITE_DATETIME_VALUES
            value
          else
            super
          end
        else
          super
        end
      end

      # If the value is an infinite value (either an infinite float or a string returned by
      # by PostgreSQL for an infinite timestamp), return it without converting it if
      # convert_infinite_timestamps is set.
      def typecast_value_datetime(value)
        if convert_infinite_timestamps
          case value
          when *INFINITE_DATETIME_VALUES
            value
          else
            super
          end
        else
          super
        end
      end
        
      module DatasetMethods
        private

        # Handle BC Date objects.
        def literal_date(date)
          if date < DATE_YEAR_1
            date <<= ((date.year) * 24 - 12)
            date.strftime("'%Y-%m-%d BC'")
          else
            super
          end
        end

        # Handle BC DateTime objects.
        def literal_datetime(date)
          if date < DATETIME_YEAR_1
            date <<= ((date.year) * 24 - 12)
            date = db.from_application_timestamp(date)
            minutes = (date.is_a?(DateTime) ? date.offset * 1440 : date.utc_offset/60).to_i
            date.strftime("'%Y-%m-%d %H:%M:%S.%N#{format_timestamp_offset(*minutes.divmod(60))} BC'")
          else
            super
          end
        end

        # Handle Date::Infinity values
        def literal_other_append(sql, v)
          if v.is_a?(Date::Infinity)
            sql << (v > 0 ? "'infinity'" : "'-infinity'")
          else
            super
          end
        end

        if RUBY_ENGINE == 'jruby'
          # :nocov:

          ExtendedDateSupport::CONVERT_TYPES = [Java::JavaSQL::Types::DATE, Java::JavaSQL::Types::TIMESTAMP]

          # Use non-JDBC parsing as JDBC parsing doesn't work for BC dates/timestamps.
          def type_convertor(map, meta, type, i)
            case type
            when *CONVERT_TYPES
              db.oid_convertor_proc(meta.getField(i).getOID)
            else
              super
            end
          end

          # Work around JRuby bug #4822 in Time#to_datetime for times before date of calendar reform
          def literal_time(time)
            if time < TIME_YEAR_1
              dt = DateTime.parse(super)
              # Work around JRuby bug #5191
              dt >>= 12 if JRUBY_VERSION == '9.2.0.0'
              literal_datetime(dt)
            else
              super
            end
          end
          # :nocov:
        else
          # Handle BC Time objects.
          def literal_time(time)
            if time < TIME_YEAR_1
              literal_datetime(time.to_datetime)
            else
              super
            end
          end
        end
      end
    end
  end

  Database.register_extension(:pg_extended_date_support, Postgres::ExtendedDateSupport)
end
