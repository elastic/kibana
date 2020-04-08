## 1.1.2
 - Added workaround to fix errors when using this plugin with Java 11[#38](https://github.com/logstash-plugins/logstash-input-azure_event_hubs/pull/38)

## 1.1.1
 - Updated Azure event hub library dependencies[#36](https://github.com/logstash-plugins/logstash-input-azure_event_hubs/pull/36)

## 1.1.0
 - Updated Azure event hub library dependencies[#27](https://github.com/logstash-plugins/logstash-input-azure_event_hubs/pull/27)

## 1.0.4
 - Added guidelines for setting number of threads

## 1.0.3
 - Fixed doc issues
   - Changed `event-hub-connections` to `event_hub_connections`
   - Added emphasis for singular vs. plural for event_hub_connections

## 1.0.2
 - Fixed minor doc issues
 - Changed doc to hardcode `Logstash` rather than using an attribute.

## 1.0.1
 - Fixed logging for exception handler

## 1.0.0 
 - Initial release of `logstash-input-azure_event_hubs` supersedes `logstash-input-azureeventhub`
 - Re-implementation that uses Event Processor Host API and new configuration options.

