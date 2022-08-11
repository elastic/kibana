/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { expressionsPluginMock } from './mocks';
import { add } from '../common/test_helpers/expression_functions/add';
import { ExpressionsServiceFork } from '../common/service/expressions_fork';

describe('ExpressionsPublicPlugin', () => {
  test('can instantiate from mocks', async () => {
    const { setup } = await expressionsPluginMock.createPlugin();
    expect(typeof setup.registerFunction).toBe('function');
  });

  describe('setup contract', () => {
    test('.fork() method returns ExpressionsService', async () => {
      const { setup } = await expressionsPluginMock.createPlugin();
      const fork = setup.fork('test');

      expect(fork).toBeInstanceOf(ExpressionsServiceFork);
    });

    describe('.registerFunction()', () => {
      test('can register a function', async () => {
        const { setup } = await expressionsPluginMock.createPlugin();
        expect(setup.getFunctions().add).toBe(undefined);
        setup.registerFunction(add);
        expect(setup.getFunctions().add.name).toBe('add');
      });
    });
  });

  describe('start contract', () => {
    describe('.execute()', () => {
      test('can parse a single function expression', async () => {
        const { doStart } = await expressionsPluginMock.createPlugin();
        const start = await doStart();

        const handler = start.execute('clog', null);
        expect(handler.getAst()).toMatchInlineSnapshot(`
          Object {
            "chain": Array [
              Object {
                "arguments": Object {},
                "function": "clog",
                "type": "function",
              },
            ],
            "type": "expression",
          }
        `);
      });
    });
  });
});
