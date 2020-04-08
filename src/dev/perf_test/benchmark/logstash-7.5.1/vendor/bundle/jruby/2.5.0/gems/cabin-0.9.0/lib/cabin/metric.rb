require "cabin/namespace"
require "cabin/publisher"
require "cabin/inspectable"

module Cabin::Metric
  include Cabin::Inspectable
  include Cabin::Publisher

  def instance=(instance)
    @instance = instance
  end # def instance=

  def instance
    return @instance
  end # def instance

  def emit
    if !@channel.nil?
      @channel.publish({ :metric => instance }.merge(to_hash))
    end
  end # def emit
end # module Cabin::Metric
