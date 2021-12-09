/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { unsetAndCleanEmptyParent } from './unset_and_clean_empty_parent';

describe('unsetAndcleanEmptyParent', () => {
  test('unsets the property of the root object, and returns an empty root object', () => {
    const config = { toRemove: 'toRemove' };
    unsetAndCleanEmptyParent(config, 'toRemove');
    expect(config).toEqual({});
  });

  test('unsets a nested property of the root object, and removes the empty parent property', () => {
    const config = { nestedToRemove: { toRemove: 'toRemove' } };
    unsetAndCleanEmptyParent(config, 'nestedToRemove.toRemove');
    expect(config).toEqual({});
  });
});
