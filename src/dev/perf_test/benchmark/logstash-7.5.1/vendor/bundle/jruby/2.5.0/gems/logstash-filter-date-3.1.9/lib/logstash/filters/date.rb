# encoding: utf-8
require "logstash/filters/base"
require "logstash/namespace"
require "logstash/timestamp"
require "logstash-filter-date_jars"

# The date filter is used for parsing dates from fields, and then using that
# date or timestamp as the logstash timestamp for the event.
#
# For example, syslog events usually have timestamps like this:
# [source,ruby]
#     "Apr 17 09:32:01"
#
# You would use the date format `MMM dd HH:mm:ss` to parse this.
#
# The date filter is especially important for sorting events and for
# backfilling old data. If you don't get the date correct in your
# event, then searching for them later will likely sort out of order.
#
# In the absence of this filter, logstash will choose a timestamp based on the
# first time it sees the event (at input time), if the timestamp is not already
# set in the event. For example, with file input, the timestamp is set to the
# time of each read.
class LogStash::Filters::Date < LogStash::Filters::Base
  config_name "date"

  # Specify a time zone canonical ID to be used for date parsing.
  # The valid IDs are listed on the http://joda-time.sourceforge.net/timezones.html[Joda.org available time zones page].
  # This is useful in case the time zone cannot be extracted from the value,
  # and is not the platform default.
  # If this is not specified the platform default will be used.
  # Canonical ID is good as it takes care of daylight saving time for you
  # For example, `America/Los_Angeles` or `Europe/Paris` are valid IDs.
  # This field can be dynamic and include parts of the event using the `%{field}` syntax
  config :timezone, :validate => :string

  # Specify a locale to be used for date parsing using either IETF-BCP47 or POSIX language tag.
  # Simple examples are `en`,`en-US` for BCP47 or `en_US` for POSIX.
  #
  # The locale is mostly necessary to be set for parsing month names (pattern with `MMM`) and
  # weekday names (pattern with `EEE`).
  #
  # If not specified, the platform default will be used but for non-english platform default
  # an english parser will also be used as a fallback mechanism.
  config :locale, :validate => :string

  # An array with field name first, and format patterns following, `[ field,
  # formats... ]`
  #
  # If your time field has multiple possible formats, you can do this:
  # [source,ruby]
  #     match => [ "logdate", "MMM dd yyyy HH:mm:ss",
  #               "MMM  d yyyy HH:mm:ss", "ISO8601" ]
  #
  # The above will match a syslog (rfc3164) or `iso8601` timestamp.
  #
  # There are a few special exceptions. The following format literals exist
  # to help you save time and ensure correctness of date parsing.
  #
  # * `ISO8601` - should parse any valid ISO8601 timestamp, such as
  #   `2011-04-19T03:44:01.103Z`
  # * `UNIX` - will parse *float or int* value expressing unix time in seconds since epoch like 1326149001.132 as well as 1326149001
  # * `UNIX_MS` - will parse **int** value expressing unix time in milliseconds since epoch like 1366125117000
  # * `TAI64N` - will parse tai64n time values
  #
  # For example, if you have a field `logdate`, with a value that looks like
  # `Aug 13 2010 00:03:44`, you would use this configuration:
  # [source,ruby]
  #     filter {
  #       date {
  #         match => [ "logdate", "MMM dd yyyy HH:mm:ss" ]
  #       }
  #     }
  #
  # If your field is nested in your structure, you can use the nested
  # syntax `[foo][bar]` to match its value. For more information, please refer to
  # <<logstash-config-field-references>>
  #
  # *More details on the syntax*
  #
  # The syntax used for parsing date and time text uses letters to indicate the
  # kind of time value (month, minute, etc), and a repetition of letters to
  # indicate the form of that value (2-digit month, full month name, etc).
  #
  # Here's what you can use to parse dates and times:
  #
  # [horizontal]
  # y:: year
  #   yyyy::: full year number. Example: `2015`.
  #   yy::: two-digit year. Example: `15` for the year 2015.
  #
  # M:: month of the year
  #   M::: minimal-digit month. Example: `1` for January and `12` for December.
  #   MM::: two-digit month. zero-padded if needed. Example: `01` for January  and `12` for December
  #   MMM::: abbreviated month text. Example: `Jan` for January. Note: The language used depends on your locale. See the `locale` setting for how to change the language.
  #   MMMM::: full month text, Example: `January`. Note: The language used depends on your locale.
  #
  # d:: day of the month
  #   d::: minimal-digit day. Example: `1` for the 1st of the month.
  #   dd::: two-digit day, zero-padded if needed. Example: `01` for the 1st of the month.
  #
  # H:: hour of the day (24-hour clock)
  #   H::: minimal-digit hour. Example: `0` for midnight.
  #   HH::: two-digit hour, zero-padded if needed. Example: `00` for midnight.
  #
  # m:: minutes of the hour (60 minutes per hour)
  #   m::: minimal-digit minutes. Example: `0`.
  #   mm::: two-digit minutes, zero-padded if needed. Example: `00`.
  #
  # s:: seconds of the minute (60 seconds per minute)
  #   s::: minimal-digit seconds. Example: `0`.
  #   ss::: two-digit seconds, zero-padded if needed. Example: `00`.
  #
  # S:: fraction of a second
  #   *Maximum precision is milliseconds (`SSS`). Beyond that, zeroes are appended.*
  #   S::: tenths of a second. Example:  `0` for a subsecond value `012`
  #   SS::: hundredths of a second. Example:  `01` for a subsecond value `01`
  #   SSS::: thousandths of a second. Example:  `012` for a subsecond value `012`
  #
  # Z:: time zone offset or identity
  #   Z::: Timezone offset structured as HHmm (hour and minutes offset from Zulu/UTC). Example: `-0700`.
  #   ZZ::: Timezone offset structured as HH:mm (colon in between hour and minute offsets). Example: `-07:00`.
  #   ZZZ::: Timezone identity. Example: `America/Los_Angeles`. Note: Valid IDs are listed on the http://joda-time.sourceforge.net/timezones.html[Joda.org available time zones page].
  #
  # z:: time zone names. *Time zone names ('z') cannot be parsed.*
  #
  # w:: week of the year
  #   w::: minimal-digit week. Example: `1`.
  #   ww::: two-digit week, zero-padded if needed. Example: `01`.
  #
  # D:: day of the year
  #
  # e:: day of the week (number)
  #
  # E:: day of the week (text)
  #   E, EE, EEE::: Abbreviated day of the week. Example:  `Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat`, `Sun`. Note: The actual language of this will depend on your locale.
  #   EEEE::: The full text day of the week. Example: `Monday`, `Tuesday`, ... Note: The actual language of this will depend on your locale.
  #
  # For non-formatting syntax, you'll need to put single-quote characters around the value. For example, if you were parsing ISO8601 time, "2015-01-01T01:12:23" that little "T" isn't a valid time format, and you want to say "literally, a T", your format would be this: "yyyy-MM-dd'T'HH:mm:ss"
  #
  # Other less common date units, such as era (G), century \(C), am/pm (a), and # more, can be learned about on the
  # http://www.joda.org/joda-time/key_format.html[joda-time documentation].
  config :match, :validate => :array, :default => []

  # Store the matching timestamp into the given target field.  If not provided,
  # default to updating the `@timestamp` field of the event.
  config :target, :validate => :string, :default => LogStash::Event::TIMESTAMP

  # Append values to the `tags` field when there has been no
  # successful match
  config :tag_on_failure, :validate => :array, :default => ["_dateparsefailure"]

  def register
    # nothing
  end

  def initialize(config = {})
    super
    if @match.length < 2
      raise LogStash::ConfigurationError, I18n.t("logstash.agent.configuration.invalid_plugin_register",
        :plugin => "filter", :type => "date",
        :error => "The match setting should contains first a field name and at least one date format, current value is #{@match}")
    end
    if @locale
      if @locale.include? '_'
        @logger.warn("Date filter now use BCP47 format for locale, replacing underscore with dash")
        @locale.gsub!('_','-')
      end
      locale = java.util.Locale.forLanguageTag(@locale)
    end

    source = @match.first

    success_block = Proc.new do |event|
      filter_matched(event)
      metric.increment(:matches)
    end
    failure_block = Proc.new do |event|
      metric.increment(:failures)
    end

    @datefilter = org.logstash.filters.DateFilter.new(source, @target, @tag_on_failure, success_block, failure_block)

    @match[1..-1].map do |format|
      @datefilter.accept_filter_config(format, @locale, @timezone)

      # Offer a fallback parser such that if the default system Locale is non-english and that no locale is set,
      # we should try to parse english if the first local parsing fails.:w
      if !@locale && "en" != java.util.Locale.getDefault().getLanguage() && (format.include?("MMM") || format.include?("E"))
        @datefilter.accept_filter_config(format, "en-US", @timezone)
      end
    end

  end # def initialize

  def multi_filter(events)
    @datefilter.receive(events)
  end

  def filter(event)
    multi_filter([event]).first
  end
end
