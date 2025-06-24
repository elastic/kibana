/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Request } from '../../../../common/adapters/request/types';
import { disambiguateRequestNames } from './disambiguate_request_names';

describe('disambiguateRequestNames', () => {
  test('correctly disambiguates request names and preserves order', () => {
    const requests = [
      {
        id: '1',
        name: 'Name A',
      },
      {
        id: '2',
        name: 'Name B',
      },
      {
        id: '3',
        name: 'Name A',
      },
      {
        id: '4',
        name: 'Name C',
      },
      {
        id: '5',
        name: 'Name B',
      },
      {
        id: '6',
        name: 'Name A',
      },
    ] as Request[];

    expect(disambiguateRequestNames(requests)).toEqual([
      {
        id: '1',
        name: 'Name A (1)',
      },
      {
        id: '2',
        name: 'Name B (1)',
      },
      {
        id: '3',
        name: 'Name A (2)',
      },
      {
        id: '4',
        name: 'Name C',
      },
      {
        id: '5',
        name: 'Name B (2)',
      },
      {
        id: '6',
        name: 'Name A (3)',
      },
    ]);
  });

  test('does not change names unnecessarily', () => {
    const requests = [
      {
        id: '1',
        name: 'Test 1',
      },
      {
        id: '2',
        name: 'Test 2',
      },
      {
        id: '3',
        name: 'Test 3',
      },
    ] as Request[];

    expect(disambiguateRequestNames(requests)).toEqual(requests);
  });

  test('correctly handles empty arrays', () => {
    expect(disambiguateRequestNames([])).toEqual([]);
  });
});
