# -*- encoding: utf-8 -*-
# stub: rake-ant 1.0.4 ruby lib

Gem::Specification.new do |s|
  s.name = "rake-ant".freeze
  s.version = "1.0.4"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Thomas E Enebo".freeze, "Charles Oliver Nutter".freeze]
  s.date = "2017-10-10"
  s.email = ["tom.enebo@gmail.com".freeze, "headius@headius.com".freeze]
  s.files = [".gitignore".freeze, "Gemfile".freeze, "LICENSE".freeze, "README.md".freeze, "Rakefile".freeze, "lib/ant.rb".freeze, "lib/rake/ant.rb".freeze, "lib/rake/ant/ant.rb".freeze, "lib/rake/ant/element.rb".freeze, "lib/rake/ant/project_converter.rb".freeze, "lib/rake/ant/rake.rb".freeze, "lib/rake/ant/target.rb".freeze, "lib/rake/ant/tasks/raketasks.rb".freeze, "lib/rake/ant/version.rb".freeze, "rake-ant.gemspec".freeze]
  s.homepage = "https://github.com/jruby/rake-ant".freeze
  s.licenses = ["EPL-2.0".freeze]
  s.rubygems_version = "2.6.14.1".freeze
  s.summary = "Ant tasks and integration for Rake".freeze

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_development_dependency(%q<bundler>.freeze, ["~> 1.15"])
      s.add_development_dependency(%q<rake>.freeze, ["~> 10.0"])
    else
      s.add_dependency(%q<bundler>.freeze, ["~> 1.15"])
      s.add_dependency(%q<rake>.freeze, ["~> 10.0"])
    end
  else
    s.add_dependency(%q<bundler>.freeze, ["~> 1.15"])
    s.add_dependency(%q<rake>.freeze, ["~> 10.0"])
  end
end
