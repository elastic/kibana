Azure Module
----------

Example configurations:

##  Basic 

All configuration is shared between Event Hubs

```yaml
modules:
  - name: azure
    var.elasticsearch.hosts: "localhost:9200"
    var.kibana.host: "localhost:5601"
    var.input.azure_event_hubs.threads: 8
    var.input.azure_event_hubs.decorate_events: true
    var.input.azure_event_hubs.consumer_group: "logstash"
    var.input.azure_event_hubs.storage_connection: "DefaultEndpointsProtocol=https;AccountName=example...."
    var.input.azure_event_hubs.event_hub_connections:
      - "Endpoint=sb://example1...EntityPath=insights-logs-errors"
      - "Endpoint=sb://example2...EntityPath=insights-metrics-pt1m"
```

## Advanced

Configuration may be Event Hub specific. Requires 'header' array with 'name' as first position, and other options (in any order) labeled. Will use the 'global' config if not defined per Event Hub. The per Event Hub configuration takes precedence. For example, in the below example 'consumer_group' will be applied to each of the configured Event Hubs. 'decorate_events' is defined in both the 'global' and per Event Hub configuration, the per Event Hub configuration takes precedence, and the 'global' configuration is effectively ignored.  

```yaml
modules:
  - name: azure
    var.elasticsearch.hosts: "localhost:9200"
    var.kibana.host: "localhost:5601"
    var.input.azure_event_hubs.threads: 8
    var.input.azure_event_hubs.decorate_events: true
    var.input.azure_event_hubs.consumer_group: logstash
    var.input.azure_event_hubs.event_hubs:
      - ["name",                      "event_hub_connection",      "storage_connection",                                      "initial_position", "decorate_events"]
      - ["insights-operational-logs", "Endpoint=sb://example1...", "DefaultEndpointsProtocol=https;AccountName=example1....", "HEAD",             "true"]
      - ["insights-metrics-pt1m",     "Endpoint=sb://example2...", "DefaultEndpointsProtocol=https;AccountName=example2....", "TAIL",             "true"]
      - ["insights-logs-errors",      "Endpoint=sb://example3...", "DefaultEndpointsProtocol=https;AccountName=example3....", "TAIL",             "false"]
      - ["insights-operational-logs", "Endpoint=sb://example4...", "DefaultEndpointsProtocol=https;AccountName=example4....", "HEAD",             "true"]
```
## Command Line

Basic mode with a single Event Hub is supported from the command line. The array syntax may not be used in the command line variant:
```
bin/logstash --modules azure -M "azure.var.elasticsearch.host=es.mycloud.com" -M "azure.var.input.azure_event_hubs.threads=8" -M "azure.var.input.azure_event_hubs.consumer_group=logstash" -M "azure.var.input.azure_event_hubs.decorate_events=true" -M "azure.var.input.azure_event_hubs.event_hub_connections=Endpoint=sb://example1...EntityPath=insights-logs-errors" -M "azure.var.input.azure_event_hubs.storage_connection=DefaultEndpointsProtocol=https;AccountName=example...."
```

###  Azure module schema

This module reads data from the Azure Event Hub and adds some additional structure to the data for Activity Logs and SQL Diagnostics. The original data is always preserved and any data added or parsed will be namespaced under 'azure'.  For example, 'azure.subscription' may have been parsed from a longer more complex URN. 

| name                 | description | note|
|--------------------- | ----------- | --- | 
| azure.subscription   | The Azure subscription from which this data originates. | Some Activity Log events may not be associated with a subscription.
| azure.group          | The primary type of data. Current values are either 'activity_log' or 'sql_diagnostics' |
| azure.category*      | The secondary type of data specific to group from which the data originated |
| azure.provider       | The Azure provider |
| azure.resource_group | The Azure resource group |  
| azure.resource_type  | The Azure resource type | 
| azure.resource_name  | The Azure resource name |
| azure.database       | The Azure database name, for display purposes | SQL Diagnostics only |
| azure.db_unique_id   | The Azure database name that is garunteed to be unique | SQL Diagnostics only |
| azure.server         | The Azure server for the database | SQL Diagnostics only |
| azure.server_and_database | The Azure server and database combined | SQL Diagnostics only |
| azure.metadata       | Any @metadata added by the plugins, for example ` var.input.azure_event_hubs.decorate_events: true` |

* Activity Logs can have the following categories: "Administrative", "ServiceHealth", "Alert", "Autoscale", "Security"
* SQL Diagnostics can have the following categories: "Metric", "Blocks", "Errors", "Timeouts", "QueryStoreRuntimeStatistics", "QueryStoreWaitStatistics", "DatabaseWaitStatistics", "SQLInsights"

Microsoft documents it's Activity log schema [here](https://docs.microsoft.com/en-us/azure/monitoring-and-diagnostics/monitoring-activity-log-schema), and the SQL Diagnostics data is documented [here](https://docs.microsoft.com/en-us/azure/sql-database/sql-database-metrics-diag-logging).  However, Elastic does not own these data models and as such can make any assurances of it's accuracy or passivity.

#### Special note - Properties field

Many of the logs contain a "properties" top level field. This is often where the most interesting data lives. There is not a fixed schema between log types for properties fields coming from different sources. This can cause mapping errors when shipping the data to Elasticsearch. For example, one log may have `properties.type` where one log sets this a String type and another sets this an Integer type. To avoid mapping errors, the original properties field is moved to `<azure.group>_<azure_category>_properties.<original_key>`. For example `properties.type` may end up as `sql_diagnostics_Errors_properties.type` or `activity_log_Security_properties.type` depending on the group/category from where the event originated. 
 

## Testing

Testing is modules is easiest with Docker and Docker compose to stand up instances of Elasticsearch and Kibana. Below is a Docker compose file that can be used for quick testing. 

```dockerfile
version: '3'

# docker-compose up --force-recreate 

services:

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:6.2.4
    ports:
      - "9200:9200"
      - "9300:9300"
    environment:
      ES_JAVA_OPTS: "-Xmx512m -Xms512m"
      discovery.type: "single-node"
    networks:
      - ek

  kibana:
    image: docker.elastic.co/kibana/kibana:6.2.4
    ports:
      - "5601:5601"
    networks:
      - ek
    depends_on:
      - elasticsearch

networks:
  ek:
    driver: bridge
```


