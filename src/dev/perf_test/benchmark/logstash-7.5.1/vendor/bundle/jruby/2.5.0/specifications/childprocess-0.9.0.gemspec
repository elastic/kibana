# -*- encoding: utf-8 -*-
# stub: childprocess 0.9.0 ruby lib

Gem::Specification.new do |s|
  s.name = "childprocess".freeze
  s.version = "0.9.0"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Jari Bakken".freeze, "Eric Kessler".freeze]
  s.date = "2018-03-10"
  s.description = "This gem aims at being a simple and reliable solution for controlling external programs running in the background on any Ruby / OS combination.".freeze
  s.email = ["morrow748@gmail.com".freeze]
  s.homepage = "http://github.com/enkessler/childprocess".freeze
  s.licenses = ["MIT".freeze]
  s.rubyforge_project = "childprocess".freeze
  s.rubygems_version = "2.7.9".freeze
  s.summary = "A simple and reliable solution for controlling external programs running in the background on any Ruby / OS combination.".freeze

  s.installed_by_version = "2.7.9" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_runtime_dependency(%q<ffi>.freeze, ["~> 1.0", ">= 1.0.11"])
      s.add_development_dependency(%q<rspec>.freeze, ["~> 3.0"])
      s.add_development_dependency(%q<yard>.freeze, ["~> 0.0"])
      s.add_development_dependency(%q<rake>.freeze, ["< 12.0"])
      s.add_development_dependency(%q<coveralls>.freeze, ["< 1.0"])
    else
      s.add_dependency(%q<ffi>.freeze, ["~> 1.0", ">= 1.0.11"])
      s.add_dependency(%q<rspec>.freeze, ["~> 3.0"])
      s.add_dependency(%q<yard>.freeze, ["~> 0.0"])
      s.add_dependency(%q<rake>.freeze, ["< 12.0"])
      s.add_dependency(%q<coveralls>.freeze, ["< 1.0"])
    end
  else
    s.add_dependency(%q<ffi>.freeze, ["~> 1.0", ">= 1.0.11"])
    s.add_dependency(%q<rspec>.freeze, ["~> 3.0"])
    s.add_dependency(%q<yard>.freeze, ["~> 0.0"])
    s.add_dependency(%q<rake>.freeze, ["< 12.0"])
    s.add_dependency(%q<coveralls>.freeze, ["< 1.0"])
  end
end
