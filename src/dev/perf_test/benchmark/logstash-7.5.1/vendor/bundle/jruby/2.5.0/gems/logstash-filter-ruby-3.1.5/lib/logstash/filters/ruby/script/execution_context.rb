# A blank area for our script to live in.
# Everything is instance_e{val,exec}'d against this
# to eliminate instance var and method def conflicts against other
# objects
class LogStash::Filters::Ruby::Script::ExecutionContext
  def initialize(name, logger)
    # Namespaced with underscore so as not to conflict with anything the user sets
    @__name__ = name
    @__logger__ = logger
  end

  def logger
    @__logger__
  end

  def register(params)
    logger.debug("skipping register since the script didn't define it")
  end

  def to_s
    "<ExecutionContext #{@__name__}>"
  end
end

