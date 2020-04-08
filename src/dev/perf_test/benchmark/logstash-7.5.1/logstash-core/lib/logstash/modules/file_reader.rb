# encoding: utf-8
require "logstash/json"

module LogStash module Modules class FileReader
  # stub these methods for testing
  include LogStash::Util::Loggable

  def self.read(path)
    begin
      ::File.read(path)
    rescue => e
      logger.error("Error when reading file from path", :path => path)
      ""
    end
  end

  def self.read_json(path)
    json = read(path)
    begin
      LogStash::Json.load(json)
    rescue => e
      logger.error("Error when parsing json from path", :path => path)
      return {}
    end
  end

  def self.glob(path)
    files = Dir.glob(path)
    if files.empty?
      logger.warn("No files found for glob", :pattern => path)
    end
    files
  end
end end end
