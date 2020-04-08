## 3.2.3
  - Fix to align with docs - looked-up values are always strings. Coerce better. [#77](https://github.com/logstash-plugins/logstash-filter-translate/pull/77)
  - Fix bug in dictionary/file the always applied RegexExact, manifested when dictionary keys are not regex compatible [Logstash #9936](https://github.com/elastic/logstash/issues/9936)
  - Added info to dictionary_path description to explain why integers must be quoted

## 3.2.2
  - Fix bug in csv_file when LS config has CSV filter plugin specified as well as a csv dictionary.
  [#70](https://github.com/logstash-plugins/logstash-filter-translate/issues/70)

## 3.2.1
  - Updated formatting of examples in documentation for consistent rendering

## 3.2.0
  - Add `iterate_on` setting to support fields that are arrays, see the docs
  for detailed explanation.
  [#66](https://github.com/logstash-plugins/logstash-filter-translate/issues/66)
  - Add Rufus::Scheduler to provide asynchronous loading of dictionary.
  [#65](https://github.com/logstash-plugins/logstash-filter-translate/issues/65)
  - Re-organise code, yields performance improvement of around 360%

## 3.1.0
  - Add 'refresh_behaviour' to either 'merge' or 'replace' during a refresh #57

## 3.0.4
  - Update gemspec summary

## 3.0.3
  - Fix some documentation issues

# 3.0.1
  - Docs: Fixed asciidoc formatting problem so info about supported dictionary file types renders

# 3.0.0
  - Breaking: Updated plugin to use new Java Event APIs

# 2.1.4
  - Fix threadsafety issues by adding in a read/write lock

# 2.1.3
  - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash
# 2.1.2
  - New dependency requirements for logstash-core for the 5.0 release
## 2.1.1
  - Add more descriptive message with the dictionary could not be loaded,
  also include test for it.

## 2.1.0
  - Added other formats, a part from YAML, to be used when loading
  dictionaries from files in this plugin. Current supported formats are
  YAML, JSON and CSV.

## 2.0.0
  - Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully,
  instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
  - Dependency on logstash-core update to 2.0

## 0.1.10
  - fix failing test due to a missing encoding: utf8 magic header
