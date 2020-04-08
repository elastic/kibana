# encoding: utf-8
require "logstash/filters/base"
require "logstash/namespace"
require "securerandom"

# The uuid filter allows you to generate a
# https://en.wikipedia.org/wiki/Universally_unique_identifier[UUID]
# and add it as a field to each processed event.
#
# This is useful if you need to generate a string that's unique for every
# event, even if the same input is processed multiple times. If you want
# to generate strings that are identical each time a event with a given
# content is processed (i.e. a hash) you should use the
# <<plugins-filters-fingerprint,fingerprint filter>> instead.
#
# The generated UUIDs follow the version 4 definition in
# https://tools.ietf.org/html/rfc4122[RFC 4122]) and will be
# represented as a standard hexadecimal string format, e.g.
# "e08806fe-02af-406c-bbde-8a5ae4475e57".
class LogStash::Filters::Uuid < LogStash::Filters::Base
  config_name "uuid"

  # Select the name of the field where the generated UUID should be
  # stored.
  #
  # Example:
  # [source,ruby]
  #     filter {
  #       uuid {
  #         target => "uuid"
  #       }
  #     }
  config :target, :validate => :string, :required => true

  # If the value in the field currently (if any) should be overridden
  # by the generated UUID. Defaults to `false` (i.e. if the field is
  # present, with ANY value, it won't be overridden)
  #
  # Example:
  # [source,ruby]
  #    filter {
  #       uuid {
  #         target    => "uuid"
  #         overwrite => true
  #       }
  #    }
  config :overwrite, :validate => :boolean, :default => false

  public
  def register
  end # def register

  public
  def filter(event)
    
    # SecureRandom.uuid returns a non UTF8 string and since
    # only UTF8 strings can be passed to a LogStash::Event
    # we need to reencode it here
    if overwrite
      event.set(target, SecureRandom.uuid.force_encoding(Encoding::UTF_8))
    elsif event.get(target).nil?
      event.set(target, SecureRandom.uuid.force_encoding(Encoding::UTF_8))
    end

    filter_matched(event)
  end # def filter

end # class LogStash::Filters::Uuid

