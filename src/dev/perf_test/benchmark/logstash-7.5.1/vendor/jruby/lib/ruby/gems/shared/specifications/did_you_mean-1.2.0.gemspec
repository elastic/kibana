# -*- encoding: utf-8 -*-
# stub: did_you_mean 1.2.0 ruby lib

Gem::Specification.new do |s|
  s.name = "did_you_mean".freeze
  s.version = "1.2.0"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Yuki Nishijima".freeze]
  s.date = "2017-12-13"
  s.description = "The gem that has been saving people from typos since 2014.".freeze
  s.email = ["mail@yukinishijima.net".freeze]
  s.homepage = "https://github.com/yuki24/did_you_mean".freeze
  s.licenses = ["MIT".freeze]
  s.required_ruby_version = Gem::Requirement.new(">= 2.5.0dev".freeze)
  s.rubygems_version = "2.6.14.1".freeze
  s.summary = "\"Did you mean?\" experience in Ruby".freeze

  s.installed_by_version = "2.6.14.1" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_development_dependency(%q<bundler>.freeze, [">= 0"])
      s.add_development_dependency(%q<rake>.freeze, [">= 0"])
      s.add_development_dependency(%q<minitest>.freeze, [">= 0"])
    else
      s.add_dependency(%q<bundler>.freeze, [">= 0"])
      s.add_dependency(%q<rake>.freeze, [">= 0"])
      s.add_dependency(%q<minitest>.freeze, [">= 0"])
    end
  else
    s.add_dependency(%q<bundler>.freeze, [">= 0"])
    s.add_dependency(%q<rake>.freeze, [">= 0"])
    s.add_dependency(%q<minitest>.freeze, [">= 0"])
  end
end
