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
 * Mock file item for testing custom content types.
 * Files don't have an existing TableListView implementation in Kibana,
 * so this serves as an example of custom content type attributes.
 */
export interface FileMockItem extends UserContentCommonSchema {
  type: 'file';
  attributes: {
    title: string;
    description?: string;
    size: number;
    extension: string;
    mimeType: string;
    fileKind: string;
  };
  managed?: boolean;
}

/**
 * Mock file items
 */
export const MOCK_FILES: FileMockItem[] = [
  {
    id: 'file-001',
    type: 'file',
    updatedAt: '2025-11-15T09:00:00.000Z',
    updatedBy: 'u_665722084_cloud',
    createdAt: '2025-10-20T14:30:00.000Z',
    createdBy: 'u_665722084_cloud',
    attributes: {
      title: 'quarterly-report-q3.pdf',
      description: 'Q3 2025 quarterly financial report',
      size: 2457600, // 2.4 MB
      extension: 'pdf',
      mimeType: 'application/pdf',
      fileKind: 'reports',
    },
    references: [{ type: 'tag', id: 'tag-important', name: 'Important' }],
  },
  {
    id: 'file-002',
    type: 'file',
    updatedAt: '2025-11-12T11:45:00.000Z',
    updatedBy: 'u_jane_doe',
    createdAt: '2025-09-15T10:00:00.000Z',
    createdBy: 'u_jane_doe',
    attributes: {
      title: 'dashboard-screenshot.png',
      description: 'Screenshot of main analytics dashboard',
      size: 524288, // 512 KB
      extension: 'png',
      mimeType: 'image/png',
      fileKind: 'images',
    },
    references: [],
  },
  {
    id: 'file-003',
    type: 'file',
    updatedAt: '2025-11-08T16:30:00.000Z',
    createdAt: '2025-08-10T09:15:00.000Z',
    createdBy: 'u_admin_local',
    attributes: {
      title: 'config-backup.json',
      description: 'Kibana configuration backup',
      size: 102400, // 100 KB
      extension: 'json',
      mimeType: 'application/json',
      fileKind: 'config',
    },
    references: [{ type: 'tag', id: 'tag-archived', name: 'Archived' }],
  },
  {
    id: 'file-004',
    type: 'file',
    updatedAt: '2025-10-30T13:20:00.000Z',
    updatedBy: 'u_john_smith',
    createdAt: '2025-07-25T15:45:00.000Z',
    createdBy: 'u_john_smith',
    attributes: {
      title: 'sample-data.csv',
      description: 'Sample dataset for testing',
      size: 1048576, // 1 MB
      extension: 'csv',
      mimeType: 'text/csv',
      fileKind: 'data',
    },
    references: [{ type: 'tag', id: 'tag-development', name: 'Development' }],
  },
  {
    id: 'file-005',
    type: 'file',
    updatedAt: '2025-09-20T08:45:00.000Z',
    createdAt: '2025-06-15T11:00:00.000Z',
    createdBy: 'u_analyst_1',
    attributes: {
      title: 'security-audit-log.txt',
      description: 'Security audit log export',
      size: 5242880, // 5 MB
      extension: 'txt',
      mimeType: 'text/plain',
      fileKind: 'logs',
    },
    references: [{ type: 'tag', id: 'tag-security', name: 'Security' }],
  },
  {
    id: 'file-006',
    type: 'file',
    updatedAt: '2025-11-14T14:10:00.000Z',
    updatedBy: 'u_665722084_cloud',
    createdAt: '2025-05-30T16:20:00.000Z',
    createdBy: 'u_665722084_cloud',
    attributes: {
      title: 'architecture-diagram.svg',
      description: 'System architecture diagram',
      size: 204800, // 200 KB
      extension: 'svg',
      mimeType: 'image/svg+xml',
      fileKind: 'images',
    },
    references: [{ type: 'tag', id: 'tag-production', name: 'Production' }],
  },
];
