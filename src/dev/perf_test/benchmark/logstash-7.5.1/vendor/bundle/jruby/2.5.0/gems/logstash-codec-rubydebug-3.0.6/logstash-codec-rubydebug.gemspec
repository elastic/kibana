Gem::Specification.new do |s|

  s.name            = 'logstash-codec-rubydebug'
  s.version         = '3.0.6'
  s.licenses        = ['Apache License (2.0)']
  s.summary         = "Applies the Ruby Awesome Print library to Logstash events"
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
  s.metadata = { "logstash_plugin" => "true", "logstash_group" => "codec" }

  # Gem dependencies
  s.add_runtime_dependency "logstash-core-plugin-api", ">= 1.60", "<= 2.99"

  # 2018-06-04: as of this writing, the latest release of awesome_print (v1.8.0) contains a bug that causes the Logstash
  # process to crash while loading this dependency if an exception is raised attempting to load defaults (e.g., when
  # `ENV['HOME']` is unset or the JVM doesn't have permission to read the `.aprc` file at that address).
  #
  # Pin to 1.7.0 until the already-fixed code on awesome_print's master branch finds its way to a release.
  # SEE: https://github.com/awesome-print/awesome_print/issues/338
  s.add_runtime_dependency 'awesome_print', '1.7.0'

  s.add_development_dependency 'logstash-devutils'
end

