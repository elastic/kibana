# frozen-string-literal: true

module Sequel
  # This module makes it easy to print deprecation warnings with optional backtraces to a given stream.
  # There are a two accessors you can use to change how/where the deprecation methods are printed
  # and whether/how backtraces should be included:
  #
  #   Sequel::Deprecation.output = $stderr # print deprecation messages to standard error (default)
  #   Sequel::Deprecation.output = File.open('deprecated_calls.txt', 'wb') # use a file instead
  #   Sequel::Deprecation.output = false # do not output deprecation messages
  #
  #   Sequel::Deprecation.prefix = "SEQUEL DEPRECATION WARNING: " # prefix deprecation messages with a given string (default)
  #   Sequel::Deprecation.prefix = false # do not prefix deprecation messages
  #
  #   Sequel::Deprecation.backtrace_filter = false # don't include backtraces
  #   Sequel::Deprecation.backtrace_filter = true # include full backtraces
  #   Sequel::Deprecation.backtrace_filter = 10 # include 10 backtrace lines (default)
  #   Sequel::Deprecation.backtrace_filter = 1 # include 1 backtrace line
  #   Sequel::Deprecation.backtrace_filter = lambda{|line, line_no| line_no < 3 || line =~ /my_app/} # select backtrace lines to output
  module Deprecation
    @backtrace_filter = 10
    @output = $stderr
    @prefix = "SEQUEL DEPRECATION WARNING: ".freeze

    class << self
      # How to filter backtraces.  +false+ does not include backtraces, +true+ includes
      # full backtraces, an Integer includes that number of backtrace lines, and
      # a proc is called with the backtrace line and line number to select the backtrace
      # lines to include.  The default is 10 backtrace lines.
      attr_accessor :backtrace_filter

      # Where deprecation messages should be output, must respond to puts.  $stderr by default.
      attr_accessor :output

      # Where deprecation messages should be prefixed with ("SEQUEL DEPRECATION WARNING: " by default).
      attr_accessor :prefix
    end

    # Print the message and possibly backtrace to the output.
    def self.deprecate(method, instead=nil)
      return unless output
      message = instead ? "#{method} is deprecated and will be removed in Sequel 5.1.  #{instead}." : method
      message = "#{prefix}#{message}" if prefix
      output.puts(message)
      case b = backtrace_filter
      when Integer
        caller.each do |c|
          b -= 1
          output.puts(c)
          break if b <= 0
        end
      when true
        caller.each{|c| output.puts(c)}
      when Proc
        caller.each_with_index{|line, line_no| output.puts(line) if b.call(line, line_no)}
      end
      nil
    end

    # If using ruby 2.3+, use Module#deprecate_constant to deprecate the constant,
    # otherwise do nothing as the ruby implementation does not support constant deprecation.
    def self.deprecate_constant(mod, constant)
      if RUBY_VERSION > '2.3'
        mod.deprecate_constant(constant)
      end
    end
  end
end
