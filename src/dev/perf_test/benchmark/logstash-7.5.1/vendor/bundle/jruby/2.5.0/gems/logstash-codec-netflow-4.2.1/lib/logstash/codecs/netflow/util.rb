# encoding: utf-8
require "bindata"
require "ipaddr"

class IP4Addr < BinData::Primitive
  endian :big
  uint32 :storage

  def set(val)
    unless val.nil?
      self.storage = val.split('.').inject(0) {|total,value| (total << 8 ) + value.to_i}
    end
  end

  def get
    # This is currently the fastest implementation
    # For benchmarks see spec/codecs/benchmarks/IPaddr.rb
    unless self.storage.nil?
      [self.storage].pack('N').unpack('C4').join('.')
    end
  end
end

class IP6Addr < BinData::Primitive
  endian  :big
  uint128 :storage

  def set(val)
    unless val.nil?
      ip = IPAddr.new(val)
      if ! ip.ipv6?
        raise ArgumentError, "invalid IPv6 address `#{val}'"
      end
      self.storage = ip.to_i
    end
  end

  def get
    # There are faster implementations, however they come with the 
    # loss of compressed IPv6 notation.
    # For benchmarks see spec/codecs/benchmarks/IP6Addr.rb
    unless self.storage.nil?
      b = "%032x" % self.storage
      c = b[0..3] + ":" + b[4..7] + ":" + b[8..11] + ":" + b[12..15] + ":" + b[16..19] + ":" + b[20..23] + ":" + b[24..27] + ":" + b[28..31]
      IPAddr.new(c).to_s
    end
  end
end

class MacAddr < BinData::Primitive
  string :bytes, :length => 6

  def set(val)
    unless val.nil?
      ints = val.split(/:/).collect { |int| int.to_i(16) }
      self.bytes = ints
    end
  end

  def get
    # This is currently the fastest implementation
    # For benchmarks see spec/codecs/benchmarks/MacAddr.rb
    b = self.bytes.unpack('H*')[0]
    b[0..1] + ":" + b[2..3] + ":" + b[4..5] + ":" + b[6..7] + ":" + b[8..9] + ":" + b[10..11]
  end
end

class VarSkip < BinData::Primitive
  endian :big
  uint8 :length_1
  uint16 :length_2, :onlyif => lambda { length_1 == 255 }
  skip :length => lambda { (length_1 == 255) ? length_2 : length_1 }

  def get
    ""
  end
end

class VarString < BinData::Primitive
  endian :big
  uint8 :length_1
  uint16 :length_2, :onlyif => lambda { length_1 == 255 }
  string :data, :trim_padding => true, :length => lambda { (length_1 == 255) ? length_2 : length_1 }

  def set(val)
    self.data = val
  end

  def get
    self.data
  end

  def snapshot
    super.encode("ASCII-8BIT", "UTF-8", invalid: :replace, undef: :replace)
  end
end

class ACLIdASA < BinData::Primitive
  string :bytes, :length => 12

  def set(val)
    unless val.nil?
      self.bytes = val.split("-").collect { |aclid| aclid.scan(/../).collect { |hex| hex.to_i(16)} }.flatten
    end
  end

  def get
    # This is currently the fastest implementation
    # For benchmarks see spec/codecs/benchmarks/ACLIdASA.rb
    b = self.bytes.unpack('H*')[0]
    b[0..7] + "-" + b[8..15] + "-" + b[16..23] 
  end
end

class MPLSLabelStackOctets < BinData::Record
  endian :big
  bit20  :label
  bit3   :experimental
  bit1   :bottom_of_stack
  uint8  :ttl
end

class Forwarding_Status < BinData::Record
  endian :big
  bit2   :status
  bit6   :reason
end

class Application_Id16 < BinData::Primitive
  endian :big
  uint8  :classification_id
  uint24 :selector_id

  def set(val)
    unless val.nil?
      self.classification_id=val.to_i<<24
      self.selector_id = val.to_i-((val.to_i>>24)<<24)
    end
  end

  def get
    self.classification_id.to_s + ".." + self.selector_id.to_s
  end
end


class Application_Id24 < BinData::Primitive
  endian :big
  uint8  :classification_id
  uint16 :selector_id

  def set(val)
    unless val.nil?
      self.classification_id=val.to_i<<16
      self.selector_id = val.to_i-((val.to_i>>16)<<16)
    end
  end

  def get
    self.classification_id.to_s + ".." + self.selector_id.to_s
  end
end


class Application_Id32 < BinData::Primitive
  endian :big
  uint8  :classification_id
  uint24 :selector_id

  def set(val)
    unless val.nil?
      self.classification_id=val.to_i<<24
      self.selector_id = val.to_i-((val.to_i>>24)<<24)
    end
  end

  def get
    self.classification_id.to_s + ".." + self.selector_id.to_s
  end
end


class Application_Id40 < BinData::Primitive
  endian :big
  uint8  :classification_id
  uint32 :selector_id

  def set(val)
    unless val.nil?
      self.classification_id=val.to_i<<32
      self.selector_id = val.to_i-((val.to_i>>32)<<32)
    end
  end

  def get
    self.classification_id.to_s + ".." + self.selector_id.to_s
  end
end


class Appid56PanaL7Pen < BinData::Record
  # RFC6759 chapter 4.1: PANA-L7-PEN
  # This implements the "application ids MAY be encoded in a smaller number of bytes"
  # Used in Application_Id56 choice statement
  endian :big
  uint32 :pen_id
  uint16 :selector_id
end


class Application_Id56 < BinData::Primitive
  endian :big
  uint8  :classification_id
  choice :selector_id, :selection => :classification_id do
    # for classification engine id 20 we switch to Appid64PanaL7Pen to decode
    appid56_pana_l7_pen 20
    uint48              :default
  end

  def set(val)
    unless val.nil?
      self.classification_id=val.to_i<<48
      if self.classification_id == 20
        # classification engine id 20 (PANA_L7_PEN) contains a 4-byte PEN:
        self.pen_id            = val.to_i-((val.to_i>>48)<<48)>>16
        self.selector_id       = val.to_i-((val.to_i>>16)<<16)
      else
        self.selector_id       = val.to_i-((val.to_i>>48)<<48)
      end
    end
  end

  def get
    if self.classification_id == 20
      self.classification_id.to_s + ".." + self.selector_id[:pen_id].to_s + ".." + self.selector_id[:selector_id].to_s
    else
      self.classification_id.to_s + ".." + self.selector_id.to_s
    end
  end
end


class Appid64PanaL7Pen < BinData::Record
  # RFC6759 chapter 4.1: PANA-L7-PEN
  # This implements the 3 bytes default selector id length
  # Used in Application_Id64 choice statement
  endian :big
  uint32 :pen_id
  uint24 :selector_id
end

class Application_Id64 < BinData::Primitive
  endian :big
  uint8  :classification_id
  choice :selector_id, :selection => :classification_id do
    # for classification engine id 20 we switch to Appid64PanaL7Pen to decode
    appid64_pana_l7_pen 20
    uint56              :default
  end

  def set(val)
    unless val.nil?
      self.classification_id=val.to_i<<56
      if self.classification_id == 20
        # classification engine id 20 (PANA_L7_PEN) contains a 4-byte PEN:
        self.pen_id            = val.to_i-((val.to_i>>56)<<56)>>24
        self.selector_id       = val.to_i-((val.to_i>>24)<<24)
      else
        self.selector_id       = val.to_i-((val.to_i>>56)<<56)
      end
    end
  end

  def get
    if self.classification_id == 20
      self.classification_id.to_s + ".." + self.selector_id[:pen_id].to_s + ".." + self.selector_id[:selector_id].to_s
    else
      self.classification_id.to_s + ".." + self.selector_id.to_s
    end
  end
end

class Appid72PanaL7Pen < BinData::Record
  # RFC6759 chapter 4.1: PANA-L7-PEN
  # This implements the "application ids MAY be encoded with a larger length"
  # Used in Application_Id72 choice statement
  endian :big
  uint32 :pen_id
  uint32 :selector_id
end

class Application_Id72 < BinData::Primitive
  endian :big
  uint8  :classification_id
  choice :selector_id, :selection => :classification_id do
    # for classification engine id 20 we switch to Appid72PanaL7Pen to decode
    appid72_pana_l7_pen 20
    uint64              :default
  end

  def set(val)
    unless val.nil?
      self.classification_id   = val.to_i<<64
      if self.classification_id == 20 
        # classification engine id 20 (PANA_L7_PEN) contains a 4-byte PEN:
        self.pen_id            = val.to_i-((val.to_i>>64)<<64)>>32
        self.selector_id       = val.to_i-((val.to_i>>32)<<32)
      else
        self.selector_id       = val.to_i-((val.to_i>>64)<<64)
      end
    end
  end

  def get
    if self.classification_id == 20
      self.classification_id.to_s + ".." + self.selector_id[:pen_id].to_s + ".." + self.selector_id[:selector_id].to_s
    else
      self.classification_id.to_s + ".." + self.selector_id.to_s
    end
  end
end

class OctetArray < BinData::Primitive
  # arg_processor :octetarray
  mandatory_parameter :initial_length
  array :bytes, :type => :uint8, :initial_length => :initial_length

  def set(val)
    unless val.nil?
      self.bytes = val.scan(/../).collect { |hex| hex.to_i(16)}
    end
  end

  def get
    self.bytes.collect { |byte| byte.value.to_s(16).rjust(2,'0') }.join
  end
end

class Header < BinData::Record
  endian :big
  uint16 :version
end

class Netflow5PDU < BinData::Record
  endian :big
  uint16 :version
  uint16 :flow_records, :assert => lambda { flow_records.value.between?(1,30) }
  uint32 :uptime
  uint32 :unix_sec
  uint32 :unix_nsec
  uint32 :flow_seq_num
  uint8  :engine_type
  uint8  :engine_id
  bit2   :sampling_algorithm
  bit14  :sampling_interval
  array :records, :initial_length => :flow_records do
    ip4_addr :ipv4_src_addr
    ip4_addr :ipv4_dst_addr
    ip4_addr :ipv4_next_hop
    uint16   :input_snmp
    uint16   :output_snmp
    uint32   :in_pkts
    uint32   :in_bytes
    uint32   :first_switched
    uint32   :last_switched
    uint16   :l4_src_port
    uint16   :l4_dst_port
    skip     :length => 1
    uint8    :tcp_flags # Split up the TCP flags maybe?
    uint8    :protocol
    uint8    :src_tos
    uint16   :src_as
    uint16   :dst_as
    uint8    :src_mask
    uint8    :dst_mask
    skip     :length => 2
  end
end

class NetflowTemplateFlowset < BinData::Record
  endian :big
  array  :templates, :read_until => lambda { flowset_length == 0 || array.num_bytes == flowset_length - 4 } do
    uint16 :template_id
    uint16 :field_count
    array  :record_fields, :initial_length => :field_count do
      uint16 :field_type
      uint16 :field_length
    end
  end
  rest  :rest, :onlyif => lambda { flowset_length == 0 }
end

class NetflowOptionFlowset < BinData::Record
  endian :big
  array  :templates, :read_until => lambda { array.num_bytes == flowset_length - 4 } do
    uint16 :template_id
    uint16 :scope_length, :assert => lambda { scope_length > 0 }
    uint16 :option_length, :assert => lambda { option_length > 0 }
    array  :scope_fields, :initial_length => lambda { scope_length / 4 } do
      uint16 :field_type
      uint16 :field_length
    end
    array  :option_fields, :initial_length => lambda { option_length / 4 } do
      uint16 :field_type
      uint16 :field_length, :assert => lambda { field_length > 0 }
    end
    string  :padding, :read_length => lambda { flowset_length - 4 - scope_length - option_length - 2 - 2 - 2 }
  end
end

class Netflow9PDU < BinData::Record
  endian :big
  uint16 :version
  uint16 :flow_records
  uint32 :uptime
  uint32 :unix_sec
  uint32 :flow_seq_num
  uint32 :source_id
  array  :records, :read_until => :eof do
    uint16 :flowset_id, :assert => lambda { [0, 1, *(256..65535)].include?(flowset_id) }
    uint16 :flowset_length, :assert => lambda { flowset_length == 0 || flowset_length > 4 }
    choice :flowset_data, :selection => :flowset_id do
      netflow_template_flowset 0
      netflow_option_flowset   1
      string                   :default, :read_length => lambda { flowset_length - 4 }
    end
  end
end

class IpfixTemplateFlowset < BinData::Record
  endian :big
  array  :templates, :read_until => lambda { flowset_length - 4 - array.num_bytes <= 2 } do
    uint16 :template_id
    uint16 :field_count
    array  :record_fields, :initial_length => :field_count do
      bit1   :enterprise
      bit15  :field_type
      uint16 :field_length
      uint32 :enterprise_id, :onlyif => lambda { enterprise != 0 }
    end
  end
  # skip :length => lambda { flowset_length - 4 - set.num_bytes } ?
end

class IpfixOptionFlowset < BinData::Record
  endian :big
  array  :templates, :read_until => lambda { flowset_length - 4 } do
    uint16 :template_id
    uint16 :field_count
    uint16 :scope_count, :assert => lambda { scope_count > 0 }
    array  :scope_fields, :initial_length => lambda { scope_count } do
      bit1   :enterprise
      bit15  :field_type
      uint16 :field_length
      uint32 :enterprise_id, :onlyif => lambda { enterprise != 0 }
    end
    array  :option_fields, :initial_length => lambda { field_count - scope_count } do
      bit1   :enterprise
      bit15  :field_type
      uint16 :field_length
      uint32 :enterprise_id, :onlyif => lambda { enterprise != 0 }
    end
    string  :padding, :read_length => lambda { flowset_length - 4 - 2 - 2 - 2 - scope_fields.num_bytes - option_fields.num_bytes }
  end
end

class IpfixPDU < BinData::Record
  endian :big
  uint16 :version
  uint16 :pdu_length
  uint32 :unix_sec
  uint32 :flow_seq_num
  uint32 :observation_domain_id
  array  :records, :read_until => lambda { array.num_bytes == pdu_length - 16 } do
    uint16 :flowset_id, :assert => lambda { [2, 3, *(256..65535)].include?(flowset_id) }
    uint16 :flowset_length, :assert => lambda { flowset_length > 4 }
    choice :flowset_data, :selection => :flowset_id do
      ipfix_template_flowset 2
      ipfix_option_flowset   3
      string                 :default, :read_length => lambda { flowset_length - 4 }
    end
  end
end

# https://gist.github.com/joshaven/184837
class Vash < Hash
  def initialize(constructor = {})
    @register ||= {}
    if constructor.is_a?(Hash)
      super()
      merge(constructor)
    else
      super(constructor)
    end
  end

  alias_method :regular_writer, :[]= unless method_defined?(:regular_writer)
  alias_method :regular_reader, :[] unless method_defined?(:regular_reader)

  def [](key)
    sterilize(key)
    clear(key) if expired?(key)
    regular_reader(key)
  end

  def []=(key, *args)
    if args.length == 2
      value, ttl = args[1], args[0]
    elsif args.length == 1
      value, ttl = args[0], 60
    else
      raise ArgumentError, "Wrong number of arguments, expected 2 or 3, received: #{args.length+1}\n"+
                           "Example Usage:  volatile_hash[:key]=value OR volatile_hash[:key, ttl]=value"
    end
    sterilize(key)
    ttl(key, ttl)
    regular_writer(key, value)
  end

  def merge(hsh)
    hsh.map {|key,value| self[sterile(key)] = hsh[key]}
    self
  end

  def cleanup!
    now = Time.now.to_i
    @register.map {|k,v| clear(k) if v < now}
  end

  def clear(key)
    sterilize(key)
    @register.delete key
    self.delete key
  end

  private
  def expired?(key)
    Time.now.to_i > @register[key].to_i
  end

  def ttl(key, secs=60)
    @register[key] = Time.now.to_i + secs.to_i
  end

  def sterile(key)
    String === key ? key.chomp('!').chomp('=') : key.to_s.chomp('!').chomp('=').to_sym
  end

  def sterilize(key)
    key = sterile(key)
  end
end

