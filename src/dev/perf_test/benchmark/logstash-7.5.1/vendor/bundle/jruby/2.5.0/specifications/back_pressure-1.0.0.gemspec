# -*- encoding: utf-8 -*-
# stub: back_pressure 1.0.0 ruby lib

Gem::Specification.new do |s|
  s.name = "back_pressure".freeze
  s.version = "1.0.0"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.metadata = { "bug_tracker_uri" => "https://github.com/yaauie/ruby_back_pressure/issues", "source_code_uri" => "https://github.com/yaauie/ruby_back_pressure" } if s.respond_to? :metadata=
  s.require_paths = ["lib".freeze]
  s.authors = ["Ry Biesemeyer".freeze]
  s.bindir = "exe".freeze
  s.date = "2019-07-09"
  s.description = "BackPressure is a zero-dependency collection of stable-API tools for safely and efficiently providing blocking back-pressure.".freeze
  s.email = ["identity@yaauie.com".freeze]
  s.homepage = "https://github.com/yaauie/ruby_back_pressure".freeze
  s.licenses = ["Apache-2.0".freeze]
  s.required_ruby_version = Gem::Requirement.new(">= 2.0".freeze)
  s.rubygems_version = "2.7.9".freeze
  s.summary = "Tools for providing blocking back-pressure".freeze

  s.installed_by_version = "2.7.9" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_development_dependency(%q<bundler>.freeze, ["~> 2.0"])
      s.add_development_dependency(%q<rake>.freeze, ["~> 10.0"])
      s.add_development_dependency(%q<rspec>.freeze, ["~> 3.0"])
      s.add_development_dependency(%q<yard>.freeze, ["~> 0.9.20"])
    else
      s.add_dependency(%q<bundler>.freeze, ["~> 2.0"])
      s.add_dependency(%q<rake>.freeze, ["~> 10.0"])
      s.add_dependency(%q<rspec>.freeze, ["~> 3.0"])
      s.add_dependency(%q<yard>.freeze, ["~> 0.9.20"])
    end
  else
    s.add_dependency(%q<bundler>.freeze, ["~> 2.0"])
    s.add_dependency(%q<rake>.freeze, ["~> 10.0"])
    s.add_dependency(%q<rspec>.freeze, ["~> 3.0"])
    s.add_dependency(%q<yard>.freeze, ["~> 0.9.20"])
  end
end
