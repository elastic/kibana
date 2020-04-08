# encoding utf-8
require "date"
require "logstash/codecs/base"
require "logstash/namespace"
require "logstash/errors"
require "tempfile"
require "time"

import "javax.crypto.Mac"

class ProtocolError < LogStash::Error; end
class HeaderError < LogStash::Error; end
class EncryptionError < LogStash::Error; end
class NaNError < LogStash::Error; end

# Read events from the collectd binary protocol over the network via udp.
# See https://collectd.org/wiki/index.php/Binary_protocol
#
# Configuration in your Logstash configuration file can be as simple as:
# [source,ruby]
#     input {
#       udp {
#         port => 25826
#         buffer_size => 1452
#         codec => collectd { }
#       }
#     }
#
# A sample `collectd.conf` to send to Logstash might be:
# [source,xml]
#     Hostname    "host.example.com"
#     LoadPlugin interface
#     LoadPlugin load
#     LoadPlugin memory
#     LoadPlugin network
#     <Plugin interface>
#         Interface "eth0"
#         IgnoreSelected false
#     </Plugin>
#     <Plugin network>
#         <Server "10.0.0.1" "25826">
#         </Server>
#     </Plugin>
#
# Be sure to replace `10.0.0.1` with the IP of your Logstash instance.
#
class LogStash::Codecs::Collectd < LogStash::Codecs::Base
  config_name "collectd"

  @@openssl_mutex = Mutex.new

  AUTHFILEREGEX = /([^:]+): (.+)/

  PLUGIN_TYPE = 2
  COLLECTD_TYPE = 4
  COLLECTD_VALUES = 6
  SIGNATURE_TYPE = 512
  ENCRYPTION_TYPE = 528

  TYPEMAP = {
    0               => "host",
    1               => "@timestamp",
    PLUGIN_TYPE     => "plugin",
    3               => "plugin_instance",
    COLLECTD_TYPE   => "collectd_type",
    5               => "type_instance",
    COLLECTD_VALUES => "values",
    7               => "interval",
    8               => "@timestamp",
    9               => "interval",
    256             => "message",
    257             => "severity",
    SIGNATURE_TYPE  => "signature",
    ENCRYPTION_TYPE => "encryption"
  }

  INTERVAL_VALUES_FIELDS = {
    "interval" => true,
    "values" => true,
    "message" => true,
  }

  INTERVAL_BASE_FIELDS = {
    'host' => true,
    '@timestamp' => true,
    'plugin' => true,
    'plugin_instance' => true,
    'collectd_type' => true,
    'type_instance' => true,
  }

  INTERVAL_TYPES = {
    7 => true,
    9 => true,
  }

  SECURITY_NONE = "None"
  SECURITY_SIGN = "Sign"
  SECURITY_ENCR = "Encrypt"

  # File path(s) to collectd `types.db` to use.
  # The last matching pattern wins if you have identical pattern names in multiple files.
  # If no types.db is provided the included `types.db` will be used (currently 5.4.0).
  config :typesdb, :validate => :array

  # Prune interval records.  Defaults to `true`.
  config :prune_intervals, :validate => :boolean, :default => true

  # Security Level. Default is `None`. This setting mirrors the setting from the
  # collectd https://collectd.org/wiki/index.php/Plugin:Network[Network plugin]
  config :security_level, :validate => [SECURITY_NONE, SECURITY_SIGN, SECURITY_ENCR],
    :default => "None"

  # What to do when a value in the event is `NaN` (Not a Number)
  #
  # - change_value (default): Change the `NaN` to the value of the nan_value option and add `nan_tag` as a tag
  # - warn: Change the `NaN` to the value of the nan_value option, print a warning to the log and add `nan_tag` as a tag
  # - drop: Drop the event containing the `NaN` (this only drops the single event, not the whole packet)
  config :nan_handling, :validate => ['change_value','warn','drop'], :default => 'change_value'

  # Only relevant when `nan_handeling` is set to `change_value`
  # Change NaN to this configured value
  config :nan_value, :validate => :number, :default => 0

  # The tag to add to the event if a `NaN` value was found
  # Set this to an empty string ('') if you don't want to tag
  config :nan_tag, :validate => :string, :default => '_collectdNaN'

  # Path to the authentication file. This file should have the same format as
  # the http://collectd.org/documentation/manpages/collectd.conf.5.shtml#authfile_filename[AuthFile]
  # in collectd. You only need to set this option if the `security_level` is set to
  # `Sign` or `Encrypt`
  config :authfile, :validate => :string

  public
  def register
    @logger.trace("Starting Collectd codec...")
    init_lambdas!
    if @typesdb.nil?
      @typesdb = ::File.expand_path('../../../vendor/types.db', ::File.dirname(__FILE__))
      if !File.exists?(@typesdb)
        raise "You must specify 'typesdb => ...' in your collectd input (I looked for '#{@typesdb}')"
      end
      @logger.debug("Using types.db", :typesdb => @typesdb.to_s)
    end
    @types = get_types(@typesdb)

    if ([SECURITY_SIGN, SECURITY_ENCR].include?(@security_level))
      if @authfile.nil?
        raise "Security level is set to #{@security_level}, but no authfile was configured"
      else
        # Load Digest and instantiate functions
        require 'digest'
        @sha256 = Digest::SHA256.new
        @sha1 = Digest::SHA1.new

        # Load OpenSSL and instantiate functions
        require 'openssl'
        @cipher = OpenSSL::Cipher.new('AES-256-OFB')

        @auth = {}
        parse_authfile
      end
    end
  end # def register

  public
  def get_types(paths)
    types = {}
    # Get the typesdb
    paths = Array(paths) # Make sure a single path is still forced into an array type
    paths.each do |path|
      @logger.debug("Getting Collectd typesdb info", :typesdb => path.to_s)
      File.open(path, 'r').each_line do |line|
        typename, *line = line.strip.split
        @logger.debug("typename", :typename => typename.to_s)
        next if typename.nil? || typename[0,1] == '#'
        types[typename] = line.collect { |l| l.strip.split(":")[0] }
      end
    end
    @logger.debug("Collectd Types", :types => types.to_s)
    return types
  end # def get_types

  def init_lambdas!
    # Lambdas for hash + closure methodology
    # This replaces when statements for fixed values and is much faster
    string_decoder  = lambda { |body| body.pack("C*")[0..-2] }
    numeric_decoder = lambda { |body| body.slice!(0..7).pack("C*").unpack("E")[0] }
    counter_decoder = lambda { |body| body.slice!(0..7).pack("C*").unpack("Q>")[0] }
    gauge_decoder   = lambda { |body| body.slice!(0..7).pack("C*").unpack("E")[0] }
    derive_decoder  = lambda { |body| body.slice!(0..7).pack("C*").unpack("q>")[0] }
    # For Low-Resolution time
    time_decoder = lambda do |body|
      byte1, byte2 = body.pack("C*").unpack("NN")
      Time.at(( ((byte1 << 32) + byte2))).utc
    end
    # Hi-Resolution time
    hirestime_decoder = lambda do |body|
      byte1, byte2 = body.pack("C*").unpack("NN")
      Time.at(( ((byte1 << 32) + byte2) * (2**-30) )).utc
    end
    # Hi-Resolution intervals
    hiresinterval_decoder = lambda do |body|
      byte1, byte2 = body.pack("C*").unpack("NN")
      Time.at(( ((byte1 << 32) + byte2) * (2**-30) )).to_i
    end
    # Value type decoder
    value_type_decoder = lambda do |body|
      body.slice!(0..1)       # Prune the header
      if body.length % 9 == 0 # Should be 9 fields
        count = 0
        retval = []
        # Iterate through and take a slice each time
        types = body.slice!(0..((body.length/9)-1))
        while body.length > 0
          # Use another hash + closure here...
          v = @values_decoder[types[count]].call(body)
          if types[count] == 1 && v.nan?
            case @nan_handling
            when 'drop'; drop = true
            else
              v = @nan_value
              add_nan_tag = true
              @nan_handling == 'warn' && @logger.warn("NaN replaced by #{@nan_value}")
            end
          end
          retval << v
          count += 1
        end
      else
        @logger.error("Incorrect number of data fields for collectd record", :body => body.to_s)
      end
      return retval, drop, add_nan_tag
    end
    # Signature
    signature_decoder = lambda do |body|
      if body.length < 32
        @logger.warning("SHA256 signature too small (got #{body.length} bytes instead of 32)")
      elsif body.length < 33
        @logger.warning("Received signature without username")
      else
        retval = []
        # Byte 32 till the end contains the username as chars (=unsigned ints)
        retval << body[32..-1].pack('C*')
        # Byte 0 till 31 contain the signature
        retval << body[0..31].pack('C*')
      end
      return retval
    end
    # Encryption
    encryption_decoder = lambda do |body|
      retval = []
      user_length = (body.slice!(0) << 8) + body.slice!(0)
      retval << body.slice!(0..user_length-1).pack('C*') # Username
      retval << body.slice!(0..15).pack('C*')            # IV
      retval << body.pack('C*')
      return retval
    end
    @id_decoder = {
      0 => string_decoder,
      1 => time_decoder,
      2 => string_decoder,
      3 => string_decoder,
      4 => string_decoder,
      5 => string_decoder,
      6 => value_type_decoder,
      7 => numeric_decoder,
      8 => hirestime_decoder,
      9 => hiresinterval_decoder,
      256 => string_decoder,
      257 => counter_decoder,
      512 => signature_decoder,
      528 => encryption_decoder
    }
    # TYPE VALUES:
    # 0: COUNTER
    # 1: GAUGE
    # 2: DERIVE
    # 3: ABSOLUTE
    @values_decoder = {
      0 => counter_decoder,
      1 => gauge_decoder,
      2 => derive_decoder,
      3 => counter_decoder
    }
  end # def init_lambdas!

  public
  def get_values(id, body)
    drop = false
    add_tag = false
    if id == COLLECTD_VALUES
      retval, drop, add_nan_tag = @id_decoder[id].call(body)
    # Use hash + closure/lambda to speed operations
    else
      retval = @id_decoder[id].call(body)
    end
    return retval, drop, add_nan_tag
  end

  private
  def parse_authfile
    # We keep the authfile parsed in memory so we don't have to open the file
    # for every event.
    @logger.debug("Parsing authfile #{@authfile}")
    if !File.exist?(@authfile)
      raise LogStash::ConfigurationError, "The file #{@authfile} was not found"
    end
    @auth.clear
    @authmtime = File.stat(@authfile).mtime
    File.readlines(@authfile).each do |line|
      #line.chomp!
      k,v = line.scan(AUTHFILEREGEX).flatten
      if k && v
        @logger.debug("Added authfile entry '#{k}' with key '#{v}'")
        @auth[k] = v
      else
        @logger.info("Ignoring malformed authfile line '#{line.chomp}'")
      end
    end
  end # def parse_authfile

  private
  def get_key(user)
    return if @authmtime.nil? or @authfile.nil?
    # Validate that our auth data is still up-to-date
    parse_authfile if @authmtime < File.stat(@authfile).mtime
    key = @auth[user]
    @logger.warn("User #{user} is not found in the authfile #{@authfile}") if key.nil?
    return key
  end # def get_key

  private
  def verify_signature(user, signature, payload)
    # The user doesn't care about the security
    return true if @security_level == SECURITY_NONE

    # We probably got and array of ints, pack it!
    payload = payload.pack('C*') if payload.is_a?(Array)

    key = get_key(user)
    return false if key.nil?
    return digest(user, payload, key) == signature
  end # def verify_signature

  private
  def digest_ruby19(user, payload, key)
    Digest::HMAC.digest(user+payload, key , Digest::SHA256)
  end

  private
  def digest_ruby20(user, payload, key)
    OpenSSL::HMAC.digest(OpenSSL::Digest.new("sha256"), key, user+payload)
  end

  def self.ruby_19?
    RUBY_VERSION == "1.9.3"
  end

  if ruby_19?
    alias_method :digest, :digest_ruby19
  else
    alias_method :digest, :digest_ruby20
  end

  private
  def decrypt_packet(user, iv, content)
    # Content has to have at least a SHA1 hash (20 bytes), a header (4 bytes) and
    # one byte of data
    return [] if content.length < 26
    content = content.pack('C*') if content.is_a?(Array)
    key = get_key(user)
    if key.nil?
      @logger.debug("Key was nil")
      return []
    end

    # Coordinate access to OpenSSL::Cipher as it is not thread safe
    plaintext = nil
    @@openssl_mutex.synchronize do
      # Set the correct state of the cipher instance
      @cipher.decrypt
      @cipher.padding = 0
      @cipher.iv = iv
      @cipher.key = @sha256.digest(key)
      # Decrypt the content
      plaintext = @cipher.update(content) + @cipher.final
      # Reset the state, as adding a new key to an already instantiated state
      # results in an exception
      @cipher.reset
    end

    # The plaintext contains a SHA1 hash as checksum in the first 160 bits
    # (20 octets) of the rest of the data
    hash = plaintext.slice!(0..19)

    if @sha1.digest(plaintext) != hash
      @logger.warn("Unable to decrypt packet, checksum mismatch")
      return []
    end
    return plaintext.unpack('C*')
  end # def decrypt_packet

  public
  def decode(payload)
    payload = payload.bytes.to_a

    collectd = {}
    was_encrypted = false

    while payload.length > 0 do
      typenum = (payload.slice!(0) << 8) + payload.slice!(0)
      # Get the length of the data in this part, but take into account that
      # the header is 4 bytes
      length  = ((payload.slice!(0) << 8) + payload.slice!(0)) - 4
      # Validate that the part length is correct
      raise(HeaderError) if length > payload.length

      body = payload.slice!(0..length-1)

      field = TYPEMAP[typenum]
      if field.nil?
        @logger.warn("Unknown typenumber: #{typenum}")
        next
      end

      values, drop, add_nan_tag = get_values(typenum, body)

      case typenum
      when SIGNATURE_TYPE
        raise(EncryptionError) unless verify_signature(values[0], values[1], payload)
        next
      when ENCRYPTION_TYPE
        payload = decrypt_packet(values[0], values[1], values[2])
        raise(EncryptionError) if payload.empty?
        was_encrypted = true
        next
      end

      raise(EncryptionError) if !was_encrypted and @security_level == SECURITY_ENCR

      # Fill in the fields.
      if values.is_a?(Array)
        if values.length > 1              # Only do this iteration on multi-value arrays
          values.each_with_index do |value, x|
            begin
              type = collectd['collectd_type']
              key = @types[type]
              key_x = key[x]
              # assign
              collectd[key_x] = value
            rescue
              @logger.error("Invalid value for type=#{type.inspect}, key=#{@types[type].inspect}, index=#{x}")
            end
          end
        else                              # Otherwise it's a single value
          collectd['value'] = values[0]      # So name it 'value' accordingly
        end
      elsif field != nil                  # Not an array, make sure it's non-empty
        collectd[field] = values            # Append values to collectd under key field
      end

      if INTERVAL_VALUES_FIELDS.has_key?(field)
        if ((@prune_intervals && !INTERVAL_TYPES.has_key?(typenum)) || !@prune_intervals)
          # Prune these *specific* keys if they exist and are empty.
          # This is better than looping over all keys every time.
          collectd.delete('type_instance') if collectd['type_instance'] == ""
          collectd.delete('plugin_instance') if collectd['plugin_instance'] == ""
          if add_nan_tag
            collectd['tags'] ||= []
            collectd['tags'] << @nan_tag
          end
          # This ugly little shallow-copy hack keeps the new event from getting munged by the cleanup
          # With pass-by-reference we get hosed (if we pass collectd, then clean it up rapidly, values can disappear)
          if !drop # Drop the event if it's flagged true
            yield LogStash::Event.new(collectd.dup)
          else
            raise(NaNError)
          end
        end
        # Clean up the event
        collectd.each_key do |k|
          collectd.delete(k) if !INTERVAL_BASE_FIELDS.has_key?(k)
        end
      end
    end # while payload.length > 0 do
  rescue EncryptionError, ProtocolError, HeaderError, NaNError
    # basically do nothing, we just want out
  end # def decode

end # class LogStash::Codecs::Collectd
