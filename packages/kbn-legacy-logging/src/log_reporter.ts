/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
