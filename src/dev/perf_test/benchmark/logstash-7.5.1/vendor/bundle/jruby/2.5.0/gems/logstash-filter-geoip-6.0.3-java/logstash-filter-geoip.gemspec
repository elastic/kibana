Gem::Specification.new do |s|

  s.name            = 'logstash-filter-geoip'
  s.version         = '6.0.3'
  s.licenses        = ['Apache License (2.0)']
  s.summary         = "Adds geographical information about an IP address"
  s.description     = "This gem is a Logstash plugin required to be installed on top of the Logstash core pipeline using $LS_HOME/bin/logstash-plugin install gemname. This gem is not a stand-alone program"
  s.authors         = ["Elastic"]
  s.email           = 'info@elastic.co'
  s.homepage        = "http://www.elastic.co/guide/en/logstash/current/index.html"
  s.platform      = "java"
  s.require_paths = ["lib", "vendor/jar-dependencies"]

  # Files
  s.files = Dir['lib/**/*','spec/**/*','vendor/**/*', 'vendor/jar-dependencies/**/*.jar', '*.gemspec','*.md','CONTRIBUTORS','Gemfile','LICENSE','NOTICE.TXT', 'maxmind-db-NOTICE.txt', 'docs/**/*']

  # Tests
  s.test_files = s.files.grep(%r{^(test|spec|features)/})

  # Special flag to let us know this is actually a logstash plugin
  s.metadata = { "logstash_plugin" => "true", "logstash_group" => "filter" }

  # Gem dependencies
  s.add_runtime_dependency "logstash-core-plugin-api", ">= 1.60", "<= 2.99"
  s.add_development_dependency 'logstash-devutils'
  s.add_development_dependency 'benchmark-ips'
end
