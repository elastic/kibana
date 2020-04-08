Gem::Specification.new do |s|
  s.name            = 'logstash-integration-rabbitmq'
  s.version         = '7.0.2'
  s.licenses        = ['Apache License (2.0)']
  s.summary         = "Integration with RabbitMQ - input and output plugins"
  s.description     = "This gem is a Logstash plugin required to be installed on top of the Logstash core pipeline "+
                      "using $LS_HOME/bin/logstash-plugin install gemname. This gem is not a stand-alone program."
  s.authors         = ["Elastic"]
  s.email           = 'info@elastic.co'
  s.homepage        = "http://www.elastic.co/guide/en/logstash/current/index.html"
  s.require_paths   = ["lib"]

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
      "integration_plugins" => "logstash-input-rabbitmq,logstash-output-rabbitmq"
  }

  s.platform = RUBY_PLATFORM

  # Gem dependencies
  s.add_runtime_dependency "logstash-core-plugin-api", ">= 1.60", "<= 2.99"
  s.add_runtime_dependency "logstash-core", ">= 6.5.0"

  s.add_runtime_dependency 'logstash-codec-json'

  s.add_runtime_dependency 'march_hare', ['~> 4.0'] #(MIT license)
  s.add_runtime_dependency 'stud', '~> 0.0.22'
  s.add_runtime_dependency 'back_pressure', '~> 1.0'

  s.add_development_dependency 'logstash-devutils'
  s.add_development_dependency 'logstash-input-generator'
  s.add_development_dependency 'logstash-codec-plain'
end
