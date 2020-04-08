# frozen_string_literal: true

require 'minitest/autorun'
require 'snmp/manager'

class EchoTransport
  def initialize
  end

  def close
  end

  def send(data, host, port)
    @data = data
  end

  def recv(max_bytes)
    SNMP::Message.decode(@data).response.encode[0,max_bytes]
  end
end

class TestConfig < Minitest::Test

  include SNMP

  def test_new_style_symbols
    config = Manager::Config.new(:host => "test")
    assert_equal("test", config.host)
  end

  def test_defaults
    config = Manager::Config.new({})
    assert_equal("localhost", config.host)
  end

  def test_old_style_symbols
    config = Manager::Config.new(:Transport => "transport")
    assert_equal("transport", config.transport)
  end

  def test_invalid_option
    assert_raises(RuntimeError) { Manager::Config.new(:fly_to_the_moon => true) }
  end

  def test_ipv6_address_guessing
    config = Manager::Config.new(:host => "::1")
    assert(config.use_IPv6)
    assert_equal("::1", config.host)
  end

  def test_applied_config
    config = Manager::Config.new(:host => "1:2:3:4:5:6:7:8", :port => 42, :timeout => 3)
    config.host
    config.use_IPv6
    config.retries
    assert_equal({:host=>"1:2:3:4:5:6:7:8", :retries=>5, :use_IPv6=>true,
                  :Host => "1:2:3:4:5:6:7:8", :Retries => 5}, config.applied_config)
  end
end

class TestManager < Minitest::Test

  include SNMP

  def setup
    @manager = Manager.new(:Transport => EchoTransport.new)
  end

  def teardown
    @manager.close
  end

  def test_defaults
    assert_equal('localhost', @manager.config[:host])
    assert_equal(161, @manager.config[:port])
    assert_equal('public', @manager.config[:write_community])
  end

  def test_community
    @manager = Manager.new(:WriteCommunity=>'private', :Transport => EchoTransport.new)
    assert_equal('public', @manager.config[:community])
    assert_equal('private', @manager.config[:write_community])

    @manager = Manager.new(:Community=>'test', :Transport => EchoTransport.new)
    assert_equal('test', @manager.config[:community])
    assert_equal('test', @manager.config[:write_community])

    @manager = Manager.new(:Community=>'test', :WriteCommunity=>'private',
                           :Transport => EchoTransport.new)
    assert_equal('test', @manager.config[:community])
    assert_equal('private', @manager.config[:write_community])
  end

  def test_transport_instance
    @manager = Manager.new(:Transport => EchoTransport.new)
    response = @manager.get("1.2.3.4")
    assert_equal("1.2.3.4", response.varbind_list.first.name.to_s)
  end

  def test_get
    response = @manager.get("1.2.3.4")
    assert_equal("1.2.3.4", response.varbind_list.first.name.to_s)

    response = @manager.get([ObjectId.new("1.2.3.4"), ObjectId.new("1.2.3.4.5")])
    assert_equal(ObjectId.new("1.2.3.4.5"), response.varbind_list[1].name)
  end

  def test_get_with_nil
    assert_raises(ArgumentError) { @manager.get(nil) }
  end

  def test_get_value
    value = @manager.get_value("1.2.3.4")
    assert_equal(Null, value)

    value = @manager.get_value(["1.2.3.4"])
    assert_equal([Null], value)

    values = @manager.get_value(["1.2.3.4", "1.2.3.4.5"])
    assert_equal(2, values.length)
    assert_equal(Null, values[0])
    assert_equal(Null, values[1])
  end

  def test_get_next
    response = @manager.get_next("1.2.3.4")
    assert_equal("1.2.3.4", response.varbind_list.first.name.to_s)

    response = @manager.get_next([ObjectId.new("1.2.3.4"), ObjectId.new("1.2.3.4.5")])
    assert_equal(ObjectId.new("1.2.3.4.5"), response.varbind_list[1].name)
  end

  def test_get_next_with_nil
    assert_raises(ArgumentError) { @manager.get_next(nil) }
  end

  def test_set
    v0 = VarBind.new("1.3.6.1.3.1.1.1.0", OctetString.new("Hello1"))
    v1 = VarBind.new("1.3.6.1.3.1.1.1.0", OctetString.new("Hello2"))
    response = @manager.set([v0, v1])
    assert_equal("Hello1", response.varbind_list[0].value.to_s)
    assert_equal("Hello2", response.varbind_list[1].value.to_s)
  end
 
  def test_set_with_nil
    assert_raises(ArgumentError) { @manager.set(nil) }
  end

  def test_single_set
    varbind = VarBind.new("1.3.6.1.3.1.1.1.0", OctetString.new("Hello"))
    response = @manager.set(varbind)
    assert_equal("Hello", response.varbind_list.first.value.to_s)
  end

  def test_get_bulk
    response = @manager.get_bulk(1, 3, ["1.3.6.1.3.1.1.1.0", "1.3.6.1.3.1.1.2.0"])
    assert_equal(:noError, response.error_status)
    assert_equal(0, response.error_index)
    assert_equal(2, response.varbind_list.length)
    assert_equal("SNMPv2-SMI::experimental.1.1.1.0", response.varbind_list[0].name.to_s)
    assert_equal("SNMPv2-SMI::experimental.1.1.2.0", response.varbind_list[1].name.to_s)
  end

  def test_get_bulk_with_nil
    assert_raises(ArgumentError) { @manager.get_bulk(nil, nil, nil) }
  end

  def test_walk
    old_verbose = $VERBOSE
    $VERBOSE = nil
    @manager.walk("ifTable") { fail "Expected break from OID not increasing" }
  ensure
    $VERBOSE = old_verbose
  end

  def test_walk_with_nil
    assert_raises(ArgumentError) { @manager.walk(nil) {} }
  end

  def test_request_id
    id = RequestId.new
    fail if id.next < 0 or id.next >= 2**31

    id.force_next(1)
    assert_equal(1, id.next)

    id.force_next(RequestId::MAX_REQUEST_ID-1)
    assert_equal(RequestId::MAX_REQUEST_ID-1, id.next)

    assert_raises(RuntimeError) { id.force_next(RequestId::MAX_REQUEST_ID) }
    assert_raises(RuntimeError) { id.force_next(0) }
  end

  def test_trap_v1
    manager = Manager.new(:Transport => EchoTransport.new, :Version => :SNMPv1)
    sent_data = manager.trap_v1(
      "enterprises.9",
      "10.1.2.3",
      :enterpriseSpecific,
      42,
      12345,
      [VarBind.new("1.3.6.1.2.3.4", SNMP::Integer.new(1))]
    )
    pdu = Message.decode(sent_data).pdu
    assert_equal(ObjectId.new("1.3.6.1.4.1.9"), pdu.enterprise)
    assert_equal(IpAddress.new("10.1.2.3"), pdu.agent_addr)
    assert_equal(:enterpriseSpecific, pdu.generic_trap)
    assert_equal(42, pdu.specific_trap)
    assert_equal(TimeTicks.new(12345), pdu.timestamp)
    assert_equal(1, pdu.vb_list.length)
  end

  def test_trap_v1_with_nil
    assert_raises(ArgumentError) { @manager.trap_v1(nil) }
  end

  def test_trap_v2
    sent_data = @manager.trap_v2(1234, "1.3.6.1.2.3.4")
    pdu = Message.decode(sent_data).pdu
    assert_equal(1234, pdu.sys_up_time)
    assert_equal("1.3.6.1.2.3.4", pdu.trap_oid.to_s)
    assert_equal(2, pdu.vb_list.length)

    sent_data = @manager.trap_v2(1234, "1.3.6.1.2.3.4", ["1.2.3", "1.4.5.6"])
    pdu = Message.decode(sent_data).pdu
    assert_equal(1234, pdu.sys_up_time)
    assert_equal("1.3.6.1.2.3.4", pdu.trap_oid.to_s)
    assert_equal(4, pdu.vb_list.length)
    assert_equal("1.4.5.6", pdu.vb_list.last.name.to_s)
  end

  def test_trap_v2_with_nil
    assert_raises(ArgumentError) { @manager.trap_v2(nil, nil, nil) }
  end

  def test_inform
    response = @manager.inform(1234, "1.3.6.1.2.3.4")
    assert_equal(1234, response.vb_list[0].value)
    assert_equal("SNMPv2-SMI::mgmt.3.4", response.vb_list[1].value.to_s)
    assert_equal(2, response.vb_list.length)

    response = @manager.inform(1234, "1.3.6.1.2.3.4", ["1.2.3", "1.4.5.6"])
    assert_equal(1234, response.vb_list[0].value)
    assert_equal("SNMPv2-SMI::mgmt.3.4", response.vb_list[1].value.to_s)
    assert_equal(4, response.vb_list.length)
  end
end

class TrapTestTransport
  include SNMP
  def initialize
    @count = 0
    sys_up_varbind = VarBind.new(ObjectId.new("1.3.6.1.2.1.1.3.0"),
                                 TimeTicks.new(1234))
    trap_oid_varbind = VarBind.new(ObjectId.new("1.3.6.1.6.3.1.1.4.1.0"),
                                   ObjectId.new("1.2.3"))
    trap = SNMPv2_Trap.new(42, VarBindList.new([sys_up_varbind, trap_oid_varbind]))
    message = Message.new(:SNMPv2c, "public", trap)
    @data = message.encode
  end

  def close
  end

  def recvfrom(max_bytes)
    @count += 1
    case @count
    when 1
      return @data, "127.0.0.1"
    when 2
      Thread.exit
    else
      raise "Huh?"
    end
  end
end


class TestTrapListener < Minitest::Test
  include SNMP

  def test_init_no_handlers
    init_called = false
    m = TrapListener.new(:ServerTransport => TrapTestTransport.new) do |manager|
      init_called = true
    end
    m.join
    assert(init_called)
  end

  def test_v2c_handler
    default_called = false
    v2c_called = false
    m = TrapListener.new(:ServerTransport => TrapTestTransport.new) do |manager|
      manager.on_trap_default { default_called = true }
      manager.on_trap_v2c { v2c_called = true }
    end
    m.join
    assert(!default_called)
    assert(v2c_called)
  end

  def test_oid_handler
    default_called = false
    v2c_called = false
    oid_called = false
    m = TrapListener.new(:ServerTransport => TrapTestTransport.new) do |manager|
      manager.on_trap("1.2.3") do |trap|
        assert_equal(ObjectId.new("1.2.3"), trap.trap_oid)
        assert_equal("127.0.0.1", trap.source_ip)
        oid_called = true
      end
      manager.on_trap_default { default_called = true }
      manager.on_trap_v2c { v2c_called = true }
    end
    m.join
    assert(!default_called)
    assert(!v2c_called)
    assert(oid_called)
  end

  ##
  # Should filter traps with a 'public' community if that community is not accepted
  #
  def test_reject_community
    assert !public_trap_passes?("test")
    assert !public_trap_passes?(["foo", "bar"])
    assert !public_trap_passes?([])
  end

  ##
  # Should accept traps with a 'public' community if that community is allowed.
  #
  def test_accept_community
    assert public_trap_passes? "public"
    assert public_trap_passes? ["test", "public"]
    assert public_trap_passes? nil
  end

  def public_trap_passes?(community_filter)
    default_called = false
    m = TrapListener.new(
        :community => community_filter,
        :server_transport => TrapTestTransport.new) do |manager|
      manager.on_trap_default { default_called = true }
    end
    m.join
    default_called
  end

end
