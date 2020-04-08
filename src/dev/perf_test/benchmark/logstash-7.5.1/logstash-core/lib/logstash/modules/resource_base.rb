# encoding: utf-8
require "logstash/json"
require_relative "file_reader"

module LogStash module Modules module ResourceBase
  attr_reader :base, :content_type, :content_path, :content_id

  def initialize(base, content_type, content_path, content = nil, content_id = nil)
    @base, @content_type, @content_path = base, content_type, content_path
    @content_id =  content_id || ::File.basename(@content_path, ".*")
    # content at this time will be a JSON string
    @content = content
    if !@content.nil?
      @content_as_object = LogStash::Json.load(@content) rescue {}
    end
  end

  def content
    @content ||= FileReader.read(@content_path)
  end

  def to_s
    "#{base}, #{content_type}, #{content_path}, #{content_id}"
  end

  def content_as_object
    @content_as_object ||= FileReader.read_json(@content_path) rescue nil
  end

  def <=>(other)
    to_s <=> other.to_s
  end

  def ==(other)
    to_s == other.to_s
  end
end end end
