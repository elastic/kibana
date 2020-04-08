# -*- encoding: utf-8 -*-
# stub: psych 3.1.0 java lib

Gem::Specification.new do |s|
  s.name = "psych".freeze
  s.version = "3.1.0"
  s.platform = "java".freeze

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Aaron Patterson".freeze, "SHIBATA Hiroshi".freeze, "Charles Oliver Nutter".freeze]
  s.date = "2018-12-17"
  s.description = "Psych is a YAML parser and emitter. Psych leverages libyaml[https://pyyaml.org/wiki/LibYAML]\nfor its YAML parsing and emitting capabilities. In addition to wrapping libyaml,\nPsych also knows how to serialize and de-serialize most Ruby objects to and from the YAML format.\n".freeze
  s.email = ["aaron@tenderlovemaking.com".freeze, "hsbt@ruby-lang.org".freeze, "headius@headius.com".freeze]
  s.extra_rdoc_files = ["CHANGELOG.rdoc".freeze, "README.md".freeze]
  s.files = [".gitignore".freeze, ".travis.yml".freeze, "CHANGELOG.rdoc".freeze, "Gemfile".freeze, "Mavenfile".freeze, "README.md".freeze, "Rakefile".freeze, "bin/console".freeze, "bin/setup".freeze, "ext/java/org/jruby/ext/psych/PsychEmitter.java".freeze, "ext/java/org/jruby/ext/psych/PsychLibrary.java".freeze, "ext/java/org/jruby/ext/psych/PsychParser.java".freeze, "ext/java/org/jruby/ext/psych/PsychToRuby.java".freeze, "ext/java/org/jruby/ext/psych/PsychYamlTree.java".freeze, "ext/psych/depend".freeze, "ext/psych/extconf.rb".freeze, "ext/psych/psych.c".freeze, "ext/psych/psych.h".freeze, "ext/psych/psych_emitter.c".freeze, "ext/psych/psych_emitter.h".freeze, "ext/psych/psych_parser.c".freeze, "ext/psych/psych_parser.h".freeze, "ext/psych/psych_to_ruby.c".freeze, "ext/psych/psych_to_ruby.h".freeze, "ext/psych/psych_yaml_tree.c".freeze, "ext/psych/psych_yaml_tree.h".freeze, "ext/psych/yaml/LICENSE".freeze, "ext/psych/yaml/api.c".freeze, "ext/psych/yaml/config.h".freeze, "ext/psych/yaml/dumper.c".freeze, "ext/psych/yaml/emitter.c".freeze, "ext/psych/yaml/loader.c".freeze, "ext/psych/yaml/parser.c".freeze, "ext/psych/yaml/reader.c".freeze, "ext/psych/yaml/scanner.c".freeze, "ext/psych/yaml/writer.c".freeze, "ext/psych/yaml/yaml.h".freeze, "ext/psych/yaml/yaml_private.h".freeze, "lib/psych.jar".freeze, "lib/psych.rb".freeze, "lib/psych/class_loader.rb".freeze, "lib/psych/coder.rb".freeze, "lib/psych/core_ext.rb".freeze, "lib/psych/exception.rb".freeze, "lib/psych/handler.rb".freeze, "lib/psych/handlers/document_stream.rb".freeze, "lib/psych/handlers/recorder.rb".freeze, "lib/psych/json/ruby_events.rb".freeze, "lib/psych/json/stream.rb".freeze, "lib/psych/json/tree_builder.rb".freeze, "lib/psych/json/yaml_events.rb".freeze, "lib/psych/nodes.rb".freeze, "lib/psych/nodes/alias.rb".freeze, "lib/psych/nodes/document.rb".freeze, "lib/psych/nodes/mapping.rb".freeze, "lib/psych/nodes/node.rb".freeze, "lib/psych/nodes/scalar.rb".freeze, "lib/psych/nodes/sequence.rb".freeze, "lib/psych/nodes/stream.rb".freeze, "lib/psych/omap.rb".freeze, "lib/psych/parser.rb".freeze, "lib/psych/scalar_scanner.rb".freeze, "lib/psych/set.rb".freeze, "lib/psych/stream.rb".freeze, "lib/psych/streaming.rb".freeze, "lib/psych/syntax_error.rb".freeze, "lib/psych/tree_builder.rb".freeze, "lib/psych/versions.rb".freeze, "lib/psych/visitors.rb".freeze, "lib/psych/visitors/depth_first.rb".freeze, "lib/psych/visitors/emitter.rb".freeze, "lib/psych/visitors/json_tree.rb".freeze, "lib/psych/visitors/to_ruby.rb".freeze, "lib/psych/visitors/visitor.rb".freeze, "lib/psych/visitors/yaml_tree.rb".freeze, "lib/psych/y.rb".freeze, "lib/psych_jars.rb".freeze, "psych.gemspec".freeze]
  s.homepage = "https://github.com/ruby/psych".freeze
  s.licenses = ["MIT".freeze]
  s.rdoc_options = ["--main".freeze, "README.md".freeze]
  s.required_ruby_version = Gem::Requirement.new(">= 2.2.2".freeze)
  s.requirements = ["jar org.yaml:snakeyaml, 1.23".freeze]
  s.rubygems_version = "2.6.14.1".freeze
  s.summary = "Psych is a YAML parser and emitter".freeze

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_development_dependency(%q<rake-compiler>.freeze, [">= 0.4.1"])
      s.add_development_dependency(%q<minitest>.freeze, ["~> 5.0"])
      s.add_runtime_dependency(%q<jar-dependencies>.freeze, [">= 0.1.7"])
      s.add_development_dependency(%q<ruby-maven>.freeze, [">= 0"])
    else
      s.add_dependency(%q<rake-compiler>.freeze, [">= 0.4.1"])
      s.add_dependency(%q<minitest>.freeze, ["~> 5.0"])
      s.add_dependency(%q<jar-dependencies>.freeze, [">= 0.1.7"])
      s.add_dependency(%q<ruby-maven>.freeze, [">= 0"])
    end
  else
    s.add_dependency(%q<rake-compiler>.freeze, [">= 0.4.1"])
    s.add_dependency(%q<minitest>.freeze, ["~> 5.0"])
    s.add_dependency(%q<jar-dependencies>.freeze, [">= 0.1.7"])
    s.add_dependency(%q<ruby-maven>.freeze, [">= 0"])
  end
end
