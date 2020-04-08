# frozen_string_literal: true

require 'snmp'
require 'minitest/autorun'
require 'yaml'

include SNMP

##
# Accept get and get-next requests, returning the data from the
# provided YAML data file.  The file contains a list of OID, value, and
# value type.
#
class YamlDataTransport
  def self.load_data(yaml_file)
    values = YAML.load(File.new(yaml_file))
    @@get_map = {}
    @@get_next_map = {}
    values.each_index do |i|
      name, value, klass = values[i]
      if i < values.length - 1
        next_name, next_value, next_klass = values[i + 1]
      else
        next_value = SNMP::EndOfMibView
        next_klass = SNMP::EndOfMibView
      end
      @@get_map[name] = [name, value, klass]
      @@get_next_map[name] = [next_name, next_value, next_klass]
    end
  end

  def initialize
    @responses = []
  end

  def close
  end

  def send(data, host, port)
    msg = Message.decode(data)
    req_class = msg.pdu.class
    if req_class == SNMP::GetRequest
      oid_map = @@get_map
    elsif req_class == SNMP::GetNextRequest
      oid_map = @@get_next_map
    else
      raise "request not supported: " + req_class
    end

    resp = msg.response
    resp.pdu.vb_list.each do |vb|
      name, value, klass = oid_map[vb.name.to_s]
      vb.name = ObjectId.new(name)
      if klass == "SNMP::NoSuchObject" or klass == "SNMP::NoSuchInstance"
        vb.value = eval(klass)
      elsif value
        vb.value = eval("#{klass}.new(value)")
      else
        vb.value = SNMP::NoSuchInstance
      end
    end
    @responses << resp.encode
  end

  def recv(max_bytes)
    @responses.shift
  end
end

class TestTransport < Minitest::Test

  def test_get
    YamlDataTransport.load_data(File.dirname(__FILE__) + "/if_table6.yaml")
    SNMP::Manager.open(:Transport => YamlDataTransport.new) do |snmp|
      value = snmp.get_value("ifDescr.1")
      assert_equal("lo0", value)
    end
  end

  def test_get_next
    YamlDataTransport.load_data(File.dirname(__FILE__) + "/if_table6.yaml")
    SNMP::Manager.open(:Transport => YamlDataTransport.new) do |snmp|
      vb = snmp.get_next("ifDescr.1")
      assert_equal("gif0", vb.vb_list.first.value)
    end
  end

end

class TestWalk < Minitest::Test

  ##
  # A single string or single ObjectId can be passed to walk()
  #
  def test_single_object
    list = []
    ifTable6_manager.walk("ifDescr") do |vb|
      assert(vb.kind_of?(VarBind), "Expected a VarBind")
      list << vb
    end
    assert_equal(6, list.length)

    list = []
    ifTable6_manager.walk(ObjectId.new("1.3.6.1.2.1.2.2.1.2")) do |vb|
      assert(vb.kind_of?(VarBind), "Expected a VarBind")
      list << vb
    end
    assert_equal(6, list.length)
  end


  ##
  # If a list of one element is passed to walk() then a list of
  # one element is passed as the block parameter.
  #
  def test_single_object_list
    executed_block = false
    ifTable6_manager.walk(["1.3.6.1.2.1.2.2.1.2"]) do |vb_list|
      executed_block = true
      assert_equal(1, vb_list.length)
      assert_equal("IF-MIB::ifDescr.1", vb_list.first.name.to_s)
      break
    end
    assert(executed_block, "Did not execute block")
  end

  ##
  # If a list of multiple items are passed to walk() then
  # multiple items are passed to the block.
  #
  def test_object_list
    list1 = []
    list2 = []
    ifTable6_manager.walk(["ifIndex", "ifDescr"]) do |vb1, vb2|
      list1 << vb1
      list2 << vb2
    end
    assert_equal(6, list1.length)
    assert_equal(6, list2.length)

    list1 = []
    list2 = []
    ifTable6_manager.walk(["ifIndex", "ifDescr"], 1) do |vb1, vb2|
      list1 << vb1
      list2 << vb2
    end
    assert_equal(6, list1.length)
    assert_equal(6, list2.length)
  end

  def test_empty
    ifTable6_manager.walk("1.3.6.1.2.1.2.2.1.2.1") do |vb|
      fail("Expected block to not be executed")
    end
  end

  def test_one
    list = []
    ifTable1_manager.walk(["1.3.6.1.2.1.2.2.1.1", "1.3.6.1.2.1.2.2.1.2"]) do |vb|
      assert_equal("IF-MIB::ifIndex.1", vb[0].name.to_s)
      assert_equal("IF-MIB::ifDescr.1", vb[1].name.to_s)
      list << vb
    end
    assert_equal(1, list.length)
  end

  def test_hole_in_one
    list = []
    ifTable1_manager.walk(["ifIndex", "ifDescr", "ifType"]) do |vb|
      assert_equal("IF-MIB::ifIndex.1", vb[0].name.to_s)
      assert_equal(1, vb[0].value)
      assert_equal("IF-MIB::ifDescr.1", vb[1].name.to_s)
      assert_equal("lo0", vb[1].value)
      assert_equal("IF-MIB::ifType.1", vb[2].name.to_s)
      assert_equal(NoSuchInstance, vb[2].value)
      list << vb
      break
    end
    assert_equal(1, list.length)
  end

  private

    def ifTable1_manager
      YamlDataTransport.load_data(File.dirname(__FILE__) + "/if_table1.yaml")
      Manager.new(:Transport => YamlDataTransport.new)
    end

    def ifTable6_manager
      YamlDataTransport.load_data(File.dirname(__FILE__) + "/if_table6.yaml")
      Manager.new(:Transport => YamlDataTransport.new)
    end
end
