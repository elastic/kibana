/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

jest.doMock('lodash', () => {
  const original = jest.requireActual('lodash');
  return {
    ...original,
    get: (func: Function) => {
      function get(this: any, args: any[]) {
        return func.apply(this, args);
      }
      return get;
    },
  };
});

export const bulkGetObjectsMock = jest.fn();
jest.doMock('../../lib/bulk_get_objects', () => ({
  bulkGetObjects: bulkGetObjectsMock,
}));
