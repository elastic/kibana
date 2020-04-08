# encoding: utf-8
require "chronic_duration"
module LogStash::Util::DurationFormatter
  CHRONIC_OPTIONS = { :format => :short }

  # Take a duration in milliseconds and transform it into
  # a format that a human can understand. This is currently used by
  # the API.
  #
  # @param [Integer] Duration in milliseconds
  # @return [String] Duration in human format
  def self.human_format(duration)
    ChronicDuration.output(duration / 1000, CHRONIC_OPTIONS)
  end
end
