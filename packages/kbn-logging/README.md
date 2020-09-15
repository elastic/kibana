# kbn-logging

Base types for the kibana platform logging system.

Note that this package currently only contains logging types. The only concrete implementation
is still in `core` for now.

- [Loggers, Appenders and Layouts](#loggers-appenders-and-layouts)
- [Logger hierarchy](#logger-hierarchy)
- [Log level](#log-level)
- [Layouts](#layouts)

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
custom appender. Currently we don't define any default layout for the custom appenders, so one should always make the choice 
explicitly.
