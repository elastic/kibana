$LOAD_PATH.unshift File.dirname(__FILE__) + '/../lib'
require 'mustache'

class ComplexView < Mustache
  self.path = File.dirname(__FILE__)

  def header
    "Colors"
  end

  def item
    items = []
    items << { :name => 'red', :current => true, :url => '#Red' }
    items << { :name => 'green', :current => false, :url => '#Green' }
    items << { :name => 'blue', :current => false, :url => '#Blue' }
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
  puts ComplexView.to_html
end
