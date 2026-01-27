/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';

/**
 * Mock map item matching the real MapUserContent type from
 * `x-pack/platform/plugins/shared/maps/public/routes/list_page/maps_list_view.tsx`
 */
export interface MapMockItem extends UserContentCommonSchema {
  type: 'map';
  attributes: {
    title: string;
    description?: string;
    layerListJSON?: string;
  };
  managed?: boolean;
}

/**
 * Mock map items
 */
export const MOCK_MAPS: MapMockItem[] = [
  {
    id: 'map-001',
    type: 'map',
    updatedAt: '2025-11-14T10:30:00.000Z',
    updatedBy: 'u_665722084_cloud',
    createdAt: '2025-09-01T08:00:00.000Z',
    createdBy: 'u_665722084_cloud',
    managed: false,
    attributes: {
      title: 'eCommerce Orders by Location',
      description: 'Geographic distribution of eCommerce orders',
    },
    references: [{ type: 'tag', id: 'tag-production', name: 'Production' }],
  },
  {
    id: 'map-002',
    type: 'map',
    updatedAt: '2025-11-10T15:45:00.000Z',
    updatedBy: 'u_jane_doe',
    createdAt: '2025-08-15T12:00:00.000Z',
    createdBy: 'u_jane_doe',
    managed: false,
    attributes: {
      title: 'Flight Routes Visualization',
      description: 'Interactive map of flight routes and destinations',
    },
    references: [{ type: 'tag', id: 'tag-development', name: 'Development' }],
  },
  {
    id: 'map-003',
    type: 'map',
    updatedAt: '2025-10-25T09:15:00.000Z',
    updatedBy: 'u_admin_local',
    createdAt: '2025-07-20T14:30:00.000Z',
    createdBy: 'u_admin_local',
    managed: false,
    attributes: {
      title: 'Web Traffic by Country',
      description: 'Heatmap of website visitors by geographic location',
    },
    references: [
      { type: 'tag', id: 'tag-production', name: 'Production' },
      { type: 'tag', id: 'tag-important', name: 'Important' },
    ],
  },
  {
    id: 'map-004',
    type: 'map',
    updatedAt: '2025-09-30T11:00:00.000Z',
    createdAt: '2025-06-10T10:45:00.000Z',
    createdBy: 'u_john_smith',
    managed: true,
    attributes: {
      title: 'Infrastructure Locations',
      description: 'Data center and server locations worldwide',
    },
    references: [],
  },
  {
    id: 'map-005',
    type: 'map',
    updatedAt: '2025-08-15T16:20:00.000Z',
    updatedBy: 'u_analyst_1',
    createdAt: '2025-05-05T13:30:00.000Z',
    createdBy: 'u_analyst_1',
    managed: false,
    attributes: {
      title: 'Security Threats Heatmap',
      description: 'Geographic distribution of detected security threats',
    },
    references: [{ type: 'tag', id: 'tag-security', name: 'Security' }],
  },
];
