# -*- encoding: utf-8 -*-
# stub: jruby-jms 1.3.0 java lib

Gem::Specification.new do |s|
  s.name = "jruby-jms".freeze
  s.version = "1.3.0"
  s.platform = "java".freeze

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Reid Morrison".freeze]
  s.date = "2019-01-06"
  s.description = "jruby-jms is a complete JRuby API into Java Messaging Specification (JMS) V1.1. For JRuby only.".freeze
  s.email = ["reidmo@gmail.com".freeze]
  s.homepage = "https://github.com/reidmorrison/jruby-jms".freeze
  s.licenses = ["Apache-2.0".freeze]
  s.rubygems_version = "2.7.9".freeze
  s.summary = "JRuby interface into JMS".freeze

  s.installed_by_version = "2.7.9" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_runtime_dependency(%q<gene_pool>.freeze, [">= 0"])
      s.add_runtime_dependency(%q<semantic_logger>.freeze, [">= 0"])
    else
      s.add_dependency(%q<gene_pool>.freeze, [">= 0"])
      s.add_dependency(%q<semantic_logger>.freeze, [">= 0"])
    end
  else
    s.add_dependency(%q<gene_pool>.freeze, [">= 0"])
    s.add_dependency(%q<semantic_logger>.freeze, [">= 0"])
  end
end
