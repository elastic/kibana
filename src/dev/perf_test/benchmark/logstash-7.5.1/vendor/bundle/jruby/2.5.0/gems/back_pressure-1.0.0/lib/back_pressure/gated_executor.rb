# encoding: utf-8

# Copyright 2019 Ry Biesemeyer <identity@yaauie.com>
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

require_relative 'executor'

module BackPressure
  ##
  # A {GatedExecutor} is an implementation of {BackPressure::Executor} that
  # allows external control of back-pressure state, and is useful when
  # non-blocking APIs provide hooks for identifying when they _should_ block.
  #
  # @author Ry Biesemeyer <identity@yaauie.com>
  # @since 1.0.0
  #
  # @example Using a GatedExecutor with a non-blocking API
  #   gated_executor = BackPressure::GatedExecutor.new
  #
  #   non_blocking_api_client.on_connection_blocked   { gated_executor.engage_back_pressure }
  #   non_blocking_api_client.on_connection_unblocked { gated_executor.remove_back_pressure }
  #
  #   16.times do
  #     Thread.new do
  #       loop do
  #         message = queue.pop
  #         gated_executor.execute { non_blocking_api_client.push(message) }
  #       end
  #     end
  #   end
  class GatedExecutor < Executor

    DEFAULT_REASON = "reason not given".freeze
    private_constant :DEFAULT_REASON

    ##
    # @param logger [Logger]: logger on which to emit (optional)
    # @param description [String]: description for logs (optional)
    # @param log_threshold [Number]: silences blockage warnings for durations
    #                                less than the provided value
    #                                (default `0`).
    #
    # @yield [gated_executor] if a block is provided, the newly-created
    #                         instance is yielded to the given block after
    #                         being initialised.
    # @yieldparam [self]
    # @yieldreturn [void]
    def initialize(logger:        nil,
                   description:   nil,
                   log_threshold: 1)

      @logger = logger
      @desc = (description ? description.dup : "#{self.class.name}<#{__id__}>").freeze
      @log_threshold = log_threshold

      @control_mutex = Mutex.new
      @control_condv = ConditionVariable.new

      @blocked_threads = Set.new
      @blocked_threads_mutex = Mutex.new

      yield(self) if block_given?
    end

    ##
    # Engages back-pressure and immediately returns; threads that send this
    # instance `GatedExecutor#execute` will be blocked until back-pressure is
    # removed.
    #
    # @param reason [String]: the reason back-pressure is being applied, to be
    #                         included in the log message (optional).
    # @return [void]
    def engage_back_pressure(reason=DEFAULT_REASON)
      @control_mutex.synchronize do
        if !@back_pressure_engaged
          @back_pressure_engaged = true
          @logger && @logger.info("#{@desc} back-pressure engaged (#{reason})")
        else
          @logger && @logger.debug("#{@desc} attempted to engage back-pressure when it is already engaged (#{reason})")
        end
      end
    end

    ##
    # Removes back-pressure, waking any threads that are currently blocked
    # by back-pressure, and immediately returns.
    #
    # @note No guarantee of ordering are made with regard to threads that
    #       are blocked at the instant back-pressure is removed.
    #
    # @return [void]
    def remove_back_pressure(reason=DEFAULT_REASON)
      @control_mutex.synchronize do
        if @back_pressure_engaged
          @back_pressure_engaged = false
          @logger && @logger.info("#{@desc} back-pressure removed (#{reason})")
          @control_condv.broadcast # wakeup _all_ waiting threads
        else
          @logger && @logger.debug("#{@desc} attempted to remove back-pressure when it not engaged (#{reason})")
        end
      end
    end

    ##
    # Helper method for determining if back-pressure is currently engaged.
    #
    # @return [Boolean]
    def back_pressure_engaged?
      @control_mutex.synchronize { @back_pressure_engaged }
    end

    ##
    # (see Executor#execute)
    #
    # @note Care must be taken to ensure that back-pressure control is executed
    #       outside of this block, as the block provided is not executed while
    #       back-pressure is engaged.
    def execute(blocking_time_limit=nil)
      fail(ArgumentError, 'block required!') unless block_given?

      if !@back_pressure_engaged || block_until_back_pressure_removed(blocking_time_limit)
        yield
        return true
      else
        return false
      end
    end

    ##
    # (see Executor#execute!)
    #
    # @note Care must be taken to ensure that back-pressure control is executed
    #       outside of this block, as the block provided is not executed while
    #       back-pressure is engaged.
    def execute!(blocking_time_limit=nil)
      execute(blocking_time_limit) do
        return yield
      end

      fail(ExecutionExpired)
    end

    ##
    # (see Executor#blocked_threads)
    def blocked_threads
      @blocked_threads_mutex.synchronize { @blocked_threads.dup.freeze }
    end

    ##
    # (see Executor#blocked?)
    def blocked?
      blocked_threads.any?
    end

    private

    ##
    # Blocks while back-pressure is engaged, immediately unblocking all threads
    # as soon as the back-pressure is removed.
    #
    # @api private
    #
    # @param blocking_time_limit [Number]: the maximum time to wait, in seconds,
    #                             when back-pressure is being applied,
    #                             before aborting (optional).
    #
    # @return [Boolean] returns `true` as soon as back-pressure is released,
    #                   or `false` if a provided `blocking_time_limit` was
    #                   reached before back-ressure could be released.
    def block_until_back_pressure_removed(blocking_time_limit=nil)
      @blocked_threads_mutex.synchronize { @blocked_threads.add(Thread.current) }

      timeout = [0.5, blocking_time_limit].compact.min
      start = Time.now
      thread_id = Thread.current.to_s

      loop do
        should_block = @control_mutex.synchronize do
          @control_condv.wait(@control_mutex, timeout)
          @back_pressure_engaged
        end
        break unless should_block

        block_duration = Time.now - start
        if @logger && block_duration > @log_threshold
          @logger.warn("#{@desc} has been blocked for #{block_duration.round(2)}s... (#{thread_id})")
        end

        if blocking_time_limit && block_duration > blocking_time_limit
          @logger && @logger.warn("#{@desc} blocking back-pressure exceeded limit of #{blocking_time_limit}s (#{thread_id})")
          return false
        end

        timeout = [30, (timeout * 2), blocking_time_limit && (blocking_time_limit-block_duration)].compact.min
      end

      return true
    ensure
      @blocked_threads_mutex.synchronize { @blocked_threads.delete(Thread.current) }
    end
  end
end