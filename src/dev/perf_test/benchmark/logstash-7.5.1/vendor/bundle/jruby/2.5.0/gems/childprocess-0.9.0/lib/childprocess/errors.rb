module ChildProcess
  class Error < StandardError
  end

  class TimeoutError < Error
  end

  class SubclassResponsibility < Error
  end

  class InvalidEnvironmentVariable < Error
  end

  class LaunchError < Error
  end

  class MissingPlatformError < Error
    def initialize
      message = "posix_spawn is not yet supported on #{ChildProcess.platform_name} (#{RUBY_PLATFORM}), falling back to default implementation. " +
                "If you believe this is an error, please file a bug at http://github.com/enkessler/childprocess/issues"

      super(message)
    end

  end
end
