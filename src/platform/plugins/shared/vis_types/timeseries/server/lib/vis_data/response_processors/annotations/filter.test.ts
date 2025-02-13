/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { filterAnnotations } from './filter';
import type { Annotation } from '../../../../../common/types/vis_data';

describe('filterAnnotations', () => {
  test('should filter annotations by passed value correctly', () => {
    expect(
      filterAnnotations(1000)([
        {
          key: 100,
        },
        {
          key: 1000,
        },
        {
          key: 10000,
        },
      ] as Annotation[])
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "key": 100,
        },
        Object {
          "key": 1000,
        },
      ]
    `);
  });
});
