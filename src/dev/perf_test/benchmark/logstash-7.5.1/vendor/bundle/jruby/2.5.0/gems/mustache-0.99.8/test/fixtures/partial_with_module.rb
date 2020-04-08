$LOAD_PATH.unshift File.dirname(__FILE__) + '/../lib'
require 'mustache'

module SimpleView
  def name
    "Bob"
  end

  def value
    100_000
  end

  def taxed_value
    value - (value * 0.4)
  end

  def in_ca
    false
  end
end

class PartialWithModule < Mustache
  include SimpleView
  self.path = File.dirname(__FILE__)

  def greeting
    "Welcome"
  end

  def farewell
    "Fair enough, right?"
  end
end

if $0 == __FILE__
  puts PartialWithModule.to_html
end
