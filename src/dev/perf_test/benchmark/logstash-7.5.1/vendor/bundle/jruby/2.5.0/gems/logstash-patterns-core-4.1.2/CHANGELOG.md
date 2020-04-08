## 4.1.2
  - Fix some documentation issues

## 4.1.0
  - Added SYSLOG5424LINE and test ipv4/ipv6/hostname as syslog5424_host rfc5424
  - Accordig to rcf5424 IP address should be accepted
  - HTTPDATE is used by patterns/aws
  - HTTPD (formerly APACHE) deserves its own pattern and test files. See #45
  - httpd: sync names between httpd20 and httpd24
  - Adding maven version to the list of default Grok patterns
  - Added Redis Monitor Log format
  - Remove extra space in ASA-6-106015 rule
  - fix COMMONAPACHELOG specs
  - Added SuSEfirewall2 pattern
  - switch USER to HTTPDUSER for "auth" field (match email addresses)
  - bind9 pattern
  - Pattern for squid3 native format
  - Parse Cisco ASA-5-304001
  - use underscores instead of hyphens in field names
  - fix timestamp expect
  - fix cs_protocol pattern name
  - fix cs_protocol and cs_uri_query names
  - added cloudfront spec test
  - add pattern for cloudfront access log
  - Java Patterns: JAVASTACKTRACEPART was duplicate

## 4.0.2
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 4.0.1
  - Republish all the gems under jruby.

## 4.0.0
  - Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141

## 2.0.5
  - Specs fixes, see https://github.com/logstash-plugins/logstash-patterns-core/pull/137

## 2.0.4
  - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash

## 2.0.3
  - New dependency requirements for logstash-core for the 5.0 release

## 2.0.0
 - Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully,
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - Dependency on logstash-core update to 2.0

## 0.4.0
 - Added grok patterns for nagios notifications
 - Added commong exim patterns
 - Allow optional space between sysloghost and colon, fixes https://github.com/elastic/logstash/issues/2101 for Cisco ASA devises.
 - Make progname optional (not always provided) for the syslog base patern.
 - Improve pattern matching performance for IPV4 patterns.
 - Fixes: UNIXPATH pattern does not combine well with comma delimination, https://github.com/logstash-plugins/logstash-patterns-core/issues/13
 - Add new valid characters for URI's in HTML5 patterns.
 - Make IPORHOST pattern match first an IP and then a HOST as the name
   implies.
 - Added patterns for ASA-4-106100, ASA-4-106102, ASA-4-106103 CISCO
   firewalls.
 - Update CISCOFW106023 rule to match values from FWSM
 - Add basic apache httpd error log format
 - Support TIMESTAMP_ISO8601 in HAProxy patterns, useful for rsyslog and other systems that can be configured to use this format. Fixes https://github.com/logstash-plugins/logstash-patterns-core/pull/80

## 0.3.0
 - Updated the AWS S3 patterns
 - Added patterns for rails 3
 - Added patterns for haproxy
 - Added patterns for bro http.log
 - Added shorewall patterns
## 0.2.0
 - Added patterns for S3 and ELB access logs amazon services
## 0.1.12
 - add some missing Cisco ASA firewall system log patterns
 - fix cisco firewall policy_id regex for policies with '-' in the name
## 0.1.11
 - Added Catalina and Tomcat patterns
 - Added German month names
