$LOAD_PATH.unshift File.dirname(__FILE__) + '/../lib'
require 'mustache'

class Escaped < Mustache
  self.path = File.dirname(__FILE__)

  def title
    "Bear > Shark"
  end
end

if $0 == __FILE__
  puts Escaped.to_html
end
