# -*- encoding: utf-8 -*-
# stub: dalli 2.7.10 ruby lib

Gem::Specification.new do |s|
  s.name = "dalli".freeze
  s.version = "2.7.10"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Peter M. Goldstein".freeze, "Mike Perham".freeze]
  s.date = "2019-03-16"
  s.description = "High performance memcached client for Ruby".freeze
  s.email = ["peter.m.goldstein@gmail.com".freeze, "mperham@gmail.com".freeze]
  s.homepage = "https://github.com/petergoldstein/dalli".freeze
  s.licenses = ["MIT".freeze]
  s.rdoc_options = ["--charset=UTF-8".freeze]
  s.rubygems_version = "2.7.9".freeze
  s.summary = "High performance memcached client for Ruby".freeze

  s.installed_by_version = "2.7.9" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_development_dependency(%q<minitest>.freeze, [">= 4.2.0"])
      s.add_development_dependency(%q<mocha>.freeze, [">= 0"])
      s.add_development_dependency(%q<rails>.freeze, ["~> 5"])
      s.add_development_dependency(%q<rake>.freeze, [">= 0"])
      s.add_development_dependency(%q<appraisal>.freeze, [">= 0"])
      s.add_development_dependency(%q<connection_pool>.freeze, [">= 0"])
      s.add_development_dependency(%q<rdoc>.freeze, [">= 0"])
      s.add_development_dependency(%q<simplecov>.freeze, [">= 0"])
    else
      s.add_dependency(%q<minitest>.freeze, [">= 4.2.0"])
      s.add_dependency(%q<mocha>.freeze, [">= 0"])
      s.add_dependency(%q<rails>.freeze, ["~> 5"])
      s.add_dependency(%q<rake>.freeze, [">= 0"])
      s.add_dependency(%q<appraisal>.freeze, [">= 0"])
      s.add_dependency(%q<connection_pool>.freeze, [">= 0"])
      s.add_dependency(%q<rdoc>.freeze, [">= 0"])
      s.add_dependency(%q<simplecov>.freeze, [">= 0"])
    end
  else
    s.add_dependency(%q<minitest>.freeze, [">= 4.2.0"])
    s.add_dependency(%q<mocha>.freeze, [">= 0"])
    s.add_dependency(%q<rails>.freeze, ["~> 5"])
    s.add_dependency(%q<rake>.freeze, [">= 0"])
    s.add_dependency(%q<appraisal>.freeze, [">= 0"])
    s.add_dependency(%q<connection_pool>.freeze, [">= 0"])
    s.add_dependency(%q<rdoc>.freeze, [">= 0"])
    s.add_dependency(%q<simplecov>.freeze, [">= 0"])
  end
end
