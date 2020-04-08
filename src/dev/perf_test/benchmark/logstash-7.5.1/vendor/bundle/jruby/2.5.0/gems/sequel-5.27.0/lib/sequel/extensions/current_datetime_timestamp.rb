# frozen-string-literal: true
#
# The current_datetime_timestamp extension makes Dataset#current_datetime
# return an object that operates like Sequel.datetime_class.now, but will
# be literalized as CURRENT_TIMESTAMP.
#
# This allows you to use the defaults_setter, timestamps, and touch
# model plugins and make sure that CURRENT_TIMESTAMP is used instead of
# a literalized timestamp value.
#
# The reason that CURRENT_TIMESTAMP is better than a literalized version
# of the timestamp is that it obeys correct transactional semantics
# (all calls to CURRENT_TIMESTAMP in the same transaction return the
# same timestamp, at least on some databases).
#
# To have current_datetime be literalized as CURRENT_TIMESTAMP for
# a single dataset:
#
#   ds = ds.extension(:current_datetime_timestamp)
#
# To have current_datetime be literalized as CURRENT_TIMESTAMP for all
# datasets of a given database.
#
#   DB.extension(:current_datetime_timestamp)
#
# Related module: Sequel::CurrentDateTimeTimestamp

#
module Sequel
  module CurrentDateTimeTimestamp
    module DatasetMethods
      # Return an instance of Sequel.datetime_class that will be literalized
      # as CURRENT_TIMESTAMP.
      def current_datetime
        (Sequel.datetime_class == ::Time ? Time : DateTime).now
      end

      private

      # Literalize custom DateTime subclass objects as CURRENT_TIMESTAMP.
      def literal_datetime_append(sql, v)
        v.is_a?(DateTime) ? literal_append(sql, Sequel::CURRENT_TIMESTAMP) : super
      end

      # Literalize custom Time subclass objects as CURRENT_TIMESTAMP.
      def literal_time_append(sql, v)
        v.is_a?(Time) ? literal_append(sql, Sequel::CURRENT_TIMESTAMP) : super
      end
    end

    # Time subclass literalized as CURRENT_TIMESTAMP
    class Time < ::Time; end

    # DateTime subclass literalized as CURRENT_TIMESTAMP
    class DateTime < ::DateTime; end
  end

  Dataset.register_extension(:current_datetime_timestamp, CurrentDateTimeTimestamp::DatasetMethods)
end
