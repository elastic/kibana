# encoding: utf-8
require "logstash/filters/base"
require "logstash/namespace"

# Allows you to truncate fields longer than a given length.
#
# This truncates on bytes values, not character count.  In practice, this
# should mean that the truncated length is somewhere between `length_bytes` and
# `length_bytes - 6` (UTF-8 supports up to 6-byte characters).
class LogStash::Filters::Truncate < LogStash::Filters::Base
  config_name "truncate"

  # A list of fieldrefs to truncate if they are too long.
  #
  # If not specified, the default behavior will be to attempt truncation on all
  # strings in the event. This default behavior could be computationally
  # expensive, so if you know exactly which fields you wish to truncate, it is
  # advised that you be specific and configure the fields you want truncated.
  #
  # Special behaviors for non-string fields:
  # 
  # * Numbers: No action
  # * Array: this plugin will attempt truncation on all elements of that array.
  # * Hash: truncate will try all values of the hash (recursively, if this hash
  # contains other hashes).
  config :fields, :validate => :string, :list => true

  # Fields over this length will be truncated to this length.
  #
  # Truncation happens from the end of the text (the start will be kept).
  #
  # As an example, if you set `length_bytes => 10` and a field contains "hello
  # world, how are you?", then this field will be truncated and have this value:
  # "hello worl"
  config :length_bytes, :validate => :number, :required => true

  def register
    # nothing
  end

  def filter(event)
    if @fields
      @fields.each do |field|
        Truncator.truncate(event, field, @length_bytes)
      end
    else
      Truncator.truncate_all(event, @length_bytes)
    end
    filter_matched(event)
  end

  module Truncator
    module_function
    
    def trim(value, length)
      return value if value.bytesize <= length
      return value if value.nil?
      return "" if length == 0
      return nil if length < 0

      # Nothing to truncate if the string is empty.
      return value if value.length == 0

      # Do the actual truncation.
      v = value.byteslice(0, length)

      # Verify we didn't break the last multibyte character.
      # If we did, keep backing up until it's a good one.
      # Unpack 'U' here will throw an exception if the last character is not a
      # valid UTF-8 character.
      # Note: I am not certain this is the correct solution in all cases.
      i = 0
      while !(v[-1].valid_encoding? && v.bytesize > 0)
        i += 1
        return "" if length - i == 0
        v = value.byteslice(0, length - i)
      end

      return v
    end

    def truncate_all(event, length)
      # TODO(sissel): I couldn't find a better way to get the top level keys for
      # an event. Nor could I find a way to iterate over all the keys in an
      # event, so this may have to suffice.
      fields = event.to_hash.keys.map { |k| "[#{k}]" }
      fields.each do |field|
        truncate(event, field, length)
      end
    end

    def truncate(event, field, length)
      value = event.get(field)
      if value.is_a?(String)
        event.set(field, trim(value, length))
      elsif value.is_a?(Array)
        new_list = value.map { |v| v.is_a?(String) ? trim(v, length) : v }
        event.set(field, new_list)
      elsif value.is_a?(Hash) || value.is_a?(java.util.Map)
        value.keys.each do |key|
          truncate(event, "#{field}[#{key}]", length)
        end
      end
    end
  end
end
