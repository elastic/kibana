/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { VisualizationType } from './types';

/**
 * Mock visualization item matching the real VisualizeUserContent type from
 * `src/platform/plugins/shared/visualizations/public/visualize_app/components/visualize_listing.tsx`
 */
export interface VisualizationMockItem extends UserContentCommonSchema {
  type: 'visualization';
  attributes: {
    id: string;
    title: string;
    description?: string;
    visType: VisualizationType;
    typeTitle?: string;
    icon?: string;
    readOnly?: boolean;
    error?: string;
  };
  managed?: boolean;
  editor?: {
    editUrl?: string;
    editApp?: string;
  };
  error?: string;
}

/**
 * Mock visualization items
 */
export const MOCK_VISUALIZATIONS: VisualizationMockItem[] = [
  {
    id: 'vis-001',
    type: 'visualization',
    updatedAt: '2025-11-15T10:00:00.000Z',
    updatedBy: 'u_665722084_cloud',
    createdAt: '2025-10-05T09:30:00.000Z',
    createdBy: 'u_665722084_cloud',
    managed: false,
    attributes: {
      id: 'vis-001',
      title: 'Revenue Over Time',
      description: 'Line chart showing revenue trends',
      visType: 'lens',
      typeTitle: 'Lens',
      icon: 'lensApp',
      readOnly: false,
    },
    editor: {
      editUrl: '/app/lens#/edit/vis-001',
      editApp: 'lens',
    },
    references: [{ type: 'tag', id: 'tag-production', name: 'Production' }],
  },
  {
    id: 'vis-002',
    type: 'visualization',
    updatedAt: '2025-11-12T14:15:00.000Z',
    updatedBy: 'u_jane_doe',
    createdAt: '2025-09-20T11:45:00.000Z',
    createdBy: 'u_jane_doe',
    managed: false,
    attributes: {
      id: 'vis-002',
      title: 'Order Distribution by Category',
      description: 'Pie chart of orders by product category',
      visType: 'pie',
      typeTitle: 'Pie',
      icon: 'visPie',
      readOnly: false,
    },
    editor: {
      editUrl: '/app/visualize#/edit/vis-002',
    },
    references: [{ type: 'tag', id: 'tag-important', name: 'Important' }],
  },
  {
    id: 'vis-003',
    type: 'visualization',
    updatedAt: '2025-11-08T09:30:00.000Z',
    createdAt: '2025-08-15T16:00:00.000Z',
    createdBy: 'u_admin_local',
    managed: false,
    attributes: {
      id: 'vis-003',
      title: 'Top Products Table',
      description: 'Data table of top selling products',
      visType: 'table',
      typeTitle: 'Data Table',
      icon: 'visTable',
      readOnly: false,
    },
    editor: {
      editUrl: '/app/visualize#/edit/vis-003',
    },
    references: [],
  },
  {
    id: 'vis-004',
    type: 'visualization',
    updatedAt: '2025-10-25T12:40:00.000Z',
    updatedBy: 'u_john_smith',
    createdAt: '2025-07-10T14:20:00.000Z',
    createdBy: 'u_john_smith',
    managed: false,
    attributes: {
      id: 'vis-004',
      title: 'Server Response Times',
      description: 'Area chart of server response latencies',
      visType: 'area',
      typeTitle: 'Area',
      icon: 'visArea',
      readOnly: false,
    },
    editor: {
      editUrl: '/app/visualize#/edit/vis-004',
    },
    references: [{ type: 'tag', id: 'tag-development', name: 'Development' }],
  },
  {
    id: 'vis-005',
    type: 'visualization',
    updatedAt: '2025-09-30T15:55:00.000Z',
    createdAt: '2025-06-25T10:10:00.000Z',
    createdBy: 'u_analyst_1',
    managed: true,
    attributes: {
      id: 'vis-005',
      title: 'Alert Count Metric',
      description: 'Single metric showing total alerts',
      visType: 'metric',
      typeTitle: 'Metric',
      icon: 'visMetric',
      readOnly: true,
    },
    editor: {
      editUrl: '/app/visualize#/edit/vis-005',
    },
    references: [{ type: 'tag', id: 'tag-security', name: 'Security' }],
  },
  {
    id: 'vis-006',
    type: 'visualization',
    updatedAt: '2025-08-20T11:25:00.000Z',
    updatedBy: 'u_665722084_cloud',
    createdAt: '2025-05-15T13:40:00.000Z',
    createdBy: 'u_665722084_cloud',
    managed: false,
    attributes: {
      id: 'vis-006',
      title: 'Tag Cloud - Keywords',
      description: 'Word cloud of popular search terms',
      visType: 'tagcloud',
      typeTitle: 'Tag Cloud',
      icon: 'visTagCloud',
      readOnly: false,
    },
    editor: {
      editUrl: '/app/visualize#/edit/vis-006',
    },
    references: [{ type: 'tag', id: 'tag-archived', name: 'Archived' }],
  },
  {
    id: 'vis-007',
    type: 'visualization',
    updatedAt: '2025-11-14T08:50:00.000Z',
    updatedBy: 'u_jane_doe',
    createdAt: '2025-04-20T09:00:00.000Z',
    createdBy: 'u_jane_doe',
    managed: false,
    attributes: {
      id: 'vis-007',
      title: 'Custom Vega Chart',
      description: 'Advanced visualization using Vega-Lite',
      visType: 'vega',
      typeTitle: 'Vega',
      icon: 'visVega',
      readOnly: false,
    },
    editor: {
      editUrl: '/app/visualize#/edit/vis-007',
    },
    references: [{ type: 'tag', id: 'tag-development', name: 'Development' }],
  },
  {
    id: 'vis-008',
    type: 'visualization',
    updatedAt: '2025-07-15T17:30:00.000Z',
    createdAt: '2025-03-10T14:15:00.000Z',
    createdBy: 'u_admin_local',
    managed: false,
    attributes: {
      id: 'vis-008',
      title: 'Broken Visualization',
      description: 'This visualization has an error',
      visType: 'line',
      typeTitle: 'Line',
      icon: 'visLine',
      readOnly: false,
      error: 'Index pattern not found: logs-*',
    },
    error: 'Index pattern not found: logs-*',
    references: [],
  },
];
