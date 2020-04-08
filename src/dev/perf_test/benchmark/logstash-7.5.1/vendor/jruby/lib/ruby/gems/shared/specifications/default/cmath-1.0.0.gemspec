# -*- encoding: utf-8 -*-
# stub: cmath 1.0.0 ruby lib

Gem::Specification.new do |s|
  s.name = "cmath".freeze
  s.version = "1.0.0"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Tadayoshi Funaba".freeze]
  s.bindir = "exe".freeze
  s.date = "2017-12-11"
  s.description = "CMath is a library that provides trigonometric and transcendental functions for complex numbers. The functions in this module accept integers, floating-point numbers or complex numbers as arguments.".freeze
  s.email = [nil]
  s.files = ["lib/cmath.rb".freeze]
  s.homepage = "https://github.com/ruby/cmath".freeze
  s.licenses = ["BSD-2-Clause".freeze]
  s.required_ruby_version = Gem::Requirement.new(">= 2.3.0".freeze)
  s.rubygems_version = "2.6.14.1".freeze
  s.summary = "Provides Trigonometric and Transcendental functions for complex numbers".freeze

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_development_dependency(%q<bundler>.freeze, [">= 0"])
      s.add_development_dependency(%q<rake>.freeze, [">= 0"])
    else
      s.add_dependency(%q<bundler>.freeze, [">= 0"])
      s.add_dependency(%q<rake>.freeze, [">= 0"])
    end
  else
    s.add_dependency(%q<bundler>.freeze, [">= 0"])
    s.add_dependency(%q<rake>.freeze, [">= 0"])
  end
end
