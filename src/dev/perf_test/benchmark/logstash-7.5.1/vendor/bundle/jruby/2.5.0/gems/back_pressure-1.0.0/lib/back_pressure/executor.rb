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

require_relative "execution_expired"

module BackPressure
  ##
  # Implementations of `BackPressure::Executor` are capable of providing
  # blocking back-pressure to callers using their `execute` or `execute!`
  # methods.
  #
  # This interface makes no guarantees about how implementations go about
  # controlling back-pressure or the order in which execution will occur
  # in the presence or absence of blocking back-pressure.
  #
  # @abstract
  #
  # @author Ry Biesemeyer <identity@yaauue.com>
  # @since 1.0.0
  class Executor
    ##
    # Executes the provided block, _after_ waiting out any back-pressure,
    # returning `true` IFF the block was executed.
    #
    # @param blocking_time_limit [Number]: the maximum time to wait, in
    #                                      seconds, when back-pressure is
    #                                      being applied, before aborting
    #                                      (optional).
    # @return [Boolean]: returns `true` if block was successfully executed,
    #                    and `false` if tht `blocking_time_limit` was
    #                    reached before it could be executed.
    #
    # @yieldreturn [void]: the value returned by the block is ignored by
    #                      this method.
    def execute(blocking_time_limit: nil)
      fail NotImplementedError
    end

    ##
    # Executes the provided block, _after_ waiting out any back-pressure,
    # returning the result of the block or raising an `ExecutionExpired`
    # exception if the provided limit was reached before execution could
    # begin.
    #
    # @param blocking_time_limit [Number]: the maximum time to wait, in
    #                                      seconds, when back-pressure is
    #                                      being applied, before aborting
    #                                      (optional).
    # @return [Object]: returns the unmodified value of the result of
    #                   executing the provided block.
    # @raise [ExecutionExpired]
    # @yieldreturn [Object]: the value returned from the block is returned
    #                        by this method
    def execute!(blocking_time_limit: nil)
      fail NotImplementedError
    end

    ##
    # Helper method for observing which threads, if any, are blocked at
    # the instant the method is invoked. The returned value is a frozen
    # snapshot, and the included threads are not guaranteed to be still
    # blocking by the time they are accessed.
    #
    # @api observation
    # @note This method should be used only for observation-based tooling.
    #
    # @return [Set{Thread}]
    def blocked_threads
      fail NotImplementedError
    end

    ##
    # Helper method for determining if any threads are currently blocked
    # by back-pressure.
    #
    # @api observation
    # @note This method should be used only for observation-based tooling.
    #
    # @return [Boolean]
    def blocked?
      fail NotImplementedError
    end
  end
end