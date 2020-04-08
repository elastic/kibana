require "java"
require "logstash-input-snmp_jars.rb"
require_relative "base_client"

java_import "org.snmp4j.CommunityTarget"
java_import "org.snmp4j.PDU"
java_import "org.snmp4j.ScopedPDU"
java_import "org.snmp4j.Snmp"
java_import "org.snmp4j.Target"
java_import "org.snmp4j.TransportMapping"
java_import "org.snmp4j.event.ResponseEvent"
java_import "org.snmp4j.mp.SnmpConstants"
java_import "org.snmp4j.smi.Address"
java_import "org.snmp4j.smi.GenericAddress"
java_import "org.snmp4j.smi.OID"
java_import "org.snmp4j.smi.OctetString"
java_import "org.snmp4j.smi.VariableBinding"
java_import "org.snmp4j.transport.DefaultUdpTransportMapping"
java_import "org.snmp4j.transport.DefaultTcpTransportMapping"
java_import "org.snmp4j.util.TreeUtils"
java_import "org.snmp4j.util.DefaultPDUFactory"
java_import "org.snmp4j.asn1.BER"

module LogStash
  class SnmpClient < BaseSnmpClient

    def initialize(protocol, address, port, community, version, retries, timeout, mib)
      super(protocol, address, port, retries, timeout, mib)
      raise(SnmpClientError, "SnmpClient is expecting verison '1' or '2c'") unless ["1", "2c"].include?(version.to_s)
      @target = build_target("#{protocol}:#{address}/#{port}", community, version, retries, timeout)
    end

    private

    def get_pdu
      pdu = PDU.new
      pdu.setType(PDU::GET)
      pdu
    end

    def get_pdu_factory
      DefaultPDUFactory.new
    end

    def build_target(address, community, version, retries, timeout)
      target = CommunityTarget.new
      target.setCommunity(OctetString.new(community))
      target.setAddress(GenericAddress.parse(address))
      target.setRetries(retries)
      target.setTimeout(timeout)
      target.setVersion(parse_version(version))
      target
    end
  end
end
