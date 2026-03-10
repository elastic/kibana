/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DASHBOARD_LINK_TYPE, EXTERNAL_LINK_TYPE } from '../../content_management';
import { transformIn } from './transform_in';

describe('transformIn', () => {
  test('should extract saved object reference from "by reference" state', () => {
    const byReferenceState = {
      title: 'Custom title',
      savedObjectId: '123',
    };
    expect(transformIn(byReferenceState)).toMatchInlineSnapshot(`
      Object {
        "references": Array [
          Object {
            "id": "123",
            "name": "savedObjectRef",
            "type": "links",
          },
        ],
        "state": Object {
          "title": "Custom title",
        },
      }
    `);
  });

  test('should extract dashboard references from "by value" state', () => {
    const byValueState = {
      title: 'Custom title',
      links: [
        {
          type: DASHBOARD_LINK_TYPE as typeof DASHBOARD_LINK_TYPE,
          destination: '19e149f0-e95e-404b-b6f8-fc751317c6be',
        },
      ],
    };
    expect(transformIn(byValueState)).toMatchInlineSnapshot(`
      Object {
        "references": Array [
          Object {
            "id": "19e149f0-e95e-404b-b6f8-fc751317c6be",
            "name": "link_undefined_dashboard",
            "type": "dashboard",
          },
        ],
        "state": Object {
          "links": Array [
            Object {
              "destinationRefName": "link_undefined_dashboard",
              "type": "dashboardLink",
            },
          ],
          "title": "Custom title",
        },
      }
    `);
  });

  test('should strip 9.3.0 properties from links', () => {
    const byValueState = {
      title: 'Custom title',
      links: [
        {
          id: 'fb1b3fc7-6e12-4542-bcf5-c61ad77241c5',
          order: 0,
          type: EXTERNAL_LINK_TYPE as typeof EXTERNAL_LINK_TYPE,
          destination: 'https://a.b.c.d.e.f.g',
        },
      ],
    };
    expect(transformIn(byValueState)).toMatchInlineSnapshot(`
      Object {
        "references": Array [],
        "state": Object {
          "links": Array [
            Object {
              "destination": "https://a.b.c.d.e.f.g",
              "type": "externalLink",
            },
          ],
          "title": "Custom title",
        },
      }
    `);
  });
});
