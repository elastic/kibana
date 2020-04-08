# frozen_string_literal: true

require 'minitest/autorun'
require 'snmp/mib'

module SNMP

  class TestMib < Minitest::Test

    def setup
      @mib = MIB.new
      @mib.load_module("SNMPv2-SMI")
      @mib.load_module("SNMPv2-MIB")
      @mib.load_module("IF-MIB")
    end

    def test_name_to_oid
      oid = @mib.oid("1.2.3.4")
      assert_equal("1.2.3.4", oid.to_s)

      oid = @mib.oid("ifTable")
      assert_equal("1.3.6.1.2.1.2.2", oid.to_s)

      oid = @mib.oid("sysDescr.0")
      assert_equal("1.3.6.1.2.1.1.1.0", oid.to_s)

      oid = @mib.oid("ifTable.1.23")
      assert_equal("1.3.6.1.2.1.2.2.1.23", oid.to_s)

      oid = @mib.oid("IF-MIB::ifTable.1.23")
      assert_equal("1.3.6.1.2.1.2.2.1.23", oid.to_s)

      assert_raises(MIB::ModuleNotLoadedError) {
        @mib.oid("IFMIB::ifTable.1.23")
      }

      assert_raises(ArgumentError) {
        @mib.oid("IF-MIB::")
      }

      assert_raises(ArgumentError) {
        MIB.new.oid("sysDescr.0")
      }

      assert_equal("1.2.3.4", MIB.new.oid("1.2.3.4").to_s)
    end

    def test_varbind_list
      vb_list = @mib.varbind_list("1.2.3.4")
      assert_equal(1, vb_list.length)
      assert_equal("1.2.3.4", vb_list.first.name.to_s)

      vb_list = @mib.varbind_list(["1.2.3.4"])
      assert_equal(1, vb_list.length)
      assert_equal("1.2.3.4", vb_list.first.name.to_s)

      vb_list = @mib.varbind_list(["IF-MIB::ifTable.1.23", "1.2.3.4"])
      assert_equal(2, vb_list.length)
      assert_equal("1.3.6.1.2.1.2.2.1.23", vb_list.first.name.to_s)
    end

    def test_varbind_list_with_nil
      assert_raises(ArgumentError) { @mib.varbind_list(nil) }
    end

    def test_varbind
      vb = @mib.varbind("1.2.3.4", Null)
      assert_equal("1.2.3.4", vb.name.to_s)
      assert_equal(Null, vb.value)

      vb = @mib.varbind("IF-MIB::ifTable.3.45", Integer.new(2))
      assert_equal("1.3.6.1.2.1.2.2.3.45", vb.name.to_s)
      assert_equal(2, vb.value)
    end

    def test_list
      list = MIB.list_imported(/SNMPv2/)
      assert_equal(4, list.length)
    end

    def test_name
      cases = [["1.3.6.1.2.1.2.2.3.45", "IF-MIB::ifTable.3.45"],
               ["1.3.6.1.2.1.1.0", "SNMPv2-MIB::system.0"],
               ["1.2.3.4", "1.2.3.4"],
               ["1.3", "SNMPv2-SMI::org"],
               ["1.2", "1.2"],
               ["1", "1"],
               ["", ""]]
      cases.each do |oid, expected_name|
        name = @mib.name(oid)
        assert_equal(expected_name, name)
      end
    end

    # def test_import
    #     module_name = MIB.import_module('SNMPv2-MIB')
    #     assert_equal('SNMPv2-MIB', module_name)
    # end

  end

end
