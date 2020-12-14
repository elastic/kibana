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

import os from 'os';
import path from 'path';
import fs from 'fs';

import stripAnsi from 'strip-ansi';

import { getLogReporter } from './log_reporter';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('getLogReporter', () => {
  it('should log to stdout (not json)', async () => {
    const lines: string[] = [];
    const origWrite = process.stdout.write;
    process.stdout.write = (buffer: string | Uint8Array): boolean => {
      lines.push(stripAnsi(buffer.toString()).trim());
      return true;
    };

    const loggerStream = getLogReporter({
      config: {
        json: false,
        dest: 'stdout',
        filter: {},
      },
      events: { log: '*' },
    });

    loggerStream.end({ event: 'log', tags: ['foo'], data: 'hello world' });

    await sleep(500);

    process.stdout.write = origWrite;
    expect(lines.length).toBe(1);
    expect(lines[0]).toMatch(/^log   \[[^\]]*\] \[foo\] hello world$/);
  });

  it('should log to stdout (as json)', async () => {
    const lines: string[] = [];
    const origWrite = process.stdout.write;
    process.stdout.write = (buffer: string | Uint8Array): boolean => {
      lines.push(JSON.parse(buffer.toString().trim()));
      return true;
    };

    const loggerStream = getLogReporter({
      config: {
        json: true,
        dest: 'stdout',
        filter: {},
      },
      events: { log: '*' },
    });

    loggerStream.end({ event: 'log', tags: ['foo'], data: 'hello world' });

    await sleep(500);

    process.stdout.write = origWrite;
    expect(lines.length).toBe(1);
    expect(lines[0]).toMatchObject({
      type: 'log',
      tags: ['foo'],
      message: 'hello world',
    });
  });

  it('should log to custom file (not json)', async () => {
    const dir = os.tmpdir();
    const logfile = `dest-${Date.now()}.log`;
    const dest = path.join(dir, logfile);

    const loggerStream = getLogReporter({
      config: {
        json: false,
        dest,
        filter: {},
      },
      events: { log: '*' },
    });

    loggerStream.end({ event: 'log', tags: ['foo'], data: 'hello world' });

    await sleep(500);

    const lines = stripAnsi(fs.readFileSync(dest, { encoding: 'utf8' }))
      .trim()
      .split(os.EOL);
    expect(lines.length).toBe(1);
    expect(lines[0]).toMatch(/^log   \[[^\]]*\] \[foo\] hello world$/);
  });

  it('should log to custom file (as json)', async () => {
    const dir = os.tmpdir();
    const logfile = `dest-${Date.now()}.log`;
    const dest = path.join(dir, logfile);

    const loggerStream = getLogReporter({
      config: {
        json: true,
        dest,
        filter: {},
      },
      events: { log: '*' },
    });

    loggerStream.end({ event: 'log', tags: ['foo'], data: 'hello world' });

    await sleep(500);

    const lines = fs
      .readFileSync(dest, { encoding: 'utf8' })
      .trim()
      .split(os.EOL)
      .map((data) => JSON.parse(data));
    expect(lines.length).toBe(1);
    expect(lines[0]).toMatchObject({
      type: 'log',
      tags: ['foo'],
      message: 'hello world',
    });
  });
});
