# -*- encoding: utf-8 -*-
# stub: json 2.2.0 java lib

Gem::Specification.new do |s|
  s.name = "json".freeze
  s.version = "2.2.0"
  s.platform = "java".freeze

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Daniel Luz".freeze]
  s.date = "2019-02-21"
  s.description = "A JSON implementation as a JRuby extension.".freeze
  s.email = "dev+ruby@mernen.com".freeze
  s.files = ["lib/json.rb".freeze, "lib/json/add/bigdecimal.rb".freeze, "lib/json/add/complex.rb".freeze, "lib/json/add/core.rb".freeze, "lib/json/add/date.rb".freeze, "lib/json/add/date_time.rb".freeze, "lib/json/add/exception.rb".freeze, "lib/json/add/ostruct.rb".freeze, "lib/json/add/range.rb".freeze, "lib/json/add/rational.rb".freeze, "lib/json/add/regexp.rb".freeze, "lib/json/add/set.rb".freeze, "lib/json/add/struct.rb".freeze, "lib/json/add/symbol.rb".freeze, "lib/json/add/time.rb".freeze, "lib/json/common.rb".freeze, "lib/json/ext.rb".freeze, "lib/json/ext/generator.jar".freeze, "lib/json/ext/parser.jar".freeze, "lib/json/generic_object.rb".freeze, "lib/json/pure.rb".freeze, "lib/json/pure/generator.rb".freeze, "lib/json/pure/parser.rb".freeze, "lib/json/version.rb".freeze, "tests/fixtures/fail10.json".freeze, "tests/fixtures/fail11.json".freeze, "tests/fixtures/fail12.json".freeze, "tests/fixtures/fail13.json".freeze, "tests/fixtures/fail14.json".freeze, "tests/fixtures/fail18.json".freeze, "tests/fixtures/fail19.json".freeze, "tests/fixtures/fail2.json".freeze, "tests/fixtures/fail20.json".freeze, "tests/fixtures/fail21.json".freeze, "tests/fixtures/fail22.json".freeze, "tests/fixtures/fail23.json".freeze, "tests/fixtures/fail24.json".freeze, "tests/fixtures/fail25.json".freeze, "tests/fixtures/fail27.json".freeze, "tests/fixtures/fail28.json".freeze, "tests/fixtures/fail3.json".freeze, "tests/fixtures/fail4.json".freeze, "tests/fixtures/fail5.json".freeze, "tests/fixtures/fail6.json".freeze, "tests/fixtures/fail7.json".freeze, "tests/fixtures/fail8.json".freeze, "tests/fixtures/fail9.json".freeze, "tests/fixtures/obsolete_fail1.json".freeze, "tests/fixtures/pass1.json".freeze, "tests/fixtures/pass15.json".freeze, "tests/fixtures/pass16.json".freeze, "tests/fixtures/pass17.json".freeze, "tests/fixtures/pass2.json".freeze, "tests/fixtures/pass26.json".freeze, "tests/fixtures/pass3.json".freeze, "tests/json_addition_test.rb".freeze, "tests/json_common_interface_test.rb".freeze, "tests/json_encoding_test.rb".freeze, "tests/json_ext_parser_test.rb".freeze, "tests/json_fixtures_test.rb".freeze, "tests/json_generator_test.rb".freeze, "tests/json_generic_object_test.rb".freeze, "tests/json_parser_test.rb".freeze, "tests/json_string_matching_test.rb".freeze, "tests/test_helper.rb".freeze]
  s.homepage = "http://json-jruby.rubyforge.org/".freeze
  s.licenses = ["Ruby".freeze]
  s.rubyforge_project = "json-jruby".freeze
  s.rubygems_version = "2.6.14.1".freeze
  s.summary = "JSON implementation for JRuby".freeze

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_development_dependency(%q<rake>.freeze, [">= 0"])
      s.add_development_dependency(%q<test-unit>.freeze, ["~> 2.0"])
    else
      s.add_dependency(%q<rake>.freeze, [">= 0"])
      s.add_dependency(%q<test-unit>.freeze, ["~> 2.0"])
    end
  else
    s.add_dependency(%q<rake>.freeze, [">= 0"])
    s.add_dependency(%q<test-unit>.freeze, ["~> 2.0"])
  end
end
