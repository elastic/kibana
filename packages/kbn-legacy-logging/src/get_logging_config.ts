/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';
import { getLogReporter } from './log_reporter';
import { LegacyLoggingConfig } from './schema';

/**
 * Returns the `@hapi/good` plugin configuration to be used for the legacy logging
 * @param config
 */
export function getLoggingConfiguration(config: LegacyLoggingConfig, opsInterval: number) {
  const events = config.events;

  if (config.silent) {
    _.defaults(events, {});
  } else if (config.quiet) {
    _.defaults(events, {
      log: ['listening', 'error', 'fatal'],
      request: ['error'],
      error: '*',
    });
  } else if (config.verbose) {
    _.defaults(events, {
      log: '*',
      ops: '*',
      request: '*',
      response: '*',
      error: '*',
    });
  } else {
    _.defaults(events, {
      log: ['info', 'warning', 'error', 'fatal'],
      request: ['info', 'warning', 'error', 'fatal'],
      error: '*',
    });
  }

  const loggerStream = getLogReporter({
    config: {
      json: config.json,
      dest: config.dest,
      timezone: config.timezone,

      // I'm adding the default here because if you add another filter
      // using the commandline it will remove authorization. I want users
      // to have to explicitly set --logging.filter.authorization=none or
      // --logging.filter.cookie=none to have it show up in the logs.
      filter: _.defaults(config.filter, {
        authorization: 'remove',
        cookie: 'remove',
      }),
    },
    events: _.transform(
      events,
      function (filtered: Record<string, string>, val: string, key: string) {
        // provide a string compatible way to remove events
        if (val !== '!') filtered[key] = val;
      },
      {}
    ),
  });

  const options = {
    ops: {
      interval: opsInterval,
    },
    includes: {
      request: ['headers', 'payload'],
    },
    reporters: {
      logReporter: [loggerStream],
    },
  };
  return options;
}
