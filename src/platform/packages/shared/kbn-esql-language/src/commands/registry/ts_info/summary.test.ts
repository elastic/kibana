/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCommand } from '@elastic/esql/types';
import { summary } from './summary';
import { TS_INFO_FIELDS } from './columns_after';

describe('TS_INFO > summary', () => {
  const mockCommand = { name: 'ts_info' } as ESQLCommand;

  it('returns exactly the fixed set of ts info columns', () => {
    const { newColumns } = summary(mockCommand);

    expect(newColumns).toEqual(new Set(TS_INFO_FIELDS.map(({ name }) => name)));
  });

  it('does not return renamedColumnsPairs, metadataColumns, aggregates, or grouping', () => {
    const { renamedColumnsPairs, metadataColumns, aggregates, grouping } = summary(mockCommand);

    expect(renamedColumnsPairs).toBeUndefined();
    expect(metadataColumns).toBeUndefined();
    expect(aggregates).toBeUndefined();
    expect(grouping).toBeUndefined();
  });
});
