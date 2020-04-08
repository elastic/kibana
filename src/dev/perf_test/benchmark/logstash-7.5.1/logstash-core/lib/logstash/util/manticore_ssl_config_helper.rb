# encoding: utf-8

module LogStash; module Util; module ManticoreSSLConfigHelper
  extend self

  ##
  # Extract Manticore-style SSL directives from the given configuration.
  #
  # @param namespace [String] a string namespace (e.g., `kibana` in `var.kibana.ssl.*`)
  # @param settings [Hash<String,Object>] a collection of Manticore-friendly SSL directives.
  #                                       if SSL explicitly disabled, an _empty_ hash will be returned.
  #
  # @return [Hash<Symbol,Object>]
  def manticore_ssl_options_from_config(namespace, settings)
    ssl_settings = strip_prefix(settings, "var.#{namespace}.ssl.")

    # boolean settings may be strings if set through the cli
    # or booleans if set through the yaml file, so we use .to_s
    if ssl_settings.include?('enabled') && !coerce_boolean(ssl_settings['enabled'])
      logger.warn('SSL explicitly disabled; other SSL settings will be ignored') if logger && ssl_settings.size > 1
      return {}
    end

    {
        :verify      => ssl_settings.fetch('verification_mode', :strict).to_sym,
        :ca_file     => ssl_settings.fetch('certificate_authority', nil),
        :client_cert => ssl_settings.fetch('certificate', nil),
        :client_key  => ssl_settings.fetch('key', nil),
    }
  end

  private

  ##
  # Returns the subset of the hash whose keys match the given prefix, with the prefix removed
  #
  # @param hash [Hash<String,Object>]
  # @param prefix [String]
  # @return [Hash<String,Object>]
  def strip_prefix(hash, prefix)
    hash.each_with_object({}) do |(key, value), memo|
      next unless key.start_with?(prefix)
      unprefixed_key = key[prefix.length..-1]
      memo[unprefixed_key] = value
    end
  end

  ##
  # Coerces the non-nil input to boolean
  #
  # @param value [Boolean,String,Integer]
  # @return [Boolean]
  def coerce_boolean(value)
    case value
    when true, "true", "T", 1 then true
    when false, "false", "F", 0 then false
    else
      fail("Boolean value required, received `#{value}`")
    end
  end

  ##
  # Adapter to enable logging via the including class' `#logger` method or `@logger` instance variable
  #
  # @return [Logger,nil]
  def logger
    return super if defined?(super)

    @logger
  end
end end end
