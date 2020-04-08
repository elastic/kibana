BEATS_VERSION = File.read(File.expand_path(File.join(File.dirname(__FILE__), "VERSION"))).strip unless defined?(BEATS_VERSION)

Gem::Specification.new do |s|
  s.name            = "logstash-input-beats"
  s.version         = BEATS_VERSION
  s.licenses        = ["Apache License (2.0)"]
  s.summary         = "Receives events from the Elastic Beats framework"
  s.description     = "This gem is a Logstash plugin required to be installed on top of the Logstash core pipeline using $LS_HOME/bin/logstash-plugin install gemname. This gem is not a stand-alone program"
  s.authors         = ["Elastic"]
  s.email           = "info@elastic.co"
  s.homepage        = "http://www.elastic.co/guide/en/logstash/current/index.html"
  s.require_paths = ["lib", "vendor/jar-dependencies"]

  # Files
  s.files = Dir["lib/**/*","spec/**/*","*.gemspec","*.md","CONTRIBUTORS","Gemfile","LICENSE","NOTICE.TXT", "vendor/jar-dependencies/**/*.jar", "vendor/jar-dependencies/**/*.rb", "VERSION", "docs/**/*"]
  # Tests
  s.test_files = s.files.grep(%r{^(test|spec|features)/})

  # Special flag to let us know this is actually a logstash plugin
  s.metadata = { "logstash_plugin" => "true", "logstash_group" => "input" }

  # Gem dependencies
  s.add_runtime_dependency "logstash-core-plugin-api", ">= 1.60", "<= 2.99"

  s.add_runtime_dependency "logstash-codec-plain"
  s.add_runtime_dependency "concurrent-ruby", "~> 1.0"
  s.add_runtime_dependency "thread_safe", "~> 0.3.5"
  s.add_runtime_dependency "logstash-codec-multiline", ">= 2.0.5"
  s.add_runtime_dependency 'jar-dependencies', '~> 0.3', '>= 0.3.4'

  s.add_development_dependency "flores", "~>0.0.6"
  s.add_development_dependency "rspec"
  s.add_development_dependency "stud"
  s.add_development_dependency "pry"
  s.add_development_dependency "rspec-wait"
  s.add_development_dependency "logstash-devutils"
  s.add_development_dependency "logstash-codec-json"
  s.add_development_dependency "childprocess" # To make filebeat/LSF integration test easier to write.

  s.platform = 'java'
end
