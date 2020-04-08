# semantic_logger
[![Gem Version](https://img.shields.io/gem/v/semantic_logger.svg)](https://rubygems.org/gems/semantic_logger) [![Build Status](https://travis-ci.org/rocketjob/semantic_logger.svg?branch=master)](https://travis-ci.org/rocketjob/semantic_logger) [![Downloads](https://img.shields.io/gem/dt/semantic_logger.svg)](https://rubygems.org/gems/semantic_logger) [![License](https://img.shields.io/badge/license-Apache%202.0-brightgreen.svg)](http://opensource.org/licenses/Apache-2.0) ![](https://img.shields.io/badge/status-Production%20Ready-blue.svg) [![Gitter chat](https://img.shields.io/badge/IRC%20(gitter)-Support-brightgreen.svg)](https://gitter.im/rocketjob/support)

Low latency, high throughput, enterprise-scale logging system for Ruby

* http://github.com/rocketjob/semantic_logger

## Documentation

[Semantic Logger Guide](http://rocketjob.github.io/semantic_logger)

[Reference Documentation](http://www.rubydoc.info/gems/semantic_logger/)

## Logging Destinations

Logging to the following destinations are all supported "out-of-the-box":

* File
* Screen
* MongoDB
* BugSnag
* NewRelic
* Splunk
* Syslog
* Roll-your-own

Semantic Logger is capable of logging thousands of lines per second without slowing
down the application. Traditional logging systems make the application wait while
the log information is being saved. Semantic Logger avoids this slowdown by pushing
log events to an in-memory queue that is serviced by a separate thread that only
handles saving log information to multiple destinations at the same time.

## Rails

When running Rails, use [rails_semantic_logger](http://github.com/rocketjob/rails_semantic_logger)
instead of Semantic Logger directly since it will automatically replace the Rails default logger with Semantic Logger.

## Supports

Semantic Logger is tested and supported on the following Ruby platforms:
- Ruby 2.1, 2.2, 2.3, and above
- JRuby 1.7.23, 9.0.5 and above

The following gems are only required when their corresponding appenders are being used,
and are therefore not automatically included by this gem:
- Bugsnag Appender: gem 'bugsnag'
- MongoDB Appender: gem 'mongo' 1.9.2 or above
- NewRelic Appender: gem 'newrelic_rpm'
- Syslog Appender: gem 'syslog_protocol' 0.9.2 or above
- Syslog Appender to a remote syslogng server over TCP or UDP: gem 'net_tcp_client'
- Splunk Appender: gem 'splunk-sdk-ruby'

## Install

    gem install semantic_logger

To configure a stand-alone application for Semantic Logger:

```ruby
require 'semantic_logger'

# Set the global default log level
SemanticLogger.default_level = :trace

# Log to a file, and use the colorized formatter
SemanticLogger.add_appender(file_name: 'development.log', formatter: :color)
```

If running rails, see: [Semantic Logger Rails](http://rocketjob.github.io/semantic_logger/rails.html)

## Author

[Reid Morrison](https://github.com/reidmorrison)

[Contributors](https://github.com/rocketjob/semantic_logger/graphs/contributors)

## Versioning

This project uses [Semantic Versioning](http://semver.org/).
