require "cabin/namespace"
require "cabin/timer"

module Cabin::Mixins::Timer
  # Start timing something.
  # Returns an instance of Cabin::Timer bound to this Cabin::Channel.
  # To stop the timer and immediately emit the result to this channel, invoke
  # the Cabin::Timer#stop method.
  def time(data, &block)
    # TODO(sissel): need to refactor string->hash shoving.
    data = dataify(data)

    timer = Cabin::Timer.new do |duration|
      data[:duration] = duration
      publish(data)
    end

    if block_given?
      block.call
      return timer.stop
    else
      return timer
    end
  end # def time
end # module Cabin::Mixins::Timer
