## 4.4.0
 - Changed timeout handling using the Timeout class [#84](https://github.com/logstash-plugins/logstash-filter-kv/pull/84)

## 4.3.3
 - Fixed asciidoc formatting in docs

## 4.3.2
 - Resolved potential race condition in pipeline shutdown where the timeout enforcer could be shut down while work was still in-flight, potentially leading to stuck pipelines.
 - Resolved potential race condition in pipeline shutdown where work could be submitted to the timeout enforcer after it had been shutdown, potentially leading to stuck pipelines.

## 4.3.1
 - Fixed asciidoc formatting in documentation [#81](https://github.com/logstash-plugins/logstash-filter-kv/pull/81)

## 4.3.0
 - Added a timeout enforcer which prevents inputs that are pathological against the generated parser from blocking
   the pipeline. By default, timeout is a generous 30s, but can be configured or disabled entirely with the new
   `timeout_millis` and `tag_on_timeout` directives ([#79](https://github.com/logstash-plugins/logstash-filter-kv/pull/79))
 - Made error-handling configurable with `tag_on_failure` directive.

## 4.2.1
 - Fixes performance regression introduced in 4.1.0 ([#70](https://github.com/logstash-plugins/logstash-filter-kv/issues/70))

## 4.2.0
 - Added `whitespace => strict` mode, which allows the parser to behave more predictably when input is known to avoid unnecessary whitespace.
 - Added error handling, which tags the event with `_kv_filter_error` if an exception is raised while handling an event instead of allowing the plugin to crash.

## 4.1.2
  - bugfix: improves trim_key and trim_value to trim any _sequence_ of matching characters from the beginning and ends of the corresponding keys and values; a previous implementation limitited trim to a single character from each end, which was surprising.
  - bugfix: fixes issue where we can fail to correctly break up a sequence that includes a partially-quoted value followed by another fully-quoted value by slightly reducing greediness of quoted-value captures.

## 4.1.1
  - bugfix: correctly handle empty values between value separator and field separator (#58)

## 4.1.0
  - feature: add option to split fields and values using a regex pattern (#55)

## 4.0.3
  - Update gemspec summary

## 4.0.2
  - Fix some documentation issues

## 4.0.0
  - breaking: trim and trimkey options are renamed to trim_value and trim_key
  - bugfix: trim_value and trim_key options now remove only leading and trailing characters (#10)
  - feature: new options remove_char_value and remove_char_key to remove all characters from keys/values whatever their position

## 3.1.1
  - internal,deps: Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 3.1.0
  - Adds :transform_value and :transform_key options to lowercase/upcase or capitalize all keys/values
## 3.0.1
 - internal: Republish all the gems under jruby.

## 3.0.0
 - internal,deps: Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141

## 2.0.7
 - feature: With include_brackets enabled, angle brackets (\< and \>) are treated the same as square brackets and parentheses, making it easy to parse strings like "a=\<b\> c=\<d\>".
 - feature: An empty value_split option value now gives a useful error message.

## 2.0.6
 - internal,deps: Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash

## 2.0.5
 - internal,deps: New dependency requirements for logstash-core for the 5.0 release

## 2.0.4
 - bugfix: Fields without values could claim the next field + value under certain circumstances. Reported in #22

## 2.0.3
 - bugfix: fixed short circuit expressions, some optimizations, added specs, PR #20
 - bugfix: fixed event field assignment, PR #21

## 2.0.0
 - internal: Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully,
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - internal,deps: Dependency on logstash-core update to 2.0

## 1.1.0
 - feature: support spaces between key and value_split,
   support brackets and recursive option.
