# -*- encoding: utf-8 -*-
# stub: gelfd2 0.4.1 ruby lib

Gem::Specification.new do |s|
  s.name = "gelfd2".freeze
  s.version = "0.4.1"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["John E. Vincent".freeze, "ptQa".freeze]
  s.date = "2017-10-19"
  s.description = "Standalone implementation of the Graylog Extended Log Format".freeze
  s.executables = ["gelfd".freeze]
  s.files = ["bin/gelfd".freeze]
  s.homepage = "https://github.com/ptqa/gelfd2".freeze
  s.rubyforge_project = "gelfd2".freeze
  s.rubygems_version = "2.7.9".freeze
  s.summary = "Pure ruby gelf server and decoding library".freeze

  s.installed_by_version = "2.7.9" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_development_dependency(%q<json>.freeze, ["~> 1.8.3"])
      s.add_development_dependency(%q<rake>.freeze, ["~> 11.2.2"])
      s.add_development_dependency(%q<test-unit>.freeze, ["~> 3.2.1"])
    else
      s.add_dependency(%q<json>.freeze, ["~> 1.8.3"])
      s.add_dependency(%q<rake>.freeze, ["~> 11.2.2"])
      s.add_dependency(%q<test-unit>.freeze, ["~> 3.2.1"])
    end
  else
    s.add_dependency(%q<json>.freeze, ["~> 1.8.3"])
    s.add_dependency(%q<rake>.freeze, ["~> 11.2.2"])
    s.add_dependency(%q<test-unit>.freeze, ["~> 3.2.1"])
  end
end
