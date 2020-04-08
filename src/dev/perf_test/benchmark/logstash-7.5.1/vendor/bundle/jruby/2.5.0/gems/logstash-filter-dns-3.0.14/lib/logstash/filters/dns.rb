# encoding: utf-8
require "logstash/filters/base"
require "logstash/namespace"
require "lru_redux"
require "resolv"
require "timeout"
require "logstash/filters/dns/resolv_patch"

java_import 'java.net.IDN'


# The DNS filter performs a lookup (either an A record/CNAME record lookup
# or a reverse lookup at the PTR record) on records specified under the
# `reverse` arrays or respectively under the `resolve` arrays.
#
# The config should look like this:
# [source,ruby]
#     filter {
#       dns {
#         reverse => [ "source_host", "field_with_address" ]
#         resolve => [ "field_with_fqdn" ]
#         action => "replace"
#       }
#     }
#
# This filter, like all filters, only processes 1 event at a time, so the use
# of this plugin can significantly slow down your pipeline's throughput if you
# have a high latency network. By way of example, if each DNS lookup takes 2
# milliseconds, the maximum throughput you can achieve with a single filter
# worker is 500 events per second (1000 milliseconds / 2 milliseconds).
class LogStash::Filters::DNS < LogStash::Filters::Base
  # TODO(sissel): The timeout limitation does seem to be fixed in here: http://redmine.ruby-lang.org/issues/5100 # but isn't currently in JRuby.
  # TODO(sissel): make `action` required? This was always the intent, but it
  # due to a typo it was never enforced. Thus the default behavior in past
  # versions was `append` by accident.

  config_name "dns"

  # Reverse resolve one or more fields.
  config :reverse, :validate => :array

  # Forward resolve one or more fields.
  config :resolve, :validate => :array

  # Determine what action to do: append or replace the values in the fields
  # specified under `reverse` and `resolve`.
  config :action, :validate => [ "append", "replace" ], :default => "append"

  # Use custom nameserver(s). For example: `["8.8.8.8", "8.8.4.4"]`.
  # If `nameserver` is not specified then `/etc/resolv.conf` will be read to
  # configure the resolver using the `nameserver`, `domain`,
  # `search` and `ndots` directives in `/etc/resolv.conf`.
  #
  # Note that nameservers normally resolve fully qualified domain names (FQDN)
  # and relying on `/etc/resolv.conf` can be useful to provide a domains search
  # list to resolve underqualified host names for example.
  config :nameserver, :validate => :array

  # `resolv` calls will be wrapped in a timeout instance
  config :timeout, :validate => :number, :default => 0.5

  # number of times to retry a failed resolve/reverse
  config :max_retries, :validate => :number, :default => 2

  # set the size of cache for successful requests
  config :hit_cache_size, :validate => :number, :default => 0

  # how long to cache successful requests (in seconds)
  config :hit_cache_ttl, :validate => :number, :default => 60

  # cache size for failed requests
  config :failed_cache_size, :validate => :number, :default => 0

  # how long to cache failed requests (in seconds)
  config :failed_cache_ttl, :validate => :number, :default => 5

  # Use custom hosts file(s). For example: `["/var/db/my_custom_hosts"]`
  config :hostsfile, :validate => :array

  attr_reader :hit_cache
  attr_reader :failed_cache

  public
  def register
    if @nameserver.nil? && @hostsfile.nil?
      @resolv = Resolv.new
    else
      @resolv = Resolv.new(build_resolvers)
    end

    if @hit_cache_size > 0
      @hit_cache = LruRedux::TTL::ThreadSafeCache.new(@hit_cache_size, @hit_cache_ttl)
    end

    if @failed_cache_size > 0
      @failed_cache = LruRedux::TTL::ThreadSafeCache.new(@failed_cache_size, @failed_cache_ttl)
    end

    @ip_validator = Resolv::AddressRegex
  end # def register

  public
  def filter(event)
    if @resolve
      return if resolve(event).nil?
    end

    if @reverse
      return if reverse(event).nil?
    end

    filter_matched(event)
  end

  private

  def build_resolvers
    build_user_host_resolvers.concat([::Resolv::Hosts.new]).concat(build_user_dns_resolver)
  end

  def build_user_host_resolvers
    return [] if @hostsfile.nil? || @hostsfile.empty?
    @hostsfile.map{|fn| ::Resolv::Hosts.new(fn)}
  end

  def build_user_dns_resolver
    return [] if @nameserver.nil? || @nameserver.empty?
    [::Resolv::DNS.new(:nameserver => @nameserver, :search => [], :ndots => 1)]
  end

  def resolve(event)
    @resolve.each do |field|
      is_array = false
      raw = event.get(field)

      if raw.nil?
        @logger.warn("DNS filter could not resolve missing field", :field => field)
        next
      end

      if raw.is_a?(Array)
        is_array = true
        if raw.length > 1
          @logger.warn("DNS: skipping resolve, can't deal with multiple values", :field => field, :value => raw)
          return
        end
        raw = raw.first
      end

      begin
        return if @failed_cache && @failed_cache[raw] # recently failed resolv, skip
        if @hit_cache
          address = @hit_cache[raw]
          if address.nil?
            if address = retriable_getaddress(raw)
              @hit_cache[raw] = address
            end
          end
        else
          address = retriable_getaddress(raw)
        end
      rescue Resolv::ResolvError => e
        @failed_cache[raw] = true if @failed_cache
        @logger.debug("DNS: couldn't resolve the hostname.",
                      :field => field, :value => raw, :message => e.message)
        return
      rescue Resolv::ResolvTimeout, Timeout::Error
        @failed_cache[raw] = true if @failed_cache
        @logger.warn("DNS: timeout on resolving the hostname.",
                      :field => field, :value => raw)
        return
      rescue SocketError => e
        @logger.error("DNS: Encountered SocketError.",
                      :field => field, :value => raw, :message => e.message)
        return
      rescue Java::JavaLang::IllegalArgumentException => e
        @logger.error("DNS: Unable to parse address.",
                      :field => field, :value => raw, :message => e.message)
        return
      rescue => e
        @logger.error("DNS: Unexpected Error.",
                      :field => field, :value => raw, :message => e.message)
        return
      end

      if @action == "replace"
        if is_array
          event.set(field, [address])
        else
          event.set(field, address)
        end
      else
        if !is_array
          event.set(field, [event.get(field), address])
        else
          arr = event.get(field)
          arr << address
          event.set(field, arr)
        end
      end

    end
  end

  private
  def reverse(event)
    @reverse.each do |field|
      raw = event.get(field)

      if raw.nil?
        @logger.warn("DNS filter could not perform reverse lookup on missing field", :field => field)
        next
      end

      is_array = false
      if raw.is_a?(Array)
          is_array = true
          if raw.length > 1
            @logger.warn("DNS: skipping reverse, can't deal with multiple values", :field => field, :value => raw)
            return
          end
          raw = raw.first
      end

      if ! @ip_validator.match(raw)
        @logger.debug("DNS: not an address",
                      :field => field, :value => event.get(field))
        return
      end
      begin
        return if @failed_cache && @failed_cache.key?(raw) # recently failed resolv, skip
        if @hit_cache
          hostname = @hit_cache[raw]
          if hostname.nil?
            if hostname = retriable_getname(raw)
              @hit_cache[raw] = hostname
            end
          end
        else
          hostname = retriable_getname(raw)
        end
      rescue Resolv::ResolvError => e
        @failed_cache[raw] = true if @failed_cache
        @logger.debug("DNS: couldn't resolve the address.",
                      :field => field, :value => raw, :message => e.message)
        return
      rescue Resolv::ResolvTimeout, Timeout::Error
        @failed_cache[raw] = true if @failed_cache
        @logger.warn("DNS: timeout on resolving address.",
                      :field => field, :value => raw)
        return
      rescue SocketError => e
        @logger.error("DNS: Encountered SocketError.",
                      :field => field, :value => raw, :message => e.message)
        return
      rescue Java::JavaLang::IllegalArgumentException => e
        @logger.error("DNS: Unable to parse address.",
                      :field => field, :value => raw, :message => e.message)
        return
      rescue => e
        @logger.error("DNS: Unexpected Error.",
                      :field => field, :value => raw, :message => e.message)
        return
      end

      if @action == "replace"
        if is_array
          event.set(field, [hostname])
        else
          event.set(field, hostname)
        end
      else
        if !is_array
          event.set(field, [event.get(field), hostname])
        else
          arr = event.get(field)
          arr << hostname
          event.set(field, arr)
        end
      end
    end
  end

  private
  def retriable_request(&block)
    tries = 0
    begin
      Timeout::timeout(@timeout) do
        block.call
      end
    rescue Timeout::Error, SocketError
      if tries < @max_retries
        tries = tries + 1
        retry
      else
        raise
      end
    end
  end

  private
  def retriable_getname(address)
    retriable_request do
      getname(address)
    end
  end

  private
  def retriable_getaddress(name)
    retriable_request do
      getaddress(name)
    end
  end

  private
  def getname(address)
    name = @resolv.getname(address).force_encoding(Encoding::UTF_8)
    IDN.toUnicode(name)
  end

  private
  def getaddress(name)
    idn = IDN.toASCII(name)
    @resolv.getaddress(idn).force_encoding(Encoding::UTF_8)
  end
end # class LogStash::Filters::DNS
