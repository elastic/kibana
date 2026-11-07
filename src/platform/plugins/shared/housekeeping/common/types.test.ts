/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HousekeepingFinding } from './types';
import { isFindingInScope } from './types';

const finding: HousekeepingFinding = {
  id: 'broken',
  resource: { type: 'index_template', id: 'logs' },
  related: [{ type: 'ingest_pipeline', id: 'gone' }],
};

describe('isFindingInScope', () => {
  it('matches a resource id on the resource or on a related resource', () => {
    expect(isFindingInScope(finding, { resourceId: 'logs' })).toBe(true);
    expect(isFindingInScope(finding, { resourceId: 'gone' })).toBe(true);
    expect(isFindingInScope(finding, { resourceId: 'other' })).toBe(false);
  });

  it('matches the type and the id on the same resource', () => {
    expect(
      isFindingInScope(finding, { resourceTypes: ['ingest_pipeline'], resourceId: 'gone' })
    ).toBe(true);
    expect(
      isFindingInScope(finding, { resourceTypes: ['ingest_pipeline'], resourceId: 'logs' })
    ).toBe(false);
  });
});
