$LOAD_PATH.unshift File.dirname(__FILE__) + '/../lib'
require 'mustache'
require 'ostruct'

class NestedObjects < Mustache
  self.path = File.dirname(__FILE__)

  def header
    "Colors"
  end

  def item
    items = []
    items << OpenStruct.new(:name => 'red', :current => true, :url => '#Red')
    items << OpenStruct.new(:name => 'green', :current => false, :url => '#Green')
    items << OpenStruct.new(:name => 'blue', :current => false, :url => '#Blue')
    items
  end

  def link
    not self[:current]
  end

  def list
    not item.empty?
  end

  def empty
    item.empty?
  end
end

if $0 == __FILE__
  puts NestedObjects.to_html
end
