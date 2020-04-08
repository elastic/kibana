# encoding: utf-8
require "logstash/util/buftok"
require "logstash/util/charset"
require "logstash/codecs/base"
require "json"

# Implementation of a Logstash codec for the ArcSight Common Event Format (CEF)
# Based on Revision 20 of Implementing ArcSight CEF, dated from June 05, 2013
# https://community.saas.hpe.com/dcvta86296/attachments/dcvta86296/connector-documentation/1116/1/CommonEventFormatv23.pdf
#
# If this codec receives a payload from an input that is not a valid CEF message, then it will
# produce an event with the payload as the 'message' field and a '_cefparsefailure' tag.
class LogStash::Codecs::CEF < LogStash::Codecs::Base
  config_name "cef"

  # Device vendor field in CEF header. The new value can include `%{foo}` strings
  # to help you build a new value from other parts of the event.
  config :vendor, :validate => :string, :default => "Elasticsearch"

  # Device product field in CEF header. The new value can include `%{foo}` strings
  # to help you build a new value from other parts of the event.
  config :product, :validate => :string, :default => "Logstash"

  # Device version field in CEF header. The new value can include `%{foo}` strings
  # to help you build a new value from other parts of the event.
  config :version, :validate => :string, :default => "1.0"

  # Signature ID field in CEF header. The new value can include `%{foo}` strings
  # to help you build a new value from other parts of the event.
  config :signature, :validate => :string, :default => "Logstash"

  # Name field in CEF header. The new value can include `%{foo}` strings
  # to help you build a new value from other parts of the event.
  config :name, :validate => :string, :default => "Logstash"

  # Severity field in CEF header. The new value can include `%{foo}` strings
  # to help you build a new value from other parts of the event.
  #
  # Defined as field of type string to allow sprintf. The value will be validated
  # to be an integer in the range from 0 to 10 (including).
  # All invalid values will be mapped to the default of 6.
  config :severity, :validate => :string, :default => "6"

  # Fields to be included in CEV extension part as key/value pairs
  config :fields, :validate => :array, :default => []
  
  # When encoding to CEF, set this to true to adhere to the specifications and
  # encode using the CEF key name (short name) for the CEF field names.
  # Defaults to false to preserve previous behaviour that was to use the long
  # version of the CEF field names.
  config :reverse_mapping, :validate => :boolean, :default => false

  # If your input puts a delimiter between each CEF event, you'll want to set
  # this to be that delimiter.
  #
  # For example, with the TCP input, you probably want to put this:
  #
  #     input {
  #       tcp {
  #         codec => cef { delimiter => "\r\n" }
  #         # ...
  #       }
  #     }
  #
  # This setting allows the following character sequences to have special meaning:
  #
  # * `\\r` (backslash "r") - means carriage return (ASCII 0x0D)
  # * `\\n` (backslash "n") - means newline (ASCII 0x0A)
  config :delimiter, :validate => :string

  # If raw_data_field is set, during decode of an event an additional field with
  # the provided name is added, which contains the raw data.
  config :raw_data_field, :validate => :string

  HEADER_FIELDS = ['cefVersion','deviceVendor','deviceProduct','deviceVersion','deviceEventClassId','name','severity']

  # Translating and flattening the CEF extensions with known field names as documented in the Common Event Format whitepaper
  MAPPINGS = {
      "act" => "deviceAction",
      "app" => "applicationProtocol",
      "c6a1" => "deviceCustomIPv6Address1",
      "c6a1Label" => "deviceCustomIPv6Address1Label",
      "c6a2" => "deviceCustomIPv6Address2",
      "c6a2Label" => "deviceCustomIPv6Address2Label",
      "c6a3" => "deviceCustomIPv6Address3",
      "c6a3Label" => "deviceCustomIPv6Address3Label",
      "c6a4" => "deviceCustomIPv6Address4",
      "c6a4Label" => "deviceCustomIPv6Address4Label",
      "cat" => "deviceEventCategory",
      "cfp1" => "deviceCustomFloatingPoint1",
      "cfp1Label" => "deviceCustomFloatingPoint1Label",
      "cfp2" => "deviceCustomFloatingPoint2",
      "cfp2Label" => "deviceCustomFloatingPoint2Label",
      "cfp3" => "deviceCustomFloatingPoint3",
      "cfp3Label" => "deviceCustomFloatingPoint3Label",
      "cfp4" => "deviceCustomFloatingPoint4",
      "cfp4Label" => "deviceCustomFloatingPoint4Label",
      "cn1" => "deviceCustomNumber1",
      "cn1Label" => "deviceCustomNumber1Label",
      "cn2" => "deviceCustomNumber2",
      "cn2Label" => "deviceCustomNumber2Label",
      "cn3" => "deviceCustomNumber3",
      "cn3Label" => "deviceCustomNumber3Label",
      "cnt" => "baseEventCount",
      "cs1" => "deviceCustomString1",
      "cs1Label" => "deviceCustomString1Label",
      "cs2" => "deviceCustomString2",
      "cs2Label" => "deviceCustomString2Label",
      "cs3" => "deviceCustomString3",
      "cs3Label" => "deviceCustomString3Label",
      "cs4" => "deviceCustomString4",
      "cs4Label" => "deviceCustomString4Label",
      "cs5" => "deviceCustomString5",
      "cs5Label" => "deviceCustomString5Label",
      "cs6" => "deviceCustomString6",
      "cs6Label" => "deviceCustomString6Label",
      "dhost" => "destinationHostName",
      "dmac" => "destinationMacAddress",
      "dntdom" => "destinationNtDomain",
      "dpid" => "destinationProcessId",
      "dpriv" => "destinationUserPrivileges",
      "dproc" => "destinationProcessName",
      "dpt" => "destinationPort",
      "dst" => "destinationAddress",
      "duid" => "destinationUserId",
      "duser" => "destinationUserName",
      "dvc" => "deviceAddress",
      "dvchost" => "deviceHostName",
      "dvcpid" => "deviceProcessId",
      "end" => "endTime",
      "fname" => "fileName",
      "fsize" => "fileSize",
      "in" => "bytesIn",
      "msg" => "message",
      "out" => "bytesOut",
      "outcome" => "eventOutcome",
      "proto" => "transportProtocol",
      "request" => "requestUrl",
      "rt" => "deviceReceiptTime",
      "shost" => "sourceHostName",
      "smac" => "sourceMacAddress",
      "sntdom" => "sourceNtDomain",
      "spid" => "sourceProcessId",
      "spriv" => "sourceUserPrivileges",
      "sproc" => "sourceProcessName",
      "spt" => "sourcePort",
      "src" => "sourceAddress",
      "start" => "startTime",
      "suid" => "sourceUserId",
      "suser" => "sourceUserName",
      "ahost" => "agentHost",
      "art" => "agentReceiptTime",
      "at" => "agentType",
      "aid" => "agentId",
      "_cefVer" => "cefVersion",
      "agt" => "agentAddress",
      "av" => "agentVersion",
      "atz" => "agentTimeZone",
      "dtz" => "destinationTimeZone",
      "slong" => "sourceLongitude",
      "slat" => "sourceLatitude",
      "dlong" => "destinationLongitude",
      "dlat" => "destinationLatitude",
      "catdt" => "categoryDeviceType",
      "mrt" => "managerReceiptTime",
      "amac" => "agentMacAddress"
  }

  # Reverse mapping of CEF full field names to CEF extensions field names for encoding into a CEF event for output.
  REVERSE_MAPPINGS = MAPPINGS.invert

  # A CEF Header is a sequence of zero or more:
  #  - backslash-escaped pipes; OR
  #  - backslash-escaped backslashes; OR
  #  - non-pipe characters
  HEADER_PATTERN = /(?:\\\||\\\\|[^|])*?/

  # Cache of a scanner pattern that _captures_ a HEADER followed by an unescaped pipe
  HEADER_SCANNER = /(#{HEADER_PATTERN})#{Regexp.quote('|')}/

  # Cache of a gsub pattern that matches a backslash-escaped backslash or backslash-escaped pipe, _capturing_ the escaped character
  HEADER_ESCAPE_CAPTURE = /\\([\\|])/

  # Cache of a gsub pattern that matches a backslash-escaped backslash or backslash-escaped equals, _capturing_ the escaped character
  EXTENSION_VALUE_ESCAPE_CAPTURE = /\\([\\=])/

  # While the original CEF spec calls out that extension keys must be alphanumeric and must not contain spaces,
  # in practice many "CEF" producers like the Arcsight smart connector produce non-legal keys including underscores,
  # commas, periods, and square-bracketed index offsets.
  #
  # To support this, we look for a specific sequence of characters that are followed by an equals sign. This pattern
  # will correctly identify all strictly-legal keys, and will also match those that include a dot-joined "subkeys" and
  # square-bracketed array indexing
  #
  # That sequence must begin with one or more `\w` (word: alphanumeric + underscore), which _optionally_ may be followed
  # by one or more "subkey" sequences and an optional square-bracketed index.
  #
  # To be understood by this implementation, a "subkey" sequence must consist of a literal dot (`.`) followed by one or
  # more characters that do not convey semantic meaning within CEF (e.g., literal-dot (`.`), literal-equals (`=`),
  # whitespace (`\s`), literal-pipe (`|`), literal-backslash ('\'), or literal-square brackets (`[` or `]`)).
  EXTENSION_KEY_PATTERN = /(?:\w+(?:\.[^\.=\s\|\\\[\]]+)*(?:\[[0-9]+\])?(?==))/

  # Some CEF extension keys seen in the wild use an undocumented array-like syntax that may not be compatible with
  # the Event API's strict-mode FieldReference parser (e.g., `fieldname[0]`).
  # Cache of a `String#sub` pattern matching array-like syntax and capturing both the base field name and the
  # array-indexing portion so we can convert to a valid FieldReference (e.g., `[fieldname][0]`).
  EXTENSION_KEY_ARRAY_CAPTURE = /^([^\[\]]+)((?:\[[0-9]+\])+)$/ # '[\1]\2'

  # In extensions, spaces may be included in an extension value without any escaping,
  # so an extension value is a sequence of zero or more:
  # - non-whitespace character; OR
  # - runs of whitespace that are NOT followed by something that looks like a key-equals sequence
  EXTENSION_VALUE_PATTERN = /(?:\S|\s++(?!#{EXTENSION_KEY_PATTERN}=))*/

  # Cache of a scanner pattern that _captures_ extension field key/value pairs
  EXTENSION_KEY_VALUE_SCANNER = /(#{EXTENSION_KEY_PATTERN})=(#{EXTENSION_VALUE_PATTERN})\s*/

  public
  def initialize(params={})
    super(params)

    # CEF input MUST be UTF-8, per the CEF White Paper that serves as the format's specification:
    # https://web.archive.org/web/20160422182529/https://kc.mcafee.com/resources/sites/MCAFEE/content/live/CORP_KNOWLEDGEBASE/78000/KB78712/en_US/CEF_White_Paper_20100722.pdf
    @utf8_charset = LogStash::Util::Charset.new('UTF-8')
    @utf8_charset.logger = self.logger

    if @delimiter
      # Logstash configuration doesn't have built-in support for escaping,
      # so we implement it here. Feature discussion for escaping is here:
      #   https://github.com/elastic/logstash/issues/1645
      @delimiter = @delimiter.gsub("\\r", "\r").gsub("\\n", "\n")
      @buffer = FileWatch::BufferedTokenizer.new(@delimiter)
    end
  end

  public
  def decode(data, &block)
    if @delimiter
      @buffer.extract(data).each do |line|
        handle(line, &block)
      end
    else
      handle(data, &block)
    end
  end

  def handle(data, &block)
    event = LogStash::Event.new
    event.set(raw_data_field, data) unless raw_data_field.nil?

    @utf8_charset.convert(data)

    # Several of the many operations in the rest of this method will fail when they encounter UTF8-tagged strings
    # that contain invalid byte sequences; fail early to avoid wasted work.
    fail('invalid byte sequence in UTF-8') unless data.valid_encoding?

    # Strip any quotations at the start and end, flex connectors seem to send this
    if data[0] == "\""
      data = data[1..-2]
    end

    # Use a scanning parser to capture the HEADER_FIELDS
    unprocessed_data = data
    HEADER_FIELDS.each do |field_name|
      match_data = HEADER_SCANNER.match(unprocessed_data)
      break if match_data.nil? # missing fields

      escaped_field_value = match_data[1]
      next if escaped_field_value.nil?

      # process legal header escape sequences
      unescaped_field_value = escaped_field_value.gsub(HEADER_ESCAPE_CAPTURE, '\1')

      event.set(field_name, unescaped_field_value)
      unprocessed_data = match_data.post_match
    end

    #Remainder is message
    message = unprocessed_data

    # Try and parse out the syslog header if there is one
    if event.get('cefVersion').include? ' '
      split_cef_version= event.get('cefVersion').rpartition(' ')
      event.set('syslog', split_cef_version[0])
      event.set('cefVersion',split_cef_version[2])
    end

    # Get rid of the CEF bit in the version
    event.set('cefVersion', event.get('cefVersion').sub(/^CEF:/, ''))

    # Use a scanning parser to capture the Extension Key/Value Pairs
    if message && message.include?('=')
      message = message.strip

      message.scan(EXTENSION_KEY_VALUE_SCANNER) do |extension_field_key, raw_extension_field_value|
        # expand abbreviated extension field keys
        extension_field_key = MAPPINGS.fetch(extension_field_key, extension_field_key)

        # convert extension field name to strict legal field_reference, fixing field names with ambiguous array-like syntax
        extension_field_key = extension_field_key.sub(EXTENSION_KEY_ARRAY_CAPTURE, '[\1]\2') if extension_field_key.end_with?(']')

        # process legal extension field value escapes
        extension_field_value = raw_extension_field_value.gsub(EXTENSION_VALUE_ESCAPE_CAPTURE, '\1')

        event.set(extension_field_key, extension_field_value)
      end
    end

    yield event
  rescue => e
    @logger.error("Failed to decode CEF payload. Generating failure event with payload in message field.", :error => e.message, :backtrace => e.backtrace, :data => data)
    yield LogStash::Event.new("message" => data, "tags" => ["_cefparsefailure"])
  end

  public
  def encode(event)
    # "CEF:0|Elasticsearch|Logstash|1.0|Signature|Name|Sev|"

    vendor = sanitize_header_field(event.sprintf(@vendor))
    vendor = self.class.get_config["vendor"][:default] if vendor == ""

    product = sanitize_header_field(event.sprintf(@product))
    product = self.class.get_config["product"][:default] if product == ""

    version = sanitize_header_field(event.sprintf(@version))
    version = self.class.get_config["version"][:default] if version == ""

    signature = sanitize_header_field(event.sprintf(@signature))
    signature = self.class.get_config["signature"][:default] if signature == ""

    name = sanitize_header_field(event.sprintf(@name))
    name = self.class.get_config["name"][:default] if name == ""

    severity = sanitize_severity(event, @severity)

    # Should also probably set the fields sent
    header = ["CEF:0", vendor, product, version, signature, name, severity].join("|")
    values = @fields.map {|fieldname| get_value(fieldname, event)}.compact.join(" ")

    @on_event.call(event, "#{header}|#{values}#{@delimiter}")
  end

  private

  # Escape pipes and backslashes in the header. Equal signs are ok.
  # Newlines are forbidden.
  def sanitize_header_field(value)
    output = ""

    value = value.to_s.gsub(/\r\n/, "\n")

    value.each_char{|c|
      case c
      when "\\", "|"
        output += "\\" + c
      when "\n", "\r"
        output += " "
      else
        output += c
      end
    }

    return output
  end

  # Keys must be made up of a single word, with no spaces
  # must be alphanumeric
  def sanitize_extension_key(value)
    value = value.to_s.gsub(/[^a-zA-Z0-9]/, "")
    return value
  end

  # Escape equal signs in the extensions. Canonicalize newlines.
  # CEF spec leaves it up to us to choose \r or \n for newline.
  # We choose \n as the default.
  def sanitize_extension_val(value)
    output = ""

    value = value.to_s.gsub(/\r\n/, "\n")

    value.each_char{|c|
      case c
      when "\\", "="
        output += "\\" + c
      when "\n", "\r"
        output += "\\n"
      else
        output += c
      end
    }

    return output
  end

  def get_value(fieldname, event)
    val = event.get(fieldname)

    return nil if val.nil?

    key = sanitize_extension_key(fieldname)
    
    if @reverse_mapping
      key = REVERSE_MAPPINGS[key] || key
    end
    
    case val
    when Array, Hash
      return "#{key}=#{sanitize_extension_val(val.to_json)}"
    when LogStash::Timestamp
      return "#{key}=#{val.to_s}"
    else
      return "#{key}=#{sanitize_extension_val(val)}"
    end
  end

  def sanitize_severity(event, severity)
    severity = sanitize_header_field(event.sprintf(severity)).strip
    severity = self.class.get_config["severity"][:default] unless valid_severity?(severity)
    severity = severity.to_i.to_s
  end

  def valid_severity?(sev)
    f = Float(sev)
    # check if it's an integer or a float with no remainder
    # and if the value is between 0 and 10 (inclusive)
    (f % 1 == 0) && f.between?(0,10)
  rescue TypeError, ArgumentError
    false
  end
end
