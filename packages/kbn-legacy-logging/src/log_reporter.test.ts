/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import os from 'os';
import path from 'path';
import fs from 'fs';
import Fs from 'fs/promises';

import stripAnsi from 'strip-ansi';

import { getLogReporter } from './log_reporter';
import { LogInterceptor } from './log_interceptor';

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

  describe('Stream processing capacity', () => {
    const NUM_OF_LINES = 1_000;
    const logEntry = { event: 'log', tags: ['foo'], data: 'hello world' };
    let loggerStream: LogInterceptor;
    let dest: string;

    beforeEach(() => {
      const dir = os.tmpdir();
      const logfile = `dest-${Date.now()}.log`;
      dest = path.join(dir, logfile);

      loggerStream = getLogReporter({
        config: {
          json: true, // Using JSON layout and file dest because it's the slowest combination.
          dest,
          filter: {},
        },
        events: { log: '*' },
      });
    });

    it(`handles a sudden burst of ${NUM_OF_LINES} log entries`, async () => {
      const closedStream = new Promise((resolve) => loggerStream.once('close', resolve));

      const acceptsMore = new Array(NUM_OF_LINES).fill(0).map(() => loggerStream.write(logEntry));

      loggerStream.end(logEntry);

      // Wait for the stream to be closed
      await closedStream;
      // Then wait some more for the OS i/o operations to complete
      await sleep(500);

      const lines = (await Fs.readFile(dest, { encoding: 'utf8' })).trim().split(os.EOL);
      expect(lines.length).toBe(NUM_OF_LINES + 1);
      expect(acceptsMore.filter(Boolean)).toHaveLength(NUM_OF_LINES);
    });

    it(`using the 'drain' event helps makes everything to go through`, async () => {
      const HIGH_LOAD = 10 * NUM_OF_LINES;

      const closedStream = new Promise((resolve) => loggerStream.once('close', resolve));

      for (let i = 0; i < HIGH_LOAD; i++) {
        if (!loggerStream.write(logEntry)) {
          await new Promise((resolve) => loggerStream.once('drain', resolve));
        }
      }

      loggerStream.end(logEntry);

      // Wait for the stream to be closed
      await closedStream;
      // Then wait some more for the OS i/o operations to complete
      await sleep(500);

      const lines = (await Fs.readFile(dest, { encoding: 'utf8' })).trim().split(os.EOL);
      expect(lines.length).toBe(HIGH_LOAD + 1);
    });
  });
});
