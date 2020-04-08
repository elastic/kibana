# encoding: utf-8
require "logstash/filters/base"
require "logstash/namespace"

# This filter _appears_ to rename fields by replacing `.` characters with a different
# separator.  In reality, it's a somewhat expensive filter that has to copy the
# source field contents to a new destination field (whose name no longer contains
# dots), and then remove the corresponding source field.
#
# It should only be used if no other options are available.
class LogStash::Filters::De_dot < LogStash::Filters::Base

  config_name "de_dot"

  # Replace dots with this value.
  config :separator, :validate => :string, :default => "_"

  # If `nested` is _true_, then create sub-fields instead of replacing dots with
  # a different separator.
  config :nested, :validate => :boolean, :default => false

  # The `fields` array should contain a list of known fields to act on.
  # If undefined, all top-level fields will be checked.  Sub-fields must be
  # manually specified in the array.  For example: `["field.suffix","[foo][bar.suffix]"]`
  # will result in "field_suffix" and nested or sub field ["foo"]["bar_suffix"]
  #
  # WARNING: This is an expensive operation.
  #
  config :fields, :validate => :array

  public
  def has_dot?(fieldref)
    fieldref =~ /\./
  end

  public
  def register
    raise ArgumentError, "de_dot: separator cannot be or contain '.'" unless (@separator =~ /\./).nil?
    # Add instance variables here, if any
  end # def register

  private
  def find_fieldref_for_delete(source)
    # In cases where fieldref may look like [a.b][c.d][e.f], we only want to delete
    # the first level at which the dotted field appears.
    fieldref = ''
    @logger.debug? && @logger.debug("de_dot: source fieldref for delete", :source => source)
    # Iterate over each level of source
    source.delete('[').split(']').each do |ref|
      fieldref = fieldref + '['
      if has_dot?(ref)
        # return when we find the first ref with a '.'
        @logger.debug? && @logger.debug("de_dot: fieldref for delete", :fieldref => fieldref + ref + ']')
        return fieldref + ref + ']'
      else
        fieldref = fieldref + ref + ']'
        @logger.debug? && @logger.debug("de_dot: fieldref still building", :fieldref => fieldref)
      end
    end
  end

  private
  def rename_field(event, fieldref)
    @logger.debug? && @logger.debug("de_dot: preprocess", :event => event.to_hash.to_s)
    if @separator == ']['
      @logger.debug? && @logger.debug("de_dot: fieldref pre-process", :fieldref => fieldref)
      fieldref = '[' + fieldref if fieldref[0] != '['
      fieldref = fieldref + ']' if fieldref[-1] != ']'
      @logger.debug? && @logger.debug("de_dot: fieldref bounding square brackets should exist now", :fieldref => fieldref)
    end
    @logger.debug? && @logger.debug("de_dot: source field reference", :fieldref => fieldref)
    newref = fieldref.gsub('.', @separator)
    @logger.debug? && @logger.debug("de_dot: replacement field reference", :newref => newref)
    event.set(newref, event.get(fieldref))
    @logger.debug? && @logger.debug("de_dot: event with both new and old field references", :event => event.to_hash.to_s)
    event.remove(find_fieldref_for_delete(fieldref))
    @logger.debug? && @logger.debug("de_dot: postprocess", :event => event.to_hash.to_s)
  end

  public
  def filter(event)
    @separator = '][' if @nested
    @logger.debug? && @logger.debug("de_dot: Replace dots with separator", :separator => @separator)
    if @fields.nil?
      fields = event.to_hash.keys
    else
      fields = @fields
    end
    @logger.debug? && @logger.debug("de_dot: Act on these fields", :fields => fields)
    fields.each do |ref|
      if event.include?(ref)
        rename_field(event, ref) if has_dot?(ref)
      end
    end
    filter_matched(event)
  end # def filter
end # class LogStash::Filters::De_dot
