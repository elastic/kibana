## 4.1.1
  - Docs: Set the default_codec doc attribute.

## 4.1.0
  - Update gemspec summary
  - Add bcc suport #55
  - Add mustache templating #51

## 4.0.6
  - Fix some documentation issues

## 4.0.5
  - Docs: Add plugin description

## 4.0.4
  - Docs: Fix plugin title

## 4.0.3
  - Properly constrain mime types deps to be < 3.0 due to ruby 2.0+ requirement
  - Uncap mail gem deps to play nicely with other plugins

## 4.0.2
  - Relax constraint on logstash-core-plugin-api to >= 1.60 <= 2.99

## 4.0.1
  - Republish all the gems under jruby.
## 4.0.0
  - Update the plugin to the version 2.0 of the plugin api, this change is required for Logstash 5.0 compatibility. See https://github.com/elastic/logstash/issues/5141
# 3.0.5
  - Depend on logstash-core-plugin-api instead of logstash-core, removing the need to mass update plugins on major releases of logstash
# 3.0.4
  - Set the version of Mail to 2.6.3, since 2.6.4 has a dependency incompatible with jruby see https://github.com/elastic/logstash/issues/4883
  
# 3.0.3
  - New dependency requirements for logstash-core for the 5.0 release

# 3.0.0
 - Plugins were updated to follow the new shutdown semantic, this mainly allows Logstash to instruct input plugins to terminate gracefully, 
   instead of using Thread.raise on the plugins' threads. Ref: https://github.com/elastic/logstash/pull/3895
 - Dependency on logstash-core update to 2.0

# 2.0.0
  - Introduced new configuration options for the smtp server, the
    options option is gone and now you need to specify each option
    independetly. This require you to change your previous configuration
    when updating.
  - Removed the deprecated option match. This option was deprecatred in
    favor of using conditionals. This change also require you to change
    your current cnofiguration if using this option.

# 1.1.0
  - Make the delivery method more reliable to failure by catching and
    logging exceptions when happen, like this LS is not going to break
    if something wrong happen, but is going to log it. Fixes #26 and #7
  - Randomize port in specs so they can run in parallel.
