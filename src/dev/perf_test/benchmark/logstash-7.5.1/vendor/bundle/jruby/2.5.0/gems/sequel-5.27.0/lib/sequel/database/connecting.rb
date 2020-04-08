# frozen-string-literal: true

module Sequel
  class Database
    # ---------------------
    # :section: 4 - Methods relating to adapters, connecting, disconnecting, and sharding
    # This methods involve the Database's connection pool.
    # ---------------------

    # Array of supported database adapters
    ADAPTERS = %w'ado amalgalite ibmdb jdbc mock mysql mysql2 odbc oracle postgres sqlanywhere sqlite tinytds'.map(&:to_sym)

    # The Database subclass for the given adapter scheme.
    # Raises Sequel::AdapterNotFound if the adapter
    # could not be loaded.
    def self.adapter_class(scheme)
      scheme.is_a?(Class) ? scheme : load_adapter(scheme.to_sym)
    end

    # Returns the scheme symbol for the Database class.
    def self.adapter_scheme
      @scheme
    end
    
    # Connects to a database.  See Sequel.connect.
    def self.connect(conn_string, opts = OPTS)
      case conn_string
      when String
        if conn_string.start_with?('jdbc:')
          c = adapter_class(:jdbc)
          opts = opts.merge(:orig_opts=>opts.dup)
          opts = {:uri=>conn_string}.merge!(opts)
        else
          uri = URI.parse(conn_string)
          scheme = uri.scheme
          c = adapter_class(scheme)
          uri_options = c.send(:uri_to_options, uri)
          uri.query.split('&').map{|s| s.split('=')}.each{|k,v| uri_options[k.to_sym] = v if k && !k.empty?} unless uri.query.to_s.strip.empty?
          uri_options.to_a.each{|k,v| uri_options[k] = (defined?(URI::DEFAULT_PARSER) ? URI::DEFAULT_PARSER : URI).unescape(v) if v.is_a?(String)}
          opts = uri_options.merge(opts).merge!(:orig_opts=>opts.dup, :uri=>conn_string, :adapter=>scheme)
        end
      when Hash
        opts = conn_string.merge(opts)
        opts = opts.merge(:orig_opts=>opts.dup)
        c = adapter_class(opts[:adapter_class] || opts[:adapter] || opts['adapter'])
      else
        raise Error, "Sequel::Database.connect takes either a Hash or a String, given: #{conn_string.inspect}"
      end

      opts = opts.inject({}) do |m, (k,v)|
        k = :user if k.to_s == 'username'
        m[k.to_sym] = v
        m
      end

      begin
        db = c.new(opts)
        db.test_connection if db.send(:typecast_value_boolean, opts.fetch(:test, true))
        if block_given?
          return yield(db)
        end
      ensure
        if block_given?
          db.disconnect if db
          Sequel.synchronize{::Sequel::DATABASES.delete(db)}
        end
      end
      db
    end
    
    # Load the adapter from the file system.  Raises Sequel::AdapterNotFound
    # if the adapter cannot be loaded, or if the adapter isn't registered
    # correctly after being loaded. Options:
    # :map :: The Hash in which to look for an already loaded adapter (defaults to ADAPTER_MAP).
    # :subdir :: The subdirectory of sequel/adapters to look in, only to be used for loading
    #            subadapters.
    def self.load_adapter(scheme, opts=OPTS)
      map = opts[:map] || ADAPTER_MAP
      if subdir = opts[:subdir]
        file = "#{subdir}/#{scheme}"
      else
        file = scheme
      end
      
      unless obj = Sequel.synchronize{map[scheme]}
        # attempt to load the adapter file
        begin
          require "sequel/adapters/#{file}"
        rescue LoadError => e
          # If subadapter file doesn't exist, just return, 
          # using the main adapter class without database customizations.
          return if subdir
          raise Sequel.convert_exception_class(e, AdapterNotFound)
        end
        
        # make sure we actually loaded the adapter
        unless obj = Sequel.synchronize{map[scheme]}
          raise AdapterNotFound, "Could not load #{file} adapter: adapter class not registered in ADAPTER_MAP"
        end
      end

      obj
    end

    # Sets the adapter scheme for the Database class. Call this method in
    # descendants of Database to allow connection using a URL. For example the
    # following:
    #
    #   class Sequel::MyDB::Database < Sequel::Database
    #     set_adapter_scheme :mydb
    #     ...
    #   end
    #
    # would allow connection using:
    #
    #   Sequel.connect('mydb://user:password@dbserver/mydb')
    def self.set_adapter_scheme(scheme) # :nodoc:
      @scheme = scheme
      Sequel.synchronize{ADAPTER_MAP[scheme] = self}
    end
    private_class_method :set_adapter_scheme

    # Sets the given module as the shared adapter module for the given scheme.
    # Used to register shared adapters for use by the mock adapter. Example:
    #
    #   # in file sequel/adapters/shared/mydb.rb
    #   module Sequel::MyDB
    #     Sequel::Database.set_shared_adapter_scheme :mydb, self
    #
    #     def self.mock_adapter_setup(db)
    #       # ...
    #     end
    #
    #     module DatabaseMethods
    #       # ...
    #     end
    #
    #     module DatasetMethods
    #       # ...
    #     end
    #   end
    #
    # would allow the mock adapter to return a Database instance that supports
    # the MyDB syntax via:
    #
    #   Sequel.connect('mock://mydb')
    def self.set_shared_adapter_scheme(scheme, mod)
      Sequel.synchronize{SHARED_ADAPTER_MAP[scheme] = mod}
    end
    
    # The connection pool for this Database instance.  All Database instances have
    # their own connection pools.
    attr_reader :pool

    # Returns the scheme symbol for this instance's class, which reflects which
    # adapter is being used.  In some cases, this can be the same as the
    # +database_type+ (for native adapters), in others (i.e. adapters with
    # subadapters), it will be different.
    #
    #   Sequel.connect('jdbc:postgres://...').adapter_scheme
    #   # => :jdbc
    def adapter_scheme
      self.class.adapter_scheme
    end

    # Dynamically add new servers or modify server options at runtime. Also adds new
    # servers to the connection pool. Only usable when using a sharded connection pool.
    #
    # servers argument should be a hash with server name symbol keys and hash or
    # proc values.  If a servers key is already in use, it's value is overridden
    # with the value provided.
    #
    #   DB.add_servers(f: {host: "hash_host_f"})
    def add_servers(servers)
      unless sharded?
        raise Error, "cannot call Database#add_servers on a Database instance that does not use a sharded connection pool"
      end

      h = @opts[:servers]
      Sequel.synchronize{h.merge!(servers)}
      @pool.add_servers(servers.keys)
    end

    # The database type for this database object, the same as the adapter scheme
    # by default.  Should be overridden in adapters (especially shared adapters)
    # to be the correct type, so that even if two separate Database objects are
    # using different adapters you can tell that they are using the same database
    # type.  Even better, you can tell that two Database objects that are using
    # the same adapter are connecting to different database types.
    #
    #   Sequel.connect('jdbc:postgres://...').database_type
    #   # => :postgres
    def database_type
      adapter_scheme
    end
    
    # Disconnects all available connections from the connection pool.  Any
    # connections currently in use will not be disconnected. Options:
    # :server :: Should be a symbol specifing the server to disconnect from,
    #             or an array of symbols to specify multiple servers.
    #
    # Example:
    #
    #   DB.disconnect # All servers
    #   DB.disconnect(server: :server1) # Single server
    #   DB.disconnect(server: [:server1, :server2]) # Multiple servers
    def disconnect(opts = OPTS)
      pool.disconnect(opts)
    end

    # Should only be called by the connection pool code to disconnect a connection.
    # By default, calls the close method on the connection object, since most
    # adapters use that, but should be overwritten on other adapters.
    def disconnect_connection(conn)
      conn.close
    end

    # Dynamically remove existing servers from the connection pool. Only usable
    # when using a sharded connection pool
    #
    # servers should be symbols or arrays of symbols.  If a nonexistent server
    # is specified, it is ignored.  If no servers have been specified for
    # this database, no changes are made. If you attempt to remove the :default server,
    # an error will be raised.
    #
    #   DB.remove_servers(:f1, :f2)
    def remove_servers(*servers)
      unless sharded?
        raise Error, "cannot call Database#remove_servers on a Database instance that does not use a sharded connection pool"
      end

      h = @opts[:servers]
      servers.flatten.each{|s| Sequel.synchronize{h.delete(s)}}
      @pool.remove_servers(servers)
    end
    
    # An array of servers/shards for this Database object.
    #
    #   DB.servers # Unsharded: => [:default]
    #   DB.servers # Sharded:   => [:default, :server1, :server2]
    def servers
      pool.servers
    end

    # Returns true if the database is using a single-threaded connection pool.
    def single_threaded?
      @single_threaded
    end
    
    if RUBY_ENGINE == 'ruby' && RUBY_VERSION < '2.5'
    # :nocov:
      def synchronize(server=nil)
        @pool.hold(server || :default){|conn| yield conn}
      end
    # :nocov:
    else
      # Acquires a database connection, yielding it to the passed block. This is
      # useful if you want to make sure the same connection is used for all
      # database queries in the block.  It is also useful if you want to gain
      # direct access to the underlying connection object if you need to do
      # something Sequel does not natively support.
      #
      # If a server option is given, acquires a connection for that specific
      # server, instead of the :default server.
      #
      #   DB.synchronize do |conn|
      #     # ...
      #   end
      def synchronize(server=nil, &block)
        @pool.hold(server || :default, &block)
      end
    end
    
    # Attempts to acquire a database connection.  Returns true if successful.
    # Will probably raise an Error if unsuccessful.  If a server argument
    # is given, attempts to acquire a database connection to the given
    # server/shard.
    def test_connection(server=nil)
      synchronize(server){|conn|}
      true
    end

    # Check whether the given connection is currently valid, by
    # running a query against it.  If the query fails, the
    # connection should probably be removed from the connection
    # pool.
    def valid_connection?(conn)
      sql = valid_connection_sql
      begin
        log_connection_execute(conn, sql)
      rescue Sequel::DatabaseError, *database_error_classes
        false
      else
        true
      end
    end

    private
    
    # The default options for the connection pool.
    def connection_pool_default_options
      {}
    end
    
    # Return the options for the given server by merging the generic
    # options for all server with the specific options for the given
    # server specified in the :servers option.
    def server_opts(server)
      opts = if @opts[:servers] and server_options = @opts[:servers][server]
        case server_options
        when Hash
          @opts.merge(server_options)
        when Proc
          @opts.merge(server_options.call(self))
        else
          raise Error, 'Server opts should be a hash or proc'
        end
      elsif server.is_a?(Hash)
        @opts.merge(server)
      else
        @opts.dup
      end
      opts.delete(:servers)
      opts
    end

    # The SQL query to issue to check if a connection is valid.
    def valid_connection_sql
      @valid_connection_sql ||= select(nil).sql
    end
  end
end
