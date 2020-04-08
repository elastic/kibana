# -*- encoding: utf-8 -*-
# stub: jls-lumberjack 0.0.26 ruby lib

Gem::Specification.new do |s|
  s.name = "jls-lumberjack".freeze
  s.version = "0.0.26"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Jordan Sissel".freeze]
  s.date = "2015-10-19"
  s.description = "lumberjack log transport library".freeze
  s.email = ["jls@semicomplete.com".freeze]
  s.homepage = "https://github.com/jordansissel/lumberjack".freeze
  s.rubygems_version = "2.7.9".freeze
  s.summary = "lumberjack log transport library".freeze

  s.installed_by_version = "2.7.9" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_runtime_dependency(%q<concurrent-ruby>.freeze, [">= 0"])
      s.add_development_dependency(%q<flores>.freeze, ["~> 0.0.6"])
      s.add_development_dependency(%q<rspec>.freeze, [">= 0"])
      s.add_development_dependency(%q<stud>.freeze, [">= 0"])
      s.add_development_dependency(%q<pry>.freeze, [">= 0"])
      s.add_development_dependency(%q<rspec-wait>.freeze, [">= 0"])
    else
      s.add_dependency(%q<concurrent-ruby>.freeze, [">= 0"])
      s.add_dependency(%q<flores>.freeze, ["~> 0.0.6"])
      s.add_dependency(%q<rspec>.freeze, [">= 0"])
      s.add_dependency(%q<stud>.freeze, [">= 0"])
      s.add_dependency(%q<pry>.freeze, [">= 0"])
      s.add_dependency(%q<rspec-wait>.freeze, [">= 0"])
    end
  else
    s.add_dependency(%q<concurrent-ruby>.freeze, [">= 0"])
    s.add_dependency(%q<flores>.freeze, ["~> 0.0.6"])
    s.add_dependency(%q<rspec>.freeze, [">= 0"])
    s.add_dependency(%q<stud>.freeze, [">= 0"])
    s.add_dependency(%q<pry>.freeze, [">= 0"])
    s.add_dependency(%q<rspec-wait>.freeze, [">= 0"])
  end
end
