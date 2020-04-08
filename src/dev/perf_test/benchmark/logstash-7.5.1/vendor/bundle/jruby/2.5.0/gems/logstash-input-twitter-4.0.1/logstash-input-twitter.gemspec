Gem::Specification.new do |s|

  s.name            = 'logstash-input-twitter'
  s.version         = '4.0.1'
  s.licenses        = ['Apache License (2.0)']
  s.summary         = "Reads events from the Twitter Streaming API"
  s.description     = "This gem is a Logstash plugin required to be installed on top of the Logstash core pipeline using $LS_HOME/bin/logstash-plugin install gemname. This gem is not a stand-alone program"
  s.authors         = ["Elastic"]
  s.email           = 'info@elastic.co'
  s.homepage        = "http://www.elastic.co/guide/en/logstash/current/index.html"
  s.require_paths = ["lib"]

  # Files
  s.files = Dir["lib/**/*","spec/**/*","*.gemspec","*.md","CONTRIBUTORS","Gemfile","LICENSE","NOTICE.TXT", "vendor/jar-dependencies/**/*.jar", "vendor/jar-dependencies/**/*.rb", "VERSION", "docs/**/*"]

  # Tests
  s.test_files = s.files.grep(%r{^(test|spec|features)/})

  # Special flag to let us know this is actually a logstash plugin
  s.metadata = { "logstash_plugin" => "true", "logstash_group" => "input" }

  # public_suffix 3.x+ includes ruby syntax from 2.1
  # This effectively requires Logstash >= 6.x
  s.required_ruby_version = '>= 2.1.0'

  # Gem dependencies
  s.add_runtime_dependency "logstash-core-plugin-api", ">= 1.60", "<= 2.99"
  s.add_runtime_dependency 'twitter', '6.2.0'
  s.add_runtime_dependency 'http-form_data', '~> 2'
  s.add_runtime_dependency 'public_suffix', '~> 3'
  s.add_runtime_dependency 'stud', '>= 0.0.22', '< 0.1'

  s.add_development_dependency 'logstash-devutils'
  s.add_development_dependency 'logstash-codec-plain'
  s.add_development_dependency 'rspec-sequencing'
end
