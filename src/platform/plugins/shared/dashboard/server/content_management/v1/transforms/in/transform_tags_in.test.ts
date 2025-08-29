/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transformTagsIn } from './transform_tags_in';

describe('transformTagsIn', () => {
  test('Should merge tags from attributes and references', () => {
    const tagRefs = transformTagsIn({
      tags: ['tag1', 'tag2'],
      references: [
        {
          id: 'tag2',
          type: 'tag',
          name: 'tag-ref-tag2',
        },
        {
          id: 'tag3',
          type: 'tag',
          name: 'tag-ref-tag3',
        },
      ],
    });

    expect(tagRefs).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "tag2",
          "name": "tag-ref-tag2",
          "type": "tag",
        },
        Object {
          "id": "tag3",
          "name": "tag-ref-tag3",
          "type": "tag",
        },
        Object {
          "id": "tag1",
          "name": "tag-ref-tag1",
          "type": "tag",
        },
      ]
    `);
  });
});
