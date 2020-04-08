# -*- encoding: utf-8 -*-
# stub: logstash-input-twitter 4.0.1 ruby lib

Gem::Specification.new do |s|
  s.name = "logstash-input-twitter".freeze
  s.version = "4.0.1"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.metadata = { "logstash_group" => "input", "logstash_plugin" => "true" } if s.respond_to? :metadata=
  s.require_paths = ["lib".freeze]
  s.authors = ["Elastic".freeze]
  s.date = "2019-07-11"
  s.description = "This gem is a Logstash plugin required to be installed on top of the Logstash core pipeline using $LS_HOME/bin/logstash-plugin install gemname. This gem is not a stand-alone program".freeze
  s.email = "info@elastic.co".freeze
  s.homepage = "http://www.elastic.co/guide/en/logstash/current/index.html".freeze
  s.licenses = ["Apache License (2.0)".freeze]
  s.required_ruby_version = Gem::Requirement.new(">= 2.1.0".freeze)
  s.rubygems_version = "2.7.9".freeze
  s.summary = "Reads events from the Twitter Streaming API".freeze

  s.installed_by_version = "2.7.9" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_runtime_dependency(%q<logstash-core-plugin-api>.freeze, [">= 1.60", "<= 2.99"])
      s.add_runtime_dependency(%q<twitter>.freeze, ["= 6.2.0"])
      s.add_runtime_dependency(%q<http-form_data>.freeze, ["~> 2"])
      s.add_runtime_dependency(%q<public_suffix>.freeze, ["~> 3"])
      s.add_runtime_dependency(%q<stud>.freeze, [">= 0.0.22", "< 0.1"])
      s.add_development_dependency(%q<logstash-devutils>.freeze, [">= 0"])
      s.add_development_dependency(%q<logstash-codec-plain>.freeze, [">= 0"])
      s.add_development_dependency(%q<rspec-sequencing>.freeze, [">= 0"])
    else
      s.add_dependency(%q<logstash-core-plugin-api>.freeze, [">= 1.60", "<= 2.99"])
      s.add_dependency(%q<twitter>.freeze, ["= 6.2.0"])
      s.add_dependency(%q<http-form_data>.freeze, ["~> 2"])
      s.add_dependency(%q<public_suffix>.freeze, ["~> 3"])
      s.add_dependency(%q<stud>.freeze, [">= 0.0.22", "< 0.1"])
      s.add_dependency(%q<logstash-devutils>.freeze, [">= 0"])
      s.add_dependency(%q<logstash-codec-plain>.freeze, [">= 0"])
      s.add_dependency(%q<rspec-sequencing>.freeze, [">= 0"])
    end
  else
    s.add_dependency(%q<logstash-core-plugin-api>.freeze, [">= 1.60", "<= 2.99"])
    s.add_dependency(%q<twitter>.freeze, ["= 6.2.0"])
    s.add_dependency(%q<http-form_data>.freeze, ["~> 2"])
    s.add_dependency(%q<public_suffix>.freeze, ["~> 3"])
    s.add_dependency(%q<stud>.freeze, [">= 0.0.22", "< 0.1"])
    s.add_dependency(%q<logstash-devutils>.freeze, [">= 0"])
    s.add_dependency(%q<logstash-codec-plain>.freeze, [">= 0"])
    s.add_dependency(%q<rspec-sequencing>.freeze, [">= 0"])
  end
end
