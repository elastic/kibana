# encoding: utf-8
require "logstash/namespace"
require "logstash/outputs/base"
require "stud/buffer"
require "logstash/outputs/webhdfs_helper"

# This plugin sends Logstash events into files in HDFS via
# the https://hadoop.apache.org/docs/r1.0.4/webhdfs.html[webhdfs] REST API.
#
# ==== Dependencies
# This plugin has no dependency on jars from hadoop, thus reducing configuration and compatibility
# problems. It uses the webhdfs gem from Kazuki Ohta and TAGOMORI Satoshi (@see: https://github.com/kzk/webhdfs).
# Optional dependencies are zlib and snappy gem if you use the compression functionality.
#
# ==== Operational Notes
# If you get an error like:
#
#     Max write retries reached. Exception: initialize: name or service not known {:level=>:error}
#
# make sure that the hostname of your namenode is resolvable on the host running Logstash. When creating/appending
# to a file, webhdfs somtime sends a `307 TEMPORARY_REDIRECT` with the `HOSTNAME` of the machine its running on.
#
# ==== Usage
# This is an example of Logstash config:
#
# [source,ruby]
# ----------------------------------
# input {
#   ...
# }
# filter {
#   ...
# }
# output {
#   webhdfs {
#     host => "127.0.0.1"                 # (required)
#     port => 50070                       # (optional, default: 50070)
#     path => "/user/logstash/dt=%{+YYYY-MM-dd}/logstash-%{+HH}.log"  # (required)
#     user => "hue"                       # (required)
#   }
# }
# ----------------------------------

class LogStash::Outputs::WebHdfs < LogStash::Outputs::Base

  include Stud::Buffer
  include LogStash::Outputs::WebHdfsHelper

  config_name "webhdfs"

  MAGIC = "\x82SNAPPY\x0".force_encoding Encoding::ASCII_8BIT
  DEFAULT_VERSION = 1
  MINIMUM_COMPATIBLE_VERSION = 1

  # The server name for webhdfs/httpfs connections.
  config :host, :validate => :string, :required => true

  # The server port for webhdfs/httpfs connections.
  config :port, :validate => :number, :default => 50070

  # Standby namenode for ha hdfs.
  config :standby_host, :validate => :string, :default => false

  # Standby namenode port for ha hdfs.
  config :standby_port, :validate => :number, :default => 50070

  # The Username for webhdfs.
  config :user, :validate => :string, :required => true

  # The path to the file to write to. Event fields can be used here,
  # as well as date fields in the joda time format, e.g.:
  # `/user/logstash/dt=%{+YYYY-MM-dd}/%{@source_host}-%{+HH}.log`
  config :path, :validate => :string, :required => true

  # Sending data to webhdfs in x seconds intervals.
  config :idle_flush_time, :validate => :number, :default => 1

  # Sending data to webhdfs if event count is above, even if `store_interval_in_secs` is not reached.
  config :flush_size, :validate => :number, :default => 500

  # WebHdfs open timeout, default 30s.
  config :open_timeout, :validate => :number, :default => 30

  # The WebHdfs read timeout, default 30s.
  config :read_timeout, :validate => :number, :default => 30

  # Use httpfs mode if set to true, else webhdfs.
  config :use_httpfs, :validate => :boolean, :default => false

  # Avoid appending to same file in multiple threads.
  # This solves some problems with multiple logstash output threads and locked file leases in webhdfs.
  # If this option is set to true, %{[@metadata][thread_id]} needs to be used in path config settting.
  config :single_file_per_thread, :validate => :boolean, :default => false

  # Retry some known webhdfs errors. These may be caused by race conditions when appending to same file, etc.
  config :retry_known_errors, :validate => :boolean, :default => true

  # How long should we wait between retries.
  config :retry_interval, :validate => :number, :default => 0.5

  # How many times should we retry. If retry_times is exceeded, an error will be logged and the event will be discarded.
  config :retry_times, :validate => :number, :default => 5

  # Compress output. One of ['none', 'snappy', 'gzip']
  config :compression, :validate => ["none", "snappy", "gzip"], :default => "none"

  # Set snappy chunksize. Only neccessary for stream format. Defaults to 32k. Max is 65536
  # @see http://code.google.com/p/snappy/source/browse/trunk/framing_format.txt
  config :snappy_bufsize, :validate => :number, :default => 32768

  # Set snappy format. One of "stream", "file". Set to stream to be hive compatible.
  config :snappy_format, :validate => ["stream", "file"], :default => "stream"

  # Set kerberos authentication.
  config :use_kerberos_auth, :validate => :boolean, :default => false

  # Set kerberos keytab file. Note that the gssapi library needs to be available to use this.
  config :kerberos_keytab, :validate => :string

  # Set ssl authentication. Note that the openssl library needs to be available to use this.
  config :use_ssl_auth, :validate => :boolean, :default => false

  # Set ssl key file.
  config :ssl_key, :validate => :string

  # Set ssl cert file.
  config :ssl_cert, :validate => :string

  ## Set codec.
  default :codec, 'line'

  public

  def register
    load_module('webhdfs')
    if @compression == "gzip"
      load_module('zlib')
    elsif @compression == "snappy"
      load_module('snappy')
    end
    @main_namenode_failed = false
    @standby_client = false
    @files = {}
    # Create and test standby client if configured.
    if @standby_host
      @standby_client = prepare_client(@standby_host, @standby_port, @user)
      begin
        test_client(@standby_client)
      rescue => e
        logger.warn("Could not connect to standby namenode #{@standby_client.host}. Error: #{e.message}. Trying main webhdfs namenode.")
      end
    end
    @client = prepare_client(@host, @port, @user)
    begin
      test_client(@client)
    rescue => e
      # If no standy host is configured, we need to exit here.
      if not @standby_host
        raise
      else
        # If a standby host is configured, try this before giving up.
        logger.error("Could not connect to #{@client.host}:#{@client.port}. Error: #{e.message}")
        do_failover
      end
    end
    # Make sure @path contains %{[@metadata][thread_id]} format value if @single_file_per_thread is set to true.
    if @single_file_per_thread and !@path.include? "%{[@metadata][thread_id]}"
      @logger.error("Please set %{[@metadata][thread_id]} format value in @path if @single_file_per_thread is active.")
      raise LogStash::ConfigurationError
    end
    buffer_initialize(
      :max_items => @flush_size,
      :max_interval => @idle_flush_time,
      :logger => @logger
    )
    @codec.on_event do |event, encoded_event|
      encoded_event
    end
  end # def register

  def receive(event)
    buffer_receive(event)
  end # def receive

  def flush(events=nil, close=false)
    return if not events
    newline = "\n"
    output_files = Hash.new { |hash, key| hash[key] = "" }
    events.collect do |event|
      # Add thread_id to event metadata to be used as format value in path configuration.
      if @single_file_per_thread
        event.set("[@metadata][thread_id]", Thread.current.object_id.to_s)
      end
      path = event.sprintf(@path)
      event_as_string = @codec.encode(event)
      event_as_string += newline unless event_as_string.end_with? newline
      output_files[path] << event_as_string
    end
    output_files.each do |path, output|
      if @compression == "gzip"
        path += ".gz"
        output = compress_gzip(output)
      elsif @compression == "snappy"
        path += ".snappy"
        if @snappy_format == "file"
          output = compress_snappy_file(output)
        elsif
          output = compress_snappy_stream(output)
        end
      end
      write_data(path, output)
    end
  end

  def write_data(path, data)
    # Retry max_retry times. This can solve problems like leases being hold by another process. Sadly this is no
    # KNOWN_ERROR in rubys webhdfs client.
    write_tries = 0
    begin
      # Try to append to already existing file, which will work most of the times.
      @client.append(path, data)
      # File does not exist, so create it.
    rescue WebHDFS::FileNotFoundError
      # Add snappy header if format is "file".
      if @compression == "snappy" and @snappy_format == "file"
        @client.create(path, get_snappy_header! + data)
      elsif
        @client.create(path, data)
      end
    # Handle other write errors and retry to write max. @retry_times.
    rescue => e
      # Handle StandbyException and do failover. Still we want to exit if write_tries >= @retry_times.
      if @standby_client && (e.message.match(/Failed to connect to host/) || e.message.match(/StandbyException/))
        do_failover
        write_tries += 1
        retry
      end
      if write_tries < @retry_times
        @logger.warn("webhdfs write caused an exception: #{e.message}. Maybe you should increase retry_interval or reduce number of workers. Retrying...")
        sleep(@retry_interval * write_tries)
        write_tries += 1
        retry
      else
        # Issue error after max retries.
        @logger.error("Max write retries reached. Events will be discarded. Exception: #{e.message}")
      end
    end
  end

  def do_failover
    if not @standby_client
      return
    end
    @logger.warn("Failing over from #{@client.host}:#{@client.port} to #{@standby_client.host}:#{@standby_client.port}.")
    @client, @standby_client = @standby_client, @client
  end

  def close
    buffer_flush(:final => true)
  end # def close
end # class LogStash::Outputs::WebHdfs
