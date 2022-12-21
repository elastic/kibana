/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { writeFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { tmpdir } from 'os';
import {
  createTelemetryUsageCollector,
  isFileReadable,
  readTelemetryFile,
  MAX_FILE_SIZE,
} from './telemetry_usage_collector';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/server/mocks';

const mockUsageCollector = () => {
  return usageCollectionPluginMock.createSetupContract();
};

describe('telemetry_usage_collector', () => {
  const tempDir = tmpdir();
  const tempFiles = {
    blank: resolve(tempDir, 'tests-telemetry_usage_collector-blank.yml'),
    empty: resolve(tempDir, 'tests-telemetry_usage_collector-empty.yml'),
    too_big: resolve(tempDir, 'tests-telemetry_usage_collector-too_big.yml'),
    unreadable: resolve(tempDir, 'tests-telemetry_usage_collector-unreadable.yml'),
    valid: resolve(tempDir, 'telemetry.yml'),
  };
  const invalidFiles = [tempFiles.too_big, tempFiles.unreadable];
  const validFiles = [tempFiles.blank, tempFiles.empty, tempFiles.valid];
  const allFiles = Object.values(tempFiles);
  const expectedObject = {
    expected: 'value',
    more: {
      nested: {
        one: 1,
        two: 2,
      },
    },
  };

  // create temp files
  beforeAll(() => {
    // blank
    writeFileSync(tempFiles.blank, '\n');
    // empty
    writeFileSync(tempFiles.empty, '');
    // 1 byte too big
    writeFileSync(tempFiles.too_big, Buffer.alloc(MAX_FILE_SIZE + 1));
    // write-only file
    writeFileSync(tempFiles.unreadable, 'valid: true', { mode: 0o222 });
    // valid
    writeFileSync(tempFiles.valid, 'expected: value\nmore.nested.one: 1\nmore.nested.two: 2');
  });

  // delete temp files
  afterAll(() => {
    allFiles.forEach((path) => {
      try {
        unlinkSync(path);
      } catch (err) {
        // ignored
      }
    });
  });

  describe('isFileReadable', () => {
    test('returns `undefined` no file is readable', async () => {
      expect(isFileReadable('')).toBe(false);
      invalidFiles.forEach((path) => {
        expect(isFileReadable(path)).toBe(false);
      });
    });

    test('returns `true` file that has valid data', async () => {
      expect(allFiles.filter(isFileReadable)).toEqual(validFiles);
    });
  });

  describe('readTelemetryFile', () => {
    test('returns `undefined` if no path was found', async () => {
      expect(await readTelemetryFile('')).toBeUndefined();
      for (const invalidFile of invalidFiles) {
        expect(await readTelemetryFile(invalidFile)).toBeUndefined();
      }
    });

    test('returns `undefined` if the file is blank or empty', async () => {
      expect(await readTelemetryFile(tempFiles.blank)).toBeUndefined();
      expect(await readTelemetryFile(tempFiles.empty)).toBeUndefined();
    });

    test('returns the object parsed from the YAML file', async () => {
      expect(await readTelemetryFile(tempFiles.valid)).toEqual(expectedObject);
    });
  });

  describe('createTelemetryUsageCollector', () => {
    test('calls `makeUsageCollector`', async () => {
      // note: it uses the file's path to get the directory, then looks for 'telemetry.yml'
      // exclusively, which is indirectly tested by passing it the wrong "file" in the same
      // dir

      // the `makeUsageCollector` is mocked above to return the argument passed to it
      const usageCollector = mockUsageCollector();
      const collectorOptions = createTelemetryUsageCollector(
        usageCollector,
        async () => tempFiles.unreadable
      );

      expect(collectorOptions.type).toBe('static_telemetry');
      // @ts-expect-error this collector does not require any arguments in the fetch method, but TS complains
      expect(await collectorOptions.fetch()).toEqual(expectedObject);
    });
  });
});
