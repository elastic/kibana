# encoding: utf-8
require "logstash/filters/base"
require "logstash/namespace"

# The clone filter is for duplicating events.
# A clone will be created for each type in the clone list.
# The original event is left unchanged.
# Created events are inserted into the pipeline 
# as normal events and will be processed by the remaining pipeline configuration 
# starting from the filter that generated them (i.e. this plugin).
class LogStash::Filters::Clone < LogStash::Filters::Base

  config_name "clone"

  # A new clone will be created with the given type for each type in this list.
  config :clones, :validate => :array, :required => true

  public
  def register
    logger.warn("The parameter 'clones' is empty, so no clones will be created.") if @clones.empty?
  end

  public
  def filter(event)
    @clones.each do |type|
      clone = event.clone
      clone.set("type", type)
      filter_matched(clone)
      @logger.debug("Cloned event", :clone => clone, :event => event)

      # Push this new event onto the stack at the LogStash::FilterWorker
      yield clone
    end
  end

end # class LogStash::Filters::Clone
