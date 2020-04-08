# encoding: UTF-8
# frozen_string_literal: true

# There is a bug in JRuby versions between 9.2.0.0 and 9.2.8.0
# the TZinfo::Timestamp `new_datetime` can build Rational numbers having
# numerators and denominators that are too large for Java longs.
#
# This patch reopens the TZinfo::Timestamp class and redefines
# the `new_datetime method.
# It scales down the numerator and denominator if they are larger than
# Java Long. There is no appreciable precision loss at the microsecond level

tzinfo_jruby_bugfixed_version = "9.2.8.0"
tzinfo_jruby_bugadded_version = "9.2.0.0"

current_jruby_version = Gem::Version.new(JRUBY_VERSION)
broken_jruby_version = Gem::Version.new(tzinfo_jruby_bugadded_version)
patched_jruby_version = Gem::Version.new(tzinfo_jruby_bugfixed_version)

return unless current_jruby_version >= broken_jruby_version && current_jruby_version < patched_jruby_version

require 'tzinfo'

if defined?(TZInfo::VERSION) && TZInfo::VERSION > '2'
  module TZInfo
    # A time represented as an `Integer` number of seconds since 1970-01-01
    # 00:00:00 UTC (ignoring leap seconds), the fraction through the second
    # (sub_second as a `Rational`) and an optional UTC offset. Like Ruby's `Time`
    # class, {Timestamp} can distinguish between a local time with a zero offset
    # and a time specified explicitly as UTC.
    class Timestamp

      protected

      def new_datetime(klass = DateTime)
        val = JD_EPOCH + ((@value.to_r + @sub_second) / 86400)
        datetime = klass.jd(jruby_scale_down_rational(val))
        @utc_offset && @utc_offset != 0 ? datetime.new_offset(Rational(@utc_offset, 86400)) : datetime
      end

      private

      # while this JRuby bug exists in 9.2.X.X https://github.com/jruby/jruby/issues/5791
      # we must scale down the numerator and denominator to fit Java Long values.

      def jruby_scale_down_rational(rat)
        return rat if rat.numerator <= java.lang.Long::MAX_VALUE
        [10, 100, 1000].each do |scale_by|
          new_numerator = rat.numerator / scale_by
          if new_numerator  <= java.lang.Long::MAX_VALUE
            return Rational(new_numerator, rat.denominator / scale_by)
          end
        end
      end
    end
  end
end
