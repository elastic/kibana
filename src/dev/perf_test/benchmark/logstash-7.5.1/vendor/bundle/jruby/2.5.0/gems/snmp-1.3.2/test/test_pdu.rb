# encoding: ascii-8bit
# frozen_string_literal: true

require 'snmp/pdu'
require 'minitest/autorun'

class TestProtocol < Minitest::Test

  include SNMP

  def test_message_decode_v1
    message = SNMP::Message.decode("0'\002\001\000\004\006public\240\032\002\002\003\350\002\001\000\002\001\0000\0160\f\006\010+\006\001\002\001\001\001\000\005\000")
    assert_equal(:SNMPv1, message.version)
    assert_equal("public", message.community)
    assert_equal(SNMP::GetRequest, message.pdu.class)
    varbind_list = message.pdu.vb_list;
    assert_equal(1, varbind_list.length)
    assert_equal([1,3,6,1,2,1,1,1,0], varbind_list.first.name)
    assert_equal(SNMP::Null, varbind_list.first.value)
  end

  def test_message_decode_v2c
    message = SNMP::Message.decode("0)\002\001\001\004\006public\240\034\002\0040\265\020\202\002\001\000\002\001\0000\0160\f\006\010+\006\001\002\001\001\001\000\005\000")
    assert_equal(:SNMPv2c, message.version)
    assert_equal("public", message.community)
    varbind_list = message.pdu.vb_list;
    assert_equal(1, varbind_list.length)
    assert_equal([1,3,6,1,2,1,1,1,0], varbind_list.first.name)
    assert_equal(SNMP::Null, varbind_list.first.value)
  end

  def test_message_decoder_v3
    assert_raises(SNMP::UnsupportedVersion) do
      SNMP::Message.decode("0>\002\001\0030\021\002\004&\266\342\314\002\003\000\377\343\004\001\004\002\001\003\004\0200\016\004\000\002\001\000\002\001\000\004\000\004\000\004\0000\024\004\000\004\000\240\016\002\004\v\3623\233\002\001\000\002\001\0000\000")
    end
  end

  def test_encode_message
    varbind = SNMP::VarBind.new([1,3,6,1234], SNMP::OctetString.new("value"))
    list = SNMP::VarBindList.new
    list << varbind << varbind;
    pdu = SNMP::Response.new(12345, list)
    message = SNMP::Message.new(:SNMPv2c, "public", pdu)
    assert_equal("07\002\001\001\004\006public\242*\002\00209\002\001\000\002\001\0000\0360\r\006\004+\006\211R\004\005value0\r\006\004+\006\211R\004\005value", message.encode)
  end

  def test_get_request_from_single_string
    request = SNMP::GetRequest.new(42, VarBindList.new(["1.3.6.1"]))
    assert_equal(42, request.request_id)
    assert_equal(1, request.varbind_list.length)
    assert_equal([1,3,6,1], request.varbind_list.first.name)
    assert_equal(SNMP::Null, request.varbind_list.first.value)
  end

  def test_get_request_from_multi_string
    request = SNMP::GetRequest.new(42, VarBindList.new(["1.3.6.1", "1.3.6.2"]))
    assert_equal(2, request.varbind_list.length)
    assert_equal([1,3,6,1], request.varbind_list.first.name)
  end

  def test_get_request_from_varbind
    request = GetRequest.new(42, VarBindList.new(VarBind.new([1,3,6,1], Null)))
    assert_equal(1, request.varbind_list.length)
    assert_equal([1,3,6,1], request.varbind_list.first.name)
  end

  def test_get_next_from_single_string
    request = SNMP::GetNextRequest.new(42, VarBindList.new("1.3.5.1"))
    assert_equal(42, request.request_id)
    assert_equal(1, request.varbind_list.length)
    assert_equal([1,3,5,1], request.varbind_list.first.name)
  end

  def test_get_next_from_single_object_id
    request = SNMP::GetNextRequest.new(42, VarBindList.new([ObjectId.new("1.3.5.1")]))
    assert_equal(42, request.request_id)
    assert_equal(1, request.varbind_list.length)
    assert_equal([1,3,5,1], request.varbind_list.first.name)
  end

  def test_each_varbind
    request = SNMP::GetRequest.new(42, VarBindList.new(["1.3.6.1", "1.3.6.2"]))
    count = 0
    request.each_varbind do |v|
      case count
      when 0
        assert_equal(ObjectName.new("1.3.6.1"), v.name)
      when 1
        assert_equal(ObjectName.new("1.3.6.2"), v.name)
      else
        fail "Unexpected count"
      end
      count +=1
    end
  end

  def test_get_bulk_create
    request = SNMP::GetBulkRequest.new(1234, VarBindList.new("1.3.6.2"), 20, 10)
    assert_equal(1234, request.request_id)
    assert_equal(20, request.non_repeaters)
    assert_equal(10, request.max_repetitions)
    assert_equal(1, request.varbind_list.length)
    assert_equal("1.3.6.2", request.varbind_list.first.name.to_s)
  end

  def test_get_bulk_encode
    request = SNMP::GetBulkRequest.new(1234, VarBindList.new, 0, 10)
    assert_equal("\245\f\002\002\004\322\002\001\000\002\001\n0\000", request.encode)
  end

  def test_error_status
    request = GetRequest.new(42, VarBindList.new("1.3.12.23.4"))
    assert_equal(:noError, request.error_status)

    request.error_status = :noCreation
    assert_equal(:noCreation, request.error_status)

    request.error_status = 2
    assert_equal(:noSuchName, request.error_status)

    request.error_status = 42
    assert_equal(42, request.error_status)

    assert_raises(InvalidErrorStatus) {request.error_status = "myErrorString"}
    
    assert_raises(InvalidErrorStatus) {request.error_status = :myErrorSymbol}
  end

  def test_snmpv2_trap
    sys_up_varbind = VarBind.new(ObjectId.new("1.3.6.1.2.1.1.3.0"),
                                 TimeTicks.new(1234))
    trap_oid_varbind = VarBind.new(ObjectId.new("1.3.6.1.6.3.1.1.4.1.0"),
                                   ObjectId.new("1.2.3"))
    trap = SNMPv2_Trap.new(42, VarBindList.new([sys_up_varbind, trap_oid_varbind]))
    assert_equal("\247-\002\001*\002\001\000\002\001\0000\"0\016\006\010+\006\001\002\001\001\003\000C\002\004\3220\020\006\n+\006\001\006\003\001\001\004\001\000\006\002*\003", trap.encode)
    assert_equal(1234, trap.sys_up_time.to_i)
    assert_equal("1.2.3", trap.trap_oid.to_s)
  end

  def test_snmpv2_invalid_trap
    trap = SNMPv2_Trap.new(42, VarBindList.new([]))
    assert_raises(InvalidTrapVarbind) { trap.sys_up_time }
    assert_raises(InvalidTrapVarbind) { trap.trap_oid }
  end

  def test_snmpv1_generic_trap
    trap = SNMPv1_Trap.new(nil, nil, 0, nil, nil, nil)
    assert_equal(:coldStart, trap.generic_trap)

    trap.generic_trap = :warmStart
    assert_equal(:warmStart, trap.generic_trap)

    trap.generic_trap = 6
    assert_equal(:enterpriseSpecific, trap.generic_trap)

    assert_raises(InvalidGenericTrap) { trap.generic_trap = -1 }
    assert_raises(InvalidGenericTrap) { trap.generic_trap = 7 }
  end

  def test_snmpv1_trap_encode
    enterprise = ObjectId.new("1.3.6.1.123")
    agent_addr = IpAddress.new("1.2.3.4")
    generic_trap = :linkDown
    specific_trap = 0
    timestamp = TimeTicks.new(2176117721)
    varbinds = VarBindList.new([VarBind.new("1.3.6.2", SNMP::Integer.new(1))])
    trap = SNMPv1_Trap.new(enterprise, agent_addr, generic_trap, specific_trap, timestamp, varbinds)
    assert_equal("\244%\006\004+\006\001{@\004\001\002\003\004\002\001\002\002\001\000C\005\000\201\264\353\3310\n0\010\006\003+\006\002\002\001\001", trap.encode)

    encoded = Message.new(:SNMPv1, "public", trap).encode
    trap = Message.decode(encoded).pdu
    assert_equal(enterprise, trap.enterprise)
    assert_equal(agent_addr, trap.agent_addr)
    assert_equal(:linkDown, trap.generic_trap)
    assert_equal(0, trap.specific_trap)
    assert_equal(2176117721, trap.timestamp.to_i)
    assert_equal(1, trap.varbind_list.length)
    assert_equal(ObjectId.new("1.3.6.2"), trap.varbind_list.first.name)
  end

  def test_response_pdu
    pdu = Response.new(2147483647, VarBindList.new, :noError, 0)
    assert_equal("\242\016\002\004\177\377\377\377\002\001\000\002\001\0000\000", pdu.encode)

    encoded = Message.new(:SNMPv2c, "public", pdu).encode
    pdu = Message.decode(encoded).pdu
    assert_equal(2147483647, pdu.request_id)
    assert_equal(:noError, pdu.error_status)
    assert_equal(0, pdu.error_index)
    assert_equal(0, pdu.varbind_list.length)
  end

  def test_response_pdu_unknown_error
    pdu = Response.new(2147483647, VarBindList.new, 6883501, 0)
    assert_equal("\xA2\x10\x02\x04\x7F\xFF\xFF\xFF\x02\x03\x69\x08\xAD\x02\x01\x00\x30\x00", pdu.encode)

    encoded = Message.new(:SNMPv2c, "public", pdu).encode
    pdu = Message.decode(encoded).pdu
    assert_equal(6883501, pdu.error_status)
  end
end
