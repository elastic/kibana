# -*- encoding: utf-8 -*-
# stub: edn 1.1.1 ruby lib

Gem::Specification.new do |s|
  s.name = "edn".freeze
  s.version = "1.1.1"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Clinton N. Dreisbach & Russ Olsen".freeze]
  s.date = "2016-05-31"
  s.description = "'edn implements a reader for Extensible Data Notation by Rich Hickey.'".freeze
  s.email = ["russ@russolsen.com".freeze]
  s.homepage = "https://github.com/relevance/edn-ruby".freeze
  s.licenses = ["MIT".freeze]
  s.rubygems_version = "2.7.9".freeze
  s.summary = "'edn implements a reader for Extensible Data Notation by Rich Hickey.'".freeze

  s.installed_by_version = "2.7.9" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_development_dependency(%q<pry>.freeze, ["~> 0.9.10"])
      s.add_development_dependency(%q<rspec>.freeze, ["~> 2.11.0"])
      s.add_development_dependency(%q<rantly>.freeze, ["~> 0.3.1"])
      s.add_development_dependency(%q<rake>.freeze, ["~> 10.3"])
    else
      s.add_dependency(%q<pry>.freeze, ["~> 0.9.10"])
      s.add_dependency(%q<rspec>.freeze, ["~> 2.11.0"])
      s.add_dependency(%q<rantly>.freeze, ["~> 0.3.1"])
      s.add_dependency(%q<rake>.freeze, ["~> 10.3"])
    end
  else
    s.add_dependency(%q<pry>.freeze, ["~> 0.9.10"])
    s.add_dependency(%q<rspec>.freeze, ["~> 2.11.0"])
    s.add_dependency(%q<rantly>.freeze, ["~> 0.3.1"])
    s.add_dependency(%q<rake>.freeze, ["~> 10.3"])
  end
end
