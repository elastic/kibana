$LOAD_PATH.unshift File.dirname(__FILE__) + '/../lib'
require 'mustache'

class Passenger < Mustache
  self.path = File.dirname(__FILE__)
  self.template_extension = 'conf'

  def server
    "example.com"
  end

  def deploy_to
    "/var/www/example.com"
  end

  def stage
    "production"
  end

  def timestamp
    Time.now.strftime('%Y%m%d%H%M%S')
  end
end

if $0 == __FILE__
  puts Passenger.to_text
end
