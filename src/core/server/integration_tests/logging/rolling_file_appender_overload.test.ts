/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setTimeout as timer } from 'timers/promises';
import { join } from 'path';
import { rm, mkdtemp, readFile, readdir } from 'fs/promises';
import { createRoot as createKbnTestServerRoot } from '@kbn/core-test-helpers-kbn-server';

// Reproduction harness for SDH-6226: "Kibana audit logs not written to disk".
// The hypothesis under test is that the rolling file appender's in-memory
// `BufferAppender` (used while `isRolling=true`) and/or the unhandled
// `WriteStream` backpressure can silently drop events under high volume.
//
// Strategy: drive the rolling appender with N uniquely-numbered events at
// high volume, mirror the same stream into a non-rolling `truth` appender,
// and after a clean shutdown assert that every event present in the truth
// file is also present somewhere in the union of rolled files.
//
// Retention is set high so that "missing" can only mean the rolling
// appender dropped the event — not that retention deleted a rolled file.

const flushDelay = 2000;
const flush = () => timer(flushDelay);

const createRoot = (rollingAppender: unknown, truthAppender: unknown) =>
  createKbnTestServerRoot({
    logging: {
      appenders: {
        'rolling-file': rollingAppender,
        'truth-file': truthAppender,
      },
      loggers: [
        {
          name: 'test.audit.overload',
          level: 'debug',
          appenders: ['rolling-file', 'truth-file'],
        },
      ],
    },
    server: { restrictInternalApis: false },
  });

describe('RollingFileAppender — overload / drop reproduction', () => {
  let root: ReturnType<typeof createRoot> | undefined;
  let testDir: string;

  const collectIdsFromFiles = async (dir: string, prefix: string) => {
    const files = (await readdir(dir)).filter((f) => f.startsWith(prefix));
    const ids = new Set<number>();
    for (const file of files) {
      const content = await readFile(join(dir, file), 'utf-8');
      for (const match of content.matchAll(/event-(\d+)/g)) {
        ids.add(Number(match[1]));
      }
    }
    return { ids, files };
  };

  beforeEach(async () => {
    testDir = await mkdtemp('rolling-overload-test');
  });

  afterEach(async () => {
    if (root) {
      await root.shutdown();
      root = undefined;
    }
    if (testDir) {
      await rm(testDir, { recursive: true });
    }
  });

  it('preserves every event under repeated size-based rollovers', async () => {
    const TOTAL = 10_000;
    const rollingFile = join(testDir, 'rolling.log');
    const truthFile = join(testDir, 'truth.log');

    root = createRoot(
      {
        type: 'rolling-file',
        fileName: rollingFile,
        layout: { type: 'pattern', pattern: '%message' },
        // Force rollover roughly every ~50 events (~80b each).
        policy: { type: 'size-limit', size: '4kb' },
        strategy: { type: 'numeric', pattern: '-%i' },
        // 365 is the schema-imposed maximum; sized so retention never reaps
        // for the volumes used below — anything missing is a real drop.
        retention: { maxFiles: 365 },
      },
      {
        type: 'file',
        fileName: truthFile,
        layout: { type: 'pattern', pattern: '%message' },
      }
    );

    await root.preboot();
    await root.setup();

    const logger = root.logger.get('test.audit.overload');

    for (let i = 0; i < TOTAL; i++) {
      logger.info(`event-${i} payload-padding-to-make-this-message-around-forty-bytes`);
    }

    // shutdown awaits any in-flight rollover and disposes the appender,
    // which is the only deterministic way to drain stream + buffer.
    await flush();
    await root.shutdown();
    root = undefined;

    const rolling = await collectIdsFromFiles(testDir, 'rolling');
    const truth = await collectIdsFromFiles(testDir, 'truth');

    const missing = [...truth.ids].filter((id) => !rolling.ids.has(id));

    // Diagnostic: surface the file inventory if the assertion fails.
    if (missing.length > 0) {
      const allFiles = await readdir(testDir);
      // eslint-disable-next-line no-console
      console.log(
        'all files:',
        allFiles,
        '\nrolling files matched:',
        rolling.files,
        '\ntruth.ids.size:',
        truth.ids.size,
        '\nrolling.ids.size:',
        rolling.ids.size,
        '\nfirst 5 missing:',
        missing.slice(0, 5)
      );
    }

    expect(truth.ids.size).toBe(TOTAL);
    expect(missing).toEqual([]);
  });

  it('flushes the in-rollover buffer on clean shutdown', async () => {
    const TOTAL = 5_000;
    const rollingFile = join(testDir, 'rolling.log');
    const truthFile = join(testDir, 'truth.log');

    root = createRoot(
      {
        type: 'rolling-file',
        fileName: rollingFile,
        layout: { type: 'pattern', pattern: '%message' },
        // Tiny size makes a rollover almost certain to be in flight when shutdown lands.
        policy: { type: 'size-limit', size: '2kb' },
        strategy: { type: 'numeric', pattern: '-%i' },
        retention: { maxFiles: 365 },
      },
      {
        type: 'file',
        fileName: truthFile,
        layout: { type: 'pattern', pattern: '%message' },
      }
    );

    await root.preboot();
    await root.setup();

    const logger = root.logger.get('test.audit.overload');

    for (let i = 0; i < TOTAL; i++) {
      logger.info(`event-${i} payload-padding-to-make-this-message-around-forty-bytes`);
    }

    // Skip the post-write flush — exit straight into shutdown so a rollover
    // is much more likely to be in progress when dispose() runs.
    await root.shutdown();
    root = undefined;

    const rolling = await collectIdsFromFiles(testDir, 'rolling');
    const truth = await collectIdsFromFiles(testDir, 'truth');

    const missing = [...truth.ids].filter((id) => !rolling.ids.has(id));

    if (missing.length > 0) {
      const allFiles = await readdir(testDir);
      // eslint-disable-next-line no-console
      console.log(
        'all files:',
        allFiles,
        '\nrolling files matched:',
        rolling.files,
        '\ntruth.ids.size:',
        truth.ids.size,
        '\nrolling.ids.size:',
        rolling.ids.size,
        '\nfirst 5 missing:',
        missing.slice(0, 5)
      );
    }

    expect(truth.ids.size).toBe(TOTAL);
    expect(missing).toEqual([]);
  });
});
