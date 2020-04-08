# frozen_string_literal: true
require 'dalli/client'

module Dalli
  class Client
    ##
    # Get the value and CAS ID associated with the key.  If a block is provided,
    # value and CAS will be passed to the block.
    def get_cas(key)
      (value, cas) = perform(:cas, key)
      value = (!value || value == 'Not found') ? nil : value
      if block_given?
        yield value, cas
      else
        [value, cas]
      end
    end

    ##
    # Fetch multiple keys efficiently, including available metadata such as CAS.
    # If a block is given, yields key/data pairs one a time.  Data is an array:
    # [value, cas_id]
    # If no block is given, returns a hash of
    #   { 'key' => [value, cas_id] }
    def get_multi_cas(*keys)
      if block_given?
        get_multi_yielder(keys) {|*args| yield(*args)}
      else
        Hash.new.tap do |hash|
          get_multi_yielder(keys) {|k, data| hash[k] = data}
        end
      end
    end

    ##
    # Set the key-value pair, verifying existing CAS.
    # Returns the resulting CAS value if succeeded, and falsy otherwise.
    def set_cas(key, value, cas, ttl=nil, options=nil)
      ttl ||= @options[:expires_in].to_i
      perform(:set, key, value, ttl, cas, options)
    end

    ##
    # Conditionally add a key/value pair, verifying existing CAS, only if the
    # key already exists on the server.  Returns the new CAS value if the
    # operation succeeded, or falsy otherwise.
    def replace_cas(key, value, cas, ttl=nil, options=nil)
      ttl ||= @options[:expires_in].to_i
      perform(:replace, key, value, ttl, cas, options)
    end

    # Delete a key/value pair, verifying existing CAS.
    # Returns true if succeeded, and falsy otherwise.
    def delete_cas(key, cas=0)
      perform(:delete, key, cas)
    end

  end
end
