# encoding: utf-8
require "uri"
require "java"
require "erb"
require "ostruct"
require "fileutils"
require "stud/temporary"
require "jar-dependencies"


# This is a bit of a hack, to make sure that all of our call pass to a specific proxies.
# We do this before any jar-dependences check is done, meaning we have to silence him.
module Jars
  def self.warn(message)
    if ENV["debug"]
      puts message
    end
  end
end

SETTINGS_TEMPLATE = ::File.join(::File.dirname(__FILE__), "settings.xml.erb")
SETTINGS_TARGET = ::File.join(Dir.home, ".m2")

class ProxyTemplateData
  attr_reader :proxies

  def initialize(proxies)
    @proxies = proxies.collect { |proxy| OpenStruct.new(proxy) }
  end

  def get_binding
    binding
  end
end

# Apply HTTP_PROXY and HTTPS_PROXY to the current environment
# this will be used by any JRUBY calls
def apply_env_proxy_settings(settings)
  $stderr.puts("Using proxy #{settings}") if ENV["DEBUG"]
  scheme = settings[:protocol].downcase
  java.lang.System.setProperty("#{scheme}.proxyHost", settings[:host])
  java.lang.System.setProperty("#{scheme}.proxyPort", settings[:port].to_s)
  java.lang.System.setProperty("#{scheme}.proxyUsername", settings[:username].to_s)
  java.lang.System.setProperty("#{scheme}.proxyPassword", settings[:password].to_s)
end

def extract_proxy_values_from_uri(proxy_uri)
  {
    :protocol => proxy_uri.scheme,
    :host => proxy_uri.host,
    :port => proxy_uri.port,
    :username => proxy_uri.user,
    :password => proxy_uri.password
  }
end

def parse_proxy_string(proxy_string)
  proxy_uri = URI.parse(proxy_string)
  if proxy_uri.kind_of?(URI::HTTP) # URI::HTTPS is already a subclass of URI::HTTP
    proxy_uri
  else
    raise "Invalid proxy `#{proxy_uri}`. The URI is not HTTP/HTTPS."
  end
end

def get_proxy(key)
  ENV[key.downcase] || ENV[key.upcase]
end

def proxy_string_exists?(proxy)
  !proxy.nil? && !proxy.strip.empty?
end

def configure_proxy
  proxies = []
  proxy = get_proxy("http_proxy")
  if proxy_string_exists?(proxy)
    proxy_uri = parse_proxy_string(proxy)
    proxy_settings = extract_proxy_values_from_uri(proxy_uri)
    proxy_settings[:protocol] = "http"
    apply_env_proxy_settings(proxy_settings)
    proxies << proxy_settings
  end

  proxy = get_proxy("https_proxy")
  if proxy_string_exists?(proxy)
    proxy_uri = parse_proxy_string(proxy)
    proxy_settings = extract_proxy_values_from_uri(proxy_uri)
    proxy_settings[:protocol] = "https"
    apply_env_proxy_settings(proxy_settings)
    proxies << proxy_settings
  end

  # I've tried overriding jar dependency environment variable to declare the settings but it doesn't seems to work.
  # I am not sure if its because of our current setup or its a bug in the library.
  if !proxies.empty?
    FileUtils.mkdir_p(SETTINGS_TARGET)
    target = ::File.join(SETTINGS_TARGET, "settings.xml")
    template = ::File.read(SETTINGS_TEMPLATE)
    template_content = ERB.new(template, 3).result(ProxyTemplateData.new(proxies).get_binding)

    if ::File.exist?(target)
      if template_content != ::File.read(target)
        puts "WARNING: A maven settings file already exist at #{target}, please review the content to make sure it include your proxies configuration."
      end
    else
      ::File.open(target, "w") { |f| f.write(template_content) }
    end
  end
end
