begin
  require 'rake/ant/element'
rescue NameError => ne
  # uncaught, we should get a NameError, such as:
  # NameError: uppercase package names not accessible this way (`org.apache.tools.ant.IntrospectionHelper')
  # this probably means $ANT_HOME is not set properly
  raise RuntimeError, "Caught NameError; examine $ANT_HOME"
end
require 'rake/ant/target'

class Rake::Ant
  java_import org.apache.tools.ant.DefaultLogger
  java_import org.apache.tools.ant.Location
  java_import org.apache.tools.ant.Project
  java_import org.apache.tools.ant.ProjectHelper

  attr_reader :project, :log, :location
  attr_accessor :current_target

  def initialize(options={}, &block)
    @options = options
    @location = Ant.location_from_caller
    @project = create_project options
    @current_target = nil
    generate_methods @project.data_type_definitions
    generate_methods @project.task_definitions
    process_arguments unless options[:run] == false || Ant.run || @location.file_name != $0
    define_tasks(&block)
  end

  def properties
    @project.properties
  end

  def define_tasks(&code)
    code.arity == 1 ? code[self] : instance_eval(&code) if code
  end

  # Add a target (two forms)
  # 1. Execute a block as a target: add_target "foo-target" { echo :message => "I am cool" }
  # 2. Execute a rake task as a target: add_target Rake.application["default"]
  def add_target(*options, &block)
    target = options.first.respond_to?(:name) ? RakeTarget.new(self, options.first) : BlockTarget.new(self, *options, &block)
    @project.add_target target
  end
  alias target add_target

  def [](name)
    if @project.targets.containsKey(name.to_s)
      TargetWrapper.new(@project, name)
    else
      MissingWrapper.new(@project, name)
    end
  end

  def execute_target(name)
    self[name].execute
  end

  def execute_default
    @project.execute_target(@project.default_target)
  end

  def project_help
    max_width = @project.targets.keys.max {|a,b| a.length <=> b.length}.length
    @project.targets.values.select {|t|
      t.description
    }.sort{|a,b|
      a.name <=> b.name
    }.map {|t|
      "%-#{max_width}s - %s" % [t.name, t.description]
    }.join("\n")
  end

  def ant(*args)
    raise "ant is known to be broken and is unsupported in the ant library"
  end

  def antcall(*args)
    raise "antcall is known to be broken and is unsupported in the ant library"
  end

  def _element(name, args = {}, &block)
    Element.new(self, name).call(@current_target, args, &block)
  end

  def method_missing(name, *args, &block)
    project.log "invoking method_missing: #{name} on Ant instance", 5
    _element(name, *args, &block)
  end

  def run(*targets)
    if targets.length > 0
      targets.each {|t| execute_target(t) }
    else
      execute_default
    end
  end

  def process_arguments(argv = ARGV, run_at_exit = true)
    properties = []
    targets = []
    argv.each {|a| a =~ /^-D/ ? properties << a[2..-1] : targets << a }
    properties.each do |p|
      key, value = p.split('=', 2)
      value ||= "true"
      @project.set_user_property(key, value)
    end
    at_exit do
      begin
        run(*targets) if (!targets.empty? || @project.default_target) && !Ant.run
      rescue => e
        warn e.message
        puts e.backtrace.join("\n") if $DEBUG
        exit 1
      end
    end if run_at_exit
  end

  private
  def create_project(options)
    # If we are calling into a rakefile from ant then we already have a project to use
    return $project if defined?($project) && $project

    options[:basedir] ||= '.'
    output_level = options.delete(:output_level) || 2

    Project.new.tap do |p|
      p.init
      p.add_build_listener(DefaultLogger.new.tap do |log|
        log.output_print_stream = Java::java.lang.System.out
        log.error_print_stream = Java::java.lang.System.err
        log.emacs_mode = true
        log.message_output_level = output_level
        @log = log
      end)
      helper = ProjectHelper.getProjectHelper
      helper.import_stack.add(Java::java.io.File.new(@location.file_name))
      p.addReference(ProjectHelper::PROJECTHELPER_REFERENCE, helper)
      options.each_pair {|k,v| p.send("set_#{k}", v) if p.respond_to?("set_#{k}") }
    end
  end

  def generate_methods(collection)
    existing_methods = Ant.instance_methods(false)
    collection.each do |name, clazz|
      element = Element.new(self, name, clazz)
      method_name = Ant.safe_method_name(name)
      (class << self; self; end).send(:define_method, method_name) do |*a, &b|
        element.call(@current_target, *a, &b)
      end unless existing_methods.include?(method_name)
    end
  end

  class << self
    attr_accessor :run

    def safe_method_name(element_name)
      if element_name =~ /\A(and|or|not|do|end|if|else)\z/m
        "_#{element_name}"
      else
        element_name
      end
    end

    def location_from_caller
      file, line = caller.detect{|el| el !~ /^#{File.dirname(__FILE__)}/ && el !~ /\.java:/}.split(/:(\d+):?/)
      Location.new(file, line.to_i, 1)
    end

    def ant(options={}, &code)
      if options.respond_to? :to_hash
        @ant ||= Ant.new options.to_hash
        @ant.define_tasks(&code)
        @ant
      else
        options = options.join(" ") if options.respond_to? :to_ary
        ant_bin = ENV['ANT_HOME'] ? File.join(ENV['ANT_HOME'], 'bin', 'ant') : 'ant' # find one on $PATH
        system "#{ant_bin} #{options.to_s}" # FIXME: Make this more secure if using array form
      end
    rescue Exception => e
      warn e.message
      warn e.backtrace.join("\n")
    end
  end
end

# This method has three different uses:
#
# 1. Call an ant task or type directly:
#      task :compile do # Rake task
#        ant.javac { }  # Look I am calling an ant task
#      end
# 2. Provide a block to provide an impromptu ant session
#      ant do
#        javac {}       # Everything executes as if in an executing ant target
#      end
# 3. Provide arguments to execute ant as it's own build
#      ant '-f my_build.xml my_target1'
#
#      Additionally this may be passed in array format if you are worried about injection:
#
#      args = ['-f', 'my_build.xml', 'my_target1']
#      ant args
#
def ant(*args, &block)
  Rake::Ant.ant(*args, &block)
end

# Need Rake DSL at top-level for "task" and other methods.
require 'rake/dsl_definition'
include Rake::DSL

def ant_import(filename = 'build.xml')
  ant = Rake::Ant.ant

  abs_name = File.expand_path(filename)
  Rake::Ant::ProjectHelper.configure_project ant.project, java.io.File.new(abs_name)

  ant.project.targets.each do |target_name, target|
    name = Rake.application.lookup(target_name) ? "ant_" + target_name : target_name

    task(name) { target.project.execute_target(target_name) }
  end
end
