# -*- encoding: utf-8 -*-
# stub: lru_redux 1.1.0 ruby lib

Gem::Specification.new do |s|
  s.name = "lru_redux".freeze
  s.version = "1.1.0"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Sam Saffron".freeze, "Kaijah Hougham".freeze]
  s.date = "2015-04-07"
  s.description = "An efficient implementation of an lru cache".freeze
  s.email = ["sam.saffron@gmail.com".freeze, "github@seberius.com".freeze]
  s.homepage = "https://github.com/SamSaffron/lru_redux".freeze
  s.licenses = ["MIT".freeze]
  s.required_ruby_version = Gem::Requirement.new(">= 1.9.3".freeze)
  s.rubygems_version = "2.7.9".freeze
  s.summary = "An efficient implementation of an lru cache".freeze

  s.installed_by_version = "2.7.9" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_development_dependency(%q<bundler>.freeze, ["~> 1.3"])
      s.add_development_dependency(%q<rake>.freeze, [">= 0"])
      s.add_development_dependency(%q<minitest>.freeze, [">= 0"])
      s.add_development_dependency(%q<guard-minitest>.freeze, [">= 0"])
      s.add_development_dependency(%q<guard>.freeze, [">= 0"])
      s.add_development_dependency(%q<rb-inotify>.freeze, [">= 0"])
      s.add_development_dependency(%q<timecop>.freeze, ["~> 0.7"])
    else
      s.add_dependency(%q<bundler>.freeze, ["~> 1.3"])
      s.add_dependency(%q<rake>.freeze, [">= 0"])
      s.add_dependency(%q<minitest>.freeze, [">= 0"])
      s.add_dependency(%q<guard-minitest>.freeze, [">= 0"])
      s.add_dependency(%q<guard>.freeze, [">= 0"])
      s.add_dependency(%q<rb-inotify>.freeze, [">= 0"])
      s.add_dependency(%q<timecop>.freeze, ["~> 0.7"])
    end
  else
    s.add_dependency(%q<bundler>.freeze, ["~> 1.3"])
    s.add_dependency(%q<rake>.freeze, [">= 0"])
    s.add_dependency(%q<minitest>.freeze, [">= 0"])
    s.add_dependency(%q<guard-minitest>.freeze, [">= 0"])
    s.add_dependency(%q<guard>.freeze, [">= 0"])
    s.add_dependency(%q<rb-inotify>.freeze, [">= 0"])
    s.add_dependency(%q<timecop>.freeze, ["~> 0.7"])
  end
end
