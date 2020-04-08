$LOAD_PATH.unshift File.dirname(__FILE__) + '/../lib'
require 'mustache'

class Delimiters < Mustache
  self.path = File.dirname(__FILE__)

  def start
    "It worked the first time."
  end

  def middle
    [ { :item => "And it worked the second time." },
      { :item => "As well as the third." } ]
  end

  def final
    "Then, surprisingly, it worked the final time."
  end
end

if $0 == __FILE__
  puts Delimiters.to_html
end
