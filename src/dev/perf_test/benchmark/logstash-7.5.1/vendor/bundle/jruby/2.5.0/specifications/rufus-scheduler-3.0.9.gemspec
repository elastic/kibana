# -*- encoding: utf-8 -*-
# stub: rufus-scheduler 3.0.9 ruby lib

Gem::Specification.new do |s|
  s.name = "rufus-scheduler".freeze
  s.version = "3.0.9"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["John Mettraux".freeze]
  s.date = "2014-08-29"
  s.description = "job scheduler for Ruby (at, cron, in and every jobs).".freeze
  s.email = ["jmettraux@gmail.com".freeze]
  s.homepage = "http://github.com/jmettraux/rufus-scheduler".freeze
  s.licenses = ["MIT".freeze]
  s.post_install_message = "\n***\n\nThanks for installing rufus-scheduler 3.0.9\n\nIt might not be 100% compatible with rufus-scheduler 2.x.\n\nIf you encounter issues with this new rufus-scheduler, especially\nif your app worked fine with previous versions of it, you can\n\nA) Forget it and peg your Gemfile to rufus-scheduler 2.0.24\n\nand / or\n\nB) Take some time to carefully report the issue at\n   https://github.com/jmettraux/rufus-scheduler/issues\n\nFor general help about rufus-scheduler, ask via:\nhttp://stackoverflow.com/questions/ask?tags=rufus-scheduler+ruby\n\nCheers.\n\n***\n    ".freeze
  s.rubyforge_project = "rufus".freeze
  s.rubygems_version = "2.7.9".freeze
  s.summary = "job scheduler for Ruby (at, cron, in and every jobs)".freeze

  s.installed_by_version = "2.7.9" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 3

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_runtime_dependency(%q<tzinfo>.freeze, [">= 0"])
      s.add_development_dependency(%q<rake>.freeze, [">= 0"])
      s.add_development_dependency(%q<rspec>.freeze, [">= 2.13.0"])
      s.add_development_dependency(%q<chronic>.freeze, [">= 0"])
    else
      s.add_dependency(%q<tzinfo>.freeze, [">= 0"])
      s.add_dependency(%q<rake>.freeze, [">= 0"])
      s.add_dependency(%q<rspec>.freeze, [">= 2.13.0"])
      s.add_dependency(%q<chronic>.freeze, [">= 0"])
    end
  else
    s.add_dependency(%q<tzinfo>.freeze, [">= 0"])
    s.add_dependency(%q<rake>.freeze, [">= 0"])
    s.add_dependency(%q<rspec>.freeze, [">= 2.13.0"])
    s.add_dependency(%q<chronic>.freeze, [">= 0"])
  end
end
