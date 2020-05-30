# Logging
- [Loggers, Appenders and Layouts](#loggers-appenders-and-layouts)
- [Logger hierarchy](#logger-hierarchy)
- [Log level](#log-level)
- [Layouts](#layouts)
  - [Pattern layout](#pattern-layout)
  - [JSON layout](#json-layout)
- [Configuration](#configuration)
- [Usage](#usage)
- [Logging config migration](#logging-config-migration)
- [Log record format changes](#log-record-format-changes)

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

### Pattern layout
With `pattern` layout it's possible to define a string pattern with special placeholders `%conversion_pattern` (see the table below) that
will be replaced with data from the actual log message. By default the following pattern is used: 
`[%date][%level][%logger]%meta %message`. Also `highlight` option can be enabled for `pattern` layout so that
some parts of the log message are highlighted with different colors that may be quite handy if log messages are forwarded
to the terminal with color support.
`pattern` layout uses a sub-set of [log4j2 pattern syntax](https://logging.apache.org/log4j/2.x/manual/layouts.html#PatternLayout)
and **doesn't implement** all `log4j2` capabilities. The conversions that are provided out of the box are:

#### level
Outputs the [level](#log-level) of the logging event.
Example of `%level` output:
```bash
TRACE
DEBUG
INFO
```

##### logger
Outputs the name of the logger that published the logging event.
Example of `%logger` output:
```bash
server
server.http
server.http.Kibana
```

#### message
Outputs the application supplied message associated with the logging event.

#### meta
Outputs the entries of `meta` object data in **json** format, if one is present in the event.
Example of `%meta` output:
```bash
// Meta{from: 'v7', to: 'v8'}
'{"from":"v7","to":"v8"}'
// Meta empty object
'{}'
// no Meta provided
''
```

##### date
Outputs the date of the logging event. The date conversion specifier may be followed by a set of braces containing a name of predefined date format and canonical timezone name.
Timezone name is expected to be one from [TZ database name](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)
Example of `%date` output:

| Conversion pattern                       | Example                                                          |
| ---------------------------------------- | ---------------------------------------------------------------- |
| `%date`                                  | `2012-02-01T14:30:22.011Z` uses `ISO8601` format by default      |
| `%date{ISO8601}`                         | `2012-02-01T14:30:22.011Z`                                       |
| `%date{ISO8601_TZ}`                      | `2012-02-01T09:30:22.011-05:00`   `ISO8601` with timezone        |
| `%date{ISO8601_TZ}{America/Los_Angeles}` | `2012-02-01T06:30:22.011-08:00`                                  |
| `%date{ABSOLUTE}`                        | `09:30:22.011`                                                   |
| `%date{ABSOLUTE}{America/Los_Angeles}`   | `06:30:22.011`                                                   |
| `%date{UNIX}`                            | `1328106622`                                                     |
| `%date{UNIX_MILLIS}`                     | `1328106622011`                                                  |

#### pid
Outputs the process ID.

### JSON layout
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
        pattern: "[%date][%level] %message"
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
    - context: plugins.myPlugin
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

| Context          | Appenders                | Level |
| ---------------- |:------------------------:| -----:|
| root             | console, file            | error |
| plugins          | custom                   | warn  |
| plugins.myPlugin | custom                   | info  |
| server           | console, file            | fatal |
| optimize         | console                  | error |
| telemetry        | json-file-appender       | all   |


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

### Logging config migration
Compatibility with the legacy logging system is assured until the end of the `v7` version.
All log messages handled by `root` context are forwarded to the legacy logging service. If you re-write
root appenders, make sure that it contains `default` appender to provide backward compatibility.
**Note**: If you define an appender for a context, the log messages aren't handled by the
`root` context anymore and not forwarded to the legacy logging service.
 
#### logging.dest
By default logs in *stdout*. With new Kibana logging you can use pre-existing `console` appender or
define a custom one.
```yaml
logging:
  loggers:
    - context: plugins.myPlugin
      appenders: [console]
```
Logs in a *file* if given file path. You should define a custom appender with `kind: file` 
```yaml

logging:
  appenders:
    file:
      kind: file
      path: /var/log/kibana.log
      layout:
        kind: pattern
  loggers:
    - context: plugins.myPlugin
      appenders: [file]
``` 
#### logging.json
Defines the format of log output. Logs in JSON if `true`. With new logging config you can adjust
the output format with [layouts](#layouts).

#### logging.quiet
Suppresses all logging output other than error messages. With new logging, config can be achieved 
with adjusting minimum required [logging level](#log-level).
```yaml
  loggers:
    - context: plugins.myPlugin
      appenders: [console]
      level: error
# or for all output
logging.root.level: error
```

#### logging.silent:
Suppresses all logging output.
```yaml
logging.root.level: off
```

#### logging.verbose:
Logs all events
```yaml
logging.root.level: all
```

#### logging.timezone
Set to the canonical timezone id to log events using that timezone. New logging config allows
to [specify timezone](#date) for `layout: pattern`.
```yaml
logging:
  appenders:
    custom-console:
      kind: console
      layout:
        kind: pattern
        highlight: true
        pattern: "[%level] [%date{ISO8601_TZ}{America/Los_Angeles}][%logger] %message"
```

#### logging.events
Define a custom logger for a specific context.

#### logging.filter
TBD

### Log record format changes

| Parameter       | Platform log record in **pattern** format  | Legacy Platform log record **text** format |
| --------------- | ------------------------------------------ | ------------------------------------------ |
| @timestamp      | ISO8601 `2012-01-31T23:33:22.011Z`         | Absolute `23:33:22.011`                    |
| context         | `parent.child`                             | `['parent', 'child']`                      |
| level           | `DEBUG`                                    | `['debug']`                                |
| meta            | stringified JSON object `{"to": "v8"}`     | N/A                                        |
| pid             | can be configured as `%pid`                | N/A                                        |

| Parameter       | Platform log record in **json** format     | Legacy Platform log record **json** format   |
| --------------- | ------------------------------------------ | -------------------------------------------- |
| @timestamp      | ISO8601_TZ `2012-01-31T23:33:22.011-05:00` | ISO8601 `2012-01-31T23:33:22.011Z`           |
| context         | `context: parent.child`                    | `tags: ['parent', 'child']`                  |
| level           | `level: DEBUG`                             | `tags: ['debug']`                            |
| meta            | separate property `"meta": {"to": "v8"}`   | merged in log record  `{... "to": "v8"}`     |
| pid             | `pid: 12345`                               | `pid: 12345`                                 |
| type            | N/A                                        | `type: log`                                  |
| error           | `{ message, name, stack }`                 | `{ message, name, stack, code, signal }`     |