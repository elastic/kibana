##
# Extensions to Fiber. In JRuby, these are all still defined in the normal
# Fiber class, so we alias them to the right names here.
#
class Fiber
  class << self
    alias current __current__
  end
  
  alias transfer __transfer__
  alias alive? __alive__
end