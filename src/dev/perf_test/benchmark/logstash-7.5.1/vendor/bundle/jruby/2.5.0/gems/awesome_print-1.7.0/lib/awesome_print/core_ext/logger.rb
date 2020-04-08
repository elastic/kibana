# Copyright (c) 2010-2013 Michael Dvorkin
#
# Awesome Print is freely distributable under the terms of MIT license.
# See LICENSE file or http://www.opensource.org/licenses/mit-license.php
#------------------------------------------------------------------------------
module AwesomePrint
  module Logger

    # Add ap method to logger
    #------------------------------------------------------------------------------
    def ap(object, level = nil)
      level ||= AwesomePrint.defaults[:log_level] if AwesomePrint.defaults
      level ||= :debug
      send level, object.ai
    end
  end
end

Logger.send(:include, AwesomePrint::Logger)
ActiveSupport::BufferedLogger.send(:include, AwesomePrint::Logger) if defined?(ActiveSupport::BufferedLogger)
