# -*- encoding: utf-8 -*-
# stub: equalizer 0.0.11 ruby lib

Gem::Specification.new do |s|
  s.name = "equalizer".freeze
  s.version = "0.0.11"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Dan Kubb".freeze, "Markus Schirp".freeze]
  s.date = "2015-03-23"
  s.description = "Module to define equality, equivalence and inspection methods".freeze
  s.email = ["dan.kubb@gmail.com".freeze, "mbj@schirp-dso.com".freeze]
  s.extra_rdoc_files = ["LICENSE".freeze, "README.md".freeze, "CONTRIBUTING.md".freeze]
  s.files = ["CONTRIBUTING.md".freeze, "LICENSE".freeze, "README.md".freeze]
  s.homepage = "https://github.com/dkubb/equalizer".freeze
  s.licenses = ["MIT".freeze]
  s.required_ruby_version = Gem::Requirement.new(">= 1.8.7".freeze)
  s.rubygems_version = "2.7.9".freeze
  s.summary = "Module to define equality, equivalence and inspection methods".freeze

  s.installed_by_version = "2.7.9" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_development_dependency(%q<bundler>.freeze, ["~> 1.3", ">= 1.3.5"])
    else
      s.add_dependency(%q<bundler>.freeze, ["~> 1.3", ">= 1.3.5"])
    end
  else
    s.add_dependency(%q<bundler>.freeze, ["~> 1.3", ">= 1.3.5"])
  end
end
