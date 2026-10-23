/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findAddedExemptions, vendorApiExemptionsSchema } from './exemptions';

describe('findAddedExemptions', () => {
  const previous = { '.mysql': 'Driver protocol', '.slack': 'Not recorded yet' };
  const isNewConnector = (id: string) => id === '.brand_new';

  it('allows removals and new connectors', () => {
    expect(
      findAddedExemptions(
        previous,
        { '.mysql': 'Driver protocol', '.brand_new': 'No spec' },
        isNewConnector
      )
    ).toEqual([]);
  });

  it('reports exemptions added for existing connectors', () => {
    expect(
      findAddedExemptions(previous, { ...previous, '.github': 'Not recorded yet' }, isNewConnector)
    ).toEqual(['.github']);
  });
});

describe('vendorApiExemptionsSchema', () => {
  it.each([
    ['ids without the leading dot', { mysql: 'Driver protocol' }],
    ['empty reasons', { '.mysql': '' }],
  ])('rejects %s', (_, exemptions) => {
    expect(vendorApiExemptionsSchema.safeParse(exemptions).success).toBe(false);
  });
});
