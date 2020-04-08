# -*- encoding: utf-8 -*-
# stub: ipaddr 1.2.0 ruby lib

Gem::Specification.new do |s|
  s.name = "ipaddr".freeze
  s.version = "1.2.0"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Akinori MUSHA".freeze, "Hajimu UMEMOTO".freeze]
  s.bindir = "exe".freeze
  s.date = "2017-10-21"
  s.description = "IPAddr provides a set of methods to manipulate an IP address.\nBoth IPv4 and IPv6 are supported.\n".freeze
  s.email = ["knu@idaemons.org".freeze, "ume@mahoroba.org".freeze]
  s.files = [".gitignore".freeze, ".travis.yml".freeze, "Gemfile".freeze, "LICENSE.txt".freeze, "README.md".freeze, "Rakefile".freeze, "bin/console".freeze, "bin/setup".freeze, "ipaddr.gemspec".freeze, "lib/ipaddr.rb".freeze]
  s.homepage = "https://github.com/ruby/ipaddr".freeze
  s.rubygems_version = "2.6.14.1".freeze
  s.summary = "A class to manipulate an IP address in ruby".freeze

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_development_dependency(%q<bundler>.freeze, ["~> 1.15"])
      s.add_development_dependency(%q<rake>.freeze, ["~> 10.0"])
      s.add_development_dependency(%q<test-unit>.freeze, [">= 0"])
    else
      s.add_dependency(%q<bundler>.freeze, ["~> 1.15"])
      s.add_dependency(%q<rake>.freeze, ["~> 10.0"])
      s.add_dependency(%q<test-unit>.freeze, [">= 0"])
    end
  else
    s.add_dependency(%q<bundler>.freeze, ["~> 1.15"])
    s.add_dependency(%q<rake>.freeze, ["~> 10.0"])
    s.add_dependency(%q<test-unit>.freeze, [">= 0"])
  end
end
