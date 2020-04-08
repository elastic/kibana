# -*- encoding: utf-8 -*-
# stub: jar-dependencies 0.4.0 ruby lib

Gem::Specification.new do |s|
  s.name = "jar-dependencies".freeze
  s.version = "0.4.0"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["christian meier".freeze]
  s.date = "2018-10-02"
  s.description = "manage jar dependencies for gems and keep track which jar was already loaded using maven artifact coordinates. it warns on version conflicts and loads only ONE jar assuming the first one is compatible to the second one otherwise your project needs to lock down the right version by providing a Jars.lock file.".freeze
  s.email = ["mkristian@web.de".freeze]
  s.executables = ["lock_jars".freeze]
  s.files = ["MIT-LICENSE".freeze, "Mavenfile".freeze, "Rakefile".freeze, "Readme.md".freeze, "bin/lock_jars".freeze, "jar-dependencies.gemspec".freeze, "lib/jar-dependencies.rb".freeze, "lib/jar_dependencies.rb".freeze, "lib/jar_install_post_install_hook.rb".freeze, "lib/jar_installer.rb".freeze, "lib/jars/attach_jars_pom.rb".freeze, "lib/jars/classpath.rb".freeze, "lib/jars/gemspec_artifacts.rb".freeze, "lib/jars/gemspec_pom.rb".freeze, "lib/jars/installer.rb".freeze, "lib/jars/lock.rb".freeze, "lib/jars/lock_down.rb".freeze, "lib/jars/lock_down_pom.rb".freeze, "lib/jars/maven_exec.rb".freeze, "lib/jars/maven_factory.rb".freeze, "lib/jars/maven_settings.rb".freeze, "lib/jars/output_jars_pom.rb".freeze, "lib/jars/post_install_hook.rb".freeze, "lib/jars/settings.xml".freeze, "lib/jars/setup.rb".freeze, "lib/jars/version.rb".freeze, "lib/rubygems_plugin.rb".freeze]
  s.homepage = "https://github.com/mkristian/jar-dependencies".freeze
  s.licenses = ["MIT".freeze]
  s.post_install_message = "\nif you want to use the executable lock_jars then install ruby-maven gem before using lock_jars\n\n  $ gem install ruby-maven -v '~> 3.3.11'\n\nor add it as a development dependency to your Gemfile\n\n   gem 'ruby-maven', '~> 3.3.11'\n\n".freeze
  s.rubygems_version = "2.6.14.1".freeze
  s.summary = "manage jar dependencies for gems".freeze

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_development_dependency(%q<minitest>.freeze, ["~> 5.3"])
      s.add_development_dependency(%q<pry>.freeze, [">= 0"])
      s.add_development_dependency(%q<rake>.freeze, ["~> 10.2"])
      s.add_development_dependency(%q<ruby-maven>.freeze, ["~> 3.3.11"])
    else
      s.add_dependency(%q<minitest>.freeze, ["~> 5.3"])
      s.add_dependency(%q<pry>.freeze, [">= 0"])
      s.add_dependency(%q<rake>.freeze, ["~> 10.2"])
      s.add_dependency(%q<ruby-maven>.freeze, ["~> 3.3.11"])
    end
  else
    s.add_dependency(%q<minitest>.freeze, ["~> 5.3"])
    s.add_dependency(%q<pry>.freeze, [">= 0"])
    s.add_dependency(%q<rake>.freeze, ["~> 10.2"])
    s.add_dependency(%q<ruby-maven>.freeze, ["~> 3.3.11"])
  end
end
