/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StoredLinksEmbeddableState } from '../types';
import type { StoredLinksByValueState910 } from './bwc';
import { transformOut } from './transform_out';

describe('transformOut', () => {
  test('should inject dashboard references for by-value state', () => {
    const byValueState = {
      title: 'Custom title',
      layout: 'vertical',
      links: [
        {
          type: 'dashboardLink',
          id: 'e2ab286f-0945-4e17-b256-f497b6c3102e',
          order: 0,
          destinationRefName: 'link_e2ab286f-0945-4e17-b256-f497b6c3102e_dashboard',
        },
      ],
    } as StoredLinksEmbeddableState;
    const references = [
      {
        name: 'link_e2ab286f-0945-4e17-b256-f497b6c3102e_dashboard',
        type: 'dashboard',
        id: '7adfa750-4c81-11e8-b3d7-01146121b73d',
      },
    ];
    expect(transformOut(byValueState, references)).toMatchInlineSnapshot(`
      Object {
        "layout": "vertical",
        "links": Array [
          Object {
            "destination": "7adfa750-4c81-11e8-b3d7-01146121b73d",
            "id": "e2ab286f-0945-4e17-b256-f497b6c3102e",
            "order": 0,
            "type": "dashboardLink",
          },
        ],
        "title": "Custom title",
      }
    `);
  });

  test('should inject dashboard references for 9.1.0 by-value state', () => {
    const byValueState = {
      title: 'Custom title',
      attributes: {
        layout: 'vertical',
        links: [
          {
            type: 'dashboardLink',
            id: 'e2ab286f-0945-4e17-b256-f497b6c3102e',
            order: 0,
            destinationRefName: 'link_e2ab286f-0945-4e17-b256-f497b6c3102e_dashboard',
          },
        ],
      } as StoredLinksByValueState910['attributes'],
    };
    const references = [
      {
        name: 'link_e2ab286f-0945-4e17-b256-f497b6c3102e_dashboard',
        type: 'dashboard',
        id: '7adfa750-4c81-11e8-b3d7-01146121b73d',
      },
    ];
    expect(transformOut(byValueState, references)).toMatchInlineSnapshot(`
      Object {
        "layout": "vertical",
        "links": Array [
          Object {
            "destination": "7adfa750-4c81-11e8-b3d7-01146121b73d",
            "id": "e2ab286f-0945-4e17-b256-f497b6c3102e",
            "order": 0,
            "type": "dashboardLink",
          },
        ],
        "title": "Custom title",
      }
    `);
  });

  test('should inject saved object reference for by-reference state', () => {
    const byReferenceState = {
      title: 'Custom title',
    } as StoredLinksEmbeddableState;
    const references = [
      {
        name: 'savedObjectRef',
        type: 'links',
        id: '820b40ee-307f-427a-ab61-5a5cdc5af7cd',
      },
    ];
    expect(transformOut(byReferenceState, references)).toMatchInlineSnapshot(`
      Object {
        "savedObjectId": "820b40ee-307f-427a-ab61-5a5cdc5af7cd",
        "title": "Custom title",
      }
    `);
  });
});
