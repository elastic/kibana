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
    expect(config).toStrictEqual({});
  });

  test('unsets a nested property of the root object, and removes the empty parent property', () => {
    const config = { nestedToRemove: { toRemove: 'toRemove' } };
    unsetAndCleanEmptyParent(config, 'nestedToRemove.toRemove');
    expect(config).toStrictEqual({});
  });

  describe('Navigating to parent known issue: Array paths', () => {
    // We navigate to the parent property by splitting the "." and dropping the last item in the path.
    // This means that paths that are declared as prop1[idx] cannot apply the parent's cleanup logic.
    // The use cases for this are quite limited, so we'll accept it as a documented limitation.

    test('does not remove a parent array when the index is specified with square brackets', () => {
      const config = { nestedToRemove: [{ toRemove: 'toRemove' }] };
      unsetAndCleanEmptyParent(config, 'nestedToRemove[0].toRemove');
      expect(config).toStrictEqual({ nestedToRemove: [{}] });
    });

    test('removes a parent array when the index is specified with dots', () => {
      const config = { nestedToRemove: [{ toRemove: 'toRemove' }] };
      unsetAndCleanEmptyParent(config, 'nestedToRemove.0.toRemove');
      expect(config).toStrictEqual({});
    });
  });
});
