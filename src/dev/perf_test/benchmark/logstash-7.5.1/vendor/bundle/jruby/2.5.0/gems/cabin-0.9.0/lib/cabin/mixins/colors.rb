require "cabin/namespace"
require "cabin/mixins/logger"

# Colorful logging.
module Cabin::Mixins::Colors
  def included(klass)
    klass.extend(Cabin::Mixins::Logger)
  end

  COLORS = [ :black, :red, :green, :yellow, :blue, :magenta, :cyan, :white ]

  COLORS.each do |color|
    # define the color first
    define_method(color) do |message, data={}|
      log(message, data.merge(:color => color))
    end

    # Exclamation marks mean bold. You should probably use bold all the time
    # because it's awesome.
    define_method("#{color}!".to_sym) do |message, data={}|
      log(message, data.merge(:color => color, :bold => true))
    end
  end
end # module Cabin::Mixins::Colors
