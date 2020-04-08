# frozen-string-literal: true

module Sequel
  module Plugins
    # The static_cache_cache plugin allows for caching the row content for subclasses
    # that use the static cache plugin (or just the current class).  Using this plugin
    # can avoid the need to query the database every time loading the plugin into a
    # model, which can save time when you have a lot of models using the static_cache
    # plugin.
    #
    # Usage:
    #
    #   # Make all model subclasses that use the static_cache plugin use
    #   # the cached values in the given file
    #   Sequel::Model.plugin :static_cache_cache, "static_cache.cache"
    #
    #   # Make the AlbumType model the cached values in the given file,
    #   # should be loaded before the static_cache plugin
    #   AlbumType.plugin :static_cache_cache, "static_cache.cache"
    module StaticCacheCache
      def self.configure(model, file)
        model.instance_variable_set(:@static_cache_cache_file, file)
        model.instance_variable_set(:@static_cache_cache, File.exist?(file) ? Marshal.load(File.read(file)) : {})
      end

      module ClassMethods
        # Dump the in-memory cached rows to the cache file.
        def dump_static_cache_cache
          File.open(@static_cache_cache_file, 'wb'){|f| f.write(Marshal.dump(@static_cache_cache))}
          nil
        end

        Plugins.inherited_instance_variables(self, :@static_cache_cache_file=>nil, :@static_cache_cache=>nil)

        private

        # Load the rows for the model from the cache if available.
        # If not available, load the rows from the database, and
        # then update the cache with the raw rows.
        def load_static_cache_rows
          if rows = Sequel.synchronize{@static_cache_cache[name]}
            rows.map{|row| call(row)}.freeze
          else
            rows = dataset.all.freeze
            raw_rows = rows.map(&:values)
            Sequel.synchronize{@static_cache_cache[name] = raw_rows}
            rows
          end
        end
      end
    end
  end
end
