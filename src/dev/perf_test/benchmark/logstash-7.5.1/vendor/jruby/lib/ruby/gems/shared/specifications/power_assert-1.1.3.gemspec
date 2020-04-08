# -*- encoding: utf-8 -*-
# stub: power_assert 1.1.3 ruby lib

Gem::Specification.new do |s|
  s.name = "power_assert".freeze
  s.version = "1.1.3"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Kazuki Tsujimoto".freeze]
  s.bindir = "exe".freeze
  s.date = "2018-06-24"
  s.description = "Power Assert for Ruby. Power Assert shows each value of variables and method calls in the expression. It is useful for testing, providing which value wasn't correct when the condition is not satisfied.".freeze
  s.email = ["kazuki@callcc.net".freeze]
  s.extra_rdoc_files = ["README.rdoc".freeze]
  s.files = ["README.rdoc".freeze]
  s.homepage = "https://github.com/k-tsj/power_assert".freeze
  s.licenses = ["2-clause BSDL".freeze, "Ruby's".freeze]
  s.rdoc_options = ["--main".freeze, "README.rdoc".freeze]
  s.rubygems_version = "2.6.14.1".freeze
  s.summary = "Power Assert for Ruby".freeze

  s.installed_by_version = "2.6.14.1" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_development_dependency(%q<test-unit>.freeze, [">= 0"])
      s.add_development_dependency(%q<rake>.freeze, [">= 0"])
      s.add_development_dependency(%q<simplecov>.freeze, [">= 0"])
      s.add_development_dependency(%q<bundler>.freeze, [">= 0"])
      s.add_development_dependency(%q<pry>.freeze, [">= 0"])
      s.add_development_dependency(%q<byebug>.freeze, [">= 0"])
      s.add_development_dependency(%q<benchmark-ips>.freeze, [">= 0"])
    else
      s.add_dependency(%q<test-unit>.freeze, [">= 0"])
      s.add_dependency(%q<rake>.freeze, [">= 0"])
      s.add_dependency(%q<simplecov>.freeze, [">= 0"])
      s.add_dependency(%q<bundler>.freeze, [">= 0"])
      s.add_dependency(%q<pry>.freeze, [">= 0"])
      s.add_dependency(%q<byebug>.freeze, [">= 0"])
      s.add_dependency(%q<benchmark-ips>.freeze, [">= 0"])
    end
  else
    s.add_dependency(%q<test-unit>.freeze, [">= 0"])
    s.add_dependency(%q<rake>.freeze, [">= 0"])
    s.add_dependency(%q<simplecov>.freeze, [">= 0"])
    s.add_dependency(%q<bundler>.freeze, [">= 0"])
    s.add_dependency(%q<pry>.freeze, [">= 0"])
    s.add_dependency(%q<byebug>.freeze, [">= 0"])
    s.add_dependency(%q<benchmark-ips>.freeze, [">= 0"])
  end
end
