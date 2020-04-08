# encoding: utf-8
require "pluginmanager/errors"

module LogStash module PluginManager module PackInstaller
  # A object that represent the directory structure
  # related to the actual gems in the extracted package.
  #
  # Example of a valid structure, where `logstash-output-secret` is the actual
  # plugin to be installed.
  #.
  # ├── dependencies
  # │   ├── addressable-2.4.0.gem
  # │   ├── cabin-0.9.0.gem
  # │   ├── ffi-1.9.14-java.gem
  # │   ├── gemoji-1.5.0.gem
  # │   ├── launchy-2.4.3-java.gem
  # │   ├── logstash-output-elasticsearch-5.2.0-java.gem
  # │   ├── manticore-0.6.0-java.gem
  # │   ├── spoon-0.0.6.gem
  # │   └── stud-0.0.22.gem
  # └── logstash-output-secret-0.1.0.gem
  class Pack
    class GemInformation
      EXTENSION = ".gem"
      SPLIT_CHAR = "-"
      JAVA_PLATFORM_RE = /-java/
      DEPENDENCIES_DIR_RE = /dependencies/

      attr_reader :file, :name, :version, :platform

      def initialize(gem)
        @file = gem
        extracts_information
      end

      def dependency?
        @dependency
      end

      def plugin?
        !dependency?
      end

      private
      def extracts_information
        basename = ::File.basename(file, EXTENSION)
        parts = basename.split(SPLIT_CHAR)

        @dependency = ::File.dirname(file) =~ DEPENDENCIES_DIR_RE

        if basename.match(JAVA_PLATFORM_RE)
          @platform = parts.pop
          @version = parts.pop
          @name = parts.join(SPLIT_CHAR)
        else
          @platform = nil
          @version = parts.pop
          @name = parts.join(SPLIT_CHAR)
        end
      end
    end

    attr_reader :gems

    def initialize(source)
      @gems = Dir.glob(::File.join(source, "**", "*.gem")).collect { |gem| GemInformation.new(gem) }
    end

    def plugins
      gems.select { |gem| !gem.dependency? }
    end

    def dependencies
      gems.select { |gem| gem.dependency? }
    end

    def valid?
      plugins.size > 0
    end
  end
end end end
