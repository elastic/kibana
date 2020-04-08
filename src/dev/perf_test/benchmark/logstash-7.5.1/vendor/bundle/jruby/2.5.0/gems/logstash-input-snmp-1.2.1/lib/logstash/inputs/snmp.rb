# encoding: utf-8
require "logstash/inputs/base"
require "logstash/namespace"
require "stud/interval"
require "socket" # for Socket.gethostname
require_relative "snmp/client"
require_relative "snmp/clientv3"
require_relative "snmp/mib"

# Generate a repeating message.
#
# This plugin is intented only as an example.

class LogStash::Inputs::Snmp < LogStash::Inputs::Base
  config_name "snmp"

  # List of OIDs for which we want to retrieve the scalar value
  config :get,:validate => :array # ["1.3.6.1.2.1.1.1.0"]

  # List of OIDs for which we want to retrieve the subtree of information
  config :walk,:validate => :array # ["1.3.6.1.2.1.1.1.0"]

  # List of tables to walk
  config :tables, :validate => :array  #[ {"name" => "interfaces" "columns" => ["1.3.6.1.2.1.2.2.1.1", "1.3.6.1.2.1.2.2.1.2", "1.3.6.1.2.1.2.2.1.5"]} ]

  # List of hosts to query the configured `get` and `walk` options.
  #
  # Each host definition is a hash and must define the `host` key and value.
  #  `host` must use the format {tcp|udp}:{ip address}/{port}
  #  for example `host => "udp:127.0.0.1/161"`
  # Each host definition can optionally include the following keys and values:
  #  `community` with a default value of `public`
  #  `version` `1`, `2c` or `3` with a default value of `2c`
  #  `retries` with a default value of `2`
  #  `timeout` in milliseconds with a default value of `1000`
  config :hosts, :validate => :array  #[ {"host" => "udp:127.0.0.1/161", "community" => "public"} ]

  # This plugin provides sets of MIBs publicly available. The full paths to these provided MIBs paths
  # Will be displayed at plugin startup.
  config :use_provided_mibs, :validate => :boolean, :default => true

  # List of paths of MIB .dic files of dirs. If a dir path is specified, all files with .dic extension will be loaded.
  #
  # ATTENTION: a MIB .dic file must be generated using the libsmi library `smidump` command line utility
  # like this for example. Here the `RFC1213-MIB.txt` file is an ASN.1 MIB file.
  #
  # `$ smidump -k -f python RFC1213-MIB.txt > RFC1213-MIB.dic`
  #
  # The OSS libsmi library https://www.ibr.cs.tu-bs.de/projects/libsmi/ is available & installable
  # on most OS.
  config :mib_paths, :validate => :array # ["path/to/mib.dic", "path/to/mib/dir"]

  # number of OID root digits to ignore in event field name. For example, in a numeric OID
  # like 1.3.6.1.2.1.1.1.0" the first 5 digits could be ignored by setting oid_root_skip => 5
  # which would result in a field name "1.1.1.0". Similarly when a MIB is used an OID such
  # as "1.3.6.1.2.mib-2.system.sysDescr.0" would become "mib-2.system.sysDescr.0"
  config :oid_root_skip, :validate => :number, :default => 0

  # number of OID tail digits to retain in event field name. For example, in a numeric OID
  # like 1.3.6.1.2.1.1.1.0" the last 2 digits could be retained by setting oid_path_length => 2
  # which would result in a field name "1.0". Similarly, when a MIB is used an OID such as
  # "1.3.6.1.2.mib-2.system.sysDescr.0" would become "sysDescr.0"
  config :oid_path_length, :validate => :number, :default => 0

  # Set polling interval in seconds
  #
  # The default, `30`, means poll each host every 30 seconds.
  config :interval, :validate => :number, :default => 30

  # Add the default "host" field to the event.
  config :add_field, :validate => :hash, :default => { "host" => "%{[@metadata][host_address]}" }

  # SNMPv3 Credentials
  #
  # A single user can be configured and will be used for all defined SNMPv3 hosts.
  # Multiple snmp input declarations will be needed if multiple SNMPv3 users are required.
  # If not using SNMPv3 simply leave options empty.

  # The SNMPv3 security name or user name
  config :security_name, :validate => :string

  # The SNMPv3 authentication protocol or type
  config :auth_protocol, :validate => ["md5", "sha", "sha2", "hmac128sha224", "hmac192sha256", "hmac256sha384", "hmac384sha512"]

  # The SNMPv3 authentication passphrase or password
  config :auth_pass, :validate => :password

  # The SNMPv3 privacy/encryption protocol
  config :priv_protocol, :validate => ["des", "3des", "aes", "aes128", "aes192", "aes256"]

  # The SNMPv3 encryption password
  config :priv_pass, :validate => :password

  # The SNMPv3 security level can be Authentication, No Privacy; Authentication, Privacy; or no Authentication, no Privacy
  config :security_level, :validate => ["noAuthNoPriv", "authNoPriv", "authPriv"]

  BASE_MIB_PATH = ::File.join(__FILE__, "..", "..", "..", "mibs")
  PROVIDED_MIB_PATHS = [::File.join(BASE_MIB_PATH, "logstash"), ::File.join(BASE_MIB_PATH, "ietf")].map { |path| ::File.expand_path(path) }

  def register
    validate_oids!
    validate_hosts!
    validate_tables!
    validate_strip!

    mib = LogStash::SnmpMib.new

    if @use_provided_mibs
      PROVIDED_MIB_PATHS.each do |path|
        logger.info("using plugin provided MIB path #{path}")
        mib.add_mib_path(path)
      end
    end

    Array(@mib_paths).each do |path|
      logger.info("using user provided MIB path #{path}")
      mib.add_mib_path(path)
    end

    # setup client definitions per provided host

    @client_definitions = []
    @hosts.each do |host|
      host_name = host["host"]
      community = host["community"] || "public"
      version = host["version"] || "2c"
      raise(LogStash::ConfigurationError, "only protocol version '1', '2c' and '3' are supported for host option '#{host_name}'") unless version =~ VERSION_REGEX

      retries = host["retries"] || 2
      timeout = host["timeout"] || 1000

      # TODO: move these validations in a custom validator so it happens before the register method is called.
      host_details = host_name.match(HOST_REGEX)
      raise(LogStash::ConfigurationError, "invalid format for host option '#{host_name}'") unless host_details
      raise(LogStash::ConfigurationError, "only udp & tcp protocols are supported for host option '#{host_name}'") unless host_details[:host_protocol].to_s =~ /^(?:udp|tcp)$/i

      protocol = host_details[:host_protocol]
      address = host_details[:host_address]
      port = host_details[:host_port]

      definition = {
        :get => Array(get),
        :walk => Array(walk),

        :host_protocol => protocol,
        :host_address => address,
        :host_port => port,
        :host_community => community,
      }

      if version == "3"
        validate_v3_user! # don't really care if verified for every host
        auth_pass = @auth_pass.nil? ? nil : @auth_pass.value
        priv_pass = @priv_pass.nil? ? nil : @priv_pass.value
        definition[:client] = LogStash::SnmpClientV3.new(protocol, address, port, retries, timeout, mib, @security_name, @auth_protocol, auth_pass, @priv_protocol, priv_pass, @security_level)
      else
        definition[:client] = LogStash::SnmpClient.new(protocol, address, port, community, version, retries, timeout, mib)
      end
      @client_definitions << definition
    end
  end

  def run(queue)
    # for now a naive single threaded poller which sleeps for the given interval between
    # each run. each run polls all the defined hosts for the get and walk options.
    while !stop?
      @client_definitions.each do |definition|
        result = {}
        if !definition[:get].empty?
          begin
            result = result.merge(definition[:client].get(definition[:get], @oid_root_skip, @oid_path_length))
          rescue => e
            logger.error("error invoking get operation on #{definition[:host_address]} for OIDs: #{definition[:get]}, ignoring", :exception => e, :backtrace => e.backtrace)
          end
        end
        if  !definition[:walk].empty?
          definition[:walk].each do |oid|
            begin
              result = result.merge(definition[:client].walk(oid, @oid_root_skip, @oid_path_length))
            rescue => e
              logger.error("error invoking walk operation on OID: #{oid}, ignoring", :exception => e, :backtrace => e.backtrace)
            end
          end
        end

        if  !Array(@tables).empty?
          @tables.each do |table_entry|
            begin
              result = result.merge(definition[:client].table(table_entry, @oid_root_skip, @oid_path_length))
            rescue => e
              logger.error("error invoking table operation on OID: #{table_entry['name']}, ignoring", :exception => e, :backtrace => e.backtrace)
            end
          end
        end

        unless result.empty?
          metadata = {
            "host_protocol" => definition[:host_protocol],
            "host_address" => definition[:host_address],
            "host_port" => definition[:host_port],
            "host_community" => definition[:host_community],
          }
          result["@metadata"] = metadata

          event = LogStash::Event.new(result)
          decorate(event)
          queue << event
        end
      end

      Stud.stoppable_sleep(@interval) { stop? }
    end
  end

  def stop
  end

  private

  OID_REGEX = /^\.?([0-9\.]+)$/
  HOST_REGEX = /^(?<host_protocol>udp|tcp):(?<host_address>.+)\/(?<host_port>\d+)$/i
  VERSION_REGEX =/^1|2c|3$/

  def validate_oids!
    @get = Array(@get).map do |oid|
      # verify oids for valid pattern and get rid or any leading dot if present
      unless oid =~ OID_REGEX
        raise(LogStash::ConfigurationError, "The get option oid '#{oid}' has an invalid format")
      end
      $1
    end

    @walk = Array(@walk).map do |oid|
      # verify oids for valid pattern and get rid or any leading dot if present
      unless oid =~ OID_REGEX
        raise(LogStash::ConfigurationError, "The walk option oid '#{oid}' has an invalid format")
      end
      $1
    end

    if !@tables.nil?
      @tables.each do |table_entry|
      # Verify oids for valid pattern and get rid of any leading dot if present
        columns = table_entry["columns"]
        columns.each do |column|
          unless column =~ OID_REGEX
      	    raise(Logstash::ConfigurationError, "The table column oid '#{column}' is an invalid format")
          end
        end
        $1
      end
    end

    raise(LogStash::ConfigurationError, "at least one get OID, one walk OID, or one table OID is required") if @get.empty? && @walk.empty? && @tables.nil?
  end

  def validate_v3_user!
    errors = []

    errors << "v3 user must have a \"security_name\" option" if @security_name.nil?
    errors << "you must specify an auth protocol if you specify an auth pass" if @auth_protocol.nil? && !@auth_pass.nil?
    errors << "you must specify an auth pass if you specify an auth protocol" if !@auth_protocol.nil? && @auth_pass.nil?
    errors << "you must specify a priv protocol if you specify a priv pass" if @priv_protocol.nil? && !@priv_pass.nil?
    errors << "you must specify a priv pass if you specify a priv protocol" if !@priv_protocol.nil? &&  @priv_pass.nil?

    raise(LogStash::ConfigurationError, errors.join(", ")) unless errors.empty?
   end


  def validate_hosts!
    # TODO: for new we only validate the host part, not the other optional options

    raise(LogStash::ConfigurationError, "at least one host definition is required") if Array(@hosts).empty?

    @hosts.each do |host|
      raise(LogStash::ConfigurationError, "each host definition must have a \"host\" option") if !host.is_a?(Hash) || host["host"].nil?
    end
  end
  
  def validate_tables!
    if !@tables.nil?
      @tables.each do |table_entry|
        raise(LogStash::ConfigurationError, "each table definition must have a \"name\" option") if !table_entry.is_a?(Hash) || table_entry["name"].nil?
      end
    end
  end

  def validate_strip!
    raise(LogStash::ConfigurationError, "you can not specify both oid_root_skip and oid_path_length") if @oid_root_skip > 0 and @oid_path_length > 0
  end
end
