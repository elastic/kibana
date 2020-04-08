# encoding: US-ASCII
# frozen_string_literal: false
# date.rb: Written by Tadayoshi Funaba 1998-2011

# == Overview
#
# This file provides two classes for working with
# dates and times.
#
# The first class, Date, represents dates.
# It works with years, months, weeks, and days.
# See the Date class documentation for more details.
#
# The second, DateTime, extends Date to include hours,
# minutes, seconds, and fractions of a second.  It
# provides basic support for time zones.  See the
# DateTime class documentation for more details.
#
# === Ways of calculating the date.
#
# In common usage, the date is reckoned in years since or
# before the Common Era (CE/BCE, also known as AD/BC), then
# as a month and day-of-the-month within the current year.
# This is known as the *Civil* *Date*, and abbreviated
# as +civil+ in the Date class.
#
# Instead of year, month-of-the-year,  and day-of-the-month,
# the date can also be reckoned in terms of year and
# day-of-the-year.  This is known as the *Ordinal* *Date*,
# and is abbreviated as +ordinal+ in the Date class.  (Note
# that referring to this as the Julian date is incorrect.)
#
# The date can also be reckoned in terms of year, week-of-the-year,
# and day-of-the-week.  This is known as the *Commercial*
# *Date*, and is abbreviated as +commercial+ in the
# Date class.  The commercial week runs Monday (day-of-the-week
# 1) to Sunday (day-of-the-week 7), in contrast to the civil
# week which runs Sunday (day-of-the-week 0) to Saturday
# (day-of-the-week 6).  The first week of the commercial year
# starts on the Monday on or before January 1, and the commercial
# year itself starts on this Monday, not January 1.
#
# For scientific purposes, it is convenient to refer to a date
# simply as a day count, counting from an arbitrary initial
# day.  The date first chosen for this was January 1, 4713 BCE.
# A count of days from this date is the *Julian* *Day* *Number*
# or *Julian* *Date*, which is abbreviated as +jd+ in the
# Date class.  This is in local time, and counts from midnight
# on the initial day.  The stricter usage is in UTC, and counts
# from midday on the initial day.  This is referred to in the
# Date class as the *Astronomical* *Julian* *Day* *Number*, and
# abbreviated as +ajd+.  In the Date class, the Astronomical
# Julian Day Number includes fractional days.
#
# Another absolute day count is the *Modified* *Julian* *Day*
# *Number*, which takes November 17, 1858 as its initial day.
# This is abbreviated as +mjd+ in the Date class.  There
# is also an *Astronomical* *Modified* *Julian* *Day* *Number*,
# which is in UTC and includes fractional days.  This is
# abbreviated as +amjd+ in the Date class.  Like the Modified
# Julian Day Number (and unlike the Astronomical Julian
# Day Number), it counts from midnight.
#
# Alternative calendars such as the Chinese Lunar Calendar,
# the Islamic Calendar, or the French Revolutionary Calendar
# are not supported by the Date class; nor are calendars that
# are based on an Era different from the Common Era, such as
# the Japanese Imperial Calendar or the Republic of China
# Calendar.
#
# === Calendar Reform
#
# The standard civil year is 365 days long.  However, the
# solar year is fractionally longer than this.  To account
# for this, a *leap* *year* is occasionally inserted.  This
# is a year with 366 days, the extra day falling on February 29.
# In the early days of the civil calendar, every fourth
# year without exception was a leap year.  This way of
# reckoning leap years is the *Julian* *Calendar*.
#
# However, the solar year is marginally shorter than 365 1/4
# days, and so the *Julian* *Calendar* gradually ran slow
# over the centuries.  To correct this, every 100th year
# (but not every 400th year) was excluded as a leap year.
# This way of reckoning leap years, which we use today, is
# the *Gregorian* *Calendar*.
#
# The Gregorian Calendar was introduced at different times
# in different regions.  The day on which it was introduced
# for a particular region is the *Day* *of* *Calendar*
# *Reform* for that region.  This is abbreviated as +sg+
# (for Start of Gregorian calendar) in the Date class.
#
# Two such days are of particular
# significance.  The first is October 15, 1582, which was
# the Day of Calendar Reform for Italy and most Catholic
# countries.  The second is September 14, 1752, which was
# the Day of Calendar Reform for England and its colonies
# (including what is now the United States).  These two
# dates are available as the constants Date::ITALY and
# Date::ENGLAND, respectively.  (By comparison, Germany and
# Holland, less Catholic than Italy but less stubborn than
# England, changed over in 1698; Sweden in 1753; Russia not
# till 1918, after the Revolution; and Greece in 1923.  Many
# Orthodox churches still use the Julian Calendar.  A complete
# list of Days of Calendar Reform can be found at
# http://www.polysyllabic.com/GregConv.html.)
#
# Switching from the Julian to the Gregorian calendar
# involved skipping a number of days to make up for the
# accumulated lag, and the later the switch was (or is)
# done, the more days need to be skipped.  So in 1582 in Italy,
# 4th October was followed by 15th October, skipping 10 days; in 1752
# in England, 2nd September was followed by 14th September, skipping
# 11 days; and if I decided to switch from Julian to Gregorian
# Calendar this midnight, I would go from 27th July 2003 (Julian)
# today to 10th August 2003 (Gregorian) tomorrow, skipping
# 13 days.  The Date class is aware of this gap, and a supposed
# date that would fall in the middle of it is regarded as invalid.
#
# The Day of Calendar Reform is relevant to all date representations
# involving years.  It is not relevant to the Julian Day Numbers,
# except for converting between them and year-based representations.
#
# In the Date and DateTime classes, the Day of Calendar Reform or
# +sg+ can be specified a number of ways.  First, it can be as
# the Julian Day Number of the Day of Calendar Reform.  Second,
# it can be using the constants Date::ITALY or Date::ENGLAND; these
# are in fact the Julian Day Numbers of the Day of Calendar Reform
# of the respective regions.  Third, it can be as the constant
# Date::JULIAN, which means to always use the Julian Calendar.
# Finally, it can be as the constant Date::GREGORIAN, which means
# to always use the Gregorian Calendar.
#
# Note: in the Julian Calendar, New Years Day was March 25.  The
# Date class does not follow this convention.
#
# === Time Zones
#
# DateTime objects support a simple representation
# of time zones.  Time zones are represented as an offset
# from UTC, as a fraction of a day.  This offset is the
# how much local time is later (or earlier) than UTC.
# UTC offset 0 is centred on England (also known as GMT).
# As you travel east, the offset increases until you
# reach the dateline in the middle of the Pacific Ocean;
# as you travel west, the offset decreases.  This offset
# is abbreviated as +of+ in the Date class.
#
# This simple representation of time zones does not take
# into account the common practice of Daylight Savings
# Time or Summer Time.
#
# Most DateTime methods return the date and the
# time in local time.  The two exceptions are
# #ajd() and #amjd(), which return the date and time
# in UTC time, including fractional days.
#
# The Date class does not support time zone offsets, in that
# there is no way to create a Date object with a time zone.
# However, methods of the Date class when used by a
# DateTime instance will use the time zone offset of this
# instance.

# Load built-in date library
JRuby::Util.load_ext("org.jruby.ext.date.DateLibrary")

require 'date/format'

# Class representing a date.
#
# See the documentation to the file date.rb for an overview.
#
# Internally, the date is represented as an Astronomical
# Julian Day Number, +ajd+.  The Day of Calendar Reform, +sg+, is
# also stored, for conversions to other date formats.  (There
# is also an +of+ field for a time zone offset, but this
# is only for the use of the DateTime subclass.)
#
# A new Date object is created using one of the object creation
# class methods named after the corresponding date format, and the
# arguments appropriate to that date format; for instance,
# Date::civil() (aliased to Date::new()) with year, month,
# and day-of-month, or Date::ordinal() with year and day-of-year.
# All of these object creation class methods also take the
# Day of Calendar Reform as an optional argument.
#
# Date objects are immutable once created.
#
# Once a Date has been created, date values
# can be retrieved for the different date formats supported
# using instance methods.  For instance, #mon() gives the
# Civil month, #cwday() gives the Commercial day of the week,
# and #yday() gives the Ordinal day of the year.  Date values
# can be retrieved in any format, regardless of what format
# was used to create the Date instance.
#
# The Date class includes the Comparable module, allowing
# date objects to be compared and sorted, ranges of dates
# to be created, and so forth.
class Date

  # Full month names, in English.  Months count from 1 to 12; a
  # month's numerical representation indexed into this array
  # gives the name of that month (hence the first element is nil).
  MONTHNAMES = [nil] + %w(January February March April May June July
                          August September October November December)

  # Full names of days of the week, in English.  Days of the week
  # count from 0 to 6 (except in the commercial week); a day's numerical
  # representation indexed into this array gives the name of that day.
  DAYNAMES = %w(Sunday Monday Tuesday Wednesday Thursday Friday Saturday)

  # Abbreviated month names, in English.
  ABBR_MONTHNAMES = [nil] + %w(Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec)

  # Abbreviated day names, in English.
  ABBR_DAYNAMES = %w(Sun Mon Tue Wed Thu Fri Sat)

  [MONTHNAMES, DAYNAMES, ABBR_MONTHNAMES, ABBR_DAYNAMES].each do |xs|
    xs.each { |x| x.freeze unless x.nil? }.freeze
  end

  class Infinity < Numeric # :nodoc:

    include Comparable

    def initialize(d=1) @d = d <=> 0 end

    def d() @d end

    protected :d

    def zero?() false end
    def finite?() false end
    def infinite?() d.nonzero? end
    def nan?() d.zero? end

    def abs() self.class.new end

    def -@() self.class.new(-d) end
    def +@() self.class.new(+d) end

    def <=>(other)
      case other
        when Infinity; return d <=> other.d
        when Numeric; return d
        else
          begin
            l, r = other.coerce(self)
            return l <=> r
          rescue NoMethodError
          end
      end
      nil
    end

    def coerce(other)
      case other
        when Numeric; return -d, d
        else
          super
      end
    end

    def to_f
      return 0 if @d == 0
      if @d > 0
        Float::INFINITY
      else
        -Float::INFINITY
      end
    end

  end

  # The Julian Day Number of the Day of Calendar Reform for Italy
  # and the Catholic countries.
  #ITALY     = 2299161 # 1582-10-15

  # The Julian Day Number of the Day of Calendar Reform for England
  # and her Colonies.
  #ENGLAND   = 2361222 # 1752-09-14

  # A constant used to indicate that a Date should always use the
  # Julian calendar.
  JULIAN    =  Infinity.new

  # A constant used to indicate that a Date should always use the
  # Gregorian calendar.
  GREGORIAN = -Infinity.new

  def self.rewrite_frags(elem) # :nodoc:
    if seconds = elem[:seconds]
      d,   fr = seconds.divmod(86400)
      h,   fr = fr.divmod(3600)
      min, fr = fr.divmod(60)
      s,   fr = fr.divmod(1)
      #offset = elem[:offset]
      #seconds += offset unless offset.nil?
      elem[:jd] = 2440588 + d # UNIX_EPOCH_IN_CJD
      elem[:hour] = h
      elem[:min] = min
      elem[:sec] = s
      elem[:sec_fraction] = fr
      elem.delete(:seconds)
    end
    elem
  end
  private_class_method :rewrite_frags

  COMPLETE_FRAGS = [
    [:time,       []],
    [nil,         [:jd]],
    [:ordinal,    [:year, :yday]],
    [:civil,      [:year, :mon, :mday]],
    [:commercial, [:cwyear, :cweek, :cwday]],
    [:wday,       [:wday, :__need_jd_filling]],
    [:wnum0,      [:year, :wnum0, :wday]],
    [:wnum1,      [:year, :wnum1, :wday]],
    [nil,         [:cwyear, :cweek, :wday]],
    [nil,         [:year, :wnum0, :cwday]],
    [nil,         [:year, :wnum1, :cwday]]
  ].freeze
  private_constant :COMPLETE_FRAGS

  def self.complete_frags(elem) # :nodoc:
    g = COMPLETE_FRAGS.max_by { |_, fields| fields.count { |field| elem.key? field } }
    c = g[1].count { |field| elem.key? field }

    if c == 0 && [:hour, :min, :sec].none? { |field| elem.key? field }
      g = nil
    end

    if g && g[0] && g[1].size != c
      d ||= Date.today

      case g[0]
      when :ordinal
        elem[:year] ||= d.year
        elem[:yday] ||= 1
      when :civil
        g[1].each do |e|
          break if elem[e]
          elem[e] = d.__send__(e)
        end
        elem[:mon]  ||= 1
        elem[:mday] ||= 1
      when :commercial
        g[1].each do |e|
          break if elem[e]
          elem[e] = d.__send__(e)
        end
        elem[:cweek] ||= 1
        elem[:cwday] ||= 1
      when :wday
        elem[:jd] ||= (d - d.wday + elem[:wday]).jd
      when :wnum0
        g[1].each do |e|
          break if elem[e]
          elem[e] = d.__send__(e)
        end
        elem[:wnum0] ||= 0
        elem[:wday]  ||= 0
      when :wnum1
        g[1].each do |e|
          break if elem[e]
          elem[e] = d.__send__(e)
        end
        elem[:wnum1] ||= 0
        elem[:wday]  ||= 1
      end
    end

    if self <= DateTime
      if g && g[0] == :time
        d ||= Date.today
        elem[:jd] ||= d.jd
      end

      elem[:hour] ||= 0
      elem[:min]  ||= 0
      elem[:sec]  ||= 0
      # see [ruby-core:47226] and the "fix"
      elem[:sec] = 59 if elem[:sec] == 60
    end

    elem
  end
  private_class_method :complete_frags

  def self.valid_date_frags?(elem, sg) # :nodoc:
    if jd = elem[:jd] and
        jd = _valid_jd?(jd, sg)
      return jd
    end

    year = elem[:year]
    if year and yday = elem[:yday] and
        jd = _valid_ordinal?(year, yday, sg)
      return jd
    end

    if year and mon = elem[:mon] and mday = elem[:mday] and
        jd = _valid_civil?(year, mon, mday, sg)
      return jd
    end

    if cwyear = elem[:cwyear] and cweek = elem[:cweek] and cwday = (elem[:cwday] || elem[:wday].nonzero? || 7) and
        jd = _valid_commercial?(cwyear, cweek, cwday, sg)
      return jd
    end

    if year and wnum0 = elem[:wnum0] and wday = (elem[:wday] || (elem[:cwday] && elem[:cwday] % 7)) and
        jd = _valid_weeknum?(year, wnum0, wday, 0, sg)
      return jd
    end

    if year and wnum1 = elem[:wnum1] and wday = (
        (elem[:wday]  && (elem[:wday]  - 1) % 7) ||
        (elem[:cwday] && (elem[:cwday] - 1) % 7)
      ) and jd = _valid_weeknum?(year, wnum1, wday, 1, sg)
      return jd
    end
  end
  private_class_method :valid_date_frags?

  def self.valid_time_frags? (elem) # :nodoc:
    h, min, s = elem.values_at(:hour, :min, :sec)
    _valid_time?(h, min, s)
  end
  private_class_method :valid_time_frags?

  def self.new_by_frags(elem, sg) # :nodoc:
    raise ArgumentError, 'invalid date' unless elem

    # fast path
    if !elem.key?(:jd) && !elem.key?(:yday) &&
        (year = elem[:year]) && (mon = elem[:mon]) && (mday = elem[:mday])
      return Date.civil(year, mon, mday, sg)
    end

    elem = rewrite_frags(elem)
    elem = complete_frags(elem)
    unless jd = valid_date_frags?(elem, sg)
      raise ArgumentError, 'invalid date'
    end
    new!(jd_to_ajd(jd, 0, 0), 0, sg)
  end
  private_class_method :new_by_frags

  # Create a new Date object by parsing from a String
  # according to a specified format.
  #
  # +str+ is a String holding a date representation.
  # +fmt+ is the format that the date is in.  See
  # date/format.rb for details on supported formats.
  #
  # The default +str+ is '-4712-01-01', and the default
  # +fmt+ is '%F', which means Year-Month-Day_of_Month.
  # This gives Julian Day Number day 0.
  #
  # +sg+ specifies the Day of Calendar Reform.
  #
  # An ArgumentError will be raised if +str+ cannot be
  # parsed.
  def self.strptime(str='-4712-01-01', fmt='%F', sg=ITALY)
    new_by_frags(_strptime(str, fmt), sg)
  end

  # Create a new Date object by parsing from a String,
  # without specifying the format.
  #
  # +str+ is a String holding a date representation.
  # +comp+ specifies whether to interpret 2-digit years
  # as 19XX (>= 69) or 20XX (< 69); the default is not to.
  # The method will attempt to parse a date from the String
  # using various heuristics; see #_parse in date/format.rb
  # for more details.  If parsing fails, an ArgumentError
  # will be raised.
  #
  # The default +str+ is '-4712-01-01'; this is Julian
  # Day Number day 0.
  #
  # +sg+ specifies the Day of Calendar Reform.
  def self.parse(str='-4712-01-01', comp=true, sg=ITALY)
    elem = _parse(str, comp)
    new_by_frags(elem, sg)
  end

  def self.iso8601(str='-4712-01-01', sg=ITALY) # :nodoc:
    elem = _iso8601(str)
    new_by_frags(elem, sg)
  end

  def self.rfc3339(str='-4712-01-01T00:00:00+00:00', sg=ITALY) # :nodoc:
    elem = _rfc3339(str)
    new_by_frags(elem, sg)
  end

  def self.xmlschema(str='-4712-01-01', sg=ITALY) # :nodoc:
    elem = _xmlschema(str)
    new_by_frags(elem, sg)
  end

  def self.rfc2822(str='Mon, 1 Jan -4712 00:00:00 +0000', sg=ITALY) # :nodoc:
    elem = _rfc2822(str)
    new_by_frags(elem, sg)
  end
  class << self; alias_method :rfc822, :rfc2822 end

  def self.httpdate(str='Mon, 01 Jan -4712 00:00:00 GMT', sg=ITALY) # :nodoc:
    elem = _httpdate(str)
    new_by_frags(elem, sg)
  end

  def self.jisx0301(str='-4712-01-01', sg=ITALY) # :nodoc:
    elem = _jisx0301(str)
    new_by_frags(elem, sg)
  end

  DAYNAMES.each_with_index do |n, i|
    define_method(n.downcase + '?') { wday == i }
  end

  # Step the current date forward +step+ days at a
  # time (or backward, if +step+ is negative) until
  # we reach +limit+ (inclusive), yielding the resultant
  # date at each step.
  def step(limit, step=1) # :yield: date
=begin
    if step.zero?
      raise ArgumentError, "step can't be 0"
    end
=end
    unless block_given?
      return to_enum(:step, limit, step)
    end
    da = self
    step_cmp = step <=> 0
    if step_cmp.nil?
      raise ArgumentError.new("comparison of #{step.class} with 0 failed")
    end
    step_cmp = step_cmp > 0 ? 1 : step_cmp < 0 ? -1 : 0
    op = %w(- <= >=)[step_cmp]
    while da.__send__(op, limit)
      yield da
      da += step
    end
    self
  end

  # Step forward one day at a time until we reach +max+
  # (inclusive), yielding each date as we go.
  def upto(max, &block) # :yield: date
    step(max, +1, &block)
  end

  # Step backward one day at a time until we reach +min+
  # (inclusive), yielding each date as we go.
  def downto(min, &block) # :yield: date
    step(min, -1, &block)
  end

end

# Class representing a date and time.
#
# See the documentation to the file date.rb for an overview.
#
# DateTime objects are immutable once created.
#
# == Other methods.
#
# The following methods are defined in Date, but declared private
# there.  They are made public in DateTime.  They are documented
# here.
#
# === hour()
#
# Get the hour-of-the-day of the time.  This is given
# using the 24-hour clock, counting from midnight.  The first
# hour after midnight is hour 0; the last hour of the day is
# hour 23.
#
# === min()
#
# Get the minute-of-the-hour of the time.
#
# === sec()
#
# Get the second-of-the-minute of the time.
#
# === sec_fraction()
#
# Get the fraction of a second of the time.  This is returned as
# a +Rational+.
#
# === zone()
#
# Get the time zone as a String.  This is representation of the
# time offset such as "+1000", not the true time-zone name.
#
# === offset()
#
# Get the time zone offset as a fraction of a day.  This is returned
# as a +Rational+.
#
# === new_offset(of=0)
#
# Create a new DateTime object, identical to the current one, except
# with a new time zone offset of +of+.  +of+ is the new offset from
# UTC as a fraction of a day.
#
class DateTime < Date

  # Create a new DateTime object corresponding to the specified
  # Ordinal Date and hour +h+, minute +min+, second +s+.
  #
  # The 24-hour clock is used.  Negative values of +h+, +min+, and
  # +sec+ are treating as counting backwards from the end of the
  # next larger unit (e.g. a +min+ of -2 is treated as 58).  No
  # wraparound is performed.  If an invalid time portion is specified,
  # an ArgumentError is raised.
  #
  # +of+ is the offset from UTC as a fraction of a day (defaults to 0).
  # +sg+ specifies the Day of Calendar Reform.
  #
  # +y+ defaults to -4712, and +d+ to 1; this is Julian Day Number
  # day 0.  The time values default to 0.
  def self.ordinal(y=-4712, d=1, h=0, min=0, s=0, of=0, sg=ITALY)
    unless (jd = _valid_ordinal?(y, d, sg)) &&
           (fr = _valid_time?(h, min, s))
      raise ArgumentError, 'invalid date'
    end
    if String === of
      of = Rational(zone_to_diff(of) || 0, 86400)
    end
    new!(jd_to_ajd(jd, fr, of), of, sg)
  end

  # Create a new DateTime object corresponding to the specified

  # Commercial Date and hour +h+, minute +min+, second +s+.
  #
  # The 24-hour clock is used.  Negative values of +h+, +min+, and
  # +sec+ are treating as counting backwards from the end of the
  # next larger unit (e.g. a +min+ of -2 is treated as 58).  No
  # wraparound is performed.  If an invalid time portion is specified,
  # an ArgumentError is raised.
  #
  # +of+ is the offset from UTC as a fraction of a day (defaults to 0).
  # +sg+ specifies the Day of Calendar Reform.
  #
  # +y+ defaults to -4712, +w+ to 1, and +d+ to 1; this is
  # Julian Day Number day 0.
  # The time values default to 0.
  def self.commercial(y=-4712, w=1, d=1, h=0, min=0, s=0, of=0, sg=ITALY)
    unless (jd = _valid_commercial?(y, w, d, sg)) &&
           (fr = _valid_time?(h, min, s))
      raise ArgumentError, 'invalid date'
    end
    if String === of
      of = Rational(zone_to_diff(of) || 0, 86400)
    end
    new!(jd_to_ajd(jd, fr, of), of, sg)
  end

  def self.new_by_frags(elem, sg) # :nodoc:
    raise ArgumentError, 'invalid date' unless elem
    

    # More work to do if not :civil
    if !elem.key?(:jd) && !elem.key?(:yday) &&
        (year = elem[:year]) && (mon = elem[:mon]) && (mday = elem[:mday])
      jd = Date._valid_civil?(year, mon, mday, sg)
      elem[:hour] ||= 0
      elem[:min] ||= 0
      elem[:sec] ||= 0
      elem[:sec] = 59 if elem[:sec] == 60
    else
      elem = rewrite_frags(elem)
      elem = complete_frags(elem)
      jd = valid_date_frags?(elem, sg)
    end
    unless jd && (fr = valid_time_frags?(elem))
      raise ArgumentError, 'invalid date'
    end
    fr += (elem[:sec_fraction] || 0) / 86400
    of = Rational(elem[:offset] || 0, 86400)
    if of < -1 || of > 1
      of = 0
      warn "invalid offset is ignored" if $VERBOSE
    end
    new!(jd_to_ajd(jd, fr, of), of, sg)
  end
  private_class_method :new_by_frags

  # Create a new DateTime object by parsing from a String
  # according to a specified format.
  #
  # +str+ is a String holding a date-time representation.
  # +fmt+ is the format that the date-time is in.  See
  # date/format.rb for details on supported formats.
  #
  # The default +str+ is '-4712-01-01T00:00:00+00:00', and the default
  # +fmt+ is '%FT%T%z'.  This gives midnight on Julian Day Number day 0.
  #
  # +sg+ specifies the Day of Calendar Reform.
  #
  # An ArgumentError will be raised if +str+ cannot be
  # parsed.
  def self.strptime(str='-4712-01-01T00:00:00+00:00', fmt='%FT%T%z', sg=ITALY)
    elem = _strptime(str, fmt)
    new_by_frags(elem, sg)
  end

  # Create a new DateTime object by parsing from a String,
  # without specifying the format.
  #
  # +str+ is a String holding a date-time representation.
  # +comp+ specifies whether to interpret 2-digit years
  # as 19XX (>= 69) or 20XX (< 69); the default is not to.
  # The method will attempt to parse a date-time from the String
  # using various heuristics; see #_parse in date/format.rb
  # for more details.  If parsing fails, an ArgumentError
  # will be raised.
  #
  # The default +str+ is '-4712-01-01T00:00:00+00:00'; this is Julian
  # Day Number day 0.
  #
  # +sg+ specifies the Day of Calendar Reform.
  def self.parse(str='-4712-01-01T00:00:00+00:00', comp=true, sg=ITALY)
    elem = _parse(str, comp)
    new_by_frags(elem, sg)
  end

  def self.iso8601(str='-4712-01-01T00:00:00+00:00', sg=ITALY) # :nodoc:
    elem = _iso8601(str)
    new_by_frags(elem, sg)
  end

  def self.rfc3339(str='-4712-01-01T00:00:00+00:00', sg=ITALY) # :nodoc:
    elem = _rfc3339(str)
    new_by_frags(elem, sg)
  end

  def self.xmlschema(str='-4712-01-01T00:00:00+00:00', sg=ITALY) # :nodoc:
    elem = _xmlschema(str)
    new_by_frags(elem, sg)
  end

  def self.rfc2822(str='Mon, 1 Jan -4712 00:00:00 +0000', sg=ITALY) # :nodoc:
    elem = _rfc2822(str)
    new_by_frags(elem, sg)
  end
  class << self; alias_method :rfc822, :rfc2822 end

  def self.httpdate(str='Mon, 01 Jan -4712 00:00:00 GMT', sg=ITALY) # :nodoc:
    elem = _httpdate(str)
    new_by_frags(elem, sg)
  end

  def self.jisx0301(str='-4712-01-01T00:00:00+00:00', sg=ITALY) # :nodoc:
    elem = _jisx0301(str)
    new_by_frags(elem, sg)
  end

  # adjust superclass (Date) methods :

  public :hour, :min, :sec, :sec_fraction, :zone, :offset, :new_offset,
         :minute, :second, :second_fraction

  class << self
    undef_method :today
  end

end
