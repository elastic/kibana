# -*- encoding: utf-8 -*-
# stub: logstash-output-webhdfs 3.0.6 ruby lib

Gem::Specification.new do |s|
  s.name = "logstash-output-webhdfs".freeze
  s.version = "3.0.6"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.metadata = { "logstash_group" => "output", "logstash_plugin" => "true" } if s.respond_to? :metadata=
  s.require_paths = ["lib".freeze]
  s.authors = ["Bj\u00F6rn Puttmann, loshkovskyi, Elastic".freeze]
  s.date = "2018-04-06"
  s.description = "This gem is a Logstash plugin required to be installed on top of the Logstash core pipeline using $LS_HOME/bin/logstash-plugin install gemname. This gem is not a stand-alone program".freeze
  s.email = "b.puttmann@dbap.de".freeze
  s.homepage = "http://www.dbap.de".freeze
  s.licenses = ["Apache License (2.0)".freeze]
  s.rubygems_version = "2.7.9".freeze
  s.summary = "Sends Logstash events to HDFS using the `webhdfs` REST API".freeze

  s.installed_by_version = "2.7.9" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_runtime_dependency(%q<logstash-core-plugin-api>.freeze, [">= 1.60", "<= 2.99"])
      s.add_runtime_dependency(%q<webhdfs>.freeze, [">= 0"])
      s.add_runtime_dependency(%q<snappy>.freeze, ["= 0.0.12"])
      s.add_development_dependency(%q<logstash-devutils>.freeze, [">= 0"])
      s.add_development_dependency(%q<logstash-codec-line>.freeze, [">= 0"])
      s.add_development_dependency(%q<logstash-codec-json>.freeze, [">= 0"])
    else
      s.add_dependency(%q<logstash-core-plugin-api>.freeze, [">= 1.60", "<= 2.99"])
      s.add_dependency(%q<webhdfs>.freeze, [">= 0"])
      s.add_dependency(%q<snappy>.freeze, ["= 0.0.12"])
      s.add_dependency(%q<logstash-devutils>.freeze, [">= 0"])
      s.add_dependency(%q<logstash-codec-line>.freeze, [">= 0"])
      s.add_dependency(%q<logstash-codec-json>.freeze, [">= 0"])
    end
  else
    s.add_dependency(%q<logstash-core-plugin-api>.freeze, [">= 1.60", "<= 2.99"])
    s.add_dependency(%q<webhdfs>.freeze, [">= 0"])
    s.add_dependency(%q<snappy>.freeze, ["= 0.0.12"])
    s.add_dependency(%q<logstash-devutils>.freeze, [">= 0"])
    s.add_dependency(%q<logstash-codec-line>.freeze, [">= 0"])
    s.add_dependency(%q<logstash-codec-json>.freeze, [">= 0"])
  end
end
