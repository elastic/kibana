#--
# Copyright (c) 2006-2014, John Mettraux, jmettraux@gmail.com
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
# THE SOFTWARE.
#
# Made in Japan.
#++


class Rufus::Scheduler

  #
  # A 'cron line' is a line in the sense of a crontab
  # (man 5 crontab) file line.
  #
  class CronLine

    # The string used for creating this cronline instance.
    #
    attr_reader :original

    attr_reader :seconds
    attr_reader :minutes
    attr_reader :hours
    attr_reader :days
    attr_reader :months
    attr_reader :weekdays
    attr_reader :monthdays
    attr_reader :timezone

    def initialize(line)

      raise ArgumentError.new(
        "not a string: #{line.inspect}"
      ) unless line.is_a?(String)

      @original = line

      items = line.split

      @timezone = (TZInfo::Timezone.get(items.last) rescue nil)
      items.pop if @timezone

      raise ArgumentError.new(
        "not a valid cronline : '#{line}'"
      ) unless items.length == 5 or items.length == 6

      offset = items.length - 5

      @seconds = offset == 1 ? parse_item(items[0], 0, 59) : [ 0 ]
      @minutes = parse_item(items[0 + offset], 0, 59)
      @hours = parse_item(items[1 + offset], 0, 24)
      @days = parse_item(items[2 + offset], 1, 31)
      @months = parse_item(items[3 + offset], 1, 12)
      @weekdays, @monthdays = parse_weekdays(items[4 + offset])

      [ @seconds, @minutes, @hours, @months ].each do |es|

        raise ArgumentError.new(
          "invalid cronline: '#{line}'"
        ) if es && es.find { |e| ! e.is_a?(Fixnum) }
      end
    end

    # Returns true if the given time matches this cron line.
    #
    def matches?(time)

      time = Time.at(time) unless time.kind_of?(Time)

      time = @timezone.utc_to_local(time.getutc) if @timezone

      return false unless sub_match?(time, :sec, @seconds)
      return false unless sub_match?(time, :min, @minutes)
      return false unless sub_match?(time, :hour, @hours)
      return false unless date_match?(time)
      true
    end

    # Returns the next time that this cron line is supposed to 'fire'
    #
    # This is raw, 3 secs to iterate over 1 year on my macbook :( brutal.
    # (Well, I was wrong, takes 0.001 sec on 1.8.7 and 1.9.1)
    #
    # This method accepts an optional Time parameter. It's the starting point
    # for the 'search'. By default, it's Time.now
    #
    # Note that the time instance returned will be in the same time zone that
    # the given start point Time (thus a result in the local time zone will
    # be passed if no start time is specified (search start time set to
    # Time.now))
    #
    #   Rufus::Scheduler::CronLine.new('30 7 * * *').next_time(
    #     Time.mktime(2008, 10, 24, 7, 29))
    #   #=> Fri Oct 24 07:30:00 -0500 2008
    #
    #   Rufus::Scheduler::CronLine.new('30 7 * * *').next_time(
    #     Time.utc(2008, 10, 24, 7, 29))
    #   #=> Fri Oct 24 07:30:00 UTC 2008
    #
    #   Rufus::Scheduler::CronLine.new('30 7 * * *').next_time(
    #     Time.utc(2008, 10, 24, 7, 29)).localtime
    #   #=> Fri Oct 24 02:30:00 -0500 2008
    #
    # (Thanks to K Liu for the note and the examples)
    #
    def next_time(from=Time.now)

      time = local_time(from)
      time = round_to_seconds(time)

      # start at the next second
      time = time + 1

      loop do
        unless date_match?(time)
          dst = time.isdst
          time += (24 - time.hour) * 3600 - time.min * 60 - time.sec
          time -= 3600 if time.isdst != dst # not necessary for winter, but...
          next
        end
        unless sub_match?(time, :hour, @hours)
          time += (60 - time.min) * 60 - time.sec; next
        end
        unless sub_match?(time, :min, @minutes)
          time += 60 - time.sec; next
        end
        unless sub_match?(time, :sec, @seconds)
          time += 1; next
        end

        break
      end

      global_time(time, from.utc?)

    rescue TZInfo::PeriodNotFound

      next_time(from + 3600)
    end

    # Returns the previous time the cronline matched. It's like next_time, but
    # for the past.
    #
    def previous_time(from=Time.now)

      time = local_time(from)
      time = round_to_seconds(time)

      # start at the previous second
      time = time - 1

      loop do
        unless date_match?(time)
          time -= time.hour * 3600 + time.min * 60 + time.sec + 1; next
        end
        unless sub_match?(time, :hour, @hours)
          time -= time.min * 60 + time.sec + 1; next
        end
        unless sub_match?(time, :min, @minutes)
          time -= time.sec + 1; next
        end
        unless sub_match?(time, :sec, @seconds)
          time -= 1; next
        end

        break
      end

      global_time(time, from.utc?)

    rescue TZInfo::PeriodNotFound

      previous_time(time)
    end

    # Returns an array of 6 arrays (seconds, minutes, hours, days,
    # months, weekdays).
    # This method is used by the cronline unit tests.
    #
    def to_array

      [
        @seconds,
        @minutes,
        @hours,
        @days,
        @months,
        @weekdays,
        @monthdays,
        @timezone ? @timezone.name : nil
      ]
    end

    # Returns a quickly computed approximation of the frequency for this
    # cron line.
    #
    # #brute_frequency, on the other hand, will compute the frequency by
    # examining a whole, that can take more than seconds for a seconds
    # level cron...
    #
    def frequency

      return brute_frequency unless @seconds && @seconds.length > 1

      delta = 60
      prev = @seconds[0]

      @seconds[1..-1].each do |sec|
        d = sec - prev
        delta = d if d < delta
      end

      delta
    end

    # Returns the shortest delta between two potential occurences of the
    # schedule described by this cronline.
    #
    # .
    #
    # For a simple cronline like "*/5 * * * *", obviously the frequency is
    # five minutes. Why does this method look at a whole year of #next_time ?
    #
    # Consider "* * * * sun#2,sun#3", the computed frequency is 1 week
    # (the shortest delta is the one between the second sunday and the third
    # sunday). This method takes no chance and runs next_time for the span
    # of a whole year and keeps the shortest.
    #
    # Of course, this method can get VERY slow if you call on it a second-
    # based cronline...
    #
    # Since it's a rarely used method, I haven't taken the time to make it
    # smarter/faster.
    #
    # One obvious improvement would be to cache the result once computed...
    #
    # See https://github.com/jmettraux/rufus-scheduler/issues/89
    # for a discussion about this method.
    #
    def brute_frequency

      delta = 366 * DAY_S

      t0 = previous_time(Time.local(2000, 1, 1))

      loop do

        break if delta <= 1
        break if delta <= 60 && @seconds && @seconds.size == 1

        t1 = next_time(t0)
        d = t1 - t0
        delta = d if d < delta

        break if @months == nil && t1.month == 2
        break if t1.year == 2001

        t0 = t1
      end

      delta
    end

    protected

    WEEKDAYS = %w[ sun mon tue wed thu fri sat ]
    DAY_S = 24 * 3600
    WEEK_S = 7 * DAY_S

    def parse_weekdays(item)

      return nil if item == '*'

      items = item.downcase.split(',')

      weekdays = nil
      monthdays = nil

      items.each do |it|

        if m = it.match(/^(.+)#(l|-?[12345])$/)

          raise ArgumentError.new(
            "ranges are not supported for monthdays (#{it})"
          ) if m[1].index('-')

          expr = it.gsub(/#l/, '#-1')

          (monthdays ||= []) << expr

        else

          expr = it.dup
          WEEKDAYS.each_with_index { |a, i| expr.gsub!(/#{a}/, i.to_s) }

          raise ArgumentError.new(
            "invalid weekday expression (#{it})"
          ) if expr !~ /^0*[0-7](-0*[0-7])?$/

          its = expr.index('-') ? parse_range(expr, 0, 7) : [ Integer(expr) ]
          its = its.collect { |i| i == 7 ? 0 : i }

          (weekdays ||= []).concat(its)
        end
      end

      weekdays = weekdays.uniq if weekdays

      [ weekdays, monthdays ]
    end

    def parse_item(item, min, max)

      return nil if item == '*'

      r = item.split(',').map { |i| parse_range(i.strip, min, max) }.flatten

      raise ArgumentError.new(
        "found duplicates in #{item.inspect}"
      ) if r.uniq.size < r.size

      r
    end

    RANGE_REGEX = /^(\*|\d{1,2})(?:-(\d{1,2}))?(?:\/(\d{1,2}))?$/

    def parse_range(item, min, max)

      return %w[ L ] if item == 'L'

      item = '*' + item if item.match(/^\//)

      m = item.match(RANGE_REGEX)

      raise ArgumentError.new(
        "cannot parse #{item.inspect}"
      ) unless m

      sta = m[1]
      sta = sta == '*' ? min : sta.to_i

      edn = m[2]
      edn = edn ? edn.to_i : sta
      edn = max if m[1] == '*'

      inc = m[3]
      inc = inc ? inc.to_i : 1

      raise ArgumentError.new(
        "#{item.inspect} is not in range #{min}..#{max}"
      ) if sta < min || edn > max

      r = []
      val = sta

      loop do
        v = val
        v = 0 if max == 24 && v == 24
        r << v
        break if inc == 1 && val == edn
        val += inc
        break if inc > 1 && val > edn
        val = min if val > max
      end

      r.uniq
    end

    def sub_match?(time, accessor, values)

      value = time.send(accessor)

      return true if values.nil?
      return true if values.include?('L') && (time + DAY_S).day == 1

      return true if value == 0 && accessor == :hour && values.include?(24)

      values.include?(value)
    end

    def monthday_match?(date, values)

      return true if values.nil?

      today_values = monthdays(date)

      (today_values & values).any?
    end

    def date_match?(date)

      return false unless sub_match?(date, :day, @days)
      return false unless sub_match?(date, :month, @months)
      return false unless sub_match?(date, :wday, @weekdays)
      return false unless monthday_match?(date, @monthdays)
      true
    end

    def monthdays(date)

      pos = 1
      d = date.dup

      loop do
        d = d - WEEK_S
        break if d.month != date.month
        pos = pos + 1
      end

      neg = -1
      d = date.dup

      loop do
        d = d + WEEK_S
        break if d.month != date.month
        neg = neg - 1
      end

      [ "#{WEEKDAYS[date.wday]}##{pos}", "#{WEEKDAYS[date.wday]}##{neg}" ]
    end

    def local_time(time)

      @timezone ? @timezone.utc_to_local(time.getutc) : time
    end

    def global_time(time, from_in_utc)

      if @timezone
        time =
          begin
            @timezone.local_to_utc(time)
          rescue TZInfo::AmbiguousTime
            @timezone.local_to_utc(time, time.isdst)
          end
        time = time.getlocal unless from_in_utc
      end

      time
    end

    def round_to_seconds(time)

      # Ruby 1.8 doesn't have #round
      time.respond_to?(:round) ? time.round : time - time.usec * 1e-6
    end
  end
end

