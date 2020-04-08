tried_gem = false
begin
  require 'jruby-win32ole'
rescue LoadError
  if tried_gem
    warn "!!!! Missing jruby-win32ole gem: jruby -S gem install jruby-win32ole"
    raise $!
  end
  require 'rubygems'
  begin
    gem 'jruby-win32ole'
  rescue LoadError
  end
  tried_gem = true
  retry
end
