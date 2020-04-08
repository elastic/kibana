# encoding: utf-8
require "logstash/inputs/base"

# This is the threadable class for logstash inputs.
# Use this class in your inputs if it can support multiple threads
class LogStash::Inputs::Threadable < LogStash::Inputs::Base

  # Set this to the number of threads you want this input to spawn.
  # This is the same as declaring the input multiple times
  config :threads, :validate => :number, :default => 1

  def initialize(params)
    super
    @threadable = true
  end

end # class LogStash::Inputs::Threadable
