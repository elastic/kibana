/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { singleAstriskValidator } from './form_schema';
import { ValidationFuncArg } from '../shared_imports';

describe('validators', () => {
  test('singleAstriskValidator should pass', async () => {
    const result = singleAstriskValidator({ value: 'kibana*' } as ValidationFuncArg<any, any>);
    expect(result).toBeUndefined();
  });
  test('singleAstriskValidator should fail', async () => {
    const result = singleAstriskValidator({ value: '*' } as ValidationFuncArg<any, any>);
    // returns error
    expect(result).toBeDefined();
  });
});
