# -*- encoding: utf-8 -*-
# stub: buftok 0.2.0 ruby lib

Gem::Specification.new do |s|
  s.name = "buftok".freeze
  s.version = "0.2.0"

  s.required_rubygems_version = Gem::Requirement.new(">= 1.3.5".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Tony Arcieri".freeze, "Martin Emde".freeze, "Erik Michaels-Ober".freeze]
  s.date = "2013-11-22"
  s.description = "BufferedTokenizer extracts token delimited entities from a sequence of arbitrary inputs".freeze
  s.email = "sferik@gmail.com".freeze
  s.homepage = "https://github.com/sferik/buftok".freeze
  s.licenses = ["MIT".freeze]
  s.rubygems_version = "2.7.9".freeze
  s.summary = "BufferedTokenizer extracts token delimited entities from a sequence of arbitrary inputs".freeze

  s.installed_by_version = "2.7.9" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 3

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_development_dependency(%q<bundler>.freeze, ["~> 1.0"])
    else
      s.add_dependency(%q<bundler>.freeze, ["~> 1.0"])
    end
  else
    s.add_dependency(%q<bundler>.freeze, ["~> 1.0"])
  end
end
