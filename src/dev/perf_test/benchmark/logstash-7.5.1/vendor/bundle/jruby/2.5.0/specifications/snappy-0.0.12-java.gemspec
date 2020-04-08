# -*- encoding: utf-8 -*-
# stub: snappy 0.0.12 java lib

Gem::Specification.new do |s|
  s.name = "snappy".freeze
  s.version = "0.0.12"
  s.platform = "java".freeze

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["miyucy".freeze]
  s.date = "2015-06-02"
  s.description = "libsnappy binding for Ruby".freeze
  s.email = ["fistfvck@gmail.com".freeze]
  s.homepage = "http://github.com/miyucy/snappy".freeze
  s.licenses = ["MIT".freeze]
  s.rubygems_version = "2.7.9".freeze
  s.summary = "libsnappy binding for Ruby".freeze

  s.installed_by_version = "2.7.9" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_runtime_dependency(%q<snappy-jars>.freeze, ["~> 1.1.0"])
      s.add_development_dependency(%q<bundler>.freeze, ["~> 1.3"])
      s.add_development_dependency(%q<rake>.freeze, [">= 0"])
      s.add_development_dependency(%q<minitest>.freeze, [">= 0"])
    else
      s.add_dependency(%q<snappy-jars>.freeze, ["~> 1.1.0"])
      s.add_dependency(%q<bundler>.freeze, ["~> 1.3"])
      s.add_dependency(%q<rake>.freeze, [">= 0"])
      s.add_dependency(%q<minitest>.freeze, [">= 0"])
    end
  else
    s.add_dependency(%q<snappy-jars>.freeze, ["~> 1.1.0"])
    s.add_dependency(%q<bundler>.freeze, ["~> 1.3"])
    s.add_dependency(%q<rake>.freeze, [">= 0"])
    s.add_dependency(%q<minitest>.freeze, [">= 0"])
  end
end
