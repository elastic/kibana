# encoding: utf-8
require "logstash/util"
require "forwardable"

# This class exists to quietly wrap a password string so that, when printed or
# logged, you don't accidentally print the password itself.
class LogStash::Util::SafeURI
  PASS_PLACEHOLDER = "xxxxxx".freeze
  HOSTNAME_PORT_REGEX=/\A(?<hostname>([A-Za-z0-9\.\-]+)|\[[0-9A-Fa-f\:]+\])(:(?<port>\d+))?\Z/

  extend Forwardable


  attr_reader :uri

  public
  def initialize(arg)
    @uri = case arg
           when String
             arg = "//#{arg}" if HOSTNAME_PORT_REGEX.match(arg)
             java.net.URI.new(arg)
           when java.net.URI
             arg
           when URI
             java.net.URI.new(arg.to_s)
           else
             raise ArgumentError, "Expected a string, java.net.URI, or URI, got a #{arg.class} creating a URL"
           end
    raise ArgumentError, "URI is not valid - host is not specified" if @uri.host.nil?
  end

  def to_s
    sanitized.to_s
  end

  def inspect
    sanitized.to_s
  end

  def sanitized
    return uri unless password # nothing to sanitize here!

    user_info = user ? "#{user}:#{PASS_PLACEHOLDER}" : nil

    make_uri(scheme, user_info, host, port, path, query, fragment)
  end

  def ==(other)
    other.is_a?(::LogStash::Util::SafeURI) ? @uri == other.uri : false
  end

  def clone
    # No need to clone the URI, in java its immutable
    self.class.new(uri)
  end

  def update(field, value)
    new_scheme = scheme
    new_user = user
    new_password = password
    new_host = host
    new_port = port
    new_path = path
    new_query = query
    new_fragment = fragment

    case field
    when :scheme
      new_scheme = value
    when :user
      new_user = value
    when :password
      new_password = value
    when :host
      new_host = value
    when :port
      new_port = value
    when :path
      new_path = value
    when :query
      new_query = value
    when :fragment
      new_fragment = value
    end

    user_info = new_user
    if new_user && new_password
      user_info += ":" + new_password
    end

    @uri = make_uri(new_scheme, user_info, new_host, new_port, new_path, new_query, new_fragment)
  end

  def user
    if userinfo
      userinfo.split(":")[0]
    end
  end

  def user=(new_user)
    update(:user, new_user)
  end

  def password
    if userinfo
      userinfo.split(":")[1]
    end
  end

  def password=(new_password)
    update(:password, new_password)
  end

  def hostname
    # Alias from the ruby library
    host
  end

  def host=(new_host)
    update(:host, new_host)
  end

  def port
    # In java this is an int
    uri.port < 1 ? nil : uri.port
  end

  def port=(new_port)
    update(:port, new_port)
  end

  def path=(new_path)
    update(:path, new_path)
  end

  def query=(new_query)
    update(:query, new_query)
  end

  def fragment=(new_fragment)
    update(:fragment, new_fragment)
  end

  # Same algorithm as Ruby's URI class uses
  def normalize!
    if path && path == ''
      path = '/'
    end
    if scheme && scheme != scheme.downcase
      scheme = self.scheme.downcase
    end
    if host && host != host.downcase
      host = self.host.downcase
    end
  end

  def normalize
    d = self.dup
    d.normalize!
    d
  end

  def path
    @uri.raw_path
  end

  def query
    @uri.raw_query
  end

  def fragment
    @uri.raw_fragment
  end

  def userinfo
    @uri.raw_user_info
  end

  def_delegators :@uri, :absolute?, :scheme, :host

  private

  # Jruby doesn't guess the constructor correctly if there are some nil things in place
  # hence, this method
  def make_uri(scheme, user_info, host, port, path, query, fragment)
    # It is lot legal to have a path not starting with a /
    prefixed_path = path && path[0] != "/" ? "/#{path}" : path
    java.net.URI.new(scheme, user_info, host, port || -1, prefixed_path, query, fragment)
  end
end

