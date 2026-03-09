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

describe('METRICS_INFO > summary', () => {
  const mockCommand = { name: 'metrics_info' } as ESQLCommand;

  it('returns exactly the fixed set of metrics info columns', () => {
    const result = summary(mockCommand);

    expect(result.newColumns).toEqual(
      new Set([
        'metric_name',
        'data_stream',
        'unit',
        'metric_type',
        'field_type',
        'dimension_fields',
      ])
    );
  });

  it('does not return renamedColumnsPairs, metadataColumns, aggregates, or grouping', () => {
    const result = summary(mockCommand);

    expect(result.renamedColumnsPairs).toBeUndefined();
    expect(result.metadataColumns).toBeUndefined();
    expect(result.aggregates).toBeUndefined();
    expect(result.grouping).toBeUndefined();
  });
});
