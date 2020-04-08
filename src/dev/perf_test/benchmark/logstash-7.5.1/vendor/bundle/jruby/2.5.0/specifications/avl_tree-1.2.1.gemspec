# -*- encoding: utf-8 -*-
# stub: avl_tree 1.2.1 ruby lib

Gem::Specification.new do |s|
  s.name = "avl_tree".freeze
  s.version = "1.2.1"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Hiroshi Nakamura".freeze]
  s.date = "2014-09-28"
  s.email = "nahi@ruby-lang.org".freeze
  s.homepage = "http://github.com/nahi/avl_tree".freeze
  s.rubygems_version = "2.7.9".freeze
  s.summary = "AVL tree, Red black tree and Lock-free Red black tree in Ruby".freeze

  s.installed_by_version = "2.7.9" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_runtime_dependency(%q<atomic>.freeze, ["~> 1.1"])
    else
      s.add_dependency(%q<atomic>.freeze, ["~> 1.1"])
    end
  else
    s.add_dependency(%q<atomic>.freeze, ["~> 1.1"])
  end
end
