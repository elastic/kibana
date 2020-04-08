Gem::Specification.new do |s|
  s.name            = 'logstash-mixin-http_client'
  s.version         = '7.0.0'
  s.licenses        = ['Apache License (2.0)']
  s.summary         = "AWS mixins to provide a unified interface for Amazon Webservice"
  s.description     = "This gem is a Logstash plugin required to be installed on top of the Logstash core pipeline using $LS_HOME/bin/logstash-plugin install gemname. This gem is not a stand-alone program"
  s.authors         = ["Elastic"]
  s.email           = 'info@elastic.co'
  s.homepage        = "http://www.elastic.co/guide/en/logstash/current/index.html"
  s.require_paths = ["lib"]

  # Files
  s.files = Dir['lib/**/*','spec/**/*','vendor/**/*','*.gemspec','*.md','CONTRIBUTORS','Gemfile','LICENSE','NOTICE.TXT']

  # Tests
  s.test_files = s.files.grep(%r{^(test|spec|features)/})

  # Gem dependencies
  s.add_runtime_dependency "logstash-core-plugin-api", ">= 1.60", "<= 2.99"
  s.add_runtime_dependency 'logstash-codec-plain'
  s.add_runtime_dependency 'manticore', '>= 0.5.2', '< 1.0.0'

  s.add_development_dependency 'logstash-devutils'
  s.add_development_dependency 'stud'
end
