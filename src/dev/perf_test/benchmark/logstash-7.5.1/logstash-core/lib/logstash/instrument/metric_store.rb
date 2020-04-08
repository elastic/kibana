# encoding: utf-8
require "concurrent"
require "logstash/instrument/metric_type"
require "thread"

module LogStash module Instrument
  # The Metric store the data structure that make sure the data is
  # saved in a retrievable way, this is a wrapper around multiples ConcurrentHashMap
  # acting as a tree like structure.
  class MetricStore
    class NamespacesExpectedError < StandardError; end
    class MetricNotFound < StandardError; end

    KEY_PATH_SEPARATOR = "/".freeze

    # Lets me a bit flexible on the coma usage in the path
    # definition
    FILTER_KEYS_SEPARATOR = /\s?*,\s*/.freeze

    def initialize
      # We keep the structured cache to allow
      # the api to search the content of the differents nodes
      @store = Concurrent::Map.new

      # This hash has only one dimension
      # and allow fast retrieval of the metrics
      @fast_lookup = Concurrent::Map.new

      # This Mutex block the critical section for the
      # structured hash, it block the zone when we first insert a metric
      # in the structured hash or when we query it for search or to make
      # the result available in the API.
      @structured_lookup_mutex = Mutex.new
    end

    # This method use the namespace and key to search the corresponding value of
    # the hash, if it doesn't exist it will create the appropriate namespaces
    # path in the hash and return `new_value`
    #
    # @param [Array] The path where the values should be located
    # @param [Symbol] The metric key
    # @return [Object] Return the new_value of the retrieve object in the tree
    def fetch_or_store(namespaces, key, default_value = nil)

      # We first check in the `@fast_lookup` store to see if we have already see that metrics before,
      # This give us a `o(1)` access, which is faster than searching through the structured
      # data store (Which is a `o(n)` operation where `n` is the number of element in the namespace and
      # the value of the key). If the metric is already present in the `@fast_lookup`, then that value is sent
      # back directly to the caller.
      #
      # BUT. If the value is not present in the `@fast_lookup` the value will be inserted and we assume that we don't
      # have it in the `@metric_store` for structured search so we add it there too.

      value = @fast_lookup.get(namespaces.dup << key)
      if value.nil?
        value = block_given? ? yield(key) : default_value
        @fast_lookup.put(namespaces.dup << key, value)
        @structured_lookup_mutex.synchronize do
            # If we cannot find the value this mean we need to save it in the store.
          fetch_or_store_namespaces(namespaces).fetch_or_store(key, value)
        end
      end
      return value;
    end

    # This method allow to retrieve values for a specific path,
    # This method support the following queries
    #
    # stats/pipelines/pipeline_X
    # stats/pipelines/pipeline_X,pipeline_2
    # stats/os,jvm
    #
    # If you use the `,` on a key the metric store will return the both values at that level
    #
    # The returned hash will keep the same structure as it had in the `Concurrent::Map`
    # but will be a normal ruby hash. This will allow the api to easily serialize the content
    # of the map
    #
    # @param [Array] The path where values should be located
    # @return [Hash]
    def get_with_path(path)
      get(*key_paths(path))
    end

    # Similar to `get_with_path` but use symbols instead of string
    #
    # @param [Array<Symbol>]
    # @return [Hash]
    def get(*key_paths)
      # Normalize the symbols access
      key_paths.map(&:to_sym)
      new_hash = Hash.new

      @structured_lookup_mutex.synchronize do
        get_recursively(key_paths, @store, new_hash)
      end

      new_hash
    end

    # Retrieve values like `get`, but don't return them fully nested.
    # This means that if you call `get_shallow(:foo, :bar)` the result will not
    # be nested inside of `{:foo {:bar => values}`.
    #
    # @param [Array<Symbol>]
    # @return [Hash]
    def get_shallow(*key_paths)
      key_paths.reduce(get(*key_paths)) {|acc, p| acc[p]}
    end


    # Return a hash including the values of the keys given at the path given
    # 
    # Example Usage:
    # extract_metrics(
    #   [:jvm, :process],
    #   :open_file_descriptors,
    #   [:cpu, [:total_in_millis, :percent]]
    #   [:pipelines, [:one, :two], :size]
    # )
    # 
    # Returns:
    # # From the jvm.process metrics namespace
    # {
    #   :open_file_descriptors => 123
    #   :cpu => { :total_in_millis => 456, :percent => 789 }
    #   :pipelines => {
    #                   :one => {:size => 90210},
    #                   :two => {:size => 8675309}
    #                 }
    # }
    def extract_metrics(path, *keys)
      keys.reduce({}) do |acc,k|
        # Simplify 1-length keys
        k = k.first if k.is_a?(Array) && k.size == 1

        # If we have array values here we need to recurse
        # There are two levels of looping here, one for the paths we might pass in
        # one for the upcoming keys we might pass in
        if k.is_a?(Array)
          # We need to build up future executions to extract_metrics
          # which means building up the path and keys arguments.
          # We need a nested loop her to execute all permutations of these in case we hit
          # something like [[:a,:b],[:c,:d]] which produces 4 different metrics
          next_paths = Array(k.first)
          next_keys = Array(k[1])
          rest = k[2..-1]
          next_paths.each do |next_path|
            # If there already is a hash at this location use that so we don't overwrite it
            np_hash = acc[next_path] || {}
            
            acc[next_path] = next_keys.reduce(np_hash) do |a,next_key|
              a.merge! extract_metrics(path + [next_path], [next_key, *rest])
            end
          end
        else # Scalar value
          res = get_shallow(*path)[k]
          acc[k] = res ? res.value : nil
        end
        
        acc
      end
    end    

    def has_metric?(*path)
      @fast_lookup[path]
    end

    # Return all the individuals Metric,
    # This call mimic a Enum's each if a block is provided
    #
    # @param path [String] The search path for metrics
    # @param [Array] The metric for the specific path
    def each(path = nil, &block)
      metrics = if path.nil?
        get_all
      else
        transform_to_array(get_with_path(path))
      end

      block_given? ? metrics.each(&block) : metrics
    end
    alias_method :all, :each

    def prune(path)
      key_paths = key_paths(path).map(&:to_sym)
      @structured_lookup_mutex.synchronize do
        keys_to_delete = @fast_lookup.keys.select {|namespace| (key_paths - namespace[0..-2]).empty? }
        keys_to_delete.each {|k| @fast_lookup.delete(k) }
        delete_from_map(@store, key_paths)
      end
    end

    def size
      @fast_lookup.size
    end

    private
    def get_all
      @fast_lookup.values
    end

    def key_paths(path)
      path.gsub(/^#{KEY_PATH_SEPARATOR}+/, "").split(KEY_PATH_SEPARATOR)
    end

    # This method take an array of keys and recursively search the metric store structure
    # and return a filtered hash of the structure. This method also take into consideration
    # getting two different branchs.
    #
    #
    # If one part of the `key_paths` contains a filter key with the following format.
    # "pipeline01, pipeline_02", It know that need to fetch the branch `pipeline01` and `pipeline02`
    #
    # Look at the rspec test for more usage.
    #
    # @param key_paths [Array<Symbol>] The list of keys part to filter
    # @param map [Concurrent::Map] The the part of map to search in
    # @param new_hash [Hash] The hash to populate with the results.
    # @return Hash
    def get_recursively(key_paths, map, new_hash)
      key_candidates = extract_filter_keys(key_paths.shift)

      key_candidates.each do |key_candidate|
        raise MetricNotFound, "For path: #{key_candidate}. Map keys: #{map.keys}" if map[key_candidate].nil?

        if key_paths.empty? # End of the user requested path
          if map[key_candidate].is_a?(Concurrent::Map)
            new_hash[key_candidate] = transform_to_hash(map[key_candidate])
          else
            new_hash[key_candidate] = map[key_candidate]
          end
        else
          if map[key_candidate].is_a?(Concurrent::Map)
            new_hash[key_candidate] = get_recursively(key_paths, map[key_candidate], {})
          else
            new_hash[key_candidate] = map[key_candidate]
          end
        end
      end
      return new_hash
    end

    def extract_filter_keys(key)
      key.to_s.strip.split(FILTER_KEYS_SEPARATOR).map(&:to_sym)
    end

    # Take a hash and recursively flatten it into an array.
    # This is useful if you are only interested in the leaf of the tree.
    # Mostly used with `each` to get all the metrics from a specific namespaces
    #
    # This could be moved to `LogStash::Util` once this api stabilize
    #
    # @return [Array] One dimension array
     def transform_to_array(map)
      map.values.collect do |value|
        value.is_a?(Hash) ? transform_to_array(value) : value
      end.flatten
    end

    # Transform the Concurrent::Map hash into a ruby hash format,
    # This is used to be serialize at the web api layer.
    #
    # This could be moved to `LogStash::Util` once this api stabilize
    #
    # @return [Hash]
    def transform_to_hash(map, new_hash = Hash.new)
      map.each_pair do |key, value|
        if value.is_a?(Concurrent::Map)
          new_hash[key] = {}
          transform_to_hash(value, new_hash[key])
        else
          new_hash[key] = value
        end
      end

      return new_hash
    end

    # This method iterate through the namespace path and try to find the corresponding
    # value for the path, if any part of the path is not found it will
    # create it.
    #
    # @param [Array] The path where values should be located
    # @raise [ConcurrentMapExpected] Raise if the retrieved object isn't a `Concurrent::Map`
    # @return [Concurrent::Map] Map where the metrics should be saved
    def fetch_or_store_namespaces(namespaces_path)
      path_map = fetch_or_store_namespace_recursively(@store, namespaces_path)

      # This mean one of the namespace and key are colliding
      # and we have to deal it upstream.
      unless path_map.is_a?(Concurrent::Map)
        raise NamespacesExpectedError, "Expecting a `Namespaces` but found class:  #{path_map.class.name} for namespaces_path: #{namespaces_path}"
      end

      return path_map
    end

    # Recursively fetch or create the namespace paths through the `MetricStove`
    # This algorithm use an index to known which keys to search in the map.
    # This doesn't cloning the array if we want to give a better feedback to the user
    #
    # @param [Concurrent::Map] Map to search for the key
    # @param [Array] List of path to create
    # @param [Integer] Which part from the list to create
    #
    def fetch_or_store_namespace_recursively(map, namespaces_path, idx = 0)
      current = namespaces_path[idx]

      # we are at the end of the namespace path, break out of the recursion
      return map if current.nil?

      new_map = map.fetch_or_store(current) { Concurrent::Map.new }
      return fetch_or_store_namespace_recursively(new_map, namespaces_path, idx + 1)
    end

    def delete_from_map(map, keys)
      key = keys.first
      if keys.size == 1
        map.delete(key)
      else
        delete_from_map(map[key], keys[1..-1]) unless map[key].nil?
      end
    end
  end
end; end
