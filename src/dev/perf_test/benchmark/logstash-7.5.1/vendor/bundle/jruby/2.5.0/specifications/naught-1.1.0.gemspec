# -*- encoding: utf-8 -*-
# stub: naught 1.1.0 ruby lib

Gem::Specification.new do |s|
  s.name = "naught".freeze
  s.version = "1.1.0"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Avdi Grimm".freeze]
  s.date = "2015-09-08"
  s.description = "Naught is a toolkit for building Null Objects".freeze
  s.email = ["avdi@avdi.org".freeze]
  s.homepage = "https://github.com/avdi/naught".freeze
  s.licenses = ["MIT".freeze]
  s.rubygems_version = "2.7.9".freeze
  s.summary = "Naught is a toolkit for building Null Objects".freeze

  s.installed_by_version = "2.7.9" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_development_dependency(%q<bundler>.freeze, ["~> 1.3"])
    else
      s.add_dependency(%q<bundler>.freeze, ["~> 1.3"])
    end
  else
    s.add_dependency(%q<bundler>.freeze, ["~> 1.3"])
  end
end
