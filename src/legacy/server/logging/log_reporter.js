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

import { Squeeze } from '@hapi/good-squeeze';
import { createWriteStream as writeStr } from 'fs';

import LogFormatJson from './log_format_json';
import LogFormatString from './log_format_string';
import { LogInterceptor } from './log_interceptor';

// NOTE: legacy logger creates a new stream for each new access
// In https://github.com/elastic/kibana/pull/55937 we reach the max listeners
// default limit of 10 for process.stdout which starts a long warning/error
// thrown every time we start the server.
// In order to keep using the legacy logger until we remove it I'm just adding
// a new hard limit here.
process.stdout.setMaxListeners(25);

export function getLoggerStream({ events, config }) {
  const squeeze = new Squeeze(events);
  const format = config.json ? new LogFormatJson(config) : new LogFormatString(config);
  const logInterceptor = new LogInterceptor();

  let dest;
  if (config.dest === 'stdout') {
    dest = process.stdout;
  } else {
    dest = writeStr(config.dest, {
      flags: 'a',
      encoding: 'utf8',
    });

    logInterceptor.on('end', () => {
      dest.end();
    });
  }

  logInterceptor.pipe(squeeze).pipe(format).pipe(dest);

  return logInterceptor;
}
