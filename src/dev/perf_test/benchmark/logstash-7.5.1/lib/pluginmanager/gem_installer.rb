# encoding: utf-8
require "pluginmanager/ui"
require "pathname"
require "rubygems/package"
require "fileutils"

module LogStash module PluginManager
  # Install a physical gem package to the appropriate location inside logstash
  # - Extract the gem
  # - Generate the specifications
  # - Copy the data in the right folders
  class GemInstaller
    GEM_HOME = Pathname.new(::File.join(LogStash::Environment::BUNDLE_DIR, "jruby", "2.5.0"))
    SPECIFICATIONS_DIR = "specifications"
    GEMS_DIR = "gems"
    CACHE_DIR = "cache"

    attr_reader :gem_home

    def initialize(gem_file, display_post_install_message = false, gem_home = GEM_HOME)
      @gem_file = gem_file
      @gem = ::Gem::Package.new(@gem_file)
      @gem_home = Pathname.new(gem_home)
      @display_post_install_message = display_post_install_message
    end

    def install
      create_destination_folders
      extract_files
      write_specification
      copy_gem_file_to_cache
      post_install_message
    end

    def self.install(gem_file, display_post_install_message = false, gem_home = GEM_HOME)
      self.new(gem_file, display_post_install_message, gem_home).install
    end

    private
    def spec
      gem_spec = @gem.spec
      def gem_spec.for_cache
        spec = dup
        spec.test_files = nil
        spec
      end
      gem_spec
    end

    def spec_dir
      gem_home.join(SPECIFICATIONS_DIR)
    end

    def cache_dir
      gem_home.join(CACHE_DIR)
    end

    def spec_file
      spec_dir.join("#{spec.full_name}.gemspec")
    end

    def gem_dir
      gem_home.join(GEMS_DIR, spec.full_name)
    end

    def extract_files
      @gem.extract_files gem_dir
    end

    def write_specification
      ::File.open(spec_file, 'w') do |file|
        spec.installed_by_version = ::Gem.rubygems_version
        file.puts spec.to_ruby_for_cache
        file.fsync rescue nil # Force writing to disk
      end
    end

    def post_install_message
      spec.post_install_message if display_post_install_message?
    end

    def display_post_install_message?
      @display_post_install_message && !spec.post_install_message.nil?
    end

    def copy_gem_file_to_cache
      destination = ::File.join(cache_dir, ::File.basename(@gem_file))
      FileUtils.cp(@gem_file, destination)
    end

    def create_destination_folders
      FileUtils.mkdir_p(gem_home)
      FileUtils.mkdir_p(gem_dir)
      FileUtils.mkdir_p(spec_dir)
      FileUtils.mkdir_p(cache_dir)
    end
  end
end end
