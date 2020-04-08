# -*- encoding: utf-8 -*-
# stub: logstash-output-elastic_app_search 1.0.0 ruby lib

Gem::Specification.new do |s|
  s.name = "logstash-output-elastic_app_search".freeze
  s.version = "1.0.0"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.metadata = { "logstash_group" => "output", "logstash_plugin" => "true" } if s.respond_to? :metadata=
  s.require_paths = ["lib".freeze]
  s.authors = ["Joao Duarte".freeze, "Elastic".freeze]
  s.date = "2019-06-12"
  s.description = "This gem is a Logstash plugin required to be installed on top of the Logstash core pipeline using $LS_HOME/bin/logstash-plugin install gemname. This gem is not a stand-alone program".freeze
  s.email = "info@elastic.co".freeze
  s.homepage = "https://elastic.co".freeze
  s.licenses = ["Apache-2.0".freeze]
  s.rubygems_version = "2.7.9".freeze
  s.summary = "Index data to Elastic App Search".freeze

  s.installed_by_version = "2.7.9" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_development_dependency(%q<jar-dependencies>.freeze, ["~> 0.4"])
      s.add_runtime_dependency(%q<logstash-core-plugin-api>.freeze, ["~> 2.0"])
      s.add_runtime_dependency(%q<logstash-codec-plain>.freeze, [">= 0"])
      s.add_development_dependency(%q<logstash-devutils>.freeze, [">= 0"])
    else
      s.add_dependency(%q<jar-dependencies>.freeze, ["~> 0.4"])
      s.add_dependency(%q<logstash-core-plugin-api>.freeze, ["~> 2.0"])
      s.add_dependency(%q<logstash-codec-plain>.freeze, [">= 0"])
      s.add_dependency(%q<logstash-devutils>.freeze, [">= 0"])
    end
  else
    s.add_dependency(%q<jar-dependencies>.freeze, ["~> 0.4"])
    s.add_dependency(%q<logstash-core-plugin-api>.freeze, ["~> 2.0"])
    s.add_dependency(%q<logstash-codec-plain>.freeze, [">= 0"])
    s.add_dependency(%q<logstash-devutils>.freeze, [">= 0"])
  end
end
