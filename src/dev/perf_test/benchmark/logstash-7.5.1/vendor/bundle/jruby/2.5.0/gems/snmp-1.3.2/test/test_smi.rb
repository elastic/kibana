# frozen_string_literal: true

require 'minitest/autorun'

begin
  require 'smi'

  class TestSmi < MiniTest::Unit::TestCase

    include SNMP::SMI

    def test_load
      name, oid_hash = load_smi_module('test/mibs/IF-MIB')
      assert_equal("IF-MIB", name)
      assert_equal("1.3.6.1.2.1.2.2", oid_hash["ifTable"])
    end

  end
rescue LoadError
  # snmp/smi may not always be available because it is a C extention
end
