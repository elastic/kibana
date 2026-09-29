/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { LoDashStatic } from 'lodash';

vi.doMock('lodash', async () => {
  // lodash is CommonJS: its namespace only exposes `default`, so spreading it would drop every helper.
  const { default: original } = await vi.importActual<{ default: LoDashStatic }>('lodash');
  const mocked = {
    ...original,
    get: (func: Function) => {
      function get(this: any, args: any[]) {
        return func.apply(this, args);
      }
      return get;
    },
  };
  return { ...mocked, default: mocked };
});

export const bulkGetObjectsMock = vi.fn();
vi.doMock('../../lib/bulk_get_objects', () => ({
  bulkGetObjects: bulkGetObjectsMock,
}));

export const bulkDeleteObjectsMock = vi.fn();
vi.doMock('../../lib/bulk_delete_objects', () => ({
  bulkDeleteObjects: bulkDeleteObjectsMock,
}));
