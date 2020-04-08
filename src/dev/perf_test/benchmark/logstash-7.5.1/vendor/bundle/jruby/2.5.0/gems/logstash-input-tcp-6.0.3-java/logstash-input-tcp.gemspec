Gem::Specification.new do |s|
  s.name          = 'logstash-input-tcp'
  s.version       = ::File.read('version').split("\n").first
  s.licenses      = ['Apache License (2.0)']
  s.summary       = "Reads events from a TCP socket"
  s.description   = "This gem is a Logstash plugin required to be installed on top of the Logstash core pipeline using $LS_HOME/bin/logstash-plugin install gemname. This gem is not a stand-alone program"
  s.authors       = ["Elastic"]
  s.email         = 'info@elastic.co'
  s.homepage      = "http://www.elastic.co/guide/en/logstash/current/index.html"
  s.platform      = "java"
  s.require_paths = ["lib", "vendor/jar-dependencies"]

  # Files
  s.files = Dir["lib/**/*","spec/**/*","*.gemspec","*.md","CONTRIBUTORS","Gemfile","LICENSE","NOTICE.TXT", "vendor/jar-dependencies/**/*.jar", "vendor/jar-dependencies/**/*.rb", "version", "docs/**/*"]

  # Tests
  s.test_files = s.files.grep(%r{^(test|spec|features)/})

  # Special flag to let us know this is actually a logstash plugin
  s.metadata = { "logstash_plugin" => "true", "logstash_group" => "input" }

  # Gem dependencies
  s.add_runtime_dependency "logstash-core-plugin-api", ">= 1.60", "<= 2.99"

  # line vs streaming codecs required for fix_streaming_codecs
  # TODO: fix_streaming_codecs should be refactored to not
  # require the codecs to be installed.
  s.add_runtime_dependency 'logstash-codec-plain'
  s.add_runtime_dependency 'logstash-codec-line'
  s.add_runtime_dependency 'logstash-codec-json'
  s.add_runtime_dependency 'logstash-codec-json_lines'
  s.add_runtime_dependency 'logstash-codec-multiline'

  s.add_development_dependency 'logstash-devutils'
  s.add_development_dependency 'flores', '~> 0.0.6'
  s.add_development_dependency 'stud', '~> 0.0.22'
end
