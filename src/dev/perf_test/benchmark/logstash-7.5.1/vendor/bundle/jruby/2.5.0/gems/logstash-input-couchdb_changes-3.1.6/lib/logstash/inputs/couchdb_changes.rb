# encoding: utf-8

require "logstash/inputs/base"
require "logstash/namespace"
require "net/http"
require "uri"

# This CouchDB input allows you to automatically stream events from the
# CouchDB http://guide.couchdb.org/draft/notifications.html[_changes] URI.
# Moreover, any "future" changes will automatically be streamed as well making it easy to synchronize
# your CouchDB data with any target destination
#
# ### Upsert and delete
# You can use event metadata to allow for document deletion.
# All non-delete operations are treated as upserts
#
# ### Starting at a Specific Sequence
# The CouchDB input stores the last sequence number value in location defined by `sequence_path`.
# You can use this fact to start or resume the stream at a particular sequence.
class LogStash::Inputs::CouchDBChanges < LogStash::Inputs::Base
  config_name "couchdb_changes"

  # IP or hostname of your CouchDB instance
  config :host, :validate => :string, :default => "localhost"

  # Port of your CouchDB instance.
  config :port, :validate => :number, :default => 5984

  # The CouchDB db to connect to.
  # Required parameter.
  config :db, :validate => :string, :required => true

  # Connect to CouchDB's _changes feed securely (via https)
  # Default: false (via http)
  config :secure, :validate => :boolean, :default => false

  # Path to a CA certificate file, used to validate certificates
  config :ca_file, :validate => :path

  # Username, if authentication is needed to connect to
  # CouchDB
  config :username, :validate => :string, :default => nil

  # Password, if authentication is needed to connect to
  # CouchDB
  config :password, :validate => :password, :default => nil

  # Logstash connects to CouchDB's _changes with feed=continuous
  # The heartbeat is how often (in milliseconds) Logstash will ping
  # CouchDB to ensure the connection is maintained.  Changing this
  # setting is not recommended unless you know what you are doing.
  config :heartbeat, :validate => :number, :default => 1000

  # File path where the last sequence number in the _changes
  # stream is stored. If unset it will write to `$HOME/.couchdb_seq`
  config :sequence_path, :validate => :string

  # If unspecified, Logstash will attempt to read the last sequence number
  # from the `sequence_path` file.  If that is empty or non-existent, it will
  # begin with 0 (the beginning).
  #
  # If you specify this value, it is anticipated that you will
  # only be doing so for an initial read under special circumstances
  # and that you will unset this value afterwards.
  config :initial_sequence, :validate => :number

  # Preserve the CouchDB document id "_id" value in the
  # output.
  config :keep_id, :validate => :boolean, :default => false

  # Preserve the CouchDB document revision "_rev" value in the
  # output.
  config :keep_revision, :validate => :boolean, :default => false

  # Future feature! Until implemented, changing this from the default
  # will not do anything.
  #
  # Ignore attachments associated with CouchDB documents.
  config :ignore_attachments, :validate => :boolean, :default => true

  # Reconnect flag.  When true, always try to reconnect after a failure
  config :always_reconnect, :validate => :boolean, :default => true

  # Reconnect delay: time between reconnect attempts, in seconds.
  config :reconnect_delay, :validate => :number, :default => 10

  # Timeout: Number of milliseconds to wait for new data before
  # terminating the connection.  If a timeout is set it will disable
  # the heartbeat configuration option.
  config :timeout, :validate => :number

  # Declare these constants here.
  FEED          = 'continuous'
  INCLUDEDOCS   = 'true'

  public
  def register
    require "logstash/util/buftok"
    if @sequence_path.nil?
      if ENV["HOME"].nil?
        @logger.error("No HOME environment variable set, I don't know where " \
                      "to keep track of the files I'm watching. Either set " \
                      "HOME in your environment, or set sequence_path in " \
                      "in your Logstash config.")
        raise ArgumentError
      end
      default_dir = ENV["HOME"]
      @sequence_path = File.join(default_dir, ".couchdb_seq")

      @logger.info("No sequence_path set, generating one...",
                   :sequence_path => @sequence_path)
    end

    @sequencedb   = SequenceDB::File.new(@sequence_path)
    @path         = '/' + @db + '/_changes'

    @scheme = @secure ? 'https' : 'http'

    if !@initial_sequence.nil?
      @logger.info("initial_sequence is set, writing to filesystem ...",
                   :initial_sequence => @initial_sequence, :sequence_path => @sequence_path)
      @sequencedb.write(@initial_sequence)
      @sequence = @initial_sequence
    else
      @logger.info("No initial_sequence set, reading from filesystem ...",
                   :sequence_path => @sequence_path)
      @sequence = @sequencedb.read
    end

  end

  module SequenceDB
    class File
      def initialize(file)
        @sequence_path = file
      end

      def read
        ::File.exists?(@sequence_path) ? ::File.read(@sequence_path).chomp.strip : 0
      end

      def write(sequence = nil)
        sequence = 0 if sequence.nil?
        ::File.write(@sequence_path, sequence.to_s)
      end
    end
  end

  public
  def run(queue)
    buffer = FileWatch::BufferedTokenizer.new
    @logger.info("Connecting to CouchDB _changes stream at:", :host => @host.to_s, :port => @port.to_s, :db => @db)
    uri = build_uri
    @logger.info("Using service uri :", :uri => uri)
    until stop?
      begin
        Net::HTTP.start(@host, @port, :use_ssl => (@secure == true), :ca_file => @ca_file) do |http|

          request = Net::HTTP::Get.new(uri.request_uri)
          request.basic_auth(@username, @password.value) if @username && @password
          http.request request do |response|
            raise ArgumentError, :message => "Server error!", :response_code => response.code if response.code >= "500"
            raise ArgumentError, :message => "Authentication error!", :response_code => response.code if response.code == "401"
            raise ArgumentError, :message => "Database not found!", :response_code => response.code if response.code == "404"
            raise ArgumentError, :message => "Request error!", :response_code => response.code if response.code >= "400"
            response.read_body do |chunk|
              buffer.extract(chunk).each do |changes|
                # Put a "stop" check here. If we stop here, anything we've read, but
                # not written, will be read again since the @sequence change won't
                # have been written to the file, ensuring that it will pick up where
                # it left off.
                break if stop?
                # If no changes come since the last heartbeat period, a blank line is
                # sent as a sort of keep-alive.  We should ignore those.
                next if changes.chomp.empty?
                if event = build_event(changes)
                  @logger.debug("event", :event => event.to_hash_with_metadata) if @logger.debug?
                  decorate(event)
                  queue << event
                  @sequence = event.get("[@metadata][seq]")
                  @sequencedb.write(@sequence.to_s)
                end
              end
            end
          end
        end
      rescue Timeout::Error, Errno::EINVAL, Errno::ECONNRESET, EOFError, Errno::EHOSTUNREACH, Errno::ECONNREFUSED,
        Net::HTTPBadResponse, Net::HTTPHeaderSyntaxError, Net::ProtocolError, SocketError => e
        @logger.error("Connection problem encountered: Retrying connection in " + @reconnect_delay.to_s + " seconds...", :error => e.to_s, :host => @host.to_s, :port => @port.to_s, :db => @db)
        retry if reconnect?
      rescue Errno::EBADF => e
        @logger.error("Unable to connect: Bad file descriptor: ", :error => e.to_s)
        retry if reconnect?
      rescue ArgumentError => e
        @logger.error("Unable to connect to database", :db => @db, :error => e.to_s)
        retry if reconnect?
      end
    end
  end

  private
  def build_uri
    options = {:feed => FEED, :include_docs => INCLUDEDOCS, :since => @sequence}
    options = options.merge(@timeout ? {:timeout => @timeout} : {:heartbeat => @heartbeat})
    URI::HTTP.build(:scheme => @scheme, :host => @host, :port => @port, :path => @path, :query => URI.encode_www_form(options))
  end

  private
  def reconnect?
    Stud.stoppable_sleep(@reconnect_delay) if @always_reconnect
    @always_reconnect
  end

  private
  def build_event(changes)
    # In lieu of a codec, build the event here
    data = LogStash::Json.load(changes)
    return nil if data.has_key?("last_seq")
    if data['doc'].nil?
      logger.debug("doc is nil", :data => data)
      return nil
    end
    hash = Hash.new
    hash['@metadata'] = { '_id' => data['doc']['_id'] }
    if data['doc']['_deleted']
      hash['@metadata']['action'] = 'delete'
    else
      hash['doc'] = data['doc']
      hash['@metadata']['action'] = 'update'
      hash['doc'].delete('_id') unless @keep_id
      hash['doc_as_upsert'] = true
      hash['doc'].delete('_rev') unless @keep_revision
    end
    hash['@metadata']['seq'] = data['seq']
    event = LogStash::Event.new(hash)
    @logger.debug("event", :event => event.to_hash_with_metadata) if @logger.debug?
    event
  end
end
