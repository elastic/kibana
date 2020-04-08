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
    # job classes
    #++

    class Job

      #
      # Used by Job#kill
      #
      class KillSignal < StandardError; end

      attr_reader :id
      attr_reader :opts
      attr_reader :original
      attr_reader :scheduled_at
      attr_reader :last_time
      attr_reader :unscheduled_at
      attr_reader :tags
      attr_reader :count
      attr_reader :last_work_time
      attr_reader :mean_work_time

      # next trigger time
      #
      attr_accessor :next_time

      # anything with a #call(job[, timet]) method,
      # what gets actually triggered
      #
      attr_reader :callable

      # a reference to the instance whose call method is the @callable
      #
      attr_reader :handler

      def initialize(scheduler, original, opts, block)

        @scheduler = scheduler
        @original = original
        @opts = opts

        @handler = block

        @callable =
          if block.respond_to?(:arity)
            block
          elsif block.respond_to?(:call)
            block.method(:call)
          elsif block.is_a?(Class)
            @handler = block.new
            @handler.method(:call) rescue nil
          else
            nil
          end

        @scheduled_at = Time.now
        @unscheduled_at = nil
        @last_time = nil

        @locals = {}
        @local_mutex = Mutex.new

        @id = determine_id

        raise(
          ArgumentError,
          'missing block or callable to schedule',
          caller[2..-1]
        ) unless @callable

        @tags = Array(opts[:tag] || opts[:tags]).collect { |t| t.to_s }

        @count = 0
        @last_work_time = 0.0
        @mean_work_time = 0.0

        # tidy up options

        if @opts[:allow_overlap] == false || @opts[:allow_overlapping] == false
          @opts[:overlap] = false
        end
        if m = @opts[:mutex]
          @opts[:mutex] = Array(m)
        end
      end

      alias job_id id

      def trigger(time)

        set_next_time(time)

        return if (
          opts[:overlap] == false &&
          running?
        )
        return if (
          callback(:confirm_lock, time) &&
          callback(:on_pre_trigger, time)
        ) == false

        @count += 1

        if opts[:blocking]
          do_trigger(time)
        else
          do_trigger_in_thread(time)
        end
      end

      def unschedule

        @unscheduled_at = Time.now
      end

      def threads

        Thread.list.select { |t| t[:rufus_scheduler_job] == self }
      end

      # Kills all the threads this Job currently has going on.
      #
      def kill

        threads.each { |t| t.raise(KillSignal) }
      end

      def running?

        threads.any?
      end

      def scheduled?

        @scheduler.scheduled?(self)
      end

      def []=(key, value)

        @local_mutex.synchronize { @locals[key] = value }
      end

      def [](key)

        @local_mutex.synchronize { @locals[key] }
      end

      def key?(key)

        @local_mutex.synchronize { @locals.key?(key) }
      end

      def keys

        @local_mutex.synchronize { @locals.keys }
      end

      #def hash
      #  self.object_id
      #end
      #def eql?(o)
      #  o.class == self.class && o.hash == self.hash
      #end
        #
        # might be necessary at some point

      # Calls the callable (usually a block) wrapped in this Job instance.
      #
      # Warning: error rescueing is the responsibity of the caller.
      #
      def call(do_rescue=false)

        do_call(Time.now, do_rescue)
      end

      protected

      def callback(meth, time)

        return true unless @scheduler.respond_to?(meth)

        arity = @scheduler.method(meth).arity
        args = [ self, time ][0, (arity < 0 ? 2 : arity)]

        @scheduler.send(meth, *args)
      end

      def compute_timeout

        if to = @opts[:timeout]
          Rufus::Scheduler.parse(to)
        else
          nil
        end
      end

      def mutex(m)

        m.is_a?(Mutex) ? m : (@scheduler.mutexes[m.to_s] ||= Mutex.new)
      end

      def do_call(time, do_rescue)

        args = [ self, time ][0, @callable.arity]
        @callable.call(*args)

      rescue StandardError => se

        raise se unless do_rescue

        return if se.is_a?(KillSignal) # discard

        @scheduler.on_error(self, se)

      # exceptions above StandardError do pass through
      end

      def do_trigger(time)

        t = Time.now
          # if there are mutexes, t might be really bigger than time

        Thread.current[:rufus_scheduler_job] = self
        Thread.current[:rufus_scheduler_time] = t
        Thread.current[:rufus_scheduler_timeout] = compute_timeout

        @last_time = t

        do_call(time, true)

      ensure

        @last_work_time =
          Time.now - Thread.current[:rufus_scheduler_time]
        @mean_work_time =
          ((@count - 1) * @mean_work_time + @last_work_time) / @count

        post_trigger(time)

        Thread.current[:rufus_scheduler_job] = nil
        Thread.current[:rufus_scheduler_time] = nil
        Thread.current[:rufus_scheduler_timeout] = nil
      end

      def post_trigger(time)

        set_next_time(time, true)

        callback(:on_post_trigger, time)
      end

      def start_work_thread

        thread =
          Thread.new do

            Thread.current[@scheduler.thread_key] = true
            Thread.current[:rufus_scheduler_job_thread] = true

            loop do

              job, time = @scheduler.work_queue.pop

              break if @scheduler.started_at == nil

              next if job.unscheduled_at

              begin

                (job.opts[:mutex] || []).reduce(
                  lambda { job.do_trigger(time) }
                ) do |b, m|
                  lambda { mutex(m).synchronize { b.call } }
                end.call

              rescue KillSignal

                # simply go on looping
              end
            end
          end

        thread[@scheduler.thread_key] = true
        thread[:rufus_scheduler_work_thread] = true
          #
          # same as above (in the thead block),
          # but since it has to be done as quickly as possible.
          # So, whoever is running first (scheduler thread vs job thread)
          # sets this information
      end

      def do_trigger_in_thread(time)

        threads = @scheduler.work_threads

        cur = threads.size
        vac = threads.select { |t| t[:rufus_scheduler_job] == nil }.size
        #min = @scheduler.min_work_threads
        max = @scheduler.max_work_threads
        que = @scheduler.work_queue.size

        start_work_thread if vac - que < 1 && cur < max

        @scheduler.work_queue << [ self, time ]
      end
    end

    class OneTimeJob < Job

      alias time next_time

      def occurrences(time0, time1)

        time >= time0 && time <= time1 ? [ time ] : []
      end

      protected

      def determine_id

        [
          self.class.name.split(':').last.downcase[0..-4],
          @scheduled_at.to_f,
          @next_time.to_f,
          opts.hash.abs
        ].map(&:to_s).join('_')
      end

      # There is no next_time for one time jobs, hence the false.
      #
      def set_next_time(trigger_time, is_post=false)

        @next_time = is_post ? nil : false
      end
    end

    class AtJob < OneTimeJob

      def initialize(scheduler, time, opts, block)

        super(scheduler, time, opts, block)

        @next_time =
          opts[:_t] || Rufus::Scheduler.parse_at(time, opts)
      end
    end

    class InJob < OneTimeJob

      def initialize(scheduler, duration, opts, block)

        super(scheduler, duration, opts, block)

        @next_time =
          @scheduled_at +
          opts[:_t] || Rufus::Scheduler.parse_in(duration, opts)
      end
    end

    class RepeatJob < Job

      attr_reader :paused_at

      attr_reader :first_at
      attr_accessor :last_at
      attr_accessor :times

      def initialize(scheduler, duration, opts, block)

        super

        @paused_at = nil

        @times = opts[:times]

        raise ArgumentError.new(
          "cannot accept :times => #{@times.inspect}, not nil or an int"
        ) unless @times == nil || @times.is_a?(Fixnum)

        self.first_at =
          opts[:first] || opts[:first_time] ||
          opts[:first_at] || opts[:first_in] ||
          0
        self.last_at =
          opts[:last] || opts[:last_at] || opts[:last_in]
      end

      def first_at=(first)

        n = Time.now
        first = n + 0.001 if first == :now || first == :immediately

        @first_at = Rufus::Scheduler.parse_to_time(first)

        raise ArgumentError.new(
          "cannot set first[_at|_in] in the past: " +
          "#{first.inspect} -> #{@first_at.inspect}"
        ) if first != 0 && @first_at < n
      end

      def last_at=(last)

        @last_at = last ? Rufus::Scheduler.parse_to_time(last) : nil

        raise ArgumentError.new(
          "cannot set last[_at|_in] in the past: " +
          "#{last.inspect} -> #{@last_at.inspect}"
        ) if last && @last_at < Time.now
      end

      def trigger(time)

        return if @paused_at
        return if time < @first_at
          #
          # TODO: remove me when @first_at gets reworked

        return (@next_time = nil) if @times && @times < 1
        return (@next_time = nil) if @last_at && time >= @last_at
          #
          # TODO: rework that, jobs are thus kept 1 step too much in @jobs

        super

        @times -= 1 if @times
      end

      def pause

        @paused_at = Time.now
      end

      def resume

        @paused_at = nil
      end

      def paused?

        @paused_at != nil
      end

      def determine_id

        [
          self.class.name.split(':').last.downcase[0..-4],
          @scheduled_at.to_f,
          opts.hash.abs
        ].map(&:to_s).join('_')
      end

      def occurrences(time0, time1)

        a = []

        nt = @next_time
        ts = @times

        loop do

          break if nt > time1
          break if ts && ts <= 0

          a << nt if nt >= time0

          nt = next_time_from(nt)
          ts = ts - 1 if ts
        end

        a
      end
    end

    #
    # A parent class of EveryJob and IntervalJob
    #
    class EvInJob < RepeatJob

      def first_at=(first)

        super

        @next_time = @first_at
      end
    end

    class EveryJob < EvInJob

      attr_reader :frequency

      def initialize(scheduler, duration, opts, block)

        super(scheduler, duration, opts, block)

        @frequency = Rufus::Scheduler.parse_in(@original)

        raise ArgumentError.new(
          "cannot schedule #{self.class} with a frequency " +
          "of #{@frequency.inspect} (#{@original.inspect})"
        ) if @frequency <= 0

        set_next_time(nil)
      end

      protected

      def set_next_time(trigger_time, is_post=false)

        return if is_post

        @next_time =
          if trigger_time
            trigger_time + @frequency
          elsif @first_at < Time.now
            Time.now + @frequency
          else
            @first_at
          end
      end

      def next_time_from(time)

        time + @frequency
      end
    end

    class IntervalJob < EvInJob

      attr_reader :interval

      def initialize(scheduler, interval, opts, block)

        super(scheduler, interval, opts, block)

        @interval = Rufus::Scheduler.parse_in(@original)

        raise ArgumentError.new(
          "cannot schedule #{self.class} with an interval " +
          "of #{@interval.inspect} (#{@original.inspect})"
        ) if @interval <= 0

        set_next_time(nil)
      end

      protected

      def set_next_time(trigger_time, is_post=false)

        @next_time =
          if is_post
            Time.now + @interval
          elsif trigger_time.nil?
            if @first_at < Time.now
              Time.now + @interval
            else
              @first_at
            end
          else
            false
          end
      end

      def next_time_from(time)

        time + @mean_work_time + @interval
      end
    end

    class CronJob < RepeatJob

      def initialize(scheduler, cronline, opts, block)

        super(scheduler, cronline, opts, block)

        @cron_line = opts[:_t] || CronLine.new(cronline)
        @next_time = @cron_line.next_time
      end

      def frequency

        @cron_line.frequency
      end

      def brute_frequency

        @cron_line.brute_frequency
      end

      protected

      def set_next_time(trigger_time, is_post=false)

        @next_time = @cron_line.next_time
      end

      def next_time_from(time)

        @cron_line.next_time(time)
      end
    end
  end
end

