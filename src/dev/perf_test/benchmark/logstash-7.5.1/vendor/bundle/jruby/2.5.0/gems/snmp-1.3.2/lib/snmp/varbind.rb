# frozen_string_literal: true
#
# Copyright (c) 2004-2014 David R. Halliday
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
# THE SOFTWARE.
#

require 'snmp/ber'

module SNMP

  class UnsupportedValueTag < RuntimeError; end
  class InvalidIpAddress < ArgumentError; end

  class VarBindList < Array
    include SNMP::BER::Encode
    extend SNMP::BER::Decode

    def self.decode(data, mib=nil)
      list = VarBindList.new
      varbind_data, remainder = decode_sequence(data)
      while varbind_data != ""
        varbind, varbind_data = VarBind.decode(varbind_data, mib)
        list << varbind
      end
      return list, remainder
    end

    def initialize(varbind_list=[])
      super()
      if varbind_list.respond_to? :to_str
        self << ObjectId.new(varbind_list.to_str).to_varbind
      elsif varbind_list.respond_to? :to_varbind
        self << varbind_list.to_varbind
      else
        varbind_list.each do |item|
          if item.respond_to? :to_str
            self << ObjectId.new(item.to_str).to_varbind
          else
            self << item.to_varbind
          end
        end
      end
    end

    def asn1_type
      "VarBindList"
    end

    def encode
      varbind_data = "".dup
      self.each do |varbind|
        varbind_data << varbind.encode
      end
      encode_sequence(varbind_data)
    end
  end

  class Integer
    include SNMP::BER::Encode
    extend SNMP::BER::Decode
    include Comparable

    def self.decode(value_data)
      Integer.new(decode_integer_value(value_data))
    end

    def asn1_type
      "INTEGER"
    end

    def initialize(value)
      @value = value.to_i
    end

    def <=>(other)
      return nil unless other.respond_to? :to_i
      @value <=> other.to_i
    end

    def coerce(other)
      if other.kind_of? ::Integer
        return [other, @value]
      else
        return [other.to_f, self.to_f]
      end
    end

    def to_s
      @value.to_s
    end

    def to_i
      @value
    end

    def to_f
      @value.to_f
    end

    def encode
      encode_integer(@value)
    end

    def to_oid
      raise RangeError, "@{value} cannot be an OID (must be >0)" if @value < 0
      ObjectId.new([@value])
    end
  end

  class Integer32 < Integer
    def initialize(value)
      super(value)
      raise ArgumentError, "Out of range: #{@value}" if @value < -2147483648
      raise ArgumentError, "Out of range: #{@value}" if @value > 2147483647
    end
  end

  class OctetString < String
    include SNMP::BER::Encode
    def self.decode(value_data)
      OctetString.new(value_data)
    end

    def asn1_type
      "OCTET STRING"
    end

    def encode
      encode_octet_string(self)
    end

    def to_oid
      oid = ObjectId.new
      each_byte { |b| oid << b }
      oid
    end
  end

  class ObjectId < Array
    include SNMP::BER::Encode
    extend SNMP::BER::Decode
    include Comparable

    def self.decode(value_data, mib=nil)
      ObjectId.new(decode_object_id_value(value_data), mib)
    end

    def asn1_type
      "OBJECT IDENTIFIER"
    end

    ##
    # Create an object id.  The input is expected to be either a string
    # in the format "n.n.n.n.n.n" or an array of integers.
    #
    def initialize(id=[], mib=nil)
      if id.nil?
        raise ArgumentError
      elsif id.respond_to? :to_str
        super(make_integers(id.to_str.split(".")))
      else
        super(make_integers(id.to_ary))
      end
      @mib = mib
    rescue ArgumentError
      raise ArgumentError, "#{id.inspect}:#{id.class} not a valid object ID"
    end

    ##
    # Adds MIB information to this object_id for use with to_s.
    #
    def with_mib(mib)
      @mib = mib
      self
    end

    def to_varbind
      VarBind.new(self, Null)
    end

    def to_oid
      self
    end

    def to_s
      if @mib
        @mib.name(self)
      else
        to_str
      end
    end

    def to_str
      self.join('.')
    end

    def inspect
      "[#{to_str}]"
    end

    def encode
      encode_object_id(self)
    end

    ##
    # Returns true if this ObjectId is a subtree of the provided parent tree
    # ObjectId.  For example, "1.3.6.1.5" is a subtree of "1.3.6.1".
    #
    def subtree_of?(parent_tree)
      parent_tree = make_object_id(parent_tree)
      if parent_tree.length > self.length
        false
      else
        parent_tree.each_index do |i|
          return false if parent_tree[i] != self[i]
        end
        true
      end
    end

    ##
    # Returns an index based on the difference between this ObjectId
    # and the provided parent ObjectId.
    #
    # For example, ObjectId.new("1.3.6.1.5").index("1.3.6.1") returns an
    # ObjectId of "5".
    #
    def index(parent_tree)
      parent_tree = make_object_id(parent_tree)
      if not subtree_of?(parent_tree)
        raise ArgumentError, "#{self.to_s} not a subtree of #{parent_tree.to_s}"
      elsif self.length == parent_tree.length
        raise ArgumentError, "OIDs are the same"
      else
        ObjectId.new(self[parent_tree.length..-1])
      end
    end

    private

      def make_integers(list)
        list.collect{|n| Integer(n)}
      end

      def make_object_id(oid)
        oid.kind_of?(ObjectId) ? oid : ObjectId.new(oid)
      end

  end

  class IpAddress
    include SNMP::BER::Encode

    class << self
      def decode(value_data)
        IpAddress.new(value_data, false)
      end
    end

    def asn1_type
      "IpAddress"
    end

    ##
    # Create an IpAddress object.  The constructor accepts either a raw
    # four-octet string or a formatted string of integers separated by dots
    # (i.e. "10.1.2.3").  Validation of the format can be disabled by setting
    # the 'validate' flag to false.
    #
    def initialize(value_data, validate=true)
      ip = value_data.to_str
      if (validate)
        if ip.length > 4
          ip = parse_string(ip)
        elsif ip.length != 4
          raise InvalidIpAddress, "Expected 4 octets or formatted string, got #{value_data.inspect}"
        end
      end
      @value = ip
    end

    ##
    # Returns a raw four-octet string representing this IpAddress.
    #
    def to_str
      @value.dup
    end

    ##
    # Returns a formatted, dot-separated string representing this IpAddress.
    #
    def to_s
      octets = []
      @value.each_byte { |b| octets << b.to_s }
      octets.join('.')
    end

    def to_oid
      oid = ObjectId.new
      @value.each_byte { |b| oid << b }
      oid
    end

    def ==(other)
      if other.respond_to? :to_str
        return @value.eql?(other.to_str)
      else
        return false
      end
    end

    def eql?(other)
      self == other
    end

    def hash
      @value.hash
    end

    def encode
      encode_tlv(BER::IpAddress_TAG, @value)
    end

    private
      def parse_string(ip_string)
        parts = ip_string.split(".")
        if parts.length != 4
          raise InvalidIpAddress, "Expected four octets separated by dots, not #{ip_string.inspect}"
        end
        value_data = "".dup
        parts.each do |s|
          octet = s.to_i
          raise InvalidIpAddress, "Octets cannot be greater than 255: #{ip_string.inspect}" if octet > 255
          raise InvalidIpAddress, "Octets cannot be negative: #{ip_string.inspect}" if octet < 0
          value_data << octet.chr
        end
        value_data
      end

  end

  class UnsignedInteger < Integer
    def initialize(value)
      super(value)
      raise ArgumentError, "Negative integer invalid: #{@value}" if @value < 0
      raise ArgumentError, "Out of range: #{@value}" if @value > 4294967295
    end

    def self.decode(value_data)
      self.new(decode_uinteger_value(value_data))
    end
  end

  class Counter32 < UnsignedInteger
    def asn1_type
      "Counter32"
    end

    def encode
      encode_tagged_integer(BER::Counter32_TAG, @value)
    end
  end

  class Gauge32 < UnsignedInteger
    def asn1_type
      "Gauge32"
    end

    def encode
      encode_tagged_integer(BER::Gauge32_TAG, @value)
    end
  end

  class Unsigned32 < UnsignedInteger
    def asn1_type
      "Unsigned32"
    end

    def encode
      encode_tagged_integer(BER::Unsigned32_TAG, @value)
    end
  end

  class TimeTicks < UnsignedInteger
    def asn1_type
      "TimeTicks"
    end

    def encode
      encode_tagged_integer(BER::TimeTicks_TAG, @value)
    end

    def to_s
      days, remainder = @value.divmod(8640000)
      hours, remainder = remainder.divmod(360000)
      minutes, remainder = remainder.divmod(6000)
      seconds, hundredths = remainder.divmod(100)
      case
      when days < 1
        sprintf('%02d:%02d:%02d.%02d',
                hours, minutes, seconds, hundredths)
      when days == 1
        sprintf('1 day, %02d:%02d:%02d.%02d',
                hours, minutes, seconds, hundredths)
      when days > 1
        sprintf('%d days, %02d:%02d:%02d.%02d',
                days, hours, minutes, seconds, hundredths)
      end
    end
  end

  class Opaque < OctetString
    def self.decode(value_data)
      Opaque.new(value_data)
    end

    def asn1_type
      "Opaque"
    end

    def encode
      encode_tlv(BER::Opaque_TAG, self)
    end
  end

  class Counter64 < Integer
    def self.decode(value_data)
      Counter64.new(decode_integer_value(value_data))
    end

    def asn1_type
      "Counter64"
    end

    def initialize(value)
      super(value)
      raise ArgumentError, "Negative integer invalid: #{@value}" if @value < 0
      raise ArgumentError, "Out of range: #{@value}" if @value > 18446744073709551615
    end

    def encode
      encode_tagged_integer(BER::Counter64_TAG, @value)
    end
  end

  class Null
    extend SNMP::BER::Encode

    class << self
      def decode(value_data)
        Null
      end

      def encode
        encode_null
      end

      def asn1_type
        'Null'
      end

      def to_s
        asn1_type
      end
    end
  end

  class NoSuchObject
    extend SNMP::BER::Encode

    class << self
      def decode(value_data)
        NoSuchObject
      end

      def encode
        encode_exception(BER::NoSuchObject_TAG)
      end

      def asn1_type
        'noSuchObject'
      end

      def to_s
        asn1_type
      end
    end
  end

  class NoSuchInstance
    extend SNMP::BER::Encode

    class << self
      def decode(value_data)
        NoSuchInstance
      end

      def encode
        encode_exception(BER::NoSuchInstance_TAG)
      end

      def asn1_type
        'noSuchInstance'
      end

      def to_s
        asn1_type
      end
    end
  end

  class EndOfMibView
    extend SNMP::BER::Encode

    class << self
      def decode(value_data)
        EndOfMibView
      end

      def encode
        encode_exception(BER::EndOfMibView_TAG)
      end

      def asn1_type
        'endOfMibView'
      end

      def to_s
        asn1_type
      end
    end
  end

  class VarBind
    include SNMP::BER::Encode
    extend SNMP::BER::Decode

    attr_accessor :name
    attr_accessor :value

    alias :oid :name

    class << self
      def decode(data, mib=nil)
        varbind_data, remaining_varbind_data = decode_sequence(data)
        name, remainder = decode_object_id(varbind_data)
        value, remainder = decode_value(remainder)
        assert_no_remainder(remainder)
        return VarBind.new(name, value).with_mib(mib), remaining_varbind_data
      end

      ValueDecoderMap = {
        BER::INTEGER_TAG           => Integer,
        BER::OCTET_STRING_TAG      => OctetString,
        BER::NULL_TAG              => Null,
        BER::OBJECT_IDENTIFIER_TAG => ObjectId,
        BER::IpAddress_TAG         => IpAddress,
        BER::Counter32_TAG         => Counter32,
        BER::Gauge32_TAG           => Gauge32,
        # note Gauge32 tag same as Unsigned32
        BER::TimeTicks_TAG         => TimeTicks,
        BER::Opaque_TAG            => Opaque,
        BER::Counter64_TAG         => Counter64,
        BER::NoSuchObject_TAG      => NoSuchObject,
        BER::NoSuchInstance_TAG    => NoSuchInstance,
        BER::EndOfMibView_TAG      => EndOfMibView
      }

      def decode_value(data)
        value_tag, value_data, remainder = decode_tlv(data)
        decoder_class = ValueDecoderMap[value_tag]
        if decoder_class
          value = decoder_class.decode(value_data)
        else
          raise UnsupportedValueTag, value_tag.to_s
        end
        return value, remainder
      end
    end

    def initialize(name, value=Null)
      if name.kind_of? ObjectId
        @name = name
      else
        @name = ObjectName.new(name)
      end
      @value = value
    end

    ##
    # Adds MIB information to this varbind for use with to_s.
    #
    def with_mib(mib)
      @name.with_mib(mib) if @name
      @value.with_mib(mib) if @value.respond_to? :with_mib
      self
    end

    def asn1_type
      "VarBind"
    end

    def to_varbind
      self
    end

    def to_s
      "[name=#{@name.to_s}, value=#{@value.to_s} (#{@value.asn1_type})]"
    end

    def each
      yield self
    end

    def encode
      data = encode_object_id(@name) << value.encode
      encode_sequence(data)
    end
  end

  class ObjectName < ObjectId
    def asn1_type
      "ObjectName"
    end
  end

end
