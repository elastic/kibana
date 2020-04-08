# encoding: ascii-8bit
# frozen_string_literal: true

require 'minitest/autorun'
require 'snmp/varbind'
require 'snmp/ber'

class ASN1_Test < Minitest::Test

  include SNMP::BER::Encode
  include SNMP::BER::Decode

  def test_decode_tlv_empty
    tag, value, data = decode_tlv("\001\000")
    assert_equal(1, tag)
    assert_equal("", value)
    assert_equal("", data)

    tag, value, data = decode_tlv("\001\000\111")
    assert_equal(1, tag)
    assert_equal("", value)
    assert_equal("\111", data)
  end

  # Decode TLV data with the short-format length field.
  def test_decode_tlv_short
    tag, value, data = decode_tlv("\001\002\023\044")
    assert_equal(1, tag)
    assert_equal("\023\044", value)
    assert_equal("", data)
  end

  # Extra bytes of data are returned.
  def test_decode_tlv_short_extra
    tag, value, data = decode_tlv("\001\002\023\044\000")
    assert_equal(1, tag)
    assert_equal("\023\044", value)
    assert_equal("\000", data)
  end

  # Decode TLV data with long-format length field
  def test_decode_tlv_long
    long_data = "".dup; 128.times { |i| long_data << i.chr }
    tag, value, data = decode_tlv("\001\201\200" + long_data)
    assert_equal(1, tag)
    assert_equal(long_data, value)
    assert_equal("", data)
  end

  # Long format with extra bytes - use four bytes for length
  def test_decode_tlv_long_extra
    long_data = "".dup; 129.times { |i| long_data << i.chr }
    tag, value, data = decode_tlv("\001\204\000\000\000\201" + long_data + "\123\123\123")
    assert_equal(1, tag)
    assert_equal(long_data, value)
    assert_equal("\123\123\123", data)
  end

  # Check invalid length - ASN.1 says that first length octet can't be 255.
  def test_bad_length
    assert_raises(BER::InvalidLength) {
      decode_tlv("\001\377\001")
    }
  end

  # Check if input data is too short
  def test_out_of_data
    assert_raises(BER::OutOfData) {
      decode_tlv("\001\001")
    }
    assert_raises(BER::OutOfData) {
      decode_tlv("\001")
    }
    assert_raises(BER::OutOfData) {
      decode_tlv("")
    }
  end

  # Decode single-octet ASN.1 integer.
  # Number is negative (2's complement) if high order bit is 1.
  def test_decode_integer_octet
    i, data = decode_integer("\002\001\042")
    assert_equal(34, i)
    assert_equal("", data)
    i, data = decode_integer("\002\001\377")
    assert_equal(-1, i)
    assert_equal("", data)
  end

  # Decode multi-octet ASN.1 integer.
  def test_decode_integer
    i, data = decode_integer("\002\004\001\002\003\004")
    assert_equal(16909060, i)
    assert_equal("", data)

    i, data = decode_integer("\002\004\377\377\377\376")
    assert_equal(-2, i)
    assert_equal("", data)

    i, data = decode_integer("\002\003\000\377\376")
    assert_equal(65534, i)
    assert_equal("", data)

    i, data = decode_integer("\002\002\000\377")
    assert_equal(255, i)
    assert_equal("", data)

    assert_raises(BER::InvalidTag) {
      decode_integer("\001\004\001\002\003\004")
    }
  end

  def test_decode_timeticks
    i, data = decode_timeticks("\103\004\001\002\003\004")
    assert_equal(16909060, i)
    assert_equal("", data)

    assert_raises(BER::InvalidTag) {
      decode_timeticks("\002\004\001\002\003\004")
    }
  end

  # Decode ASN.1 octet string
  def test_decode_octet_string
    s, _ = decode_octet_string("\004\202\000\005hello")
    assert_equal("hello",s)
    assert_raises(BER::InvalidTag) {
      decode_octet_string("\005\202\000\005hello")
    }
  end

  def test_decode_ip_address
    ip, _ = decode_ip_address("@\004\001\002\003\004")
    assert_equal(ip, "\001\002\003\004")
    assert_raises(BER::InvalidTag) {
      decode_ip_address("\004\004\001\002\003\004")
    }
    assert_raises(BER::InvalidLength) {
      decode_ip_address("@\005\001\002\003\004\005")
    }
  end

  # Decode ASN.1 sequence
  def test_decode_sequence
    seq, data = decode_sequence("\060\003\002\001\077")
    assert_equal("\002\001\077", seq)
    assert_equal("", data)

    seq, data = decode_sequence("\060\003\002\001\077\002\001\001")
    assert_equal("\002\001\077", seq)
    assert_equal("\002\001\001", data)

    assert_raises(BER::InvalidTag) {
      decode_sequence("\061\003\002\001\077")
    }
  end

  def test_decode_object_id
    # Handle an empty object identifier because net-snmp does it and
    # they probably had a good reason.
    object_id, remainder = decode_object_id("\006\000")
    assert_equal([], object_id)
    assert_equal("", remainder)

    object_id, remainder = decode_object_id("\006\001+")
    assert_equal([1,3], object_id);
    assert_equal("", remainder)

    object_id, remainder = decode_object_id("\006\002+\006")
    assert_equal([1,3,6], object_id);
    assert_equal("", remainder)

    object_id, remainder = decode_object_id("\006\003+\202\001")
    assert_equal([1,3,257], object_id);
    assert_equal("", remainder)

    object_id, remainder = decode_object_id("\006\003S\202\001")
    assert_equal([2,3,257], object_id);
    assert_equal("", remainder)

    object_id, remainder = decode_object_id("\006\001\000")
    assert_equal([0,0], object_id);
    assert_equal("", remainder)

    assert_raises(BER::InvalidTag) do
      decode_object_id("\007\001+")
    end
  end

  def test_encode_length
    assert_equal("\000", encode_length(0))
    assert_equal("\001", encode_length(1))
    assert_equal("\177", encode_length(127))
    assert_equal("\201\200", encode_length(128))
    assert_equal("\202\002\001", encode_length(513))
    assert_raises(BER::InvalidLength) { encode_length(-1) }
  end

  def test_encode_integer
    assert_equal("\002\001\000", encode_integer(0))
    assert_equal("\002\001\001", encode_integer(1))
    assert_equal("\002\001\177", encode_integer(127))
    assert_equal("\002\002\000\200", encode_integer(128))
    assert_equal("\002\002\000\377", encode_integer(255))
    assert_equal("\002\002\001\000", encode_integer(256))

    assert_equal("\002\001\377", encode_integer(-1))
    assert_equal("\002\001\200", encode_integer(-128))
    assert_equal("\002\002\377\177", encode_integer(-129))
  end

  def test_encode_octet_string
    assert_equal("\004\015Dave was here", encode_octet_string("Dave was here"))
    assert_equal("\004\000", encode_octet_string(""))
  end

  def test_encode_sequence
    assert_equal("0\015Dave was here", encode_sequence("Dave was here"))
    assert_equal("0\000", encode_sequence(""))
  end

  def test_encode_null
    assert_equal("\005\000", encode_null)
  end

  def test_encode_exception
    assert_equal("\200\000", encode_exception(0x80))
  end

  def test_encode_object_id
    assert_equal("\006\001".dup << 80.chr, encode_object_id([2]))
    assert_equal("\006\001\000", encode_object_id([0,0]))
    assert_equal("\006\001+", encode_object_id([1,3]))
    assert_equal("\006\002+\006", encode_object_id([1,3,6]))
    assert_equal("\006\003+\202\001", encode_object_id([1,3,257]))
    assert_equal("\006\003".dup << 82.chr << "\202\001", encode_object_id([2,2,257]))
    assert_raises(BER::InvalidObjectId) { encode_object_id([3,2,257]) }
    assert_raises(BER::InvalidObjectId) { encode_object_id([]) }

    assert_equal("\006\a+\203\377\177\203\377\177",
                 encode_object_id(SNMP::ObjectId.new("1.3.65535.65535")))
  end
end
