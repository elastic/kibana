# encoding: utf-8
require "logstash/codecs/base"
require "logstash/util/charset"

# Line-oriented text data.
#
# Decoding behavior: Only whole line events will be emitted.
#
# Encoding behavior: Each event will be emitted with a trailing newline.
class LogStash::Codecs::Line < LogStash::Codecs::Base
  config_name "line"

  # Set the desired text format for encoding.
  config :format, :validate => :string

  # The character encoding used in this input. Examples include `UTF-8`
  # and `cp1252`
  #
  # This setting is useful if your log files are in `Latin-1` (aka `cp1252`)
  # or in another character set other than `UTF-8`.
  #
  # This only affects "plain" format logs since json is `UTF-8` already.
  config :charset, :validate => ::Encoding.name_list, :default => "UTF-8"

  # Change the delimiter that separates lines
  config :delimiter, :validate => :string, :default => "\n"

  MESSAGE_FIELD = "message".freeze

  def register
    require "logstash/util/buftok"
    @buffer = FileWatch::BufferedTokenizer.new(@delimiter)
    @converter = LogStash::Util::Charset.new(@charset)
    @converter.logger = @logger
  end

  def decode(data)
    @buffer.extract(data).each { |line| yield LogStash::Event.new(MESSAGE_FIELD => @converter.convert(line)) }
  end

  def flush(&block)
    remainder = @buffer.flush
    if !remainder.empty?
      block.call(LogStash::Event.new(MESSAGE_FIELD => @converter.convert(remainder)))
    end
  end

  def encode(event)
    encoded = @format ? event.sprintf(@format) : event.to_s
    @on_event.call(event, encoded + @delimiter)
  end
end
