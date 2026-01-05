/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transformReferencesOut } from './transform_references_out';

describe('transformReferencesOut', () => {
  test('should only return control group references', () => {
    const references = [
      {
        name: 'someTagRef',
        type: 'tag',
        id: '1',
      },
      {
        name: 'controlGroup_1234',
        type: 'index-pattern',
        id: '1',
      },
    ];
    expect(transformReferencesOut(references)).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "1",
          "name": "controlGroup_1234",
          "type": "index-pattern",
        },
      ]
    `);
  });
});
