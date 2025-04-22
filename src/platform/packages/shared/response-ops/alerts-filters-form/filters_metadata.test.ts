/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFilterMetadata } from './filters_metadata';
import type { AlertsFilter } from './types';

describe('getFilterMetadata', () => {
  it('should throw an error if filter type is missing', () => {
    expect(() => getFilterMetadata({} as AlertsFilter)).toThrow(
      'Cannot get metadata for filter without type'
    );
  });

  it('should throw an error if filter type is not found in metadata', () => {
    // @ts-expect-error: Testing unknown type
    expect(() => getFilterMetadata({ type: 'unknown' })).toThrow(
      'Alerts filter of type unknown not found'
    );
  });

  it('should return metadata for a valid filter type', () => {
    const metadata = getFilterMetadata({ type: 'ruleTags' });
    expect(metadata).toHaveProperty('id', 'ruleTags');
    expect(metadata).toHaveProperty('displayName');
    expect(metadata).toHaveProperty('component');
    expect(metadata).toHaveProperty('isEmpty');
    expect(metadata).toHaveProperty('toKql');
  });
});
