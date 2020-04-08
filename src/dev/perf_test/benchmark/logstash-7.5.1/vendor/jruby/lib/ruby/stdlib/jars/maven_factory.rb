require 'jar_dependencies'
require 'jars/gemspec_artifacts'

module Jars
  class MavenFactory
    module AttachJars
      def attach_jars(spec, all_dependencies = false)
        @index ||= 0
        @done ||= []

        deps = GemspecArtifacts.new(spec)
        deps.artifacts.each do |a|
          # for this gemspec we want to include all artifacts but
          # for all others we want to exclude provided and test artifacts
          next unless !@done.include?(a.key) && (all_dependencies || ((a.scope != 'provided') && (a.scope != 'test')))

          # ruby dsl is not working reliably for classifier
          self["jars.#{@index}"] = a.to_coord_no_classifier
          if a.exclusions
            jndex = 0
            a.exclusions.each do |ex|
              self["jars.#{@index}.exclusions.#{jndex}"] = ex.to_s
              jndex += 1
            end
          end
          self["jars.#{@index}.scope"] = a.scope if a.scope
          self["jars.#{@index}.classifier"] = a.classifier if a.classifier
          @index += 1
          @done << a.key
        end
      end
    end

    attr_reader :debug, :verbose

    def initialize(options = nil, debug = Jars.debug?, verbose = Jars.verbose?)
      @options = (options || {}).dup
      @options.delete(:ignore_dependencies)
      @debug = debug
      @verbose = verbose
      @installed_maven = false
    end

    def maven_new(pom)
      lazy_load_maven
      maven = setup(Maven::Ruby::Maven.new)

      maven.extend AttachJars
      # TODO: copy pom to tmp dir in case it is not a real file
      maven.options['-f'] = pom
      maven
    end

    private

    def setup(maven)
      maven.verbose = @verbose
      maven.options['-X'] = nil if @debug
      if @verbose
        maven.options['-e'] = nil
      elsif !@debug
        maven.options['--quiet'] = nil
      end
      maven['verbose'] = (@debug || @verbose) == true

      if Jars.maven_settings
        maven.options['-s'] = Jars::MavenSettings.effective_settings
      end

      maven['maven.repo.local'] = java.io.File.new(Jars.local_maven_repo).absolute_path.to_s

      maven
    end

    private

    def lazy_load_maven
      add_gem_to_load_path('ruby-maven')
      add_gem_to_load_path('ruby-maven-libs')
      if @installed_maven
        puts
        puts 'using maven for the first time results in maven'
        puts 'downloading all its default plugin and can take time.'
        puts 'as those plugins get cached on disk and further execution'
        puts 'of maven is much faster then the first time.'
        puts
      end
      require 'maven/ruby/maven'
    end

    def find_spec_via_rubygems(name, req)
      require 'rubygems/dependency'
      dep = Gem::Dependency.new(name, req)
      dep.matching_specs(true).last
    end

    def add_gem_to_load_path(name)
      # if the gem is already activated => good
      return if Gem.loaded_specs[name]
      # just install gem if needed and add it to the load_path
      # and leave activated gems as they are
      req = requirement(name)
      unless spec = find_spec_via_rubygems(name, req)
        spec = install_gem(name, req)
      end
      unless spec
        raise "failed to resolve gem '#{name}' if you're using Bundler add it as a dependency"
      end
      path = File.join(spec.full_gem_path, spec.require_path)
      $LOAD_PATH << path unless $LOAD_PATH.include?(path)
    end

    def requirement(name)
      jars = Gem.loaded_specs['jar-dependencies']
      dep = jars.nil? ? nil : jars.dependencies.detect { |d| d.name == name }
      dep.nil? ? Gem::Requirement.create('>0') : dep.requirement
    end

    def install_gem(name, req)
      @installed_maven = true
      puts "Installing gem '#{name}' . . ."
      require 'rubygems/dependency_installer'
      inst = Gem::DependencyInstaller.new(@options ||= {})
      inst.install(name, req).first
    rescue => e
      if Jars.verbose?
        warn e.inspect.to_s
        warn e.backtrace.join("\n")
      end
      raise "there was an error installing '#{name} (#{req})' #{@options[:domain]}. please install it manually: #{e.inspect}"
    end
  end
end
