require "cabin/namespace"

# Timestamp events before publishing.
module Cabin::Mixins::Timestamp
  def self.extended(instance)
    self.included(instance.class)
  end
  def self.included(klass)
    klass.action do |event|
      event[:timestamp] = Time.now.strftime("%Y-%m-%dT%H:%M:%S.%6N%z")
    end
  end
end
