$LOAD_PATH.unshift File.dirname(__FILE__) + '/../lib'
require 'mustache'

class Simple < Mustache
  self.path = File.dirname(__FILE__)

  def name
    "Chris"
  end

  def value
    10_000
  end

  def taxed_value
    value - (value * 0.4)
  end

  def in_ca
    true
  end
end

if $0 == __FILE__
  puts Simple.to_html
end
