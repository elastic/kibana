# frozen_string_literal: true

require 'minitest/autorun'
require 'snmp'

class TimeoutManager  < SNMP::Manager
  attr_accessor :response_count

  def initialize(config)
    super(config)
    @response_count = 0
    @raise_on_send = false
    @raise_on_get = false
  end

  def raise_send_error
    @raise_on_send = true
  end

  def raise_get_error
    @raise_on_get = true
  end

  def send_request(request, community, host, port)
    raise RuntimeError if @raise_on_send
  end

  def get_response(request)
    @response_count += 1
    raise RuntimeError if @raise_on_get
    raise Timeout::Error, "testing retry count"
  end
end

class MismatchIdTransport
  def initialize
    @data = []
  end

  def close
  end

  def send(data, host, port)
    bad_id_data = data.dup
    bad_msg = SNMP::Message.decode(bad_id_data)
    bad_msg.pdu.request_id -= 3  # corrupt request_id
    @data << bad_msg.encode # insert corrupted PDU before real data
    @data << bad_id_data
  end

  def recv(max_bytes)
    raise "receive queue is empty" unless @data.first
    SNMP::Message.decode(@data.shift).response.encode[0,max_bytes]
  end
end


class TestRetry < Minitest::Test
  def test_retry_count
    assert_response_count(0, 1, SNMP::RequestTimeout)
    assert_response_count(1, 2, SNMP::RequestTimeout)
    assert_response_count(5, 6, SNMP::RequestTimeout)
  end

  def test_retry_on_error
    assert_response_count(5, 0, RuntimeError) { |m| m.raise_send_error }
    old_verbose = $VERBOSE
    $VERBOSE = nil
    assert_response_count(5, 6, SNMP::RequestTimeout) { |m| m.raise_get_error }
    $VERBOSE = old_verbose
  end

  def assert_response_count(retry_count, response_count, exception)
    m = TimeoutManager.new( :Retries => retry_count )
    yield m if block_given?
    assert_raises(exception) { m.get("1.2.3.4") }
    assert_equal(response_count, m.response_count)
  end

  def test_drop_mismatched_id
    m = SNMP::Manager.new(:Transport => MismatchIdTransport.new)
    m.get("1.2.3.4")
  end
end
