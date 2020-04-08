require "cabin/namespace"

# This mixin allows you to easily give channel and publish features
# to a class.
module Cabin::Publisher
  # Set the channel
  def channel=(channel)
    @channel = channel
  end # def channel=

  # Get the channel
  def channel
    return @channel
  end # def channel

  # Publish to the channel
  def publish(object)
    @channel << object
  end # def publish
end # module Cabin::Publisher
