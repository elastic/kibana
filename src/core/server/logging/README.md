# Logging

The way logging works in Kibana is inspired by `log4j 2` logging framework used by [Elasticsearch](https://www.elastic.co/guide/en/elasticsearch/reference/current/settings.html#logging).
The main idea is to have consistent logging behaviour (configuration, log format etc.) across the entire Elastic Stack 
where possible.

## Loggers, Appenders and Layouts

Kibana logging system has three main components: _loggers_, _appenders_ and _layouts_. These components allow us to log
messages according to message type and level, and to control how these messages are formatted and where the final logs
will be displayed or stored.

__Loggers__ define what logging settings should be applied at the particular context.

__Appenders__ define where log messages are displayed (eg. stdout or console) and stored (eg. file on the disk).

__Layouts__ define how log messages are formatted and what type of information they include.


## Logger hierarchy

Every logger has its unique name or context that follows hierarchical naming rule. The logger is considered to be an 
ancestor of another logger if its name followed by a `.` is a prefix of the descendant logger name. For example logger
with `a.b` context is an ancestor of logger with `a.b.c` context. All top-level loggers are descendants of special
logger with `root` context that resides at the top of the logger hierarchy. This logger always exists and 
fully configured.

Developer can configure _log level_ and _appenders_ that should be used within particular context. If logger configuration
specifies only _log level_ then _appenders_ configuration will be inherited from the ancestor logger. 

__Note:__ in the current implementation log messages are only forwarded to appenders configured for a particular logger 
context or to appenders of the closest ancestor if current logger doesn't have any appenders configured. That means that
we __don't support__ so called _appender additivity_ when log messages are forwarded to _every_ distinct appender within
ancestor chain including `root`.

## Log level

Currently we support the following log levels: _all_, _fatal_, _error_, _warn_, _info_, _debug_, _trace_, _off_.
Levels are ordered, so _all_ > _fatal_ > _error_ > _warn_ > _info_ > _debug_ > _trace_ > _off_.
A log record is being logged by the logger if its level is higher than or equal to the level of its logger. Otherwise, 
the log record is ignored.

The _all_ and _off_ levels can be used only in configuration and are just handy shortcuts that allow developer to log every
log record or disable logging entirely for the specific context.

## Layouts

Every appender should know exactly how to format log messages before they are written to the console or file on the disk.
This behaviour is controlled by the layouts and configured through `appender.layout` configuration property for every 
custom appender (see examples in [Configuration](#configuration)). Currently we don't define any default layout for the
custom appenders, so one should always make the choice explicitly.

There are two types of layout supported at the moment: `pattern` and `json`. 

With `pattern` layout it's possible to define a string pattern with special placeholders wrapped into curly braces that
will be replaced with data from the actual log message. By default the following pattern is used: 
`[{timestamp}][{level}][{context}] {message}`. Also `highlight` option can be enabled for `pattern` layout so that
some parts of the log message are highlighted with different colors that may be quite handy if log messages are forwarded
to the terminal with color support.

With `json` layout log messages will be formatted as JSON strings that include timestamp, log level, context, message 
text and any other metadata that may be associated with the log message itself.

## Configuration

As any configuration in the platform, logging configuration is validated against the predefined schema and if there are
any issues with it, Kibana will fail to start with the detailed error message.

Once the code acquired a logger instance it should not care about any runtime changes in the configuration that may
happen: all changes will be applied to existing logger instances under the hood.

Here is the configuration example that can be used to configure _loggers_, _appenders_ and _layouts_:

```yaml
logging:
  appenders:
    console:
      kind: console
      layout:
        kind: pattern
        highlight: true
    file:
      kind: file
      path: /var/log/kibana.log
      layout:
        kind: pattern
    custom:
      kind: console
      layout:
        kind: pattern
        pattern: [{timestamp}][{level}] {message}
    json-file-appender:
      kind: file
      path: /var/log/kibana-json.log

  root:
    appenders: [console, file]
    level: error

  loggers:
    - context: plugins
      appenders: [custom]
      level: warn
    - context: plugins.pid
      level: info
    - context: server
      level: fatal
    - context: optimize
      appenders: [console]
    - context: telemetry
      level: all
      appenders: [json-file-appender]
```

Here is what we get with the config above:

| Context       | Appenders                | Level |
| ------------- |:------------------------:| -----:|
| root          | console, file            | error |
| plugins       | custom                   | warn  |
| plugins.pid   | custom                   | info  |
| server        | console, file            | fatal |
| optimize      | console                  | error |
| telemetry     | json-file-appender       | all   |


The `root` logger has a dedicated configuration node since this context is special and should always exist. By 
default `root` is configured with `info` level and `default` appender that is also always available. This is the 
configuration that all custom loggers will use unless they're re-configured explicitly.

For example to see _all_ log messages that fall back on the `root` logger configuration, just add one line to the configuration:

```yaml
logging.root.level: all
```

Or disable logging entirely with `off`:

```yaml
logging.root.level: off
```

## Usage

Usage is very straightforward, one should just get a logger for a specific context and use it to log messages with 
different log level. 

```typescript
const logger = kibana.logger.get('server');

logger.trace('Message with `trace` log level.');
logger.debug('Message with `debug` log level.');
logger.info('Message with `info` log level.');
logger.warn('Message with `warn` log level.');
logger.error('Message with `error` log level.');
logger.fatal('Message with `fatal` log level.');

const loggerWithNestedContext = kibana.logger.get('server', 'http');
loggerWithNestedContext.trace('Message with `trace` log level.');
loggerWithNestedContext.debug('Message with `debug` log level.');
```

And assuming logger for `server` context with `console` appender and `trace` level was used, console output will look like this:
```bash
[2017-07-25T18:54:41.639Z][TRACE][server] Message with `trace` log level.
[2017-07-25T18:54:41.639Z][DEBUG][server] Message with `debug` log level.
[2017-07-25T18:54:41.639Z][INFO ][server] Message with `info` log level.
[2017-07-25T18:54:41.639Z][WARN ][server] Message with `warn` log level.
[2017-07-25T18:54:41.639Z][ERROR][server] Message with `error` log level.
[2017-07-25T18:54:41.639Z][FATAL][server] Message with `fatal` log level.

[2017-07-25T18:54:41.639Z][TRACE][server.http] Message with `trace` log level.
[2017-07-25T18:54:41.639Z][DEBUG][server.http] Message with `debug` log level.
```

The log will be less verbose with `warn` level for the `server` context:
```bash
[2017-07-25T18:54:41.639Z][WARN ][server] Message with `warn` log level.
[2017-07-25T18:54:41.639Z][ERROR][server] Message with `error` log level.
[2017-07-25T18:54:41.639Z][FATAL][server] Message with `fatal` log level.
```
