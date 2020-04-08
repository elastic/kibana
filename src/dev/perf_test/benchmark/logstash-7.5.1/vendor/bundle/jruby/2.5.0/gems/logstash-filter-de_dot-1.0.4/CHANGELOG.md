## 1.0.4
  - fix failure of fieldnames with boolean value "false" #9

## 1.0.3
  - Update gemspec summary

## 1.0.2
  - Fix some documentation issues

# 1.0.0
  - Depend on the correct version of logstash-core-plugin-api to work with
    Logstash 5.0
  - Fix all event references to use event.get() and event.set() methodology
# 0.1.3
  - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash
# 0.1.2
  - New dependency requirements for logstash-core for the 5.0 release
## 0.1.1
 - Fix issue #4, where fields specified by `fields => ` were added to events if
   they were not present.
 - Fixed a bug where objects (nested fields) were not properly deleted if there
   were multiple levels and each had a dotted field name.
 - Fix issue #3, where dynamic fields are not recognized properly because of the
   instance variable.
## 0.1.0
 - Initial release
