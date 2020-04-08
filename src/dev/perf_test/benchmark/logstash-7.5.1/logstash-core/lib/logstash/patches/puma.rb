# encoding: utf-8
#
# Patch to replace the usage of STDERR and STDOUT
# see: https://github.com/elastic/logstash/issues/5912
module LogStash
  class NullLogger
    def self.debug(message)
    end
  end

  # Puma uses by default the STDERR an the STDOUT for all his error
  # handling, the server class accept custom a events object that can accept custom io object,
  # so I just wrap the logger into an IO like object.
  class IOWrappedLogger
    def initialize(new_logger)
      @logger_lock = Mutex.new
      @logger = new_logger
    end

    def sync=(v)
      # noop
    end

    def logger=(logger)
      @logger_lock.synchronize { @logger = logger }
    end

    def puts(str)
      # The logger only accept a str as the first argument
      @logger_lock.synchronize { @logger.debug(str.to_s) }
    end
    alias_method :write, :puts
    alias_method :<<, :puts
  end

end

# Reopen the puma class to create a scoped STDERR and STDOUT
# This operation is thread safe since its done at the class level
# and force JRUBY to flush his classes cache.
module Puma
  STDERR = LogStash::IOWrappedLogger.new(LogStash::NullLogger)
  STDOUT = LogStash::IOWrappedLogger.new(LogStash::NullLogger)
end
