require 'jars/maven_exec'
require 'jars/lock'
require 'fileutils'

module Jars
  class Classpath
    # convenient method
    def self.require(scope = nil)
      new.require(scope)
    end

    # convenient method
    def self.classpath(scope = nil)
      new.classpath(scope)
    end

    # convenient method
    def self.classpath_string(scope = nil)
      new.classpath_string(scope)
    end

    def initialize(spec = nil, deps = nil)
      @spec = spec
      @deps = deps
    end

    def mvn
      @mvn ||= MavenExec.new(@spec)
    end

    def workdir(dirname)
      dir = File.join(mvn.basedir, dirname)
      dir if File.directory?(dir)
    end

    def dependencies_list
      if @deps.nil?
        deps = Jars.lock_path(mvn.basedir)
        @deps = deps if deps && File.exist?(deps)
      end
      if @deps
        @deps
      else
        resolve_dependencies
      end
    end
    private :dependencies_list

    DEPENDENCY_LIST = 'dependencies.list'.freeze
    def resolve_dependencies
      basedir = workdir('pkg') || workdir('target') || workdir('')
      deps = File.join(basedir, DEPENDENCY_LIST)
      mvn.resolve_dependencies_list(deps)
      deps
    end
    private :resolve_dependencies

    def require(scope = nil)
      process(scope) do |jar|
        if jar.scope == :system
          Kernel.require jar.path
        else
          require_jar(*jar.gacv)
        end
      end
      if scope.nil? || scope == :runtime
        process(:provided) do |jar|
          Jars.mark_as_required(*jar.gacv)
        end
      end
    end

    def classpath(scope = nil)
      classpath = []
      process(scope) do |jar|
        classpath << jar.file
      end
      classpath
    end

    def process(scope, &block)
      deps = dependencies_list
      Lock.new(deps).process(scope, &block)
    ensure
      # just delete the temporary file if it exists
      FileUtils.rm_f(DEPENDENCY_LIST)
    end
    private :process

    def classpath_string(scope = nil)
      classpath(scope).join(File::PATH_SEPARATOR)
    end
  end
end
