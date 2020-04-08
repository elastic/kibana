$LOAD_PATH.unshift File.dirname(__FILE__) + '/../lib'
require 'mustache'

class Comments < Mustache
  self.path = File.dirname(__FILE__)

  def title
    "A Comedy of Errors"
  end
end

if $0 == __FILE__
  puts Comments.to_html
end
