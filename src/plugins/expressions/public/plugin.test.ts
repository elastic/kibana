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

      test('kibana_context function is available', async () => {
        const { setup } = await expressionsPluginMock.createPlugin();
        const result = await setup.run('kibana_context', null);
        expect(result).toMatchObject({
          type: 'kibana_context',
        });
      });
    });
  });

  describe('start contract', () => {
    describe('.execute()', () => {
      test('can parse a single function expression', async () => {
        const { doStart } = await expressionsPluginMock.createPlugin();
        const start = await doStart();

        const handler = start.execute('clog');
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

      test('"kibana" function return value of type "kibana_context"', async () => {
        const { doStart } = await expressionsPluginMock.createPlugin();
        const start = await doStart();
        const execution = start.execute('kibana');
        const result = await execution.getData();

        expect((result as any).type).toBe('kibana_context');
      });
    });
  });
});
