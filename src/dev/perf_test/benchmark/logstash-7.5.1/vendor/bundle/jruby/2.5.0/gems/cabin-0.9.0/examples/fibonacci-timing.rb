require "rubygems"
require "cabin"
require "logger"

def fib(n)
  return 1 if n < 2
  return fib(n - 1) + fib(n - 2)
end

# Logging::... is something I'm implemented and experimenting with.
@logger = Cabin::Channel.new

# A logging channel can have any number of subscribers.
# Any subscriber is simply expected to respond to '<<' and take a single
# argument (the event)
# Special case of stdlib Logger instances that are wrapped smartly to 
# log JSON and call the right Logger method (Logger#info, etc).
@logger.subscribe(Logger.new(STDOUT))

# You can store arbitrary key-value pairs in the logging channel. 
# These are emitted with every event.

n = 35
@logger[:input] = n
@logger.time("fibonacci latency") do
  fib(n)
end

