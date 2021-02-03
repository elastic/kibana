/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { expressionsPluginMock } from './mocks';
import { add } from '../common/test_helpers/expression_functions/add';
import { ExpressionsService } from '../common';

describe('ExpressionsPublicPlugin', () => {
  test('can instantiate from mocks', async () => {
    const { setup } = await expressionsPluginMock.createPlugin();
    expect(typeof setup.registerFunction).toBe('function');
  });

  describe('setup contract', () => {
    test('.fork() method returns ExpressionsService', async () => {
      const { setup } = await expressionsPluginMock.createPlugin();
      const fork = setup.fork();

      expect(fork).toBeInstanceOf(ExpressionsService);
    });

    describe('.registerFunction()', () => {
      test('can register a function', async () => {
        const { setup } = await expressionsPluginMock.createPlugin();
        expect(setup.getFunctions().add).toBe(undefined);
        setup.registerFunction(add);
        expect(setup.getFunctions().add.name).toBe('add');
      });
    });

    describe('.run()', () => {
      test('can execute simple expression', async () => {
        const { setup } = await expressionsPluginMock.createPlugin();
        const bar = await setup.run('var_set name="foo" value="bar" | var name="foo"', null);
        expect(bar).toBe('bar');
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
