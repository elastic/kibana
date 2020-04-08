# encoding: utf-8
require "logstash/codecs/base"
require "logstash/timestamp"
require "logstash/util"

class LogStash::Codecs::Msgpack < LogStash::Codecs::Base
  config_name "msgpack"


  config :format, :validate => :string, :default => nil

  public
  def register
    require "msgpack"
  end

  public
  def decode(data)
    begin
      # Msgpack does not care about UTF-8
      event = LogStash::Event.new(MessagePack.unpack(data))
      
      if event.get("tags").nil?
        event.set("tags", [])
      end
      
      if @format
        if event.get("message").nil?
          event.set("message", event.sprintf(@format))
        end  
      end
    rescue => e
      # Treat as plain text and try to do the best we can with it?
      @logger.warn("Trouble parsing msgpack input, falling back to plain text",
                   :input => data, :exception => e)
      event.set("message", data)
      
      tags = event.get("tags").nil? ? [] : event.get("tags") 
      tags << "_msgpackparsefailure"
      event.set("tags", tags)
    end
    yield event
  end # def decode

  public
  def encode(event)
    # use normalize to make sure returned Hash is pure Ruby for
    # MessagePack#pack which relies on pure Ruby object recognition
    data = LogStash::Util.normalize(event.to_hash)
    # timestamp is serialized as a iso8601 string
    # merge to avoid modifying data which could have side effects if multiple outputs
    @on_event.call(event, MessagePack.pack(data.merge(LogStash::Event::TIMESTAMP => event.timestamp.to_iso8601)))
  end # def encode

end # class LogStash::Codecs::Msgpack
