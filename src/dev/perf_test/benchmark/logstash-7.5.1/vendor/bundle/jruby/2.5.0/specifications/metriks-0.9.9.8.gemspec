# -*- encoding: utf-8 -*-
# stub: metriks 0.9.9.8 ruby lib

Gem::Specification.new do |s|
  s.name = "metriks".freeze
  s.version = "0.9.9.8"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Eric Lindvall".freeze]
  s.date = "2017-04-26"
  s.description = "An experimental metrics client.".freeze
  s.email = "eric@sevenscale.com".freeze
  s.extra_rdoc_files = ["README.md".freeze, "LICENSE".freeze]
  s.files = ["LICENSE".freeze, "README.md".freeze]
  s.homepage = "https://github.com/eric/metriks".freeze
  s.rdoc_options = ["--charset=UTF-8".freeze]
  s.rubygems_version = "2.7.9".freeze
  s.summary = "An experimental metrics client".freeze

  s.installed_by_version = "2.7.9" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 2

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_runtime_dependency(%q<atomic>.freeze, ["~> 1.0"])
      s.add_runtime_dependency(%q<hitimes>.freeze, ["~> 1.1"])
      s.add_runtime_dependency(%q<avl_tree>.freeze, ["~> 1.2.0"])
      s.add_development_dependency(%q<mocha>.freeze, ["~> 0.10"])
    else
      s.add_dependency(%q<atomic>.freeze, ["~> 1.0"])
      s.add_dependency(%q<hitimes>.freeze, ["~> 1.1"])
      s.add_dependency(%q<avl_tree>.freeze, ["~> 1.2.0"])
      s.add_dependency(%q<mocha>.freeze, ["~> 0.10"])
    end
  else
    s.add_dependency(%q<atomic>.freeze, ["~> 1.0"])
    s.add_dependency(%q<hitimes>.freeze, ["~> 1.1"])
    s.add_dependency(%q<avl_tree>.freeze, ["~> 1.2.0"])
    s.add_dependency(%q<mocha>.freeze, ["~> 0.10"])
  end
end
