# frozen_string_literal: false
# Timeout long-running blocks
#
# == Synopsis
#
#   require 'timeout'
#   status = Timeout::timeout(5) {
#     # Something that should be interrupted if it takes more than 5 seconds...
#   }
#
# == Description
#
# Timeout provides a way to auto-terminate a potentially long-running
# operation if it hasn't finished in a fixed amount of time.
#
# Previous versions didn't use a module for namespacing, however
# #timeout is provided for backwards compatibility.  You
# should prefer Timeout.timeout instead.
#
# == Copyright
#
# Copyright:: (C) 2000  Network Applied Communication Laboratory, Inc.
# Copyright:: (C) 2000  Information-technology Promotion Agency, Japan

module Timeout
  # Raised by Timeout.timeout when the block times out.
  class Error < RuntimeError
    attr_reader :thread

    def self.catch(*args)
      exc = new(*args)
      exc.instance_variable_set(:@thread, Thread.current)
      ::Kernel.catch(exc) {yield exc}
    end

    def exception(*)
      # TODO: use Fiber.current to see if self can be thrown
      if self.thread == Thread.current
        bt = caller
        begin
          throw(self, bt)
        rescue UncaughtThrowError
        end
      end
      self
    end
  end

  # :stopdoc:
  THIS_FILE = /\A#{Regexp.quote(__FILE__)}:/o
  CALLER_OFFSET = ((c = caller[0]) && THIS_FILE =~ c) ? 1 : 0
  private_constant :THIS_FILE, :CALLER_OFFSET
  # :startdoc:
end

# Load executor-based timeout logic into Timeout mod
JRuby::Util.load_ext('org.jruby.ext.timeout.Timeout')

def timeout(*args, &block)
  warn "Object##{__method__} is deprecated, use Timeout.timeout instead.", uplevel: 1
  Timeout.timeout(*args, &block)
end

# Another name for Timeout::Error, defined for backwards compatibility with
# earlier versions of timeout.rb.
TimeoutError = Timeout::Error
class Object
  deprecate_constant :TimeoutError
end
