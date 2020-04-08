# Copyright (c) 2010-2013 Michael Dvorkin
#
# Awesome Print is freely distributable under the terms of MIT license.
# See LICENSE file or http://www.opensource.org/licenses/mit-license.php
#------------------------------------------------------------------------------
#
# Method#name was intorduced in Ruby 1.8.7 so we define it here as necessary.
#
unless nil.method(:class).respond_to?(:name)
  class Method
    def name
      inspect.split(/[#.>]/)[-1]
    end
  end

  class UnboundMethod
    def name
      inspect.split(/[#.>]/)[-1]
    end
  end
end