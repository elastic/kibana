# -*- ruby encoding: utf-8 -*-

class MIME::Types
  Cache = Struct.new(:version, :data) # :nodoc:

  # Caching of MIME::Types registries is advisable if you will be loading
  # the default registry relatively frequently. With the class methods on
  # MIME::Types::Cache, any MIME::Types registry can be marshaled quickly
  # and easily.
  #
  # The cache is invalidated on a per-version basis; a cache file for
  # version 2.0 will not be reused with version 2.0.1.
  class Cache
    class << self
      # Attempts to load the cache from the file provided as a parameter or in
      # the environment variable +RUBY_MIME_TYPES_CACHE+. Returns +nil+ if the
      # file does not exist, if the file cannot be loaded, or if the data in
      # the cache version is different than this version.
      def load(cache_file = nil)
        cache_file ||= ENV['RUBY_MIME_TYPES_CACHE']
        return nil unless cache_file and File.exist?(cache_file)

        cache = Marshal.load(File.binread(cache_file))
        if cache.version == MIME::Types::VERSION
          Marshal.load(cache.data)
        else
          MIME::Types.logger.warn <<-warning.chomp
Could not load MIME::Types cache: invalid version
          warning
          nil
        end
      rescue => e
        MIME::Types.logger.warn <<-warning.chomp
Could not load MIME::Types cache: #{e}
        warning
        return nil
      end

      # Attempts to save the types provided to the cache file provided.
      #
      # If +types+ is not provided or is +nil+, the cache will contain the
      # current MIME::Types default registry.
      #
      # If +cache_file+ is not provided or is +nil+, the cache will be written
      # to the file specified in the environment variable
      # +RUBY_MIME_TYPES_CACHE+. If there is no cache file specified either
      # directly or through the environment, this method will return +nil+
      def save(types = nil, cache_file = nil)
        cache_file ||= ENV['RUBY_MIME_TYPES_CACHE']
        return nil unless cache_file

        types ||= MIME::Types.send(:__types__)

        File.open(cache_file, 'wb') do |f|
          f.write(Marshal.dump(new(types.data_version, Marshal.dump(types))))
        end
      end
    end
  end

  # MIME::Types requires a container Hash with a default values for keys
  # resulting in an empty array (<tt>[]</tt>), but this cannot be dumped
  # through Marshal because of the presence of that default Proc. This class
  # exists solely to satisfy that need.
  class Container < Hash # :nodoc:
    def initialize
      super
      self.default_proc = ->(h, k) { h[k] = [] }
    end

    def marshal_dump
      {}.merge(self)
    end

    def marshal_load(hash)
      self.default_proc = ->(h, k) { h[k] = [] }
      self.merge!(hash)
    end
  end
end
