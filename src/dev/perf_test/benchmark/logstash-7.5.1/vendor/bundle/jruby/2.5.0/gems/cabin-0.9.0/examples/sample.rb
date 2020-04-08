require "rubygems"
require "cabin"

# Logging::... is something I'm implemented and experimenting with.
@logger = Cabin::Channel.new

# A logging channel can have any number of subscribers.
# Any subscriber is simply expected to respond to '<<' and take a single
# argument (the event)
# Special case handling of stdlib Logger and IO objects comes for free, though.
@logger.subscribe(STDOUT)

# You can store arbitrary key-value pairs in the logging channel. 
# These are emitted with every event.
@logger[:program] = "sample program"

def foo(val)
  # A context is something that lets you modify key-value pieces in the
  # logging channel and gives you a trivial way to undo the changes later.
  context = @logger.context()
  context[:foo] = val
  context[:example] = 100

  # The point of the context above is to save context so that the bar() method 
  # and it's logging efforts can include said context.
  timer = @logger.time("Timing bar")
  bar()
  timer.stop   # logs the result.

  @logger.time("Another bar timer") do
    bar()
  end

  # Clearing this context will exactly undo the changes made to the logger by
  # this context.
  context.clear()
end

def bar
  @logger.info("bar bar bar!")
  sleep(rand * 2)
end

foo("Hello")
@logger.info("All done.")

