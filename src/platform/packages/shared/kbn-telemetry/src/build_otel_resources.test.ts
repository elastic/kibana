/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('@kbn/apm-config-loader', () => {
  const originalPkg = jest.requireActual('@kbn/apm-config-loader');

  return {
    ...originalPkg,
    getConfiguration: jest.fn(),
  };
});

import { resources } from '@elastic/opentelemetry-node/sdk';
import {
  ATTR_PROCESS_COMMAND_ARGS,
  ATTR_PROCESS_EXECUTABLE_NAME,
  ATTR_PROCESS_PID,
} from '@opentelemetry/semantic-conventions/incubating';
import { buildOtelResources } from './build_otel_resources';

const PROCESS_ARGS_COUNT = 'process.args_count';

describe('buildOtelResources', () => {
  beforeEach(() => {
    const { getConfiguration } = jest.requireMock('@kbn/apm-config-loader');
    getConfiguration.mockReturnValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('process command args', () => {
    test('drops process.command_args and records how many arguments were detected', async () => {
      const commandArgs = ['node', '--dev', 'src/cli/dist'];
      jest.spyOn(resources.processDetector, 'detect').mockReturnValue({
        attributes: {
          [ATTR_PROCESS_PID]: 123,
          [ATTR_PROCESS_EXECUTABLE_NAME]: 'node',
          [ATTR_PROCESS_COMMAND_ARGS]: commandArgs,
        },
      });

      const resource = buildOtelResources();
      await resource.waitForAsyncAttributes?.();

      expect(resource.attributes).not.toHaveProperty(ATTR_PROCESS_COMMAND_ARGS);
      expect(resource.attributes[PROCESS_ARGS_COUNT]).toBe(commandArgs.length);
      expect(resource.attributes[ATTR_PROCESS_PID]).toBe(123);
      expect(resource.attributes[ATTR_PROCESS_EXECUTABLE_NAME]).toBe('node');
    });

    test('records a count of zero when the detected command args are empty', async () => {
      jest.spyOn(resources.processDetector, 'detect').mockReturnValue({
        attributes: {
          [ATTR_PROCESS_COMMAND_ARGS]: [],
        },
      });

      const resource = buildOtelResources();
      await resource.waitForAsyncAttributes?.();

      expect(resource.attributes).not.toHaveProperty(ATTR_PROCESS_COMMAND_ARGS);
      expect(resource.attributes[PROCESS_ARGS_COUNT]).toBe(0);
    });

    test('does not set process.args_count when command args are absent', async () => {
      jest.spyOn(resources.processDetector, 'detect').mockReturnValue({
        attributes: {
          [ATTR_PROCESS_PID]: 123,
        },
      });

      const resource = buildOtelResources();
      await resource.waitForAsyncAttributes?.();

      expect(resource.attributes).not.toHaveProperty(ATTR_PROCESS_COMMAND_ARGS);
      expect(resource.attributes).not.toHaveProperty(PROCESS_ARGS_COUNT);
      expect(resource.attributes[ATTR_PROCESS_PID]).toBe(123);
    });

    test('drops non-array command args without recording a count', async () => {
      jest.spyOn(resources.processDetector, 'detect').mockReturnValue({
        attributes: {
          [ATTR_PROCESS_COMMAND_ARGS]: 'node --dev src/cli/dist',
        },
      });

      const resource = buildOtelResources();
      await resource.waitForAsyncAttributes?.();

      expect(resource.attributes).not.toHaveProperty(ATTR_PROCESS_COMMAND_ARGS);
      expect(resource.attributes).not.toHaveProperty(PROCESS_ARGS_COUNT);
    });

    test('strips command args reported by the real process detector', async () => {
      const resource = buildOtelResources();
      await resource.waitForAsyncAttributes?.();

      const expectedCount = [process.argv[0], ...process.execArgv, ...process.argv.slice(1)].length;

      expect(resource.attributes).not.toHaveProperty(ATTR_PROCESS_COMMAND_ARGS);
      expect(resource.attributes[PROCESS_ARGS_COUNT]).toBe(expectedCount);
      expect(resource.attributes[ATTR_PROCESS_PID]).toBe(process.pid);
    });
  });
});
