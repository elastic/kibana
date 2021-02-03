/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { createWriteStream } from 'fs';
import { pipeline } from 'stream';

// @ts-expect-error missing type def
import { Squeeze } from '@hapi/good-squeeze';

import { KbnLoggerJsonFormat } from './log_format_json';
import { KbnLoggerStringFormat } from './log_format_string';
import { LogInterceptor } from './log_interceptor';
import { LogFormatConfig } from './log_format';

export function getLogReporter({ events, config }: { events: any; config: LogFormatConfig }) {
  const squeeze = new Squeeze(events);
  const format = config.json ? new KbnLoggerJsonFormat(config) : new KbnLoggerStringFormat(config);
  const logInterceptor = new LogInterceptor();

  if (config.dest === 'stdout') {
    pipeline(logInterceptor, squeeze, format, onFinished);
    // The `pipeline` function is used to properly close all streams in the
    // pipeline in case one of them ends or fails. Since stdout obviously
    // shouldn't be closed in case of a failure in one of the other streams,
    // we're not including that in the call to `pipeline`, but rely on the old
    // `pipe` function instead.
    format.pipe(process.stdout);
  } else {
    const dest = createWriteStream(config.dest, {
      flags: 'a',
      encoding: 'utf8',
    });
    pipeline(logInterceptor, squeeze, format, dest, onFinished);
  }

  return logInterceptor;
}

function onFinished(err: NodeJS.ErrnoException | null) {
  if (err) {
    // eslint-disable-next-line no-console
    console.error('An unexpected error occurred in the logging pipeline:', err.stack);
  }
}
