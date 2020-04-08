## 7.0.0
  - Removed obsolete ssl_certificate_verify option

## 6.0.1
  - Fix some documentation issues

# 6.0.0
  - Breaking: mark ssl_certificate_verify as obsolete

# 5.2.0
  - Make ssl_certificate_verify deprecated, not obsolete. We don't want
    to break compat across major logstash versions

# 5.1.0
  - Add user / password options for HTTP auth

## 5.0.0
  - Obsolete ssl_certificate_verify option that didn't actually work

## 4.0.3
  - Raise configuration error when user supplies a trust/keystore without a password

## 4.0.2
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 4.0.1
  - Republish all the gems under jruby.
## 4.0.0
  - Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141
# 2.2.4
  - Fix 'ssl_certificate_validation' option to actually let you disable cert validation
# 2.2.3
  - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash
# 2.2.2
  - New dependency requirements for logstash-core for the 5.0 release
# 2.2.1
 * Use a superior 'validate_after_inactivity' default of 200ms to force more frequent checks for broken keepalive situations
# 2.2.0
 * Bump manticore version to be at least 0.5.2 for #close support
# 2.1.0
 * Default `automatic_retries` to 1 to fix connections to hosts with broken keepalive
 * Add `non_idempotent_retries` option
# 2.0.0
 * Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully,
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 * Dependency on logstash-core update to 2.0
# 1.0.2
  * Add 'verify_cert' config option
# 1.0.1
  * Default to 0 automatic_retries
# 1.0.0
  * Allow to use either V1 or V2 of the `AWS-SDK` in your plugins. Fixes: https://github.com/logstash-plugins/logstash-mixin-aws/issues/8
