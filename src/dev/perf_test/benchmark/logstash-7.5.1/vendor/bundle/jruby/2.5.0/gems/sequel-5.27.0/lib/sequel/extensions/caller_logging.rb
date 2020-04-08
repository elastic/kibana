# frozen-string-literal: true
#
# The caller_logging extension includes caller information before
# query logging, showing which code caused the query.  It skips
# internal Sequel code, showing the first non-Sequel caller line.
#
#   DB.extension :caller_logging
#   DB[:table].first
#   # Logger:
#   # (0.000041s) (source: /path/to/app/foo/t.rb:12 in `get_first`) SELECT * FROM table LIMIT 1
#
# You can further filter the caller lines by setting
# <tt>Database#caller_logging_ignore</tt> to a regexp of additional
# caller lines to ignore.  This is useful if you have specific
# methods or internal extensions/plugins that you would also
# like to ignore as they obscure the code actually making the
# request.
#
#   DB.caller_logging_ignore = %r{/path/to/app/lib/plugins}
#
# You can also format the caller before it is placed in the logger,
# using +caller_logging_formatter+:
#
#   DB.caller_logging_formatter = lambda do |caller|
#     "(#{caller.sub(/\A\/path\/to\/app\//, '')})"
#   end
#   DB[:table].first
#   # Logger:
#   # (0.000041s) (foo/t.rb:12 in `get_first`) SELECT * FROM table LIMIT 1
#
# Related module: Sequel::CallerLogging

require 'rbconfig'

#
module Sequel
  module CallerLogging
    SEQUEL_LIB_PATH = (File.expand_path('../../..', __FILE__) + '/').freeze

    # A regexp of caller lines to ignore, in addition to internal Sequel and Ruby code.
    attr_accessor :caller_logging_ignore

    # A callable to format the external caller
    attr_accessor :caller_logging_formatter

    # Include caller information when logging query.
    def log_connection_yield(sql, conn, args=nil)
      if !@loggers.empty? && (external_caller = external_caller_for_log)
        sql = "#{external_caller} #{sql}"
      end
      super
    end

    private

    # The caller to log, ignoring internal Sequel and Ruby code, and user specified
    # lines to ignore.
    def external_caller_for_log
      ignore = caller_logging_ignore
      c = caller.find do |line|
        !(line.start_with?(SEQUEL_LIB_PATH) ||
          line.start_with?(RbConfig::CONFIG["rubylibdir"]) ||
          (ignore && line =~ ignore))
      end

      if c
        c = if formatter = caller_logging_formatter
          formatter.call(c)
        else
          "(source: #{c})"
        end
      end

      c
    end
  end

  Database.register_extension(:caller_logging, CallerLogging)
end
