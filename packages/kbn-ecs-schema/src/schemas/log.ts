/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License
* 2.0 and the Server Side Public License, v 1; you may not use this file except
* in compliance with, at your election, the Elastic License 2.0 or the Server
* Side Public License, v 1.
*/

/* eslint-disable */
export const logEcs = {
  file: {
    path: {
      dashed_name: 'log-file-path',
      description: 'Full path to the log file this event came from, including the file name. It should include the drive letter, when appropriate.\n' +
        "If the event wasn't read from a log file, do not populate this field.",
      example: '/var/log/fun-times.log',
      flat_name: 'log.file.path',
      ignore_above: 1024,
      level: 'extended',
      name: 'file.path',
      normalize: [],
      short: 'Full path to the log file this event came from.',
      type: 'keyword'
    }
  },
  level: {
    dashed_name: 'log-level',
    description: 'Original log level of the log event.\n' +
      "If the source of the event provides a log level or textual severity, this is the one that goes in `log.level`. If your source doesn't specify one, you may put your event transport's severity here (e.g. Syslog severity).\n" +
      'Some examples are `warn`, `err`, `i`, `informational`.',
    example: 'error',
    flat_name: 'log.level',
    ignore_above: 1024,
    level: 'core',
    name: 'level',
    normalize: [],
    short: 'Log level of the log event.',
    type: 'keyword'
  },
  logger: {
    dashed_name: 'log-logger',
    description: 'The name of the logger inside an application. This is usually the name of the class which initialized the logger, or can be a custom name.',
    example: 'org.elasticsearch.bootstrap.Bootstrap',
    flat_name: 'log.logger',
    ignore_above: 1024,
    level: 'core',
    name: 'logger',
    normalize: [],
    short: 'Name of the logger.',
    type: 'keyword'
  },
  origin: {
    file: {
      line: {
        dashed_name: 'log-origin-file-line',
        description: 'The line number of the file containing the source code which originated the log event.',
        example: 42,
        flat_name: 'log.origin.file.line',
        level: 'extended',
        name: 'origin.file.line',
        normalize: [],
        short: 'The line number of the file which originated the log event.',
        type: 'long'
      },
      name: {
        dashed_name: 'log-origin-file-name',
        description: 'The name of the file containing the source code which originated the log event.\n' +
          'Note that this field is not meant to capture the log file. The correct field to capture the log file is `log.file.path`.',
        example: 'Bootstrap.java',
        flat_name: 'log.origin.file.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'origin.file.name',
        normalize: [],
        short: 'The code file which originated the log event.',
        type: 'keyword'
      }
    },
    function: {
      dashed_name: 'log-origin-function',
      description: 'The name of the function or method which originated the log event.',
      example: 'init',
      flat_name: 'log.origin.function',
      ignore_above: 1024,
      level: 'extended',
      name: 'origin.function',
      normalize: [],
      short: 'The function which originated the log event.',
      type: 'keyword'
    }
  },
  syslog: {
    dashed_name: 'log-syslog',
    description: 'The Syslog metadata of the event, if the event was transmitted via Syslog. Please see RFCs 5424 or 3164.',
    flat_name: 'log.syslog',
    level: 'extended',
    name: 'syslog',
    normalize: [],
    short: 'Syslog metadata',
    type: 'object',
    appname: {
      dashed_name: 'log-syslog-appname',
      description: 'The device or application that originated the Syslog message, if available.',
      example: 'sshd',
      flat_name: 'log.syslog.appname',
      ignore_above: 1024,
      level: 'extended',
      name: 'syslog.appname',
      normalize: [],
      short: 'The device or application that originated the Syslog message.',
      type: 'keyword'
    },
    facility: {
      code: {
        dashed_name: 'log-syslog-facility-code',
        description: 'The Syslog numeric facility of the log event, if available.\n' +
          'According to RFCs 5424 and 3164, this value should be an integer between 0 and 23.',
        example: 23,
        flat_name: 'log.syslog.facility.code',
        format: 'string',
        level: 'extended',
        name: 'syslog.facility.code',
        normalize: [],
        short: 'Syslog numeric facility of the event.',
        type: 'long'
      },
      name: {
        dashed_name: 'log-syslog-facility-name',
        description: 'The Syslog text-based facility of the log event, if available.',
        example: 'local7',
        flat_name: 'log.syslog.facility.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'syslog.facility.name',
        normalize: [],
        short: 'Syslog text-based facility of the event.',
        type: 'keyword'
      }
    },
    hostname: {
      dashed_name: 'log-syslog-hostname',
      description: 'The hostname, FQDN, or IP of the machine that originally sent the Syslog message. This is sourced from the hostname field of the syslog header. Depending on the environment, this value may be different from the host that handled the event, especially if the host handling the events is acting as a collector.',
      example: 'example-host',
      flat_name: 'log.syslog.hostname',
      ignore_above: 1024,
      level: 'extended',
      name: 'syslog.hostname',
      normalize: [],
      short: 'The host that originated the Syslog message.',
      type: 'keyword'
    },
    msgid: {
      dashed_name: 'log-syslog-msgid',
      description: 'An identifier for the type of Syslog message, if available. Only applicable for RFC 5424 messages.',
      example: 'ID47',
      flat_name: 'log.syslog.msgid',
      ignore_above: 1024,
      level: 'extended',
      name: 'syslog.msgid',
      normalize: [],
      short: 'An identifier for the type of Syslog message.',
      type: 'keyword'
    },
    priority: {
      dashed_name: 'log-syslog-priority',
      description: 'Syslog numeric priority of the event, if available.\n' +
        'According to RFCs 5424 and 3164, the priority is 8 * facility + severity. This number is therefore expected to contain a value between 0 and 191.',
      example: 135,
      flat_name: 'log.syslog.priority',
      format: 'string',
      level: 'extended',
      name: 'syslog.priority',
      normalize: [],
      short: 'Syslog priority of the event.',
      type: 'long'
    },
    procid: {
      dashed_name: 'log-syslog-procid',
      description: 'The process name or ID that originated the Syslog message, if available.',
      example: 12345,
      flat_name: 'log.syslog.procid',
      ignore_above: 1024,
      level: 'extended',
      name: 'syslog.procid',
      normalize: [],
      short: 'The process name or ID that originated the Syslog message.',
      type: 'keyword'
    },
    severity: {
      code: {
        dashed_name: 'log-syslog-severity-code',
        description: 'The Syslog numeric severity of the log event, if available.\n' +
          "If the event source publishing via Syslog provides a different numeric severity value (e.g. firewall, IDS), your source's numeric severity should go to `event.severity`. If the event source does not specify a distinct severity, you can optionally copy the Syslog severity to `event.severity`.",
        example: 3,
        flat_name: 'log.syslog.severity.code',
        level: 'extended',
        name: 'syslog.severity.code',
        normalize: [],
        short: 'Syslog numeric severity of the event.',
        type: 'long'
      },
      name: {
        dashed_name: 'log-syslog-severity-name',
        description: 'The Syslog numeric severity of the log event, if available.\n' +
          "If the event source publishing via Syslog provides a different severity value (e.g. firewall, IDS), your source's text severity should go to `log.level`. If the event source does not specify a distinct severity, you can optionally copy the Syslog severity to `log.level`.",
        example: 'Error',
        flat_name: 'log.syslog.severity.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'syslog.severity.name',
        normalize: [],
        short: 'Syslog text-based severity of the event.',
        type: 'keyword'
      }
    },
    structured_data: {
      dashed_name: 'log-syslog-structured-data',
      description: 'Structured data expressed in RFC 5424 messages, if available. These are key-value pairs formed from the structured data portion of the syslog message, as defined in RFC 5424 Section 6.3.',
      flat_name: 'log.syslog.structured_data',
      level: 'extended',
      name: 'syslog.structured_data',
      normalize: [],
      short: 'Structured data expressed in RFC 5424 messages.',
      type: 'flattened'
    },
    version: {
      dashed_name: 'log-syslog-version',
      description: 'The version of the Syslog protocol specification. Only applicable for RFC 5424 messages.',
      example: 1,
      flat_name: 'log.syslog.version',
      ignore_above: 1024,
      level: 'extended',
      name: 'syslog.version',
      normalize: [],
      short: 'Syslog protocol version.',
      type: 'keyword'
    }
  }
}