# -*- encoding: utf-8 -*-
# stub: semantic_logger 3.4.1 ruby lib

Gem::Specification.new do |s|
  s.name = "semantic_logger".freeze
  s.version = "3.4.1"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Reid Morrison".freeze]
  s.date = "2017-01-05"
  s.description = "Next generation logging system for Ruby to support highly concurrent, high throughput, low latency enterprise systems".freeze
  s.email = ["reidmo@gmail.com".freeze]
  s.homepage = "https://github.com/rocketjob/semantic_logger".freeze
  s.licenses = ["Apache-2.0".freeze]
  s.rubygems_version = "2.7.9".freeze
  s.summary = "Scalable, next generation enterprise logging for Ruby".freeze

  s.installed_by_version = "2.7.9" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_runtime_dependency(%q<concurrent-ruby>.freeze, ["~> 1.0"])
    else
      s.add_dependency(%q<concurrent-ruby>.freeze, ["~> 1.0"])
    end
  else
    s.add_dependency(%q<concurrent-ruby>.freeze, ["~> 1.0"])
  end
end
