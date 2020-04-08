require 'mustache'
require 'tmpdir'
require 'yaml'
require 'test/unit'

# Calls appropriate method on YAML. See: https://gist.github.com/tenderlove/958999ab4240b93bd3cd
YAML.add_domain_type(nil, 'code') { |_, val| eval(val['ruby']) }

# A simple base class for Mustache specs.
# Creates a partials directory, then points a (dynamic) subclass of Mustache at
# that directory before each test; the partials directory is destroyed after
# each test is run.
class MustacheSpec < Test::Unit::TestCase
  def setup
    @partials = File.join(File.dirname(__FILE__), 'partials')
    Dir.mkdir(@partials)

    @Mustache = Class.new(Mustache)
    @Mustache.template_path = @partials
  end

  def teardown
    Dir[File.join(@partials, '*')].each { |file| File.delete(file) }
    Dir.rmdir(@partials)
  end

  # Extracts the partials from the test, and dumps them into the partials
  # directory for inclusion.
  def setup_partials(test)
    (test['partials'] || {}).each do |name, content|
      File.open(File.join(@partials, "#{name}.mustache"), 'w') do |f|
        f.print(content)
      end
    end
  end

  # Asserts equality between the rendered template and the expected value,
  # printing additional context data on failure.
  def assert_mustache_spec(test)
    actual = @Mustache.render(test['template'], test['data'])

    assert_equal test['expected'], actual, "" <<
      "#{ test['desc'] }\n" <<
      "Data: #{ test['data'].inspect }\n" <<
      "Template: #{ test['template'].inspect }\n" <<
      "Partials: #{ (test['partials'] || {}).inspect }\n"
  end

  def test_noop; assert(true); end
end

spec_files = File.join(File.dirname(__FILE__), '..', 'ext', 'spec', 'specs', '*.yml')
Dir[spec_files].each do |file|
  spec = YAML.load_file(file)

  klass_name = "Test" + File.basename(file, ".yml").sub(/~/, '').capitalize
  instance_eval "class ::#{klass_name} < MustacheSpec; end"
  test_suite = Kernel.const_get(klass_name)

  test_suite.class_eval do
    spec['tests'].each do |test|
      define_method :"test - #{test['name']}" do
        setup_partials(test)
        assert_mustache_spec(test)
      end
    end
  end
end
