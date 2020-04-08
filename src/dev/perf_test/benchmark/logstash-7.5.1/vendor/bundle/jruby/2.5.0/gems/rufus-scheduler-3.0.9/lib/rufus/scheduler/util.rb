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


module Rufus

  class Scheduler

    #--
    # time and string methods
    #++

    def self.parse(o, opts={})

      opts[:no_error] = true

      parse_cron(o, opts) ||
      parse_in(o, opts) || # covers 'every' schedule strings
      parse_at(o, opts) ||
      raise(ArgumentError.new("couldn't parse \"#{o}\""))
    end

    def self.parse_in(o, opts={})

      o.is_a?(String) ? parse_duration(o, opts) : o
    end

    TZ_REGEX = /\b((?:[a-zA-Z][a-zA-z0-9\-+]+)(?:\/[a-zA-Z0-9_\-+]+)?)\b/

    def self.parse_at(o, opts={})

      return o if o.is_a?(Time)

      # TODO: deal with tz if suffixed to Chronic string?
      return Chronic.parse(o, opts) if defined?(Chronic)

      tz = nil
      s =
        o.to_s.gsub(TZ_REGEX) { |m|
          t = TZInfo::Timezone.get(m) rescue nil
          tz ||= t
          t ? '' : m
        }

      begin
        DateTime.parse(o)
      rescue
        raise ArgumentError, "no time information in #{o.inspect}"
      end if RUBY_VERSION < '1.9.0'

      t = Time.parse(s)

      tz ? tz.local_to_utc(t) : t

    rescue StandardError => se

      return nil if opts[:no_error]
      raise se
    end

    def self.parse_cron(o, opts)

      CronLine.new(o)

    rescue ArgumentError => ae

      return nil if opts[:no_error]
      raise ae
    end

    def self.parse_to_time(o)

      t = o
      t = parse(t) if t.is_a?(String)
      t = Time.now + t if t.is_a?(Numeric)

      raise ArgumentError.new(
        "cannot turn #{o.inspect} to a point in time, doesn't make sense"
      ) unless t.is_a?(Time)

      t
    end

    DURATIONS2M = [
      [ 'y', 365 * 24 * 3600 ],
      [ 'M', 30 * 24 * 3600 ],
      [ 'w', 7 * 24 * 3600 ],
      [ 'd', 24 * 3600 ],
      [ 'h', 3600 ],
      [ 'm', 60 ],
      [ 's', 1 ]
    ]
    DURATIONS2 = DURATIONS2M.dup
    DURATIONS2.delete_at(1)

    DURATIONS = DURATIONS2M.inject({}) { |r, (k, v)| r[k] = v; r }
    DURATION_LETTERS = DURATIONS.keys.join

    DU_KEYS = DURATIONS2M.collect { |k, v| k.to_sym }

    # Turns a string like '1m10s' into a float like '70.0', more formally,
    # turns a time duration expressed as a string into a Float instance
    # (millisecond count).
    #
    # w -> week
    # d -> day
    # h -> hour
    # m -> minute
    # s -> second
    # M -> month
    # y -> year
    # 'nada' -> millisecond
    #
    # Some examples:
    #
    #   Rufus::Scheduler.parse_duration "0.5"    # => 0.5
    #   Rufus::Scheduler.parse_duration "500"    # => 0.5
    #   Rufus::Scheduler.parse_duration "1000"   # => 1.0
    #   Rufus::Scheduler.parse_duration "1h"     # => 3600.0
    #   Rufus::Scheduler.parse_duration "1h10s"  # => 3610.0
    #   Rufus::Scheduler.parse_duration "1w2d"   # => 777600.0
    #
    # Negative time strings are OK (Thanks Danny Fullerton):
    #
    #   Rufus::Scheduler.parse_duration "-0.5"   # => -0.5
    #   Rufus::Scheduler.parse_duration "-1h"    # => -3600.0
    #
    def self.parse_duration(string, opts={})

      string = string.to_s

      return 0.0 if string == ''

      m = string.match(/^(-?)([\d\.#{DURATION_LETTERS}]+)$/)

      return nil if m.nil? && opts[:no_error]
      raise ArgumentError.new("cannot parse '#{string}'") if m.nil?

      mod = m[1] == '-' ? -1.0 : 1.0
      val = 0.0

      s = m[2]

      while s.length > 0
        m = nil
        if m = s.match(/^(\d+|\d+\.\d*|\d*\.\d+)([#{DURATION_LETTERS}])(.*)$/)
          val += m[1].to_f * DURATIONS[m[2]]
        elsif s.match(/^\d+$/)
          val += s.to_i
        elsif s.match(/^\d*\.\d*$/)
          val += s.to_f
        elsif opts[:no_error]
          return nil
        else
          raise ArgumentError.new(
            "cannot parse '#{string}' (especially '#{s}')"
          )
        end
        break unless m && m[3]
        s = m[3]
      end

      mod * val
    end

    class << self
      #-
      # for compatibility with rufus-scheduler 2.x
      #+
      alias parse_duration_string parse_duration
      alias parse_time_string parse_duration
    end


    # Turns a number of seconds into a a time string
    #
    #   Rufus.to_duration 0                    # => '0s'
    #   Rufus.to_duration 60                   # => '1m'
    #   Rufus.to_duration 3661                 # => '1h1m1s'
    #   Rufus.to_duration 7 * 24 * 3600        # => '1w'
    #   Rufus.to_duration 30 * 24 * 3600 + 1   # => "4w2d1s"
    #
    # It goes from seconds to the year. Months are not counted (as they
    # are of variable length). Weeks are counted.
    #
    # For 30 days months to be counted, the second parameter of this
    # method can be set to true.
    #
    #   Rufus.to_duration 30 * 24 * 3600 + 1, true   # => "1M1s"
    #
    # If a Float value is passed, milliseconds will be displayed without
    # 'marker'
    #
    #   Rufus.to_duration 0.051                       # => "51"
    #   Rufus.to_duration 7.051                       # => "7s51"
    #   Rufus.to_duration 0.120 + 30 * 24 * 3600 + 1  # => "4w2d1s120"
    #
    # (this behaviour mirrors the one found for parse_time_string()).
    #
    # Options are :
    #
    # * :months, if set to true, months (M) of 30 days will be taken into
    #   account when building up the result
    # * :drop_seconds, if set to true, seconds and milliseconds will be trimmed
    #   from the result
    #
    def self.to_duration(seconds, options={})

      h = to_duration_hash(seconds, options)

      return (options[:drop_seconds] ? '0m' : '0s') if h.empty?

      s =
        DU_KEYS.inject('') { |r, key|
          count = h[key]
          count = nil if count == 0
          r << "#{count}#{key}" if count
          r
        }

      ms = h[:ms]
      s << ms.to_s if ms

      s
    end

    class << self
      #-
      # for compatibility with rufus-scheduler 2.x
      #+
      alias to_duration_string to_duration
      alias to_time_string to_duration
    end

    # Turns a number of seconds (integer or Float) into a hash like in :
    #
    #   Rufus.to_duration_hash 0.051
    #     # => { :ms => "51" }
    #   Rufus.to_duration_hash 7.051
    #     # => { :s => 7, :ms => "51" }
    #   Rufus.to_duration_hash 0.120 + 30 * 24 * 3600 + 1
    #     # => { :w => 4, :d => 2, :s => 1, :ms => "120" }
    #
    # This method is used by to_duration behind the scenes.
    #
    # Options are :
    #
    # * :months, if set to true, months (M) of 30 days will be taken into
    #   account when building up the result
    # * :drop_seconds, if set to true, seconds and milliseconds will be trimmed
    #   from the result
    #
    def self.to_duration_hash(seconds, options={})

      h = {}

      if seconds.is_a?(Float)
        h[:ms] = (seconds % 1 * 1000).to_i
        seconds = seconds.to_i
      end

      if options[:drop_seconds]
        h.delete(:ms)
        seconds = (seconds - seconds % 60)
      end

      durations = options[:months] ? DURATIONS2M : DURATIONS2

      durations.each do |key, duration|

        count = seconds / duration
        seconds = seconds % duration

        h[key.to_sym] = count if count > 0
      end

      h
    end

    #--
    # misc
    #++

    # Produces the UTC string representation of a Time instance
    #
    # like "2009/11/23 11:11:50.947109 UTC"
    #
    def self.utc_to_s(t=Time.now)

      "#{t.utc.strftime('%Y-%m-%d %H:%M:%S')}.#{sprintf('%06d', t.usec)} UTC"
    end

    # Produces a hour/min/sec/milli string representation of Time instance
    #
    def self.h_to_s(t=Time.now)

      "#{t.strftime('%H:%M:%S')}.#{sprintf('%06d', t.usec)}"
    end

    # Debugging tools...
    #
    class D

      def self.h_to_s(t=Time.now); Rufus::Scheduler.h_to_s(t); end
    end
  end
end

