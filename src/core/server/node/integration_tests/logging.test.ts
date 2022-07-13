/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as kbnTestServer from '../../../test_helpers/kbn_server';

function createRootWithRoles(roles: string[]) {
  return kbnTestServer.createRoot({
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

describe('node service global LogMeta', () => {
  const validRoles = [['ui', 'background_tasks'], ['ui'], ['background_tasks']];

  validRoles.forEach((roles) => {
    describe(`with node.roles: ${roles}`, () => {
      let root: ReturnType<typeof createRootWithRoles>;
      let mockConsoleLog: jest.SpyInstance;

      beforeAll(async () => {
        mockConsoleLog = jest.spyOn(global.console, 'log');
        root = createRootWithRoles(roles);

        await root.preboot();
        await root.setup();
      }, 30000);

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
