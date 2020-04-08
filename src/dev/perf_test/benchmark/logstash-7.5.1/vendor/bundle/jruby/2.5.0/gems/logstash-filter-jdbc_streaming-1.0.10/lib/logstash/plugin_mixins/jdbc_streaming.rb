# encoding: utf-8
require "logstash/config/mixin"
require_relative "jdbc_streaming/wrapped_driver"

# Tentative of abstracting JDBC logic to a mixin
# for potential reuse in other plugins (input/output)
module LogStash module PluginMixins module JdbcStreaming
  class RowCache
    def initialize(size, ttl)
      @cache = ::LruRedux::TTL::ThreadSafeCache.new(size, ttl)
    end

    def get(parameters)
      @cache.getset(parameters) { yield }
    end
  end

  class NoCache
    def initialize(size, ttl) end

    def get(statement)
      yield
    end
  end

  # This method is called when someone includes this module
  def self.included(base)
    # Add these methods to the 'base' given.
    base.extend(self)
    base.setup_jdbc_config
  end

  public
  def setup_jdbc_config
    # JDBC driver library path to third party driver library.
    config :jdbc_driver_library, :validate => :path

    # JDBC driver class to load, for example "oracle.jdbc.OracleDriver" or "org.apache.derby.jdbc.ClientDriver"
    config :jdbc_driver_class, :validate => :string, :required => true

    # JDBC connection string
    config :jdbc_connection_string, :validate => :string, :required => true

    # JDBC user
    config :jdbc_user, :validate => :string

    # JDBC password
    config :jdbc_password, :validate => :password

    # Connection pool configuration.
    # Validate connection before use.
    config :jdbc_validate_connection, :validate => :boolean, :default => false

    # Connection pool configuration.
    # How often to validate a connection (in seconds)
    config :jdbc_validation_timeout, :validate => :number, :default => 3600
  end

  private

  def load_driver_jars
    unless @jdbc_driver_library.nil? || @jdbc_driver_library.empty?
      @jdbc_driver_library.split(",").each do |driver_jar|
        begin
          @logger.debug("loading #{driver_jar}")
          # Use https://github.com/jruby/jruby/wiki/CallingJavaFromJRuby#from-jar-files to make classes from jar
          # available
          require driver_jar
        rescue LoadError => e
          raise LogStash::PluginLoadingError, "unable to load #{driver_jar} from :jdbc_driver_library, #{e.message}"
        end
      end
    end
  end

  public
  def prepare_jdbc_connection
    require "sequel"
    require "sequel/adapters/jdbc"
    require "java"

    load_driver_jars

    @sequel_opts_symbols = @sequel_opts.inject({}) {|hash, (k,v)| hash[k.to_sym] = v; hash}
    @sequel_opts_symbols[:user] = @jdbc_user unless @jdbc_user.nil? || @jdbc_user.empty?
    @sequel_opts_symbols[:password] = @jdbc_password.value unless @jdbc_password.nil?

    Sequel::JDBC.load_driver(@jdbc_driver_class)
    @database = Sequel.connect(@jdbc_connection_string, @sequel_opts_symbols)
    if @jdbc_validate_connection
      @database.extension(:connection_validator)
      @database.pool.connection_validation_timeout = @jdbc_validation_timeout
    end
    begin
      @database.test_connection
    rescue Sequel::DatabaseConnectionError => e
      #TODO return false and let the plugin raise a LogStash::ConfigurationError
      raise e
    end
  end # def prepare_jdbc_connection
end end end
