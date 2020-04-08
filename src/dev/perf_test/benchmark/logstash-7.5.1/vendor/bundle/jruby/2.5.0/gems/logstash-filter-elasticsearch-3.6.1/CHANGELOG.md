## 3.6.1
  - Loosen restrictions on Elasticsearch gem ([#120](https://github.com/logstash-plugins/logstash-filter-elasticsearch/pull/120))

## 3.6.0
  - Add support for extracting hits total from Elasticsearch 7.x responses

## 3.5.0
  - Added connection check during register to avoid failures during processing
  - Changed Elasticsearch Client transport to use Manticore
  - Changed amount of logging details during connection failure

## 3.4.0
  - Adds `[@metadata][total_hits]` with total hits returned from the query ([#106](https://github.com/logstash-plugins/logstash-filter-elasticsearch/pull/106))
  - Improves error logging to fully inspect caught exceptions ([#105](https://github.com/logstash-plugins/logstash-filter-elasticsearch/pull/105))

## 3.3.1
  - Fix: The filter now only calls `filter_matched` on events that actually matched.
    This fixes issues where all events would have success-related actions happened
    when no match had actually happened (`add_tag`, `add_field`, `remove_tag`,
    `remove_field`)

## 3.3.0
  - Enhancement : if elasticsearch response contains any shard failure, then `tag_on_failure` tags are added to Logstash event
  - Enhancement : add support for nested fields
  - Enhancement : add 'docinfo_fields' option
  - Enhancement : add 'aggregation_fields' option

## 3.2.1
  - Update gemspec summary

## 3.2.0
  - `index` setting now supports field formatting, such as `index => "%{myindex}"` (Boris Gorbylev)

## 3.1.8
  - Fix a thread safety issue when using this filter with multiple workers on heavy load, we now create an elasticsearch client for every LogStash worker. #76

## 3.1.6
  - Fix some documentation issues

## 3.1.5
 - Docs: Fix broken link to Logstash docs.
 - Support ca_file setting when using https uri in hosts parameter

## 3.1.4
 - Docs: Bump patch level for doc build.

## 3.1.3
  - Change the queries loglevel from info to debug.

## 3.1.2
  - Docs: Add requirement to use version 3.1.1 or higher to support sending Content-Type headers.
  
## 3.1.1
  - Upgrade es-ruby client to support correct content-type

## 3.1.0
  - Support for full use of query DSL. Added query_template to use full DSL.

## 3.0.3
  - Fix couple of bugs related to incorrect variable names

## 3.0.2
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 3.0.1
- Fix: wrong usage of search params, now if index is properly specified
  it's passed to search so it's performed not to all indices if this is not the explicit intention.
## 3.0.0
  - Breaking: Updated plugin to use new Java Event APIs
## 2.1.0
  - Improved the configuration options to be more easy to understand and
    match what the expectations are from the documentation.
  - Initial refactoring to include later one a common client for all the
    ES plugins.
  - Adding support for having an index in the query pattern.
  - Improved documentation.
  - Added intitial integration and unit tests.
## 2.0.4
  - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash
## 2.0.3
  - New dependency requirements for logstash-core for the 5.0 release
## 2.0.0
 - Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully, 
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - Dependency on logstash-core update to 2.0
## 0.1.6
- removed require statement for a file that is no longer present in logstash-core.
