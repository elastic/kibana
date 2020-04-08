require 'logger'
require 'thread'
require 'concurrent-ruby'
require 'monitor'

# Generic connection pool class
class GenePool

  attr_accessor :name, :warn_timeout, :logger, :timeout_class
  attr_reader   :pool_size

  # Creates a gene_pool.  The passed block will be used to initialize a single instance of
  # the item being pooled (i.e., socket connection or whatever)
  # options -
  #   name          - The name used in logging messages.
  #   pool_size     - The maximum number of instances that will be created (Defaults to 1).
  #   timeout       - Will raise a Timeout exception if waiting on a connection for this many seconds.
  #   timeout_class - Exception class to raise if timeout error, defaults to Timeout::Error
  #   warn_timeout  - Displays an error message if a checkout takes longer that the given time (used to give hints to increase the pool size).
  #   idle_timeout  - If set, the connection will be renewed if it hasn't been used in this amount of time (seconds).
  #   logger        - The logger used for log messages, defaults to STDERR.
  #   close_proc    - The process or method used to close a pooled instance when it is removed.
  #     Defaults to :close.  Set to nil for no-op or a symbol for a method or a proc that takes an argument for the instance.
  def initialize(options={}, &connect_block)
    @connect_block = connect_block

    @name          = options[:name]          || 'GenePool'
    @pool_size     = options[:pool_size]     || 1
    @timeout       = options[:timeout]
    @timeout_class = options[:timeout_class] || Timeout::Error
    @warn_timeout  = options[:warn_timeout]  || 5.0
    @idle_timeout  = options[:idle_timeout]
    @logger        = options[:logger]
    @close_proc    = options[:close_proc]    || (!options.has_key?(:close_proc) && :close)

    unless @logger
      @logger = Logger.new(STDERR)
      @logger.level = Logger::INFO
    end

    @connections = []
    @checked_out = []
    # Map the original connections object_id within the with_connection method to the final connection.
    # This could change if the connection is renew'ed.
    @with_map    = Concurrent::Hash.new

    setup_mutex
  end

  def size
    @mutex.synchronize do
      return @connections.size
    end
  end

  def pool_size=(size)
    @mutex.synchronize do
      return if @pool_size == size
      @pool_size = size
      if @pool_size < @connections.size
        old_connections = (@connections - @checked_out).last(@connections.size - @pool_size)
        old_connections.each do |connection|
          remove_and_close(connection)
          @logger.info "#{@name}: Connection #{connection}(#{connection.object_id}) has been removed due to pool size reduction"
        end
      end
    end
  end

  # Check out a connection from the pool, creating it if necessary.
  def checkout
    start_time = Time.now
    connection = nil
    reserved_connection_placeholder = Thread.current
    begin
      @mutex.synchronize do
        raise "Can't perform checkout, #{@name} has been closed" if @pool_size == 0
        until connection do
          if @checked_out.size < @connections.size
            connection = (@connections - @checked_out).first
            @checked_out << connection
          elsif @connections.size < @pool_size
            # Perform the actual connection outside the mutex
            connection = reserved_connection_placeholder
            @connections << connection
            @checked_out << connection
            @logger.debug {"#{@name}: Created connection ##{@connections.size} #{connection}(#{connection.object_id}) for #{name}"}
          else
            @logger.info "#{@name}: Waiting for an available connection, all #{@pool_size} connections are checked out."
            wait_mutex(start_time)
          end
        end
      end
    ensure
      delta = Time.now - start_time
      if delta > @warn_timeout
        @logger.warn "#{@name}: It took #{delta} seconds to obtain a connection.  Consider raising the pool size which is " +
          "currently set to #{@pool_size}."
      end
    end
    if connection == reserved_connection_placeholder
      connection = renew(reserved_connection_placeholder)
    elsif @idle_timeout && (Time.now - connection._last_used) >= @idle_timeout
      connection = renew(connection)
    end

    @logger.debug {"#{@name}: Checkout connection #{connection}(#{connection.object_id}) self=#{self}"}
    return connection
  end

  # Return a connection to the pool.
  def checkin(connection)
    @mutex.synchronize do
      @checked_out.delete(connection)
      if @pool_size < @connections.size
        remove_and_close(connection)
        @logger.info "#{@name}: Checkin connection #{connection}(#{connection.object_id}) has been removed due to pool size reduction"
      else
        connection._last_used = Time.now
        @condition.signal
      end
    end
    @logger.debug {"#{@name}: Checkin connection #{connection}(#{connection.object_id}) self=#{self}"}
  end

  # Create a scope for checking out a connection
  # The client should handle cleanup on exception which should be something similar to the following:
  #   rescue Exception => e
  #     @gene_pool.remove(connection)
  #     raise
  #   end
  # Note that with_connection_auto_remove automatically does this
  def with_connection
    connection = checkout
    @with_map[connection.object_id] = connection
    begin
      yield connection
    ensure
      # Update connection for any renew's that have occurred
      connection = @with_map.delete(connection.object_id)
      checkin(connection) if connection
    end
  end

  # Create a scope for checking out a connection while automatically removing this connection on exception
  def with_connection_auto_remove
    with_connection do |connection|
      begin
        yield connection
      rescue Exception
        remove(connection)
        raise
      end
    end
  end


  # Create a scope for checking out a connection while automatically retrying on exception
  def with_connection_auto_retry
    with_connection do |connection|
      begin
        yield connection
      rescue Exception => e
        if e.kind_of?(Timeout::Error) || e.kind_of?(@timeout_class) || e.message =~ /expired/
          remove(connection)
          raise
        end
        connection = renew(connection)
        begin
          yield connection
        rescue Exception => e
          remove(connection)
          raise
        end
      end
    end
  end

  # Remove an existing connection from the pool
  def remove(connection)
    @mutex.synchronize do
      @connections.delete(connection)
      @checked_out.delete(connection)
      @condition.signal
    end
    close_connection(connection)
    @logger.debug {"#{@name}: Removed connection #{connection}(#{connection.object_id}) self=#{self}"}
  end

  # If a connection needs to be renewed for some reason, reassign it here
  def renew(old_connection)
    new_connection =
      begin
        @connect_block.call
      rescue Exception
        remove old_connection
        raise
      end
    class << new_connection
      attr_accessor :_last_used
    end
    @mutex.synchronize do
      index = @checked_out.index(old_connection)
      raise Error.new("Can't reassign non-checked out connection for #{@name}") unless index
      @checked_out[index] = new_connection
      @connections[@connections.index(old_connection)] = new_connection
      # If this is part of a with_connection block, then track our new connection
      if @with_map.respond_to?(:key)
        with_key = @with_map.key(old_connection)
      else
        # 1.8 compatibility
        with_key = @with_map.index(old_connection)
      end

      @with_map[with_key] = new_connection if with_key
    end
    # Since connection has been removed, it can be closed outside the mutex
    close_connection(old_connection)

    @logger.debug {"#{@name}: Renewed connection old=#{old_connection.inspect} new=#{new_connection.inspect}"}
    return new_connection
  end

  # Perform the given block for each connection.  Note that close should be used for safely closing all connections
  # This should probably only ever be used to allow interrupt of a connection that is checked out?
  def each
    @mutex.synchronize do
      # Don't include the ones in a reserved_placeholder state because that object is meaningless
      @connections.each { |connection| yield connection unless connection.kind_of?(Thread) }
    end
  end

  # Return a copy of all the current connections
  def connections
    connections = @mutex.synchronize { connections = @connections.dup }
    connections.delete_if { |c| c.kind_of?(Thread) }
    connections.freeze
    connections
  end

  # Close all connections and wait for active connections to complete
  #
  # Parameters:
  #   timeout:
  #     Maximum time to wait for connections to close before returning
  def close(timeout=10)
    # Prevent any new connections from being handed out
    self.pool_size = 0
    start_time = Time.now
    while (Time.now - start_time) < timeout
      sleep 1
      @mutex.synchronize do
        return if @connections.empty?
        @logger.info "#{@name}: Waiting to close, #{@connections.size} connections are still in use"
      end
    end
    @logger.warn "#{@name}: Timed out while waiting to close, #{@connections.size} connections are still in use"
  end

  def remove_idle(idle_time=60)
    @mutex.synchronize do
      (@connections - @checked_out).each do |idle_connection|
        if (Time.now - idle_connection._last_used) >= idle_time
          remove_and_close(idle_connection)
          @logger.debug {"#{@name}: Removed idle connection=#{idle_connection}(#{idle_connection.object_id})"}
        end
      end
    end
  end

  def to_s
    conn = chk = with = nil
    @mutex.synchronize do
      conn = @connections.map{|c| c.object_id}.join(',')
      chk  = @checked_out.map{|c| c.object_id}.join(',')
      with = @with_map.keys.map{|k| "#{k}=#{@with_map[k].object_id}"}.join(',')
    end
    "connections=#{conn} checked_out=#{chk} with_map=#{with}"
  end

  #######
  private
  #######

  def close_connection(connection)
    return unless @close_proc
    # Thread is used as a reserved_connection_placeholder so don't close the connection if it's actually a thread
    return if connection.kind_of?(Thread)
    if @close_proc.kind_of?(Symbol)
      connection.__send__(@close_proc)
    else
      @close_proc.call(connection)
    end
  rescue NoMethodError
    @logger.warn "Unable to close, you should explicitly set :close_proc => nil in the gene_pool options"
  rescue Exception => e
    @logger.warn "Exception trying to close #{connection}(#{connection.object_id}): #{e.message}\n\t#{e.backtrace.join("\n\t")}"
  end

  # Clients should have obtained the mutex before calling this!
  def remove_and_close(connection)
    @connections.delete(connection)
    close_connection(connection)
  end

  def setup_mutex
    @connections.extend(MonitorMixin)
    # Mutex for synchronizing pool access
    @mutex = @connections
    # Condition variable for waiting for an available connection
    @condition = @mutex.new_cond
  end

  def wait_mutex(start_time)
    return @condition.wait unless @timeout
    delta = @timeout - (Time.now - start_time)
    raise @timeout_class if delta <= 0.0
    @condition.wait(delta)
    delta = @timeout - (Time.now - start_time)
    raise @timeout_class if delta <= 0.0
  end
end
