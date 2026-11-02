/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { VegaRenderDescriptor } from '../../data_model/types';
import { canUpdateDataInPlace } from './can_update_data_in_place';

const descriptor = (overrides: Record<string, unknown> = {}, values: unknown[] = [{ a: 1 }]) =>
  ({
    useMap: true,
    mapConfig: { zoom: 3 },
    spec: { data: [{ name: 'tiles', url: { query: 'FROM logs' }, values }], marks: [] },
    ...overrides,
  } as unknown as VegaRenderDescriptor);

describe('canUpdateDataInPlace', () => {
  test('is true when only the data values differ', () => {
    expect(canUpdateDataInPlace(descriptor(), descriptor({}, [{ a: 2 }, { a: 3 }]))).toBe(true);
  });

  test('is false when the spec differs beyond data values', () => {
    expect(
      canUpdateDataInPlace(
        descriptor(),
        descriptor({ spec: { data: [{ name: 'tiles', values: [] }], marks: [{}] } })
      )
    ).toBe(false);
  });

  test('is false when the map config differs', () => {
    expect(canUpdateDataInPlace(descriptor(), descriptor({ mapConfig: { zoom: 4 } }))).toBe(false);
  });

  test('is false for non-map specs and when the new descriptor has an error', () => {
    expect(canUpdateDataInPlace(descriptor({ useMap: false }), descriptor())).toBe(false);
    expect(canUpdateDataInPlace(descriptor(), descriptor({ error: 'boom' }))).toBe(false);
  });
});
