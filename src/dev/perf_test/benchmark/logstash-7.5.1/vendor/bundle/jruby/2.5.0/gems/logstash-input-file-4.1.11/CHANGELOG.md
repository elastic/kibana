## 4.1.11
  - Fixed link to FAQ [#247](https://github.com/logstash-plugins/logstash-input-file/pull/247)

## 4.1.10
  - Fixed problem in Windows where some paths would fail to return an identifier ("inode"). Make path into a C style String before encoding to UTF-16LE. [#232](https://github.com/logstash-plugins/logstash-input-file/issues/232)

## 4.1.9
  - Fixed issue where logs were being spammed with needless error messages [#224](https://github.com/logstash-plugins/logstash-input-file/pull/224)

## 4.1.8
  - Fixed problem in tail and read modes where the read loop could get stuck if an IO error occurs in the loop.
    The file appears to be being read but it is not, suspected with file truncation schemes.
    [Issue #205](https://github.com/logstash-plugins/logstash-input-file/issues/205)

## 4.1.7
  - Fixed problem in rotation handling where the target file being rotated was
  subjected to the start_position setting when it must always start from the beginning.
  [Issue #214](https://github.com/logstash-plugins/logstash-input-file/issues/214)

## 4.1.6
  - Fixed Errno::ENOENT exception in Discoverer. [Issue #204](https://github.com/logstash-plugins/logstash-input-file/issues/204)

## 4.1.5
  - Fixed text anchor by changing it from hardcoded to asciidoc reference to
    work in versioned plugin reference

## 4.1.4
  - Fixed a regression where files discovered after first discovery were not
    always read from the beginning. Applies to tail mode only.
    [#198](https://github.com/logstash-plugins/logstash-input-file/issues/198)
  - Added much better support for file rotation schemes of copy/truncate and
    rename cascading. Applies to tail mode only.
  - Added support for processing files over remote mounts e.g. NFS. Before, it
    was possible to read into memory allocated but not filled with data resulting
    in ASCII NUL (0) bytes in the message field. Now, files are read up to the
    size as given by the remote filesystem client. Applies to tail and read modes.

## 4.1.3
  - Fixed `read` mode of regular files sincedb write is requested in each read loop
    iteration rather than waiting for the end-of-file to be reached. Note: for gz files,
    the sincedb entry can only be updated at the end of the file as it is not possible
    to seek into a compressed file and begin reading from that position.
    [#196](https://github.com/logstash-plugins/logstash-input-file/pull/196)
  - Added support for String Durations in some settings e.g. `stat_interval => "750 ms"`
    [#194](https://github.com/logstash-plugins/logstash-input-file/pull/194)

## 4.1.2
  - Fix `require winhelper` error in WINDOWS.
    [Issue #184](https://github.com/logstash-plugins/logstash-input-file/issues/184)
  - Fix when no delimiter is found in a chunk, the chunk is reread - no forward progress
    is made in the file.
    [Issue #185](https://github.com/logstash-plugins/logstash-input-file/issues/185)

## 4.1.1
  - Fix JAR_VERSION read problem, prevented Logstash from starting.
    [Issue #180](https://github.com/logstash-plugins/logstash-input-file/issues/180)
  - Fix sincedb write error when using /dev/null, repeatedly causes a plugin restart.
    [Issue #182](https://github.com/logstash-plugins/logstash-input-file/issues/182)

## 4.1.0
  - Move Filewatch code into the plugin folder, rework Filewatch code to use
    Logstash facilities like logging and environment.
  - New feature: `mode` setting. Introduces two modes, `tail` mode is the
    existing behaviour for tailing, `read` mode is new behaviour that is
    optimized for the read complete content scenario. Please read the docs to
    fully appreciate the benefits of `read` mode.
  - New feature: File completion actions. Settings `file_completed_action`
    and `file_completed_log_path` control what actions to do after a file is
    completely read. Applicable: `read` mode only.
  - New feature: in `read` mode, compressed files can be processed, GZIP only.
  - New feature: Files are sorted after being discovered. Settings `file_sort_by`
    and `file_sort_direction` control the sort order. Applicable: any mode.
  - New feature: Banded or striped file processing. Settings: `file_chunk_size`
    and `file_chunk_count` control banded or striped processing. Applicable: any mode.
  - New feature: `sincedb_clean_after` setting. Introduces expiry of sincedb
    records. The default is 14 days. If, after `sincedb_clean_after` days, no
    activity has been detected on a file (inode) the record expires and is not
    written to disk. The persisted record now includes the "last activity seen"
    timestamp. Applicable: any mode.
  - Docs: extensive additions to introduce the new features.

## 4.0.5
  - Docs: Set the default_codec doc attribute.

## 4.0.4
  - Update gemspec summary

## 4.0.3
  - Fix some documentation issues

## 4.0.1
  - Docs: Fix the description with the logstash documentation generator
  - Fix an issue with the rspec suite not finding log4j

## 4.0.0
  - Breaking: `ignore_older` settings is disabled by default. Previously if the file was older than
    24 hours (the default for ignore_older), it would be ignored. This confused new users a lot, specially
    when they were reading new files with Logstash (with `start_position => beginning`). This setting also
    makes it consistent with Filebeat.

## 3.1.2
  - Adjust a few log call levels

## 3.1.1
  - Add host to @metadata

## 3.1.0
  - Breaking: Use native `--path.data` for Logstash 5.0 for sincedb files.

## 3.0.3
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 3.0.2
  - relax constrains of `logstash-devutils` see https://github.com/elastic/logstash-devutils/issues/48

## 3.0.1
  - Republish all the gems under jruby.

## 3.0.0
  - Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141

# 2.2.5
  - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash

# 2.2.3
  - New dependency requirements for logstash-core for the 5.0 release

## 2.2.2
 - Fix for: Filewatch library complains if HOME or SINCEDB_PATH variables are unset.
   - [Issue #101](https://github.com/logstash-plugins/logstash-input-file/issues/101)
   - [PR, filewatch 78](https://github.com/jordansissel/ruby-filewatch/pull/78) introduces the fix
   - [Issue, filewatch 76](https://github.com/jordansissel/ruby-filewatch/issues/76)
 - Improve documentation on ignore_older and close_older options [#104](https://github.com/logstash-plugins/logstash-input-file/issues/104) Documentation

## 2.2.1
 - Fix spec failures on CI Linux builds (not seen on local OSX and Linux)

## 2.2.0
 - Use ruby-filewatch 0.8.0, major rework of filewatch. See [Pull Request 74](https://github.com/jordansissel/ruby-filewatch/pull/74)
 - add max_open_files config option, defaults to 4095, the input will process much more than this but have this number of files open at any time - files are closed based on the close_older setting, thereby making others openable.
 - Changes the close_older logic to measure the time since the file was last read internlly rather than using the file stat modified time.
 - Use logstash-codec-multiline 2.0.7, fixes a bug with auto_flush deadlocking when multiple file inputs are defined in the LS config.

## 2.1.3
 - Use ruby-filewatch 0.7.1, re-enable close after file is modified again

## 2.1.2
 - Isolate test helper class in their own namespace

## 2.1.1
 - Correct LS core dependency version

## 2.1.0
 - Implement new config options: ignore_older and close_older.  When close_older is set, any buffered data will be flushed.
 - Fixes [#81](https://github.com/logstash-plugins/logstash-input-file/issues/81)
 - Fixes [#81](https://github.com/logstash-plugins/logstash-input-file/issues/89)
 - Fixes [#81](https://github.com/logstash-plugins/logstash-input-file/issues/90)

## 2.0.3
 - Implement Stream Identity mapping of codecs: distinct codecs will collect input per stream identity (filename)

## 2.0.2
 - Change LS core dependency version
 - Add CI badge

## 2.0.1
 - Change LS core dependency version

## 2.0.0
 - Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully,
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - Dependency on logstash-core update to 2.0

## 1.0.1
 - Force dependency on filewatch >= 0.6.5 that fixes a sincedb bug
 - Better documentation and error handling regarding the "sincedb_path" parameter
