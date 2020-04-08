Gem::Specification.new do |s|
  s.name            = 'logstash-integration-kafka'
  s.version         = '10.0.0'
  s.licenses        = ['Apache-2.0']
  s.summary         = "Integration with Kafka - input and output plugins"
  s.description     = "This gem is a Logstash plugin required to be installed on top of the Logstash core pipeline "+
                      "using $LS_HOME/bin/logstash-plugin install gemname. This gem is not a stand-alone program."
  s.authors         = ["Elastic"]
  s.email           = 'info@elastic.co'
  s.homepage        = "http://www.elastic.co/guide/en/logstash/current/index.html"
  s.require_paths   = ['lib', 'vendor/jar-dependencies']

  # Files
  s.files = Dir.glob(%w(
    lib/**/*
    spec/**/*
    *.gemspec
    *.md
    CONTRIBUTORS
    Gemfile
    LICENSE
    NOTICE.TXT
    vendor/jar-dependencies/**/*.jar
    vendor/jar-dependencies/**/*.rb
    VERSION docs/**/*
  ))

  # Tests
  s.test_files = s.files.grep(%r{^(test|spec|features)/})

  # Special flag to let us know this is actually a logstash plugin
  s.metadata = {
      "logstash_plugin"     => "true",
      "logstash_group"      => "integration",
      "integration_plugins" => "logstash-input-kafka,logstash-output-kafka"
  }

  s.add_development_dependency 'jar-dependencies', '~> 0.3.12'

  s.platform = RUBY_PLATFORM

  # Gem dependencies
  s.add_runtime_dependency "logstash-core-plugin-api", ">= 1.60", "<= 2.99"
  s.add_runtime_dependency "logstash-core", ">= 6.5.0"

  s.add_runtime_dependency 'logstash-codec-json'
  s.add_runtime_dependency 'logstash-codec-plain'
  s.add_runtime_dependency 'stud', '>= 0.0.22', '< 0.1.0'

  s.add_development_dependency 'logstash-devutils'
  s.add_development_dependency 'rspec-wait'
  s.add_development_dependency 'poseidon'
  s.add_development_dependency 'snappy'
end
