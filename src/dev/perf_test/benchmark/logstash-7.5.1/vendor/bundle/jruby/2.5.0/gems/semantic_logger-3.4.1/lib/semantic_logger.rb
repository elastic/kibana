require 'semantic_logger/core_ext/thread'
require 'semantic_logger/version'
require 'semantic_logger/semantic_logger'

# @formatter:off
module SemanticLogger
  autoload :AnsiColors,         'semantic_logger/ansi_colors'
  autoload :Base,               'semantic_logger/base'
  autoload :DebugAsTraceLogger, 'semantic_logger/debug_as_trace_logger'
  autoload :Log,                'semantic_logger/log'
  autoload :Logger,             'semantic_logger/logger'
  autoload :Loggable,           'semantic_logger/loggable'
  autoload :Subscriber,         'semantic_logger/subscriber'

  module Appender
    # DEPRECATED, use SemanticLogger::AnsiColors
    AnsiColors = SemanticLogger::AnsiColors

    # DEPRECATED: use SemanticLogger::Formatters::Color.new
    def self.colorized_formatter
      SemanticLogger::Formatters::Color.new
    end

    # DEPRECATED: use SemanticLogger::Formatters::Json.new
    def self.json_formatter
      SemanticLogger::Formatters::Json.new
    end

    autoload :Bugsnag,          'semantic_logger/appender/bugsnag'
    autoload :Elasticsearch,    'semantic_logger/appender/elasticsearch'
    autoload :File,             'semantic_logger/appender/file'
    autoload :Graylog,          'semantic_logger/appender/graylog'
    autoload :Honeybadger,      'semantic_logger/appender/honeybadger'
    autoload :Sentry,           'semantic_logger/appender/sentry'
    autoload :Http,             'semantic_logger/appender/http'
    autoload :MongoDB,          'semantic_logger/appender/mongodb'
    autoload :NewRelic,         'semantic_logger/appender/new_relic'
    autoload :Splunk,           'semantic_logger/appender/splunk'
    autoload :SplunkHttp,       'semantic_logger/appender/splunk_http'
    autoload :Syslog,           'semantic_logger/appender/syslog'
    autoload :Tcp,              'semantic_logger/appender/tcp'
    autoload :Udp,              'semantic_logger/appender/udp'
    autoload :Wrapper,          'semantic_logger/appender/wrapper'
  end

  module Concerns
    autoload :Compatibility,    'semantic_logger/concerns/compatibility'
  end

  module Formatters
    autoload :Base,             'semantic_logger/formatters/base'
    autoload :Color,            'semantic_logger/formatters/color'
    autoload :Default,          'semantic_logger/formatters/default'
    autoload :Json,             'semantic_logger/formatters/json'
    autoload :Raw,              'semantic_logger/formatters/raw'
    autoload :Syslog,           'semantic_logger/formatters/syslog'
  end

  module Metrics
    autoload :NewRelic,         'semantic_logger/metrics/new_relic'
    autoload :Statsd,           'semantic_logger/metrics/statsd'
    autoload :Udp,              'semantic_logger/metrics/udp'
  end

  if defined?(JRuby)
    module JRuby
      autoload :GarbageCollectionLogger, 'semantic_logger/jruby/garbage_collection_logger'
    end
  end
end
# @formatter:on

# Close and flush all appenders at exit, waiting for outstanding messages on the queue
# to be written first
at_exit do
  # Cannot call #close since test frameworks use at_exit to run loaded tests
  SemanticLogger.flush
end
