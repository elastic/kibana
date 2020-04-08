# encoding: utf-8
require "paquet/dependency"
require "paquet/shell_ui"
require "paquet/utils"

module Paquet
  class Gem
    RUBYGEMS_URI = "https://rubygems.org/downloads"

    attr_reader :gems, :ignores

    def initialize(target_path, cache = nil)
      @target_path = target_path
      @gems = []
      @ignores = []
      @cache = cache
    end

    def add(name)
      @gems << name
    end

    def ignore(name)
      @ignores << name
    end

    def pack
      Paquet::ui.info("Cleaning existing target path: #{@target_path}")

      FileUtils.rm_rf(@target_path)
      FileUtils.mkdir_p(@target_path)

      package_gems(collect_required_gems)
    end

    def package_gems(collect_required_gems)
      gems_to_package = collect_required_gems
        .collect { |gem| gem_full_name(gem) }
        .uniq

      if use_cache?
        gems_to_package.each do |gem_name|
          if gem_file = find_in_cache(gem_name)
            destination = File.join(@target_path, File.basename(gem_file))
            FileUtils.cp(gem_file, destination)
            Paquet::ui.info("Vendoring: #{gem_name}, from cache: #{gem_file}")
          else
            download_gem(gem_name)
          end
        end
      else
        gems_to_package.each do |gem_name|
          download_gem(gem_name)
        end
      end
    end

    def use_cache?
      @cache
    end

    def find_in_cache(gem_name)
      filename = File.join(@cache, gem_name)
      File.exist?(filename) ? filename : nil
    end

    def size
      @gems.size
    end

    def ignore?(name)
      ignores.include?(name)
    end

    def collect_required_gems()
      candidates = []
      @gems.each do |name|
        candidates += resolve_dependencies(name)
      end
      candidates.flatten
    end

    def resolve_dependencies(name)
      return [] if ignore?(name)

      spec = ::Gem::Specification.find_by_name(name)
      current_dependency = Dependency.new(name, spec.version, spec.platform)
      dependencies = spec.dependencies.select { |dep| dep.type == :runtime }

      if dependencies.size == 0
        [current_dependency]
      else
        [dependencies.collect { |spec| resolve_dependencies(spec.name) }, current_dependency].flatten.uniq { |s| s.name }
      end
    end

    def gem_full_name(gem)
      gem.ruby? ? "#{gem.name}-#{gem.version}.gem" : "#{gem.name}-#{gem.version}-#{gem.platform}.gem" 
    end

    def download_gem(gem_name)
      source = "#{RUBYGEMS_URI}/#{gem_name}"
      destination = File.join(@target_path, gem_name)

      Paquet::ui.info("Vendoring: #{gem_name}, downloading: #{source}")
      Paquet::Utils::download_file(source, destination)
    end
  end
end
