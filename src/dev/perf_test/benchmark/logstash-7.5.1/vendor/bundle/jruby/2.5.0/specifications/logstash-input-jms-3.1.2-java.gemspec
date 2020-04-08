# -*- encoding: utf-8 -*-
# stub: logstash-input-jms 3.1.2 java lib

Gem::Specification.new do |s|
  s.name = "logstash-input-jms".freeze
  s.version = "3.1.2"
  s.platform = "java".freeze

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.metadata = { "logstash_group" => "input", "logstash_plugin" => "true" } if s.respond_to? :metadata=
  s.require_paths = ["lib".freeze]
  s.authors = ["Elasticsearch".freeze]
  s.date = "2019-12-05"
  s.description = "This gem is a Logstash plugin required to be installed on top of the Logstash core pipeline using $LS_HOME/bin/logstash-plugin install gemname. This gem is not a stand-alone program".freeze
  s.email = "info@elasticsearch.com".freeze
  s.homepage = "http://www.elasticsearch.org/guide/en/logstash/current/index.html".freeze
  s.licenses = ["Apache License (2.0)".freeze]
  s.rubygems_version = "2.7.9".freeze
  s.summary = "Reads events from a Jms Broker".freeze

  s.installed_by_version = "2.7.9" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_runtime_dependency(%q<logstash-core-plugin-api>.freeze, [">= 1.60", "<= 2.99"])
      s.add_runtime_dependency(%q<logstash-codec-json>.freeze, ["~> 3.0"])
      s.add_runtime_dependency(%q<logstash-codec-plain>.freeze, ["~> 3.0"])
      s.add_runtime_dependency(%q<semantic_logger>.freeze, ["< 4.0.0"])
      s.add_runtime_dependency(%q<jruby-jms>.freeze, [">= 1.2.0"])
      s.add_development_dependency(%q<logstash-devutils>.freeze, [">= 0"])
    else
      s.add_dependency(%q<logstash-core-plugin-api>.freeze, [">= 1.60", "<= 2.99"])
      s.add_dependency(%q<logstash-codec-json>.freeze, ["~> 3.0"])
      s.add_dependency(%q<logstash-codec-plain>.freeze, ["~> 3.0"])
      s.add_dependency(%q<semantic_logger>.freeze, ["< 4.0.0"])
      s.add_dependency(%q<jruby-jms>.freeze, [">= 1.2.0"])
      s.add_dependency(%q<logstash-devutils>.freeze, [">= 0"])
    end
  else
    s.add_dependency(%q<logstash-core-plugin-api>.freeze, [">= 1.60", "<= 2.99"])
    s.add_dependency(%q<logstash-codec-json>.freeze, ["~> 3.0"])
    s.add_dependency(%q<logstash-codec-plain>.freeze, ["~> 3.0"])
    s.add_dependency(%q<semantic_logger>.freeze, ["< 4.0.0"])
    s.add_dependency(%q<jruby-jms>.freeze, [">= 1.2.0"])
    s.add_dependency(%q<logstash-devutils>.freeze, [">= 0"])
  end
end
