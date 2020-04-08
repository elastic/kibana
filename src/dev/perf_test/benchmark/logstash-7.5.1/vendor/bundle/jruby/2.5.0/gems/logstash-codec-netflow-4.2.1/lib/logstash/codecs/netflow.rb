# encoding: utf-8
require "logstash/codecs/base"
require "logstash/namespace"
require "logstash/timestamp"
#require "logstash/json"
require "json"

# Documentation moved to docs/

class LogStash::Codecs::Netflow < LogStash::Codecs::Base
  config_name "netflow"

  # Netflow v9/v10 template cache TTL (minutes)
  config :cache_ttl, :validate => :number, :default => 4000

  # Where to save the template cache
  # This helps speed up processing when restarting logstash
  # (So you don't have to await the arrival of templates)
  # cache will save as path/netflow_templates.cache and/or path/ipfix_templates.cache
  config :cache_save_path, :validate => :path

  # Specify into what field you want the Netflow data.
  config :target, :validate => :string, :default => "netflow"

  # Only makes sense for ipfix, v9 already includes this
  # Setting to true will include the flowset_id in events
  # Allows you to work with sequences, for instance with the aggregate filter
  config :include_flowset_id, :validate => :boolean, :default => false

  # Specify which Netflow versions you will accept.
  config :versions, :validate => :array, :default => [5, 9, 10]

  # Override YAML file containing Netflow field definitions
  config :netflow_definitions, :validate => :path

  # Override YAML file containing IPFIX field definitions
  config :ipfix_definitions, :validate => :path

  NETFLOW5_FIELDS = ['version', 'flow_seq_num', 'engine_type', 'engine_id', 'sampling_algorithm', 'sampling_interval', 'flow_records']
  NETFLOW9_FIELDS = ['version', 'flow_seq_num']
  NETFLOW9_SCOPES = {
    1 => :scope_system,
    2 => :scope_interface,
    3 => :scope_line_card,
    4 => :scope_netflow_cache,
    5 => :scope_template,
  }
  IPFIX_FIELDS = ['version']
  SWITCHED = /_switched$/
  FLOWSET_ID = "flowset_id"

  def initialize(params = {})
    super(params)
    @threadsafe = true
  end

  def clone
    self
  end

  def register
    require "logstash/codecs/netflow/util"

    @netflow_templates = TemplateRegistry.new(logger, @cache_ttl, @cache_save_path && "#{@cache_save_path}/netflow_templates.cache")
    @ipfix_templates = TemplateRegistry.new(logger, @cache_ttl, @cache_save_path && "#{@cache_save_path}/ipfix_templates.cache")

    # Path to default Netflow v9 field definitions
    filename = ::File.expand_path('netflow/netflow.yaml', ::File.dirname(__FILE__))
    @netflow_fields = load_definitions(filename, @netflow_definitions)

    # Path to default IPFIX field definitions
    filename = ::File.expand_path('netflow/ipfix.yaml', ::File.dirname(__FILE__))
    @ipfix_fields = load_definitions(filename, @ipfix_definitions)
  end # def register

  def decode(payload, metadata = nil, &block)
#   BinData::trace_reading do
    header = Header.read(payload)

    unless @versions.include?(header.version)
      @logger.warn("Ignoring Netflow version v#{header.version}")
      return
    end

    if header.version == 5
      flowset = Netflow5PDU.read(payload)
      flowset.records.each do |record|
        yield(decode_netflow5(flowset, record))
      end
    elsif header.version == 9
#     BinData::trace_reading do
      flowset = Netflow9PDU.read(payload)
      flowset.records.each do |record|
        if metadata != nil
          decode_netflow9(flowset, record, metadata).each{|event| yield(event)}
        else
          decode_netflow9(flowset, record).each{|event| yield(event)}
        end
#      end
     end
    elsif header.version == 10
#     BinData::trace_reading do
      flowset = IpfixPDU.read(payload)
      flowset.records.each do |record|
        decode_ipfix(flowset, record).each { |event| yield(event) }
      end
#     end
    else
      @logger.warn("Unsupported Netflow version v#{header.version}")
    end
#   end
  rescue BinData::ValidityError, IOError => e
    @logger.warn("Invalid netflow packet received (#{e})")
  end

  private

  def decode_netflow5(flowset, record)
    event = {
      LogStash::Event::TIMESTAMP => LogStash::Timestamp.at(flowset.unix_sec.snapshot, flowset.unix_nsec.snapshot / 1000),
      @target => {}
    }

    # Copy some of the pertinent fields in the header to the event
    NETFLOW5_FIELDS.each do |f|
      event[@target][f] = flowset[f].snapshot
    end

    # Create fields in the event from each field in the flow record
    record.each_pair do |k, v|
      case k.to_s
      when SWITCHED
        # The flow record sets the first and last times to the device
        # uptime in milliseconds. Given the actual uptime is provided
        # in the flowset header along with the epoch seconds we can
        # convert these into absolute times
        millis = flowset.uptime - v
        seconds = flowset.unix_sec - (millis / 1000)
        micros = (flowset.unix_nsec / 1000) - ((millis % 1000) * 1000)
        if micros < 0
          seconds--
          micros += 1000000
        end
        event[@target][k.to_s] = LogStash::Timestamp.at(seconds, micros).to_iso8601
      else
        event[@target][k.to_s] = v.snapshot
      end
    end

    LogStash::Event.new(event)
  rescue BinData::ValidityError, IOError => e
    @logger.warn("Invalid netflow packet received (#{e})")
  end

  def decode_netflow9(flowset, record, metadata = nil)
    events = []

    # Check for block of trailing padding
    if record.flowset_length == 0
      return events
    end 

    case record.flowset_id
    when 0..1
      # Template flowset
      record.flowset_data.templates.each do |template|
        catch (:field) do
          fields = []
          template_length = 0
          # Template flowset (0) or Options template flowset (1) ?
          if record.flowset_id == 0
            @logger.debug? and @logger.debug("Start processing template")
            template.record_fields.each do |field|
              if field.field_length > 0
                entry = netflow_field_for(field.field_type, field.field_length, template.template_id)
                throw :field unless entry
                fields += entry
                template_length += field.field_length
              end
            end
          else
            @logger.debug? and @logger.debug("Start processing options template")
            template.scope_fields.each do |field|
              if field.field_length > 0
                fields << [uint_field(0, field.field_length), NETFLOW9_SCOPES[field.field_type]]
              end
              template_length += field.field_length
            end
            template.option_fields.each do |field|
              entry = netflow_field_for(field.field_type, field.field_length, template.template_id)
              throw :field unless entry
              fields += entry
              template_length += field.field_length
            end
          end
          # We get this far, we have a list of fields
          #key = "#{flowset.source_id}|#{event["source"]}|#{template.template_id}"
          if metadata != nil
            key = "#{flowset.source_id}|#{template.template_id}|#{metadata["host"]}|#{metadata["port"]}"
          else
            key = "#{flowset.source_id}|#{template.template_id}"
          end
          @netflow_templates.register(key, fields) do |bindata|
            @logger.debug("Received template #{template.template_id} with fields #{fields.inspect}")
            @logger.debug("Received template #{template.template_id} of size #{template_length} bytes. Representing in #{bindata.num_bytes} BinData bytes")
            if template_length != bindata.num_bytes
              @logger.warn("Received template #{template.template_id} of size #{template_length} bytes doesn't match BinData representation we built (#{bindata.num_bytes} bytes)")
            end
          end
        end
      end
    when 256..65535
      # Data flowset
      #key = "#{flowset.source_id}|#{event["source"]}|#{record.flowset_id}"
      @logger.debug? and @logger.debug("Start processing data flowset #{record.flowset_id}")
      if metadata != nil
        key = "#{flowset.source_id}|#{record.flowset_id}|#{metadata["host"]}|#{metadata["port"]}"
      else
        key = "#{flowset.source_id}|#{record.flowset_id}"
      end

      template = @netflow_templates.fetch(key)

      if !template
        @logger.warn("Can't (yet) decode flowset id #{record.flowset_id} from source id #{flowset.source_id}, because no template to decode it with has been received. This message will usually go away after 1 minute.")
        return events
      end

      length = record.flowset_length - 4

      # Template shouldn't be longer than the record 
      # As fas as padding is concerned, the RFC defines a SHOULD for 4-word alignment
      # so we won't complain about that.
      if template.num_bytes != nil
        if template.num_bytes > length
          @logger.warn("Template length exceeds flowset length, skipping", :template_id => record.flowset_id, :template_length => template.num_bytes, :record_length => length)
          return events
        end
      end

      array = BinData::Array.new(:type => template, :initial_length => length / template.num_bytes)
      records = array.read(record.flowset_data)

      flowcounter = 1
      records.each do |r|
        @logger.debug? and @logger.debug("Start processing flow #{flowcounter} from data flowset id #{record.flowset_id}")
        event = {
          LogStash::Event::TIMESTAMP => LogStash::Timestamp.at(flowset.unix_sec),
          @target => {}
        }

        # Fewer fields in the v9 header
        NETFLOW9_FIELDS.each do |f|
          event[@target][f] = flowset[f].snapshot
        end

        event[@target][FLOWSET_ID] = record.flowset_id.snapshot

        r.each_pair do |k, v|
          case k.to_s
          when SWITCHED
            millis = flowset.uptime - v
            seconds = flowset.unix_sec - (millis / 1000)
            # v9 did away with the nanosecs field
            micros = 1000000 - ((millis % 1000) * 1000)
            event[@target][k.to_s] = LogStash::Timestamp.at(seconds, micros).to_iso8601
          else
            event[@target][k.to_s] = v.snapshot
          end
        end

        events << LogStash::Event.new(event)
        flowcounter += 1
      end
    else
      @logger.warn("Unsupported flowset id #{record.flowset_id}")
    end

    events
  rescue BinData::ValidityError, IOError => e
    @logger.warn("Invalid netflow packet received (#{e})")
  end

  def decode_ipfix(flowset, record)
    events = []

    case record.flowset_id
    when 2..3
      record.flowset_data.templates.each do |template|
        catch (:field) do
          fields = []
          # Template flowset (2) or Options template flowset (3) ?
          template_fields = (record.flowset_id == 2) ? template.record_fields : (template.scope_fields.to_ary + template.option_fields.to_ary)
          template_fields.each do |field|
            field_type = field.field_type
            field_length = field.field_length
            enterprise_id = field.enterprise ? field.enterprise_id : 0

            entry = ipfix_field_for(field_type, enterprise_id, field.field_length)
            throw :field unless entry
            fields += entry
          end
          # FIXME Source IP address required in key
          key = "#{flowset.observation_domain_id}|#{template.template_id}"

          @ipfix_templates.register(key, fields)
        end
      end
    when 256..65535
      # Data flowset
      key = "#{flowset.observation_domain_id}|#{record.flowset_id}"
      template = @ipfix_templates.fetch(key)

      if !template
        @logger.warn("Can't (yet) decode flowset id #{record.flowset_id} from observation domain id #{flowset.observation_domain_id}, because no template to decode it with has been received. This message will usually go away after 1 minute.")
        return events
      end

      array = BinData::Array.new(:type => template, :read_until => :eof)
      records = array.read(record.flowset_data)

      records.each do |r|
        event = {
          LogStash::Event::TIMESTAMP => LogStash::Timestamp.at(flowset.unix_sec),
          @target => {}
        }

        IPFIX_FIELDS.each do |f|
          event[@target][f] = flowset[f].snapshot
        end

        if @include_flowset_id
          event[@target][FLOWSET_ID] = record.flowset_id.snapshot
        end

        r.each_pair do |k, v|
          case k.to_s
          when /^flow(?:Start|End)Seconds$/
            event[@target][k.to_s] = LogStash::Timestamp.at(v.snapshot).to_iso8601
          when /^flow(?:Start|End)(Milli|Micro|Nano)seconds$/
            case $1
            when 'Milli'
              event[@target][k.to_s] = LogStash::Timestamp.at(v.snapshot.to_f / 1_000).to_iso8601
            when 'Micro', 'Nano'
              # For now we'll stick to assuming ntp timestamps,
              # Netscaler implementation may be buggy though:
              # https://bugs.wireshark.org/bugzilla/show_bug.cgi?id=11047
              # This only affects the fraction though
              ntp_seconds = (v.snapshot >> 32) & 0xFFFFFFFF
              ntp_fraction = (v.snapshot & 0xFFFFFFFF).to_f / 2**32
              event[@target][k.to_s] = LogStash::Timestamp.at(Time.utc(1900,1,1).to_i + ntp_seconds, ntp_fraction * 1000000).to_iso8601
            end
          else
            event[@target][k.to_s] = v.snapshot
          end
        end

        events << LogStash::Event.new(event)
      end
    else
      @logger.warn("Unsupported flowset id #{record.flowset_id}")
    end

    events
  rescue BinData::ValidityError => e
    @logger.warn("Invalid IPFIX packet received (#{e})")
  end

  def load_definitions(defaults, extra)
    begin
      fields = YAML.load_file(defaults)
    rescue Exception => e
      raise "#{self.class.name}: Bad syntax in definitions file #{defaults}"
    end

    # Allow the user to augment/override/rename the default fields
    if extra
      raise "#{self.class.name}: definitions file #{extra} does not exist" unless File.exists?(extra)
      begin
        fields.merge!(YAML.load_file(extra))
      rescue Exception => e
        raise "#{self.class.name}: Bad syntax in definitions file #{extra}"
      end
    end

    fields
  end

  def uint_field(length, default)
    # If length is 4, return :uint32, etc. and use default if length is 0
    ("uint" + (((length > 0) ? length : default) * 8).to_s).to_sym
  end # def uint_field

  def skip_field(field, type, length)
    if length == 65535
      field[0] = :VarSkip
    else
      field += [nil, {:length => length.to_i}]
    end

    field
  end # def skip_field

  def string_field(field, type, length)
    if length == 65535
      field[0] = :VarString
    else
      field[0] = :string
      field += [{ :length => length.to_i, :trim_padding => true }]
    end

    field
  end # def string_field

  def get_rfc6759_application_id_class(field,length)
    case length
    when 2
      field[0] = :Application_Id16
    when 3
      field[0] = :Application_Id24
    when 4
      field[0] = :Application_Id32
    when 5
      field[0] = :Application_Id40
    when 7
      field[0] = :Application_Id56
    when 8
      field[0] = :Application_Id64
    when 9
      field[0] = :Application_Id72
    else
      @logger.warn("Unsupported application_id length encountered, skipping", :field => field, :length => length)
      nil
    end      
    field[0]
  end

  def netflow_field_for(type, length, template_id)
    if @netflow_fields.include?(type)
      field = @netflow_fields[type].clone
      if field.is_a?(Array)

        field[0] = uint_field(length, field[0]) if field[0].is_a?(Integer)

        # Small bit of fixup for:
        # - skip or string field types where the length is dynamic
	# - uint(8|16|24|32|64} where we use the length as specified by the
	#   template instead of the YAML (e.g. ipv6_flow_label is 3 bytes in
	#   the YAML and Cisco doc, but Cisco ASR9k sends 4 bytes).
	#   Another usecase is supporting reduced-size encoding as per RFC7011 6.2
	# - application_id where we use the length as specified by the 
	#   template and map it to custom types for handling.
	#   
	case field[0]
        when :uint8
          field[0] = uint_field(length, field[0])
        when :uint16
          if length>2
            @logger.warn("Reduced-size encoding for uint16 is larger than uint16", :field => field, :length => length)
          end
          field[0] = uint_field(length, field[0])
        when :uint24
          field[0] = uint_field(length, field[0])
        when :uint32
          if length>4
            @logger.warn("Reduced-size encoding for uint32 is larger than uint32", :field => field, :length => length)
          end
          field[0] = uint_field(length, field[0])
        when :uint64
          if length>8
            @logger.warn("Reduced-size encoding for uint64 is larger than uint64", :field => field, :length => length)
          end
          field[0] = uint_field(length, field[0])
        when :application_id
          field[0] = get_rfc6759_application_id_class(field,length)
        when :skip
          field += [nil, {:length => length.to_i}]
        when :string
          field = string_field(field, type, length.to_i)
        end

        @logger.debug? and @logger.debug("Field definition complete for template #{template_id}", :field => field)

        [field]
      else
        @logger.warn("Definition should be an array", :field => field)
        nil
      end
    else
      @logger.warn("Unsupported field in template #{template_id}", :type => type, :length => length)
      nil
    end
  end # def netflow_field_for

  def ipfix_field_for(type, enterprise, length)
    if @ipfix_fields.include?(enterprise)
      if @ipfix_fields[enterprise].include?(type)
        field = @ipfix_fields[enterprise][type].clone
      else
        @logger.warn("Unsupported enterprise field", :type => type, :enterprise => enterprise, :length => length)
      end
    else
      @logger.warn("Unsupported enterprise", :enterprise => enterprise)
    end

    return nil unless field

    if field.is_a?(Array)
      case field[0]
      when :skip
        field = skip_field(field, type, length.to_i)
      when :string
        field = string_field(field, type, length.to_i)
      when :octetarray
        field[0] = :OctetArray
        field += [{:initial_length => length.to_i}]
      when :uint64
        field[0] = uint_field(length, 8)
      when :uint32
        field[0] = uint_field(length, 4)
      when :uint16
        field[0] = uint_field(length, 2)
      when :application_id
        field[0] = get_rfc6759_application_id_class(field,length)
      end

      @logger.debug("Definition complete", :field => field)
      [field]
    else
      @logger.warn("Definition should be an array", :field => field)
    end
  end

  class TemplateRegistry
    ##
    # @param logger [Logger]
    # @param ttl [Integer]
    # @param file_path [String] (optional)
    def initialize(logger, ttl, file_path=nil)
      @logger = logger
      @ttl = Integer(ttl)
      @file_path = file_path

      @mutex = Mutex.new

      @bindata_struct_cache = Vash.new
      @bindata_spec_cache = Vash.new

      do_load unless file_path.nil?
    end

    ##
    # Register a Template by name using an array of type/name tuples.
    #
    # @param key [String]: the key under which to save this template
    # @param field_tuples [Array<Array<String>>]: an array of [type,name] tuples, e.g., ["uint32","fieldName"]
    # @return [BinData::Struct]
    #
    # If a block is given, the template is yielded to the block _before_ being saved in the cache.
    #
    # @yieldparam [BinData::Struct]
    # @yieldreturn [void]
    # @yieldthrow :invalid_template : if the template is deemed invalid within the block, throwing this symbol causes
    #                                the template to not be cached.
    #
    # @threadsafe
    def register(key, field_tuples, &block)
      @mutex.synchronize do
        do_register(key, field_tuples, &block)
      end
    end

    ##
    # Fetch a Template by name
    #
    # @param key [String]
    # @return [BinData::Struct]
    #
    # @threadsafe
    def fetch(key)
      @mutex.synchronize do
        do_fetch(key)
      end
    end

    ##
    # Force persist, potentially cleaning up elements from the file-based cache that have already been evicted from
    # the memory-based cache
    def persist()
      @mutex.synchronize do
        do_persist
      end
    end

    private
    attr_reader :logger
    attr_reader :file_path

    ##
    # @see `TemplateRegistry#register(String,Array<>)`
    # @api private
    def do_register(key, field_tuples)
      template = BinData::Struct.new(:fields => field_tuples, :endian => :big)

      catch(:invalid_template) do
        yield(template) if block_given?

        @bindata_spec_cache[key, @ttl] = field_tuples
        @bindata_struct_cache[key, @ttl] = template

        do_persist

        template
      end
    end

    ##
    # @api private
    def do_load
      unless File.exists?(file_path)
        logger.warn('Template Cache does not exist', :file_path => file_path)
        return
      end

      logger.debug? and logger.debug('Loading templates from template cache', :file_path => file_path)
      file_data = File.read(file_path)
      templates_cache = JSON.parse(file_data)
      templates_cache.each do |key, fields|
        do_register(key, fields)
      end

      logger.warn('Template Cache not writable', file_path: file_path) unless File.writable?(file_path)
    rescue => e
      logger.error('Template Cache could not be loaded', :file_path => file_path, :exception => e.message)
    end

    ##
    # @see `TemplateRegistry#persist`
    # @api private
    def do_persist
      return if file_path.nil?

      logger.debug? and logger.debug('Writing templates to template cache', :file_path => file_path)

      fail('Template Cache not writable') if File.exists?(file_path) && !File.writable?(file_path)

      do_cleanup!

      templates_cache = @bindata_spec_cache

      File.open(file_path, 'w') do |file|
        file.write(templates_cache.to_json)
      end
    rescue Exception => e
      logger.error('Template Cache could not be saved', :file_path => file_path, :exception => e.message)
    end

    ##
    # @see `TemplateRegistry#cleanup`
    # @api private
    def do_cleanup!
      @bindata_spec_cache.cleanup!
      @bindata_struct_cache.cleanup!
    end

    ##
    # @see `TemplateRegistry#fetch(String)`
    # @api private
    def do_fetch(key)
      @bindata_struct_cache[key]
    end
  end
end # class LogStash::Filters::Netflow
