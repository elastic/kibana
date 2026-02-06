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
 * Mock dashboard item matching the real DashboardSavedObjectUserContent type from
 * `src/platform/plugins/shared/dashboard/public/dashboard_listing/types.ts`
 */
export interface DashboardMockItem extends UserContentCommonSchema {
  type: 'dashboard';
  attributes: {
    title: string;
    description?: string;
    /** Whether dashboard should restore saved time range when opened */
    timeRestore: boolean;
  };
  managed?: boolean;
  /** Dashboards can be favorited */
  canFavorite: true;
}

/**
 * Mock dashboard items
 */
export const MOCK_DASHBOARDS: DashboardMockItem[] = [
  {
    id: 'dashboard-001',
    type: 'dashboard',
    updatedAt: '2025-11-15T14:30:00.000Z',
    updatedBy: 'u_665722084_cloud',
    createdAt: '2025-10-01T09:00:00.000Z',
    createdBy: 'u_665722084_cloud',
    attributes: {
      title: '[eCommerce] Revenue Dashboard',
      description: 'Analyze mock eCommerce orders and revenue metrics',
      timeRestore: true,
    },
    references: [
      { type: 'tag', id: 'tag-production', name: 'Production' },
      { type: 'tag', id: 'tag-important', name: 'Important' },
    ],
    managed: false,
    canFavorite: true,
  },
  {
    id: 'dashboard-002',
    type: 'dashboard',
    updatedAt: '2025-11-10T08:15:00.000Z',
    updatedBy: 'u_jane_doe',
    createdAt: '2025-09-15T11:30:00.000Z',
    createdBy: 'u_admin_local',
    attributes: {
      title: '[Security] Detection Rule Monitoring',
      description: 'Monitor the health and performance of detection rules',
      timeRestore: false,
    },
    references: [
      { type: 'tag', id: 'tag-security', name: 'Security' },
      { type: 'tag', id: 'fleet-managed-default', name: 'Managed' },
    ],
    managed: true,
    canFavorite: true,
  },
  {
    id: 'dashboard-003',
    type: 'dashboard',
    updatedAt: '2025-11-12T16:45:00.000Z',
    updatedBy: 'u_665722084_cloud',
    createdAt: '2025-08-20T14:00:00.000Z',
    createdBy: 'u_665722084_cloud',
    attributes: {
      title: '[Flights] Global Flight Dashboard',
      description: 'Analyze mock flight data for ES-Air, Logstash Airways, Kibana Airlines',
      timeRestore: true,
    },
    references: [{ type: 'tag', id: 'tag-development', name: 'Development' }],
    managed: false,
    canFavorite: true,
  },
  {
    id: 'dashboard-004',
    type: 'dashboard',
    updatedAt: '2025-10-28T10:00:00.000Z',
    updatedBy: 'u_analyst_1',
    createdAt: '2025-07-10T08:30:00.000Z',
    createdBy: 'u_john_smith',
    attributes: {
      title: '[Logs] Web Traffic Analysis',
      description: "Analyze web traffic log data for Elastic's website",
      timeRestore: true,
    },
    references: [{ type: 'tag', id: 'tag-production', name: 'Production' }],
    managed: false,
    canFavorite: true,
  },
  {
    id: 'dashboard-005',
    type: 'dashboard',
    updatedAt: '2025-11-01T12:00:00.000Z',
    createdAt: '2025-06-01T10:00:00.000Z',
    createdBy: 'u_admin_local',
    attributes: {
      title: 'Infrastructure Overview',
      description: 'Server and container metrics overview',
      timeRestore: false,
    },
    references: [],
    managed: false,
    canFavorite: true,
  },
  {
    id: 'dashboard-006',
    type: 'dashboard',
    updatedAt: '2025-09-15T09:30:00.000Z',
    updatedBy: 'u_jane_doe',
    createdAt: '2025-05-20T15:45:00.000Z',
    createdBy: 'u_jane_doe',
    attributes: {
      title: 'APM Service Map',
      description: 'Application performance monitoring service dependencies',
      timeRestore: false,
    },
    references: [{ type: 'tag', id: 'tag-archived', name: 'Archived' }],
    managed: false,
    canFavorite: true,
  },
  {
    id: 'dashboard-007',
    type: 'dashboard',
    updatedAt: '2025-11-14T11:20:00.000Z',
    updatedBy: 'u_665722084_cloud',
    createdAt: '2025-04-10T13:00:00.000Z',
    createdBy: 'u_admin_local',
    attributes: {
      title: 'ML Anomaly Explorer',
      description: 'Machine learning anomaly detection results',
      timeRestore: false,
    },
    references: [
      { type: 'tag', id: 'tag-development', name: 'Development' },
      { type: 'tag', id: 'tag-important', name: 'Important' },
    ],
    managed: false,
    canFavorite: true,
  },
  {
    id: 'dashboard-008',
    type: 'dashboard',
    updatedAt: '2025-08-20T14:00:00.000Z',
    createdAt: '2025-03-05T09:15:00.000Z',
    createdBy: 'u_john_smith',
    attributes: {
      title: 'Uptime Monitoring',
      description: 'Monitor service uptime and availability',
      timeRestore: true,
    },
    references: [{ type: 'tag', id: 'tag-production', name: 'Production' }],
    managed: false,
    canFavorite: true,
  },
];

/**
 * Dashboard mock data wrapped in search response format
 */
export const DASHBOARD_MOCK_SEARCH_RESPONSE = {
  result: {
    contentTypeId: 'dashboard',
    result: {
      hits: MOCK_DASHBOARDS,
      pagination: {
        total: MOCK_DASHBOARDS.length,
      },
    },
  },
};
