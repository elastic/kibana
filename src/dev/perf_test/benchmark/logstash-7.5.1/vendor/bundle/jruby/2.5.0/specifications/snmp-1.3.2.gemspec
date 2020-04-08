# -*- encoding: utf-8 -*-
# stub: snmp 1.3.2 ruby lib

Gem::Specification.new do |s|
  s.name = "snmp".freeze
  s.version = "1.3.2"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Dave Halliday".freeze]
  s.date = "2019-06-20"
  s.description = "A Ruby implementation of SNMP (the Simple Network Management Protocol).".freeze
  s.email = "hallidave@gmail.com".freeze
  s.extra_rdoc_files = ["README.rdoc".freeze]
  s.files = ["README.rdoc".freeze]
  s.homepage = "https://github.com/hallidave/ruby-snmp".freeze
  s.licenses = ["MIT".freeze]
  s.rdoc_options = ["--main".freeze, "README.rdoc".freeze, "--title".freeze, "SNMP Library for Ruby".freeze]
  s.required_ruby_version = Gem::Requirement.new(">= 1.9.0".freeze)
  s.rubygems_version = "2.7.9".freeze
  s.summary = "A Ruby implementation of SNMP (the Simple Network Management Protocol).".freeze

  s.installed_by_version = "2.7.9" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_development_dependency(%q<rake>.freeze, [">= 0"])
      s.add_development_dependency(%q<bundler>.freeze, [">= 0"])
      s.add_development_dependency(%q<minitest>.freeze, [">= 0"])
      s.add_development_dependency(%q<rdoc>.freeze, [">= 0"])
    else
      s.add_dependency(%q<rake>.freeze, [">= 0"])
      s.add_dependency(%q<bundler>.freeze, [">= 0"])
      s.add_dependency(%q<minitest>.freeze, [">= 0"])
      s.add_dependency(%q<rdoc>.freeze, [">= 0"])
    end
  else
    s.add_dependency(%q<rake>.freeze, [">= 0"])
    s.add_dependency(%q<bundler>.freeze, [">= 0"])
    s.add_dependency(%q<minitest>.freeze, [">= 0"])
    s.add_dependency(%q<rdoc>.freeze, [">= 0"])
  end
end
