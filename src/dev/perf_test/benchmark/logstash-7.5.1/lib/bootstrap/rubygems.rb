# encoding: utf-8
module LogStash
  module Rubygems
    extend self

    ##
    # Take a plugin name and get the latest versions available in the gem repository.
    # @param [String] The plugin name
    # @return [Hash] The collection of registered versions
    ##
    def versions(plugin)
      require "gems"
      require_relative "patches/gems"
      Gems.versions(plugin)
    end
    # Take a gem package and extract it to a specific target
    # @param [String] Gem file, this must be a path
    # @param [String, String] Return a Gem::Package and the installed path
    def unpack(file, path)
      require "rubygems/package"
      require "securerandom"

      # We are creating a random directory per extract,
      # if we dont do this bundler will not trigger download of the dependencies.
      # Use case is:
      # - User build his own gem with a fix
      # - User doesnt increment the version
      # - User install the same version but different code or dependencies multiple times..
      basename  = ::File.basename(file, '.gem')
      unique = SecureRandom.hex(4)
      target_path = ::File.expand_path(::File.join(path, unique, basename))

      package = ::Gem::Package.new(file)
      package.extract_files(target_path)

      return [package, target_path]
    end

  end
end
