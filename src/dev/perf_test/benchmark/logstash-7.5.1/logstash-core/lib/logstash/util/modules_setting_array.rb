# encoding: utf-8
require "forwardable"
require "logstash/util/password"

module LogStash module Util class ModulesSettingArray
  extend Forwardable
  DELEGATED_METHODS = [].public_methods.reject{|symbol| symbol.to_s.end_with?('__')}

  def_delegators :@original, *DELEGATED_METHODS

  attr_reader :original
  def initialize(value)
    unless value.is_a?(Array)
      raise ArgumentError.new("Module Settings must be an Array. Received: #{value.class}")
    end
    @original = value
    # wrap passwords
    @original.each do |hash|
      hash.keys.select{|key| key.to_s.end_with?('password') && !hash[key].is_a?(LogStash::Util::Password)}.each do |key|
        hash[key] = LogStash::Util::Password.new(hash[key])
      end
    end
  end

  def __class__
    LogStash::Util::ModulesSettingArray
  end
end end end
