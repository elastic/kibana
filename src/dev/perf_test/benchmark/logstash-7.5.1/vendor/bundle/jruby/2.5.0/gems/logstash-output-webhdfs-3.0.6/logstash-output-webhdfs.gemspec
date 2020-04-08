# encoding: utf-8
Gem::Specification.new do |s|

  s.name            = 'logstash-output-webhdfs'
  s.version         = '3.0.6'
  s.licenses        = ['Apache License (2.0)']
  s.summary         = "Sends Logstash events to HDFS using the `webhdfs` REST API"
  s.description     = "This gem is a Logstash plugin required to be installed on top of the Logstash core pipeline using $LS_HOME/bin/logstash-plugin install gemname. This gem is not a stand-alone program"
  s.authors         = ["Björn Puttmann, loshkovskyi, Elastic"]
  s.email           = 'b.puttmann@dbap.de'
  s.homepage        = "http://www.dbap.de"
  s.require_paths = ["lib"]

  # Files
  s.files = Dir["lib/**/*","spec/**/*","*.gemspec","*.md","CONTRIBUTORS","Gemfile","LICENSE","NOTICE.TXT", "vendor/jar-dependencies/**/*.jar", "vendor/jar-dependencies/**/*.rb", "VERSION", "docs/**/*"]

  # Tests
  s.test_files = s.files.grep(%r{^(test|spec|features)/})

  # Special flag to let us know this is actually a logstash plugin
  s.metadata = { "logstash_plugin" => "true", "logstash_group" => "output" }

  # Gem dependencies
  s.add_runtime_dependency "logstash-core-plugin-api", ">= 1.60", "<= 2.99"
  s.add_runtime_dependency 'webhdfs'
  s.add_runtime_dependency 'snappy', "= 0.0.12"
  s.add_development_dependency 'logstash-devutils'

  s.add_development_dependency 'logstash-codec-line'
  s.add_development_dependency 'logstash-codec-json'


end
