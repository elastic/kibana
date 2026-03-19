/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { enrichDimensions } from './enrich_dimensions';

describe('enrichDimensions', () => {
  it('returns dimensions unchanged when getFieldType returns undefined for all', () => {
    const dimensions = [{ name: 'host.name' }, { name: 'service.name' }];
    const getFieldType = () => undefined;

    expect(enrichDimensions(dimensions, getFieldType)).toEqual([
      { name: 'host.name' },
      { name: 'service.name' },
    ]);
  });

  it('adds type when getFieldType returns a value', () => {
    const dimensions = [{ name: 'host.name' }, { name: 'service.name' }];
    const getFieldType = () => 'keyword';

    expect(enrichDimensions(dimensions, getFieldType)).toEqual([
      { name: 'host.name', type: 'keyword' },
      { name: 'service.name', type: 'keyword' },
    ]);
  });

  it('handles mixed results where some dimensions have types and some do not', () => {
    const dimensions = [{ name: 'host.name' }, { name: 'unknown.field' }];
    const getFieldType = (name: string) => (name === 'host.name' ? 'keyword' : undefined);

    expect(enrichDimensions(dimensions, getFieldType)).toEqual([
      { name: 'host.name', type: 'keyword' },
      { name: 'unknown.field' },
    ]);
  });

  it('handles empty array', () => {
    const getFieldType = () => 'keyword';

    expect(enrichDimensions([], getFieldType)).toEqual([]);
  });
});
