/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { expressionsPluginMock } from './mocks';
import { add } from '../common/test_helpers/expression_functions/add';

describe('ExpressionsServerPlugin', () => {
  test('can instantiate from mocks', async () => {
    const { setup } = await expressionsPluginMock.createPlugin();
    expect(typeof setup.registerFunction).toBe('function');
  });

  describe('setup contract', () => {
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
});
