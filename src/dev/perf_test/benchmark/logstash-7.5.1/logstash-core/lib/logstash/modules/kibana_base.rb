# encoding: utf-8
require "logstash/json"

module LogStash module Modules class KibanaBase
  attr_reader :import_path, :content

  def initialize(import_path, content)
    @import_path, @content = import_path, content
  end

  def import(client)
    raise NotImplementedError, "#{self.class.name} needs to implement `#import`"
  end

  def to_s
    import_path
  end

  def content_as_object
    return content unless content.is_a?(String)
    LogStash::Json.load(content) rescue nil
  end
end end end
