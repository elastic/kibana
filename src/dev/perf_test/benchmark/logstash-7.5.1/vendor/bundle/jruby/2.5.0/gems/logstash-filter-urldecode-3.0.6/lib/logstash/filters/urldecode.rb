# encoding: utf-8
require "logstash/filters/base"
require "logstash/namespace"
require "logstash/util/charset"
require "uri"

# The urldecode filter is for decoding fields that are urlencoded.
class LogStash::Filters::Urldecode < LogStash::Filters::Base
  config_name "urldecode"

  # The field which value is urldecoded
  config :field, :validate => :string, :default => "message"

  # Urldecode all fields
  config :all_fields, :validate => :boolean, :default => false

  # Append values to the `tags` field when an exception is thrown
  config :tag_on_failure, :validate => :array, :default => ["_urldecodefailure"]

  # Thel character encoding used in this filter. Examples include `UTF-8`
  # and `cp1252`
  #
  # This setting is useful if your url decoded string are in `Latin-1` (aka `cp1252`)
  # or in another character set other than `UTF-8`.
  config :charset, :validate => ::Encoding.name_list, :default => "UTF-8"

  UnescapeRe = /((?:%[0-9a-fA-F]{2})+)/
  UnescapePercent = '%'.freeze
  UnescapePack = 'H*'.freeze

  public
  def register
    @converter = LogStash::Util::Charset.new(@charset)
    @converter.logger = logger
  end #def register

  public
  def filter(event)
    begin
      # If all_fields is true then try to decode them all
      if @all_fields
        event.to_hash.each do |name, value|
          event.set(name, urldecode(value))
        end
      # else decode the specified field
      else
        event.set(field, urldecode(event.get(@field)))
      end
    rescue => e
      @tag_on_failure.each{|tag| event.tag(tag)}
    end

    filter_matched(event)
  end # def filter

  private

  def unescape(value)
    # There is a bug in the Ruby stdlib URI.unescape
    # this: URI.unescape("europ%C3%A9enneeuropéenne") throws the following error
    # Encoding::CompatibilityError: incompatible encodings: ASCII-8BIT and UTF-8
    # because Array#pack returns ASCII-8BIT encoded strings
    # this a hybrid of URI.unescape and CGI.unescape
    value.gsub(UnescapeRe){|s|[s.delete(UnescapePercent)].pack(UnescapePack).force_encoding(value.encoding) }
  end

  # Attempt to handle string, array, and hash values for fields.
  # For all other datatypes, just return, URI.unescape doesn't support them.
  def urldecode(value)
    case value
    when String
      escaped = unescape(value)
      return @converter.convert(escaped)
    when Array
      ret_values = []
      value.each { |v| ret_values << urldecode(v) }
      return ret_values
    when Hash
      ret_values = {}
      value.each { |k,v| ret_values[k] = urldecode(v) }
      return ret_values
    else
      return value
    end
  end
end # class LogStash::Filters::Urldecode
