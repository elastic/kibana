# encoding: utf-8
require "logstash/filters/base"
require "logstash/namespace"

# The split filter clones an event by splitting one of its fields and
# placing each value resulting from the split into a clone of the original
# event. The field being split can either be a string or an array.
#
# An example use case of this filter is for taking output from the
# <<plugins-inputs-exec,exec input plugin>> which emits one event for
# the whole output of a command and splitting that output by newline -
# making each line an event.
#
# Split filter can also be used to split array fields in events into individual events.
# A very common pattern in JSON & XML is to make use of lists to group data together.
#
# For example, a json structure like this:
#
# [source,js]
# ----------------------------------
# { field1: ...,
#  results: [
#    { result ... },
#    { result ... },
#    { result ... },
#    ...
# ] }
# ----------------------------------
#
# The split filter can be used on the above data to create separate events for each value of `results` field
#
# [source,js]
# ----------------------------------
# filter {
#  split {
#    field => "results"
#  }
# }
# ----------------------------------
#
# The end result of each split is a complete copy of the event
# with only the current split section of the given field changed.
class LogStash::Filters::Split < LogStash::Filters::Base
  PARSE_FAILURE_TAG = '_split_type_failure'.freeze

  config_name "split"

  # The string to split on. This is usually a line terminator, but can be any
  # string. If you are splitting a JSON array into multiple events, you can ignore this field.
  config :terminator, :validate => :string, :default => "\n"

  # The field which value is split by the terminator.  
  # Can be a multiline message or the ID of an array.  
  # Nested arrays are referenced like: "[object_id][array_id]"
  config :field, :validate => :string, :default => "message"

  # The field within the new event which the value is split into.
  # If not set, the target field defaults to split field name.
  config :target, :validate => :string

  def register
    # set @target to @field if not configured
    @target ||= @field
  end

  def filter(event)
    original_value = event.get(@field)

    if original_value.is_a?(Array)
      splits = target.nil? ? event.remove(@field) : original_value
    elsif original_value.is_a?(String)
      # Using -1 for 'limit' on String#split makes ruby not drop trailing empty
      # splits.
      splits = original_value.split(@terminator, -1)
    else
      logger.warn("Only String and Array types are splittable. field:#{@field} is of type = #{original_value.class}")
      event.tag(PARSE_FAILURE_TAG)
      return
    end

    # Skip filtering if splitting this event resulted in only one thing found.
    return if splits.length == 1 && original_value.is_a?(String)

    splits.each do |value|
      next if value.nil? || (value.is_a?(String) && value.empty?)
      @logger.debug? && @logger.debug("Split event", :value => value, :field => @field)

      event_split = event.clone
      event_split.set(@target, value)
      filter_matched(event_split)

      # Push this new event onto the stack at the LogStash::FilterWorker
      yield event_split
    end

    # Cancel this event, we'll use the newly generated ones above.
    event.cancel
  end
end
