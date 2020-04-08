## 2.9.1
  - bugfix: fix inactivity timeout feature when processing old logs (PR [#103](https://github.com/logstash-plugins/logstash-filter-aggregate/pull/103), thanks @jdratlif for his contribution!)
  - docs: fix several typos in documentation
  - docs: enhance example 4 documentation
  - ci: enhance plugin continuous integration

## 2.9.0
  - new feature: add ability to dynamically define a custom `timeout` or `inactivity_timeout` in `code` block (fix issues [#91](https://github.com/logstash-plugins/logstash-filter-aggregate/issues/91) and [#92](https://github.com/logstash-plugins/logstash-filter-aggregate/issues/92))
  - new feature: add meta informations available in `code` block through `map_meta` variable
  - new feature: add Logstash metrics, specific to aggregate plugin: aggregate_maps, pushed_events, task_timeouts, code_errors, timeout_code_errors
  - new feature: validate at startup that `map_action` option equals to 'create', 'update' or 'create_or_update'

## 2.8.0
  - new feature: add 'timeout_timestamp_field' option (fix issue [#81](https://github.com/logstash-plugins/logstash-filter-aggregate/issues/81))  
    When set, this option lets to compute timeout based on event timestamp field (and not system time).  
    It's particularly useful when processing old logs.

## 2.7.2
  - bugfix: fix synchronisation issue at Logstash shutdown (issue [#75](https://github.com/logstash-plugins/logstash-filter-aggregate/issues/75))

## 2.7.1
  - docs: update gemspec summary

## 2.7.0
 - new feature: add support for multiple pipelines (for Logstash 6.0+)  
   aggregate maps, timeout options, and aggregate_maps_path are now stored per pipeline.  
   each pipeline is independant.
 - docs: fix break lines in documentation examples  

## 2.6.4
- bugfix: fix a NPE issue at Logstash 6.0 shutdown
- docs: remove all redundant documentation in aggregate.rb (now only present in docs/index.asciidoc)

## 2.6.3
- docs: fix some documentation issues

## 2.6.2
- docs: remove incorrectly coded, redundant links

## 2.6.1
- docs: bump patch level for doc build

## 2.6.0
- new feature: add 'inactivity_timeout' option.  
  Events for a given `task_id` will be aggregated for as long as they keep arriving within the defined `inactivity_timeout` option - the inactivity timeout is reset each time a new event happens. On the contrary, `timeout` is never reset and happens after `timeout` seconds since aggregation map creation.

## 2.5.2
- bugfix: fix 'aggregate_maps_path' load (issue [#62](https://github.com/logstash-plugins/logstash-filter-aggregate/issues/62)). Re-start of Logstash died when no data were provided in 'aggregate_maps_path' file for some aggregate task_id patterns
- enhancement: at Logstash startup, check that 'task_id' option contains a field reference expression (else raise error)
- docs: enhance examples
- docs: precise that tasks are tied to their task_id pattern, even if they have same task_id value

## 2.5.1
- enhancement: when final flush occurs (just before Logstash shutdown), add `_aggregatefinalflush` tag on generated timeout events 
- bugfix: when final flush occurs (just before Logstash shutdown), push last aggregate map as event (if push_previous_map_as_event=true)
- bugfix: fix 'timeout_task_id_field' feature when push_previous_map_as_event=true
- bugfix: fix aggregate_maps_path feature (bug since v2.4.0)
- internal: add debug logging
- internal: refactor flush management static variables

## 2.5.0
 - new feature: add compatibility with Logstash 5
 - breaking: need Logstash 2.4 or later  

## 2.4.0
 - new feature: You can now define timeout options per task_id pattern (fix issue [#42](https://github.com/logstash-plugins/logstash-filter-aggregate/issues/42))  
 timeout options are : `timeout, timeout_code, push_map_as_event_on_timeout, push_previous_map_as_event, timeout_task_id_field, timeout_tags`
 - validation: a configuration error is thrown at startup if you define any timeout option on several aggregate filters for the same task_id pattern
 - breaking: if you use `aggregate_maps_path` option, storage format has changed. So you have to delete `aggregate_maps_path` file before starting Logstash
 
## 2.3.1
 - new feature: Add new option "timeout_tags" so that you can add tags to generated timeout events
 
## 2.3.0
 - new feature: Add new option "push_map_as_event_on_timeout" so that when a task timeout happens the aggregation map can be yielded as a new event
 - new feature: Add new option "timeout_code" which takes the timeout event populated with the aggregation map and executes code on it. This works for "push_map_as_event_on_timeout" as well as "push_previous_map_as_event"
 - new feature: Add new option "timeout_task_id_field" which is used to map the task_id on timeout events.

## 2.2.0
 - new feature: add new option "push_previous_map_as_event" so that each time aggregate plugin detects a new task id, it pushes previous aggregate map as a new logstash event

## 2.1.2
 - bugfix: clarify default timeout behaviour : by default, timeout is 1800s 

## 2.1.1
 - bugfix: when "aggregate_maps_path" option is defined in more than one aggregate filter, raise a Logstash::ConfigurationError 
 - bugfix: add support for logstash hot reload feature 

## 2.1.0
 - new feature: add new option "aggregate_maps_path" so that aggregate maps can be stored at logstash shutdown and reloaded at logstash startup

## 2.0.5
 - internal,deps: Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash
 - breaking: need Logstash 2.3 or later

## 2.0.4
 - internal,deps: New dependency requirements for logstash-core for the 5.0 release

## 2.0.3
 - bugfix: fix issue [#10](https://github.com/logstash-plugins/logstash-filter-aggregate/issues/10) : numeric task_id is now well processed

## 2.0.2
 - bugfix: fix issue [#5](https://github.com/logstash-plugins/logstash-filter-aggregate/issues/5) : when code call raises an exception, the error is logged and the event is tagged '_aggregateexception'. It avoids logstash crash.

## 2.0.0
 - internal: Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully, instead of using Thread.raise on the plugins' threads.  
   Ref: https://github.com/elastic/logstash/pull/3895
 - internal,deps: Dependency on logstash-core update to 2.0

## 0.1.3
 - breaking: remove "milestone" method call which is deprecated in logstash 1.5, break compatibility with logstash 1.4
 - internal,test: enhanced tests using 'expect' command
 - docs: add a second example in documentation

## 0.1.2
 - compatible with logstash 1.4
 - first version available on github
