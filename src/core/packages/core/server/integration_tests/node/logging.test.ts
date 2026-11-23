/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createRoot as createkbnTestServerRoot } from '@kbn/core-test-helpers-kbn-server';
import { unsafeConsole } from '@kbn/security-hardening';

function createRootWithRoles(roles: string[]) {
  return createkbnTestServerRoot({
    node: {
      roles,
    },
    logging: {
      appenders: {
        'test-console': {
          type: 'console',
          layout: {
            type: 'json',
          },
        },
      },
      root: {
        appenders: ['test-console'],
        level: 'info',
      },
    },
  });
}

describe('node service global context', () => {
  const validRoles = [['ui', 'background_tasks'], ['ui'], ['background_tasks']];

  validRoles.forEach((roles) => {
    describe(`with node.roles: ${roles}`, () => {
      let root: ReturnType<typeof createRootWithRoles>;
      let mockConsoleLog: jest.SpyInstance;

      beforeAll(async () => {
        mockConsoleLog = jest.spyOn(unsafeConsole, 'log');
        root = createRootWithRoles(roles);

        await root.preboot();
        await root.setup();
      });

      beforeEach(() => {
        mockConsoleLog.mockClear();
      });

      afterAll(async () => {
        mockConsoleLog.mockRestore();
        await root.shutdown();
      });

      it('logs the correct roles in service.node.roles', () => {
        const logger = root.logger.get('foo.bar');

        logger.info('test info');

        expect(mockConsoleLog).toHaveBeenCalledTimes(1);
        expect(JSON.parse(mockConsoleLog.mock.calls[0][0])).toEqual(
          expect.objectContaining({ service: { node: { roles } } })
        );
      });
    });
  });
});
