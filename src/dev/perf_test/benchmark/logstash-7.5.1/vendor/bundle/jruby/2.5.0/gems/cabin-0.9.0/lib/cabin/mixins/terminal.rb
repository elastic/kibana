require "cabin/namespace"

module Cabin::Mixins::Terminal

  def terminal(message)
    publish(message) do |subscriber, event|
      output = subscriber.output
      output.respond_to?(:tty?) && output.tty?
    end
  end

end
