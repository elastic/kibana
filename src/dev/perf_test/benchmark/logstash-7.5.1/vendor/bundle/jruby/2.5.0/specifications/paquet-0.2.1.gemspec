# -*- encoding: utf-8 -*-
# stub: paquet 0.2.1 ruby lib

Gem::Specification.new do |s|
  s.name = "paquet".freeze
  s.version = "0.2.1"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Elastic".freeze]
  s.bindir = "exe".freeze
  s.date = "2017-03-24"
  s.description = "This gem add a few rake tasks to create a uber gems that will be shipped as a zip".freeze
  s.email = ["info@elastic.co".freeze]
  s.homepage = "https://github.com/elastic/logstash".freeze
  s.licenses = ["Apache License (2.0)".freeze]
  s.rubygems_version = "2.7.9".freeze
  s.summary = "Rake helpers to create a uber gem".freeze

  s.installed_by_version = "2.7.9" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_development_dependency(%q<rspec>.freeze, [">= 0"])
      s.add_development_dependency(%q<pry>.freeze, [">= 0"])
      s.add_development_dependency(%q<webmock>.freeze, ["~> 2.2.0"])
      s.add_development_dependency(%q<stud>.freeze, [">= 0"])
    else
      s.add_dependency(%q<rspec>.freeze, [">= 0"])
      s.add_dependency(%q<pry>.freeze, [">= 0"])
      s.add_dependency(%q<webmock>.freeze, ["~> 2.2.0"])
      s.add_dependency(%q<stud>.freeze, [">= 0"])
    end
  else
    s.add_dependency(%q<rspec>.freeze, [">= 0"])
    s.add_dependency(%q<pry>.freeze, [">= 0"])
    s.add_dependency(%q<webmock>.freeze, ["~> 2.2.0"])
    s.add_dependency(%q<stud>.freeze, [">= 0"])
  end
end
