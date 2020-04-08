
module PleaseRun
  class Error < StandardError; end
  class ConfigurationError < Error; end
  class PlatformLoadError < Error; end
  class FileWritingFailure < Error; end
end
