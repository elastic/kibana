# -*- encoding: utf-8 -*-
# stub: fileutils 1.1.0 ruby lib

Gem::Specification.new do |s|
  s.name = "fileutils".freeze
  s.version = "1.1.0"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.metadata = { "source_code_uri" => "https://github.com/ruby/fileutils" } if s.respond_to? :metadata=
  s.require_paths = ["lib".freeze]
  s.authors = ["Minero Aoki".freeze]
  s.date = "2018-05-15"
  s.description = "Several file utility methods for copying, moving, removing, etc.".freeze
  s.email = [nil]
  s.files = [".gitignore".freeze, ".travis.yml".freeze, "Gemfile".freeze, "LICENSE.txt".freeze, "README.md".freeze, "Rakefile".freeze, "bin/console".freeze, "bin/setup".freeze, "fileutils.gemspec".freeze, "lib/fileutils.rb".freeze]
  s.homepage = "https://github.com/ruby/fileutils".freeze
  s.licenses = ["BSD-2-Clause".freeze]
  s.required_ruby_version = Gem::Requirement.new(">= 2.3.0".freeze)
  s.rubygems_version = "2.6.14.1".freeze
  s.summary = "Several file utility methods for copying, moving, removing, etc.".freeze

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_development_dependency(%q<rake>.freeze, [">= 0"])
    else
      s.add_dependency(%q<rake>.freeze, [">= 0"])
    end
  else
    s.add_dependency(%q<rake>.freeze, [">= 0"])
  end
end
