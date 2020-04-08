## 4.0.1
  - Updated Twitter gem to v6.2.0, cleaned up obsolete monkey patches, fixed integration tests [#63](https://github.com/logstash-plugins/logstash-input-twitter/pull/63)

## 4.0.0
  - Update http-form_data to ~> 2 and public_suffix to ~> 3

## 3.0.8
  - Docs: Set the default_codec doc attribute.

## 3.0.7
  - Update gemspec summary

## 3.0.6
  - Fix some documentation issues

## 3.0.4
 - Pin version of http-form_data to 1.0.1 since 1.0.2 isn't compatible with Ruby 1.9

## 3.0.3
  - Add protection for the (Java) Event when adding Twitter gem objects to the event in values,
    fixes #40.
  - add a specific rescue clause for any exceptions raised during event generation - these
    should not be handled by the general rescue in the run method because this rescue assumes
    a twitter gem upstream error and acts accordingly which is the wrong recovery action for an event generation failure
  - refactor tests and add new integration test that publishes a tweet with known content.

## 3.0.2
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 3.0.1
  - Republish all the gems under jruby.
## 3.0.0
  - Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141
# 2.2.2
  - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash
# 2.2.1
  - New dependency requirements for logstash-core for the 5.0 release
## 2.2.0
  - Upgraded the twitter gem to the last version available, 5.15.0
  - Add proxy support, Fixes #7.

## 2.1.0
  - Add an option to fetch data from the sample endpoint.
  - Add hashtags, symbols and user_mentions as data for the non extended tweet event.
  - Add an option to filter per location and language.
  - Add an option to stream data from a list of users.
  - Add integration and unit tests for this and previous features.
  - Add an ignore_retweet flag to filter them.
  - Small code reorg and refactoring.
  - Fixes #22 #21 #20 #11 #9

## 2.0.0
 - Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully, 
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - Dependency on logstash-core update to 2.0

1.0.1
  * Handle tweets with a null 'in-reply-to' without crashing. This is a temporary fix till JrJackson is updated.
