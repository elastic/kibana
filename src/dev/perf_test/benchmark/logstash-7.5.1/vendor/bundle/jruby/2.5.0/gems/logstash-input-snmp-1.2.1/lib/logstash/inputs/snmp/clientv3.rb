require 'java'
require 'logstash-input-snmp_jars.rb'


java_import 'org.snmp4j.PDU'
java_import 'org.snmp4j.ScopedPDU'
java_import 'org.snmp4j.Snmp'
java_import 'org.snmp4j.Target'
java_import 'org.snmp4j.TransportMapping'
java_import 'org.snmp4j.event.ResponseEvent'
java_import 'org.snmp4j.mp.MPv3'
java_import 'org.snmp4j.mp.SnmpConstants'
java_import 'org.snmp4j.security.AuthMD5'
java_import 'org.snmp4j.security.AuthSHA'
java_import 'org.snmp4j.security.AuthSHA2'
java_import 'org.snmp4j.security.AuthHMAC128SHA224'
java_import 'org.snmp4j.security.AuthHMAC192SHA256'
java_import 'org.snmp4j.security.AuthHMAC256SHA384'
java_import 'org.snmp4j.security.AuthHMAC384SHA512'
java_import 'org.snmp4j.security.Priv3DES'
java_import 'org.snmp4j.security.PrivDES'
java_import 'org.snmp4j.security.PrivAES128'
java_import 'org.snmp4j.security.PrivAES192'
java_import 'org.snmp4j.security.PrivAES256'
java_import 'org.snmp4j.security.SecurityModels'
java_import 'org.snmp4j.security.SecurityProtocols'
java_import 'org.snmp4j.security.USM'
java_import 'org.snmp4j.security.UsmUser'
java_import 'org.snmp4j.security.SecurityLevel'
java_import 'org.snmp4j.smi.Address'
java_import 'org.snmp4j.smi.GenericAddress'
java_import 'org.snmp4j.smi.OID'
java_import 'org.snmp4j.smi.OctetString'
java_import 'org.snmp4j.transport.DefaultUdpTransportMapping'
java_import 'org.snmp4j.transport.DefaultTcpTransportMapping'
java_import 'org.snmp4j.UserTarget'
java_import 'org.snmp4j.util.DefaultPDUFactory'

module LogStash
  class SnmpClientV3 < BaseSnmpClient

    def initialize(protocol, address, port, retries, timeout, mib, security_name, auth_protocol, auth_pass, priv_protocol, priv_pass, security_level)
      super(protocol, address, port, retries, timeout, mib)

      security_level = parse_security_level(security_level)
      security_name = OctetString.new(security_name)
      auth_protocol = parse_auth_protocol(auth_protocol)
      priv_protocol = parse_priv_protocol(priv_protocol)
      auth_pass = auth_pass.nil? ? nil : OctetString.new(auth_pass)
      priv_pass = priv_pass.nil? ? nil : OctetString.new(priv_pass)

      usm = USM.new(SecurityProtocols.getInstance, OctetString.new(MPv3.createLocalEngineID), 0)
      SecurityModels.getInstance.addSecurityModel(usm)

      @snmp.getUSM.addUser(UsmUser.new(security_name, auth_protocol, auth_pass, priv_protocol, priv_pass))
      @target = build_target("#{protocol}:#{address}/#{port}", security_name, security_level, retries, timeout)
    end

    private

    def build_target(address, name, seclevel, retries, timeout)
      target = UserTarget.new
      target.setSecurityLevel(seclevel)
      target.setSecurityName(name)
      target.setAddress(GenericAddress.parse(address))
      target.setRetries(retries)
      target.setTimeout(timeout)
      target.setVersion(SnmpConstants.version3)
      target
    end

    def get_pdu
      pdu = ScopedPDU.new
      pdu.setType(PDU::GET)
      pdu
    end

    def get_pdu_factory
      DefaultPDUFactory.new(PDU::GET)
    end

    def parse_priv_protocol(priv_protocol)
      return nil if priv_protocol.nil?

      case priv_protocol.to_s.downcase
        when "des"
          SnmpConstants::usmDESPrivProtocol
        when "3des"
          SnmpConstants::usm3DESEDEPrivProtocol
        when "aes"
          SnmpConstants::usmAesCfb128Protocol
        when "aes128"
          SnmpConstants::usmAesCfb128Protocol
        when "aes192"
          SnmpConstants::oosnmpUsmAesCfb192Protocol
        when "aes256"
          SnmpConstants::oosnmpUsmAesCfb256Protocol
        else
         raise(SnmpClientError, "privacy protocol '#{priv_protocol}' is not supported, expected protocols are 'des', '3des', 'aes', 'aes128', 'aes192', and 'aes256'")
      end
    end

    def parse_auth_protocol(auth_protocol)
      return nil if auth_protocol.nil?

      case auth_protocol.to_s.downcase
        when 'md5'
          AuthMD5::ID
        when 'sha'
          AuthSHA::ID
        when 'sha2'
          AuthSHA2::ID
        when 'hmac128sha224'
          AuthHMAC128SHA224::ID
        when 'hmac192sha256'
          AuthHMAC192SHA256::ID
        when 'hmac256sha384'
          AuthHMAC256SHA384::ID
        when 'hmac384sha512'
          AuthHMAC384SHA512::ID
        else
          raise(SnmpClientError, "authentication protocol '#{auth_protocol}' is not supported, expected protocols are 'md5', 'sha', and 'sha2'")
      end
    end

    def parse_security_level(security_level)
      case security_level.to_s.downcase
        when 'noauthnopriv'
	        SecurityLevel::NOAUTH_NOPRIV
        when 'authnopriv'
	        SecurityLevel::AUTH_NOPRIV
        when 'authpriv'
          SecurityLevel::AUTH_PRIV
        else
          SecurityLevel::NOAUTH_NOPRIV
      end
    end
  end
end
