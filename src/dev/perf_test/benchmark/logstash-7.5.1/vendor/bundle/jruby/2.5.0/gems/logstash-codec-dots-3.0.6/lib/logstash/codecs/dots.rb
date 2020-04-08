# encoding: utf-8
require "logstash/codecs/base"

class LogStash::Codecs::Dots < LogStash::Codecs::Base
  config_name "dots"

  public
  def decode(data)
    raise "Not implemented"
  end # def decode

  public
  def encode(event)
    @on_event.call(event, ".")
  end # def encode

end # class LogStash::Codecs::Dots
