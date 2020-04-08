require "logstash/codecs/base"
require "logstash/codecs/line"
require "logstash/util"

class LogStash::Codecs::EDNLines < LogStash::Codecs::Base
  config_name "edn_lines"


  def register
    require "edn"
  end

  public
  def initialize(params={})
    super(params)
    @lines = LogStash::Codecs::Line.new
  end

  public
  def decode(data)
    @lines.decode(data) do |event|
      begin
        yield LogStash::Event.new(EDN.read(event.get("message")))
      rescue => e
        @logger.warn("EDN parse failure. Falling back to plain-text", :error => e, :data => data)
        yield LogStash::Event.new("message" => data)
      end
    end
  end

  public
  def encode(event)
    # use normalize to make sure returned Hash is pure Ruby for
    # #to_edn which relies on pure Ruby object recognition
    data = LogStash::Util.normalize(event.to_hash)
    # timestamp is serialized as a iso8601 string
    # merge to avoid modifying data which could have side effects if multiple outputs
    @on_event.call(event, data.merge(LogStash::Event::TIMESTAMP => event.timestamp.to_iso8601).to_edn + NL)
  end

end
