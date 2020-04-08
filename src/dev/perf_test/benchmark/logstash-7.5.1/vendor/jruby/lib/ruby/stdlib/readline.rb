require 'readline/version'

load "jline/jline/#{Readline::Version::JLINE_VERSION}/jline-#{Readline::Version::JLINE_VERSION}.jar"

require 'readline.jar'

# boot extension
if JRuby::Util.respond_to?(:load_ext)
  JRuby::Util.load_ext('org.jruby.ext.readline.Readline')
else
  require 'java'; require 'jruby'
  begin
    org.jruby.ext.readline.ReadlineService.new.load(JRuby.runtime, false)
  rescue NameError => ne
    raise NameError, "unable to load readline subsystem: #{ne.message}", ne.backtrace
  end
end
