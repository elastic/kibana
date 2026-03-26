/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import { columnsAfter } from './columns_after';

describe('TS columnsAfter', () => {
  it('returns fields from the source', async () => {
    const sourceFields: ESQLFieldWithMetadata[] = [
      { name: 'field1', type: 'double', userDefined: false },
      { name: 'field2', type: 'keyword', userDefined: false },
    ];

    const result = await columnsAfter({} as any, [], '', {
      fromFrom: () => Promise.resolve(sourceFields),
      fromJoin: () => Promise.resolve([]),
      fromEnrich: () => Promise.resolve([]),
    });

    expect(result).toEqual(sourceFields);
  });
});
