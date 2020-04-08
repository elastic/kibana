# -*- encoding: utf-8 -*-
# stub: mustache 0.99.8 ruby lib

Gem::Specification.new do |s|
  s.name = "mustache".freeze
  s.version = "0.99.8"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Chris Wanstrath".freeze, "Magnus Holm".freeze, "Pieter van de Bruggen".freeze]
  s.date = "2014-12-01"
  s.description = "Inspired by ctemplate, Mustache is a framework-agnostic way to render\nlogic-free views.\n\nAs ctemplates says, \"It emphasizes separating logic from presentation:\nit is impossible to embed application logic in this template\nlanguage.\n\nThink of Mustache as a replacement for your views. Instead of views\nconsisting of ERB or HAML with random helpers and arbitrary logic,\nyour views are broken into two parts: a Ruby class and an HTML\ntemplate.\n".freeze
  s.email = "chris@ozmm.org".freeze
  s.executables = ["mustache".freeze]
  s.files = ["bin/mustache".freeze]
  s.homepage = "http://github.com/mustache/mustache".freeze
  s.licenses = ["MIT".freeze]
  s.required_ruby_version = Gem::Requirement.new(">= 1.9.3".freeze)
  s.rubygems_version = "2.7.9".freeze
  s.summary = "Mustache is a framework-agnostic way to render logic-free views.".freeze

  s.installed_by_version = "2.7.9" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_development_dependency(%q<bundler>.freeze, ["~> 1.6"])
      s.add_development_dependency(%q<rake>.freeze, ["~> 10.3"])
      s.add_development_dependency(%q<rdoc>.freeze, ["~> 4.1"])
      s.add_development_dependency(%q<ronn>.freeze, ["~> 0.7"])
      s.add_development_dependency(%q<turn>.freeze, ["~> 0.9"])
    else
      s.add_dependency(%q<bundler>.freeze, ["~> 1.6"])
      s.add_dependency(%q<rake>.freeze, ["~> 10.3"])
      s.add_dependency(%q<rdoc>.freeze, ["~> 4.1"])
      s.add_dependency(%q<ronn>.freeze, ["~> 0.7"])
      s.add_dependency(%q<turn>.freeze, ["~> 0.9"])
    end
  else
    s.add_dependency(%q<bundler>.freeze, ["~> 1.6"])
    s.add_dependency(%q<rake>.freeze, ["~> 10.3"])
    s.add_dependency(%q<rdoc>.freeze, ["~> 4.1"])
    s.add_dependency(%q<ronn>.freeze, ["~> 0.7"])
    s.add_dependency(%q<turn>.freeze, ["~> 0.9"])
  end
end
