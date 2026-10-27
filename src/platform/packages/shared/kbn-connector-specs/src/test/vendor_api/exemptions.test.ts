/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorCoverage } from './exemptions';
import { findLostCoverage, vendorApiExemptionsSchema } from './exemptions';

describe('findLostCoverage', () => {
  const coverage = (
    atBase: ConnectorCoverage['atBase'],
    recorded: boolean,
    exempt = false
  ): ConnectorCoverage => ({ id: '.connector', atBase, recorded, exempt });

  it.each([
    ['recorded connectors', coverage('recorded', true)],
    ['connectors that were not recorded at the merge base', coverage('unrecorded', false)],
    ['new recorded connectors', coverage('new', true)],
    ['new exempt connectors', coverage('new', false, true)],
  ])('accepts %s', (_, connector) => {
    expect(findLostCoverage([connector])).toEqual([]);
  });

  it.each([
    ['connectors whose artifacts were removed', coverage('recorded', false)],
    ['connectors whose artifacts were replaced by an exemption', coverage('recorded', false, true)],
    ['new connectors without artifacts or an exemption', coverage('new', false)],
  ])('reports %s', (_, connector) => {
    expect(findLostCoverage([connector])).toEqual([connector]);
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
