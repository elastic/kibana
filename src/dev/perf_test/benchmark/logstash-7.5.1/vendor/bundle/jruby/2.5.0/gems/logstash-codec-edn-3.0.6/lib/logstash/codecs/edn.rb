require "logstash/codecs/base"
require "logstash/util"

class LogStash::Codecs::EDN < LogStash::Codecs::Base
  config_name "edn"


  def register
    require "edn"
  end

  public
  def decode(data)
    begin
      yield LogStash::Event.new(EDN.read(data))
    rescue => e
      @logger.warn("EDN parse failure. Falling back to plain-text", :error => e, :data => data)
      yield LogStash::Event.new("message" => data)
    end
  end

  public
  def encode(event)
    # use normalize to make sure returned Hash is pure Ruby
    # #to_edn which relies on pure Ruby object recognition
    data = LogStash::Util.normalize(event.to_hash)
    # timestamp is serialized as a iso8601 string
    # merge to avoid modifying data which could have side effects if multiple outputs
    @on_event.call(event, data.merge(LogStash::Event::TIMESTAMP => event.timestamp.to_iso8601).to_edn)
  end

end
