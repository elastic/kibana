$LOAD_PATH.unshift File.dirname(__FILE__) + '/../lib'
require 'mustache'

class DotNotation < Mustache
  self.path = File.dirname(__FILE__)

  def person
    return {
      :name => OpenStruct.new(:first => 'Chris', :last => 'Firescythe'),
      :age  => 24,
      :hometown => {
        :city  => "Cincinnati",
        :state => "OH"
      }
    }
  end

  def normal
    "Normal"
  end
end

if $0 == __FILE__
  puts DotNotation.to_html
end
