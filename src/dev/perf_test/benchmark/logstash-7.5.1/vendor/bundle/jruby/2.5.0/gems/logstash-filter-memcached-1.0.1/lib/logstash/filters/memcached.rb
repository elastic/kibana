# encoding: utf-8
require "logstash/filters/base"
require "logstash/namespace"

# This filter provides facilities to interact with Memcached.
class LogStash::Filters::Memcached < LogStash::Filters::Base

  # This is how you configure this filter from your Logstash config.
  #
  # Given:
  #  - event with field `hostname` with value `example.com`
  #  - memcached with entry for `threats/hostname/example.com`
  #
  # The following config will inject the value from memcached into
  # the nested field `[threats][host]`:
  #
  # filter {
  #   memcached {
  #     hosts => ["localhost:11211"]
  #     namespace => "threats"
  #     get => {
  #       "hostname:%{[hostname]}" => "[threats][host]"
  #     }
  #   }
  # }
  #
  config_name "memcached"
  
  # an array of memcached hosts to connect to
  # valid forms:
  # ipv4:
  #   - 127.0.0.1
  #   - 127.0.0.1:11211
  # ipv6:
  #   - ::1
  #   - [::1]:11211
  # fqdn:
  #   - your.fqdn.com
  #   - your.fqdn.com:11211
  config :hosts, :validate => :array, :default => ["localhost"]

  # if specified and non-empty, all keys will be prepended with this string and a colon (`:`)
  config :namespace, :validate => :string, :required => false

  # GET data from the given memcached keys to inject into the corresponding event fields.
  #  - memcached keys can reference event fields via sprintf
  #  - event fields can be deep references
  #
  # get {
  #   "memcached-key1" => "[path][to][field1]"
  #   "memcached-key2" => "[path][to][field2]"
  # }
  config :get, :validate => :hash, :required => false

  # SET the given fields from the event to the corresponding keys in memcached
  #  - memcached keys can reference event fields via sprintf
  #  - event fields can be deep references
  #
  # set {
  #   "[path][to][field1]" => "memcached-key1"
  #   "[path][to][field2]" => "memcached-key2"
  # }
  config :set, :validate => :hash, :required => false


  # if performing a setting operation to memcached, the time-to-live in seconds.
  # NOTE: in Memcached, a value of 0 (default) means "never expire"
  config :ttl, :validate => :number, :default => 0

  public

  attr_reader :cache

  def register
    if @ttl < 0
      logger.error("ttl cannot be negative")
      fail("invalid ttl: cannot be negative")
    end

    @cache = establish_connection
  end # def register

  def filter(event)
    set_success = do_set(event)
    get_success = do_get(event)

    filter_matched(event) if (set_success || get_success)
  end # def filter

  def close
    cache.close
  end

  private

  def do_get(event)
    return false unless @get && !@get.empty?

    event_fields_by_memcached_key = @get.each_with_object({}) do |(memcached_key_template, event_field), memo|
      memcached_key = event.sprintf(memcached_key_template)
      memo[memcached_key] = event_field
    end

    memcached_keys = event_fields_by_memcached_key.keys
    cache_hits_by_memcached_key = cache.get_multi(memcached_keys)

    cache_hits = 0
    event_fields_by_memcached_key.each do |memcached_key, event_field|
      value = cache_hits_by_memcached_key[memcached_key]
      if value.nil?
        logger.trace("cache:get miss", context(key: memcached_key))
      else
        logger.trace("cache:get hit", context(key: memcached_key, value: value))
        cache_hits += 1
        event.set(event_field, value)
      end
    end

    return cache_hits > 0
  end

  def do_set(event)
    return false unless @set && !@set.empty?

    values_by_memcached_key = @set.each_with_object({}) do |(event_field, memcached_key_template), memo|
      memcached_key = event.sprintf(memcached_key_template)
      value = event.get(event_field)

      memo[memcached_key] = value unless value.nil?
    end

    return false if values_by_memcached_key.empty?

    cache.multi do
      values_by_memcached_key.each do |memcached_key, value|
        logger.trace("cache:set", context(key: memcached_key, value: value))
        cache.set(memcached_key, value)
      end
    end

    return true
  end

  def establish_connection
    require 'dalli'

    hosts = validate_connection_hosts
    options = validate_connection_options
    logger.debug('connecting to memcached', context(hosts: hosts, options: options))
    Dalli::Client.new(@hosts, options).tap do |client|
      begin
        client.alive!
      rescue Dalli::RingError
        logger.error("failed to connect", context(hosts: hosts, options: options))
        fail("cannot connect to memcached")
      end
    end
  end

  def validate_connection_options
    {}.tap do |options|
      options[:ttl] = @ttl
      options[:namespace] = @namespace unless @namespace.nil? || @namespace.empty?
    end
  end

  def validate_connection_hosts
    logger.error("configuration: hosts empty!") && fail if @hosts.empty?

    @hosts.map(&:to_s)
  end

  def context(hash={})
    @plugin_context ||= Hash.new.tap do |hash|
      hash[:namespace] = @namespace unless @namespace.nil? or @namespace.empty?
    end
    return hash if @plugin_context.empty?

    @plugin_context.merge(hash)
  end
end # class LogStash::Filters::Memcached
