## 3.4.1
 - Fixed link formatting for input type (documentation)

## 3.4.0
 - Skips objects that are archived to AWS Glacier with a helpful log message (previously they would log as matched, but then fail to load events) [#160](https://github.com/logstash-plugins/logstash-input-s3/pull/160)
 - Added `watch_for_new_files` option, enabling single-batch imports [#159](https://github.com/logstash-plugins/logstash-input-s3/pull/159)

## 3.3.7
  - Added ability to optionally include S3 object properties inside @metadata [#155](https://github.com/logstash-plugins/logstash-input-s3/pull/155)

## 3.3.6
  - Fixed error in documentation by removing illegal commas [#154](https://github.com/logstash-plugins/logstash-input-s3/pull/154)

## 3.3.5
  - [#136](https://github.com/logstash-plugins/logstash-input-s3/pull/136) Avoid plugin crashes when encountering 'bad' files in S3 buckets

## 3.3.4
  - Log entry when bucket is empty #150

## 3.3.3
  - Symbolize hash keys for additional_settings hash #148

## 3.3.2
  - Docs: Set the default_codec doc attribute.

## 3.3.1
 - Improve error handling when listing/downloading from S3 #144

## 3.3.0
  - Add documentation for endpoint, role_arn and role_session_name #142
  - Add support for additional_settings option #141

## 3.2.0
 - Add support for auto-detecting gzip files with `.gzip` extension, in addition to existing support for `*.gz`
 - Improve performance of gzip decoding by 10x by using Java's Zlib

## 3.1.9
  - Change default sincedb path to live in `{path.data}/plugins/inputs/s3` instead of $HOME.
    Prior Logstash installations (using $HOME default) are automatically migrated.
  - Don't download the file if the length is 0 #2

## 3.1.8
  - Update gemspec summary

## 3.1.7
  - Fix missing last multi-line entry #120

## 3.1.6
  - Fix some documentation issues

## 3.1.4
 - Avoid parsing non string elements #109

## 3.1.3
 - The plugin will now include the s3 key in the metadata #105

## 3.1.2
 - Fix an issue when the remote file contains multiple blob of gz in the same file #101
 - Make the integration suite run
 - Remove uneeded development dependency

## 3.1.1
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 3.1.0
 - breaking,config: Remove deprecated config `credentials` and `region_endpoint`. Please use AWS mixin.

## 3.0.1
 - Republish all the gems under jruby.

## 3.0.0
 - Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141

## 2.0.6
 - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash

## 2.0.5
 - New dependency requirements for logstash-core for the 5.0 release

## 2.0.4
 - Fix for Error: No Such Key problem when deleting

## 2.0.3
 - Do not raise an exception if the sincedb file is empty, instead return the current time #66

## 2.0.0
 - Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully, 
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - Dependency on logstash-core update to 2.0

