# -*- encoding: utf-8 -*-
# stub: memoizable 0.4.2 ruby lib

Gem::Specification.new do |s|
  s.name = "memoizable".freeze
  s.version = "0.4.2"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Dan Kubb".freeze, "Erik Michaels-Ober".freeze]
  s.date = "2014-03-27"
  s.description = "Memoize method return values".freeze
  s.email = ["dan.kubb@gmail.com".freeze, "sferik@gmail.com".freeze]
  s.extra_rdoc_files = ["CONTRIBUTING.md".freeze, "LICENSE.md".freeze, "README.md".freeze]
  s.files = ["CONTRIBUTING.md".freeze, "LICENSE.md".freeze, "README.md".freeze]
  s.homepage = "https://github.com/dkubb/memoizable".freeze
  s.licenses = ["MIT".freeze]
  s.rubygems_version = "2.7.9".freeze
  s.summary = "Memoize method return values".freeze

  s.installed_by_version = "2.7.9" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_runtime_dependency(%q<thread_safe>.freeze, ["~> 0.3", ">= 0.3.1"])
      s.add_development_dependency(%q<bundler>.freeze, ["~> 1.5", ">= 1.5.3"])
    else
      s.add_dependency(%q<thread_safe>.freeze, ["~> 0.3", ">= 0.3.1"])
      s.add_dependency(%q<bundler>.freeze, ["~> 1.5", ">= 1.5.3"])
    end
  else
    s.add_dependency(%q<thread_safe>.freeze, ["~> 0.3", ">= 0.3.1"])
    s.add_dependency(%q<bundler>.freeze, ["~> 1.5", ">= 1.5.3"])
  end
end
