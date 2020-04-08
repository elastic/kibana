# -*- encoding: utf-8 -*-
# stub: awesome_print 1.7.0 ruby lib

Gem::Specification.new do |s|
  s.name = "awesome_print".freeze
  s.version = "1.7.0"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Michael Dvorkin".freeze]
  s.date = "2016-06-07"
  s.description = "Great Ruby dubugging companion: pretty print Ruby objects to visualize their structure. Supports custom object formatting via plugins".freeze
  s.email = "mike@dvorkin.net".freeze
  s.homepage = "https://github.com/awesome-print/awesome_print".freeze
  s.licenses = ["MIT".freeze]
  s.rubyforge_project = "awesome_print".freeze
  s.rubygems_version = "2.7.9".freeze
  s.summary = "Pretty print Ruby objects with proper indentation and colors".freeze

  s.installed_by_version = "2.7.9" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_development_dependency(%q<rspec>.freeze, [">= 3.0.0"])
      s.add_development_dependency(%q<appraisal>.freeze, [">= 0"])
      s.add_development_dependency(%q<fakefs>.freeze, [">= 0.2.1"])
      s.add_development_dependency(%q<sqlite3>.freeze, [">= 0"])
      s.add_development_dependency(%q<nokogiri>.freeze, [">= 1.6.5"])
      s.add_development_dependency(%q<codeclimate-test-reporter>.freeze, [">= 0"])
    else
      s.add_dependency(%q<rspec>.freeze, [">= 3.0.0"])
      s.add_dependency(%q<appraisal>.freeze, [">= 0"])
      s.add_dependency(%q<fakefs>.freeze, [">= 0.2.1"])
      s.add_dependency(%q<sqlite3>.freeze, [">= 0"])
      s.add_dependency(%q<nokogiri>.freeze, [">= 1.6.5"])
      s.add_dependency(%q<codeclimate-test-reporter>.freeze, [">= 0"])
    end
  else
    s.add_dependency(%q<rspec>.freeze, [">= 3.0.0"])
    s.add_dependency(%q<appraisal>.freeze, [">= 0"])
    s.add_dependency(%q<fakefs>.freeze, [">= 0.2.1"])
    s.add_dependency(%q<sqlite3>.freeze, [">= 0"])
    s.add_dependency(%q<nokogiri>.freeze, [">= 1.6.5"])
    s.add_dependency(%q<codeclimate-test-reporter>.freeze, [">= 0"])
  end
end
