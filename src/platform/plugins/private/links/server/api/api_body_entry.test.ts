/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expectApiBodyEntryRoundTrip } from '@kbn/saved-objects-management-plugin/server/mocks';
import { linksApiBodyEntry } from './api_body_entry';

// Dashboard link reference names are random; numbering them makes the round trip comparable.
let referenceNumber = 0;
jest.mock('uuid', () => ({ v4: () => `${referenceNumber++}` }));

describe('links API body entry', () => {
  beforeEach(() => {
    referenceNumber = 0;
  });

  it('round-trips a links item with dashboard links, an external link and a tag', () => {
    const stored = {
      attributes: {
        title: 'Navigation',
        description: 'Links to the other dashboards',
        layout: 'horizontal' as const,
        links: [
          {
            type: 'dashboardLink' as const,
            label: 'Overview',
            destinationRefName: 'link_0_dashboard',
            options: { use_filters: true, use_time_range: true, open_in_new_tab: false },
          },
          {
            type: 'externalLink' as const,
            destination: 'https://www.elastic.co',
            options: { open_in_new_tab: true, encode_url: true },
          },
          {
            type: 'dashboardLink' as const,
            destinationRefName: 'link_1_dashboard',
            options: { use_filters: false, use_time_range: true, open_in_new_tab: true },
          },
        ],
      },
      references: [
        { name: 'link_0_dashboard', type: 'dashboard', id: 'overview-dashboard' },
        { name: 'link_1_dashboard', type: 'dashboard', id: 'details-dashboard' },
        { name: 'tag-ref-web-tag', type: 'tag', id: 'web-tag' },
      ],
    };

    expect(expectApiBodyEntryRoundTrip(linksApiBodyEntry, stored)).toEqual({
      title: 'Navigation',
      description: 'Links to the other dashboards',
      layout: 'horizontal',
      links: [
        expect.objectContaining({ type: 'dashboardLink', destination: 'overview-dashboard' }),
        expect.objectContaining({ type: 'externalLink', destination: 'https://www.elastic.co' }),
        expect.objectContaining({ type: 'dashboardLink', destination: 'details-dashboard' }),
      ],
      tags: ['web-tag'],
    });
  });

  it('puts every dashboard link destination into the references', () => {
    const { references } = linksApiBodyEntry.toStored(
      linksApiBodyEntry.getSchema().parse({
        title: 'Cycle',
        links: [{ type: 'dashboardLink', destination: 'other-dashboard' }],
      })
    );

    expect(references).toEqual([
      { name: 'link_0_dashboard', type: 'dashboard', id: 'other-dashboard' },
    ]);
  });
});
