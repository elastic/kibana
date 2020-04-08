# encoding: utf-8
require "logstash/util/password"

module LogStash module Util class CloudSettingAuth
  attr_reader :original, :username, :password

  def initialize(value)
    return if value.nil?

    unless value.is_a?(String)
      raise ArgumentError.new("Cloud Auth must be String. Received: #{value.class}")
    end
    @original = value
    @username, sep, password = @original.partition(":")
    if @username.empty? || sep.empty? || password.empty?
      raise ArgumentError.new("Cloud Auth username and password format should be \"<username>:<password>\".")
    end
    @password = LogStash::Util::Password.new(password)
  end

  def to_s
    "#{@username}:#{@password}"
  end

  def inspect
    to_s
  end
end end end
