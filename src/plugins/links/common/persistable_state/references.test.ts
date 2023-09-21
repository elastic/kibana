/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DASHBOARD_LINK_TYPE, EXTERNAL_LINK_TYPE } from '../content_management';
import { extractReferences, injectReferences } from './references';

describe('extractReferences', () => {
  test('should handle missing links attribute', () => {
    const attributes = {
      title: 'my links',
    };
    expect(extractReferences({ attributes })).toEqual({
      attributes: {
        title: 'my links',
      },
      references: [],
    });
  });

  test('should extract dashboard references from dashboard links', () => {
    const attributes = {
      title: 'my links',
      links: [
        {
          id: 'fb1b3fc7-6e12-4542-bcf5-c61ad77241c5',
          type: DASHBOARD_LINK_TYPE as typeof DASHBOARD_LINK_TYPE,
          destination: '19e149f0-e95e-404b-b6f8-fc751317c6be',
          order: 0,
        },
        {
          id: '4d5cd000-5632-4d3a-ad41-11d7800ff2aa',
          type: EXTERNAL_LINK_TYPE as typeof EXTERNAL_LINK_TYPE,
          destination: 'https://example.com',
          order: 1,
        },
        {
          id: '1409fabb-1d2b-49c2-a2dc-705bd8fabd0c',
          type: DASHBOARD_LINK_TYPE as typeof DASHBOARD_LINK_TYPE,
          destination: '39555f99-a3b8-4210-b1ef-fa0fa86fa3da',
          order: 2,
        },
      ],
    };
    expect(extractReferences({ attributes })).toEqual({
      attributes: {
        title: 'my links',
        links: [
          {
            id: 'fb1b3fc7-6e12-4542-bcf5-c61ad77241c5',
            type: 'dashboardLink',
            destinationRefName: 'link_fb1b3fc7-6e12-4542-bcf5-c61ad77241c5_dashboard',
            order: 0,
          },
          {
            id: '4d5cd000-5632-4d3a-ad41-11d7800ff2aa',
            type: 'externalLink',
            destination: 'https://example.com',
            order: 1,
          },
          {
            id: '1409fabb-1d2b-49c2-a2dc-705bd8fabd0c',
            type: 'dashboardLink',
            destinationRefName: 'link_1409fabb-1d2b-49c2-a2dc-705bd8fabd0c_dashboard',
            order: 2,
          },
        ],
      },
      references: [
        {
          id: '19e149f0-e95e-404b-b6f8-fc751317c6be',
          name: 'link_fb1b3fc7-6e12-4542-bcf5-c61ad77241c5_dashboard',
          type: 'dashboard',
        },
        {
          id: '39555f99-a3b8-4210-b1ef-fa0fa86fa3da',
          name: 'link_1409fabb-1d2b-49c2-a2dc-705bd8fabd0c_dashboard',
          type: 'dashboard',
        },
      ],
    });
  });
});

describe('injectReferences', () => {
  test('should handle missing links attribute', () => {
    const attributes = {
      title: 'my links',
    };
    expect(injectReferences({ attributes, references: [] })).toEqual({
      attributes: {
        title: 'my links',
      },
    });
  });

  test('should inject dashboard references into dashboard links', () => {
    const attributes = {
      title: 'my links',
      links: [
        {
          id: 'fb1b3fc7-6e12-4542-bcf5-c61ad77241c5',
          type: DASHBOARD_LINK_TYPE as typeof DASHBOARD_LINK_TYPE,
          destinationRefName: 'link_fb1b3fc7-6e12-4542-bcf5-c61ad77241c5_dashboard',
          order: 0,
        },
        {
          id: '4d5cd000-5632-4d3a-ad41-11d7800ff2aa',
          type: EXTERNAL_LINK_TYPE as typeof EXTERNAL_LINK_TYPE,
          destination: 'https://example.com',
          order: 1,
        },
        {
          id: '1409fabb-1d2b-49c2-a2dc-705bd8fabd0c',
          type: DASHBOARD_LINK_TYPE as typeof DASHBOARD_LINK_TYPE,
          destinationRefName: 'link_1409fabb-1d2b-49c2-a2dc-705bd8fabd0c_dashboard',
          order: 2,
        },
      ],
    };
    const references = [
      {
        id: '19e149f0-e95e-404b-b6f8-fc751317c6be',
        name: 'link_fb1b3fc7-6e12-4542-bcf5-c61ad77241c5_dashboard',
        type: 'dashboard',
      },
      {
        id: '39555f99-a3b8-4210-b1ef-fa0fa86fa3da',
        name: 'link_1409fabb-1d2b-49c2-a2dc-705bd8fabd0c_dashboard',
        type: 'dashboard',
      },
    ];
    expect(injectReferences({ attributes, references })).toEqual({
      attributes: {
        title: 'my links',
        links: [
          {
            id: 'fb1b3fc7-6e12-4542-bcf5-c61ad77241c5',
            type: 'dashboardLink',
            destination: '19e149f0-e95e-404b-b6f8-fc751317c6be',
            order: 0,
          },
          {
            id: '4d5cd000-5632-4d3a-ad41-11d7800ff2aa',
            type: 'externalLink',
            destination: 'https://example.com',
            order: 1,
          },
          {
            id: '1409fabb-1d2b-49c2-a2dc-705bd8fabd0c',
            type: 'dashboardLink',
            destination: '39555f99-a3b8-4210-b1ef-fa0fa86fa3da',
            order: 2,
          },
        ],
      },
    });
  });
});
