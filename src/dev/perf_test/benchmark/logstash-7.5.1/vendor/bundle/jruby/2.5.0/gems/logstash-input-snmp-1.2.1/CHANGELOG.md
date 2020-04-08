## 1.2.1
  - Fixed GAUGE32 integer overflow [#65] (https://github.com/logstash-plugins/logstash-input-snmp/pull/65)

## 1.2.0
  - Adding oid_path_length config option [#59] (https://github.com/logstash-plugins/logstash-input-snmp/pull/59)
  - Fixing bug with table support removing index value from OIDs [#60] )https://github.com/logstash-plugins/logstash-input-snmp/issues/60)

## 1.1.1
  - Added information and other improvements to documentation [#57](https://github.com/logstash-plugins/logstash-input-snmp/pull/57)

## 1.1.0
  - Added support for querying SNMP tables [#49] (https://github.com/logstash-plugins/logstash-input-snmp/pull/49)
  - Changed three error messages in the base_client to include the target address for clarity in the logs.

## 1.0.1
  - Added no_codec condition to the documentation and bumped version [#39](https://github.com/logstash-plugins/logstash-input-snmp/pull/39)
  - Changed docs to improve options layout [#38](https://github.com/logstash-plugins/logstash-input-snmp/pull/38)

## 1.0.0
  - Added improved syntax coercion [#32](https://github.com/logstash-plugins/logstash-input-snmp/pull/32)

## 0.1.0.beta5
  - Added OPAQUE type coercion [#29](https://github.com/logstash-plugins/logstash-input-snmp/pull/29)
  - Added SNMPv3 support [#27](https://github.com/logstash-plugins/logstash-input-snmp/pull/27)
  - Added support for provided MIBs [#25](https://github.com/logstash-plugins/logstash-input-snmp/pull/25)

## 0.1.0.beta4
  - Fixed missing coercions [#12](https://github.com/logstash-plugins/logstash-input-snmp/pull/12)

## 0.1.0.beta3
  - add tcp transport protocol support, https://github.com/logstash-plugins/logstash-input-snmp/pull/8
  - add SNMPv1 protocol version support, https://github.com/logstash-plugins/logstash-input-snmp/pull/9

## 0.1.0.beta2
  - add host info in metadata and host field, https://github.com/logstash-plugins/logstash-input-snmp/pull/7

## 0.1.0.beta1
  - First beta version

