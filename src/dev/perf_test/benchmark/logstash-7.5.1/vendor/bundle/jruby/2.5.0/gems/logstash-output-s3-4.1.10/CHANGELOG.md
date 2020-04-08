## 4.1.10
  - Added clarification for endpoint in documentation [#198](https://github.com/logstash-plugins/logstash-output-s3/pull/198)

## 4.1.9
  - Added configuration information for multiple s3 outputs to documentation [#196](https://github.com/logstash-plugins/logstash-output-s3/pull/196)
  - Fixed formatting problems and typographical errors [#194](https://github.com/logstash-plugins/logstash-output-s3/pull/194), [#201](https://github.com/logstash-plugins/logstash-output-s3/pull/201), and [#204](https://github.com/logstash-plugins/logstash-output-s3/pull/204)

## 4.1.8
  - Add support for setting mutipart upload threshold [#202](https://github.com/logstash-plugins/logstash-output-s3/pull/202)

## 4.1.7
  - Fixed issue where on restart, 0 byte files could erroneously be uploaded to s3 [#195](https://github.com/logstash-plugins/logstash-output-s3/issues/195)

## 4.1.6
  - Fixed leak of file handles that prevented temporary files from being cleaned up before pipeline restart [#190](https://github.com/logstash-plugins/logstash-output-s3/issues/190)

## 4.1.5
  - Fixed bucket validation failures when bucket policy requires encryption [#191](https://github.com/logstash-plugins/logstash-output-s3/pull/191)

## 4.1.4
  - [#185](https://github.com/logstash-plugins/logstash-output-s3/pull/184) Internal: Revert rake pinning to fix upstream builds

## 4.1.3
  - [#181](https://github.com/logstash-plugins/logstash-output-s3/pull/181) Docs: Fix incorrect characterization of parameters as `required` in example configuration.
  - [#184](https://github.com/logstash-plugins/logstash-output-s3/pull/184) Internal: Pin rake version for jruby-1.7 compatibility

## 4.1.2
  - Symbolize hash keys for additional_settings hash #179

## 4.1.1
  - Docs: Set the default_codec doc attribute.

## 4.1.0
  - Add documentation for endpoint, role_arn and role_session_name #174
  - Add option for additional settings #173
  - Add more S3 bucket ACLs #158
  - Handle file not found exception on S3 upload #144
  - Document prefix interpolation #154

## 4.0.13
  - Update gemspec summary

## 4.0.12
 - Fix bug where output would fail if the s3 bucket had encryption enabled (#146, #155)

## 4.0.11
 - Fixed a randomly occurring error that logged as a missing `__jcreate_meta` method

## 4.0.10
  - Fix some documentation issues

## 4.0.9
 - Correct issue that allows to run on Ruby 9k. #150

## 4.0.8
 - Documentation changes

## 4.0.7
  - Fix: `#restore_from_crash` should use the same upload options as the normal uploader. #140
  - Fix: Wrongly named `canned_acl` options, renamed to "public-read", "public-read-write", "authenticated-read", from the documentation http://docs.aws.amazon.com/AmazonS3/latest/dev/acl-overview.html#canned-acl

## 4.0.6
  - Fix: Use the right `signature_version` for the SDK v2 #129
  - Fix an issue to prevent the output to upload empty file to S3 #128
  - Docs: Update the doc to show the new format of the remote file #126

## 4.0.5
  - Delete the file on disk after they are succesfully uploaded to S3 #122 #120
  - Added logging when an exception occur in the Uploader's `on_complete` callback

## 4.0.4
  - Add support for `storage_class` configuration
  - Fix compatibility with Logstash 2.4
  - Add support for `aws:kms` server side encryption #104

## 4.0.3
  - When configuring the `canned_acl` options of the plugins the role was not applied correctly to the created object: #7

## 4.0.2
  - Fixed AWS authentication when using instance profile credentials.

## 4.0.1
  - Improved Error logging for S3 validation. Now specific S3 perms errors are logged

## 4.0.0
  - This version is a complete rewrite over version 3.0.0 See #103
  - This Plugin now uses the V2 version of the SDK, this make sure we receive the latest updates and changes.
  - We now uses S3's `upload_file` instead of reading chunks, this method is more efficient and will uses the multipart with threads if the files is too big.
  - You can now use the `fieldref` syntax in the prefix to dynamically changes the target with the events it receives.
  - The Upload queue is now a bounded list, this options is necessary to allow back pressure to be communicated back to the pipeline but its configurable by the user.
  - If the queue is full the plugin will start the upload in the current thread.
  - The plugin now threadsafe and support the concurrency model `shared`
  - The rotation strategy can be selected, the recommended is `size_and_time` that will check for both the configured limits (`size` and `time` are also available)
  - The `restore` option will now use a separate threadpool with an unbounded queue
  - The `restore` option will not block the launch of logstash and will uses less resources than the real time path
  - The plugin now uses `multi_receive_encode`, this will optimize the writes to the files
  - rotate operation are now batched to reduce the number of IO calls.
  - Empty file will not be uploaded by any rotation rotation strategy
  - We now use Concurrent-Ruby for the implementation of the java executor
  - If you have finer grain permission on prefixes or want faster boot, you can disable the credentials check with `validate_credentials_on_root_bucket`
  - The credentials check will no longer fails if we can't delete the file
  - We now have a full suite of integration test for all the defined rotation

Fixes: #4 #81 #44 #59 #50

## 3.2.0
  - Move to the new concurrency model `:single`
  - use correct license identifier #99
  - add support for `bucket_owner_full_control` in the canned ACL #87
  - delete the test file but ignore any errors, because we actually only need to be able to write to S3. #97

## 3.1.2
  - Fix improper shutdown of output worker threads
  - improve exception handling

## 3.0.1
 - Republish all the gems under jruby.

## 3.0.0
 - Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141

## 2.0.7
 - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash

## 2.0.6
 - New dependency requirements for logstash-core for the 5.0 release

## 2.0.5
 - Support signature_version option for v4 S3 keys

## 2.0.4
 - Remove the `Time.now` stub in the spec, it was conflicting with other test when running inside the default plugins test #63
 - Make the spec run faster by adjusting the values of time rotation test.

## 2.0.3
 - Update deps for logstash 2.0

## 2.0.2
 - Fixes an issue when tags were defined #39

## 2.0.0
 - Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully,
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - Dependency on logstash-core update to 2.0

## 1.0.1
- Fix a synchronization issue when doing file rotation and checking the size of the current file
- Fix an issue with synchronization when shutting down the plugin and closing the current temp file
