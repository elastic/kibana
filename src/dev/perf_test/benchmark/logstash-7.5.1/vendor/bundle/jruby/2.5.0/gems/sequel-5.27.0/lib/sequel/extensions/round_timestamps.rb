# frozen-string-literal: true
#
# The round_timestamps extension will automatically round timestamp
# values to the database's supported level of precision before literalizing
# them.
#
# For example, if the database supports millisecond precision, and you give
# it a Time value with microsecond precision, it will round it appropriately:
#
#   Time.at(1405341161.917999982833862)
#   # default: 2014-07-14 14:32:41.917999
#   # with extension: 2014-07-14 14:32:41.918000
#
# The round_timestamps extension correctly deals with databases that support
# millisecond or second precision.  In addition to handling Time values, it
# also handles DateTime values and Sequel::SQLTime values (for the TIME type).
#
# To round timestamps for a single dataset:
#
#   ds = ds.extension(:round_timestamps)
#
# To round timestamps for all datasets on a single database:
#
#   DB.extension(:round_timestamps)
#
# Related module: Sequel::Dataset::RoundTimestamps

module Sequel
  class Dataset
    module RoundTimestamps
      # Round DateTime values before literalizing
      def literal_datetime(v)
        super(v + Rational(5, 10**timestamp_precision)/864000)
      end

      # Round Sequel::SQLTime values before literalizing
      def literal_sqltime(v)
        super(v.round(timestamp_precision))
      end

      # Round Time values before literalizing
      def literal_time(v)
        super(v.round(timestamp_precision))
      end
    end

    register_extension(:round_timestamps, RoundTimestamps)
  end
end
