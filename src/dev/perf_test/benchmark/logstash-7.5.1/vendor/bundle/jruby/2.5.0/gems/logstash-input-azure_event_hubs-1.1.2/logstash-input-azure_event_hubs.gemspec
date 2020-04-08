GEM_VERSION = File.read(File.expand_path(File.join(File.dirname(__FILE__), "VERSION"))).strip unless defined?(GEM_VERSION)

Gem::Specification.new do |s|
  s.name          = 'logstash-input-azure_event_hubs'
  s.version       = GEM_VERSION
  s.licenses      = ['Apache-2.0']
  s.summary       = 'Consumes events from Azure Event Hubs for use with Logstash'
  s.description   = 'This gem is a Logstash plugin required to be installed on top of the Logstash core pipeline using $LS_HOME/bin/logstash-plugin install gemname. This gem is not a stand-alone program'
  s.homepage      = 'http://www.elastic.co/guide/en/logstash/current/index.html'
  s.authors       = ['Elastic']
  s.email         = 'info@elastic.co'
  s.require_paths = ['lib', 'vendor/jar-dependencies']

  # Files
  s.files = Dir['lib/**/*','spec/**/*','vendor/**/*', 'vendor/jar-dependencies/**/*.jar','*.gemspec','*.md','CONTRIBUTORS','Gemfile','LICENSE','NOTICE.TXT', 'VERSION']
   # Tests
  s.test_files = s.files.grep(%r{^(test|spec|features)/})

  # Special flag to let us know this is actually a logstash plugin
  s.metadata = { "logstash_plugin" => "true", "logstash_group" => "input" }

  # Gem dependencies
  s.add_runtime_dependency "logstash-core-plugin-api", "~> 2.0"
  s.add_runtime_dependency 'logstash-codec-plain'
  s.add_runtime_dependency 'logstash-codec-json'
  s.add_runtime_dependency 'stud', '>= 0.0.22'
  s.add_development_dependency 'logstash-devutils', '>= 0.0.16'
end
