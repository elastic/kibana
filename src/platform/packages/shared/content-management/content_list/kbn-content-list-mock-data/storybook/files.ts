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
 * Mock file items.
 *
 * Tuned to span the name-cell permutation matrix (short/long filename ×
 * empty/short/long description) so the Files Management stories exercise
 * both the custom-render (`Original`) and `Column.Name showDescription`
 * (`Proposal`) layouts at narrow and ≥ 2560px viewports. The Files story
 * does not render tags inline, so the matrix collapses to `t × d` and
 * tag counts are kept low. The matrix uses `t{s,m,l}` for filename
 * length and `d{0,s,l}` for description length.
 *
 * No pinned IDs — story consumers iterate the list without ID
 * references.
 */
export const MOCK_FILES: FileMockItem[] = [
  // ts-ds — short filename + short description. Baseline compact row.
  {
    id: 'file-001',
    type: 'file',
    updatedAt: '2025-11-15T09:00:00.000Z',
    updatedBy: 'u_665722084_cloud',
    createdAt: '2025-10-20T14:30:00.000Z',
    createdBy: 'u_665722084_cloud',
    attributes: {
      title: 'q3-report.pdf',
      description: 'Q3 2025 financial report.',
      size: 2457600,
      extension: 'pdf',
      mimeType: 'application/pdf',
      fileKind: 'reports',
    },
    references: [{ type: 'tag', id: 'tag-important', name: 'Important' }],
  },
  // tl-ds — long descriptive filename + short description. Exercises
  // filename truncation/wrap when paired with the description.
  {
    id: 'file-002',
    type: 'file',
    updatedAt: '2025-11-12T11:45:00.000Z',
    updatedBy: 'u_jane_doe',
    createdAt: '2025-09-15T10:00:00.000Z',
    createdBy: 'u_jane_doe',
    attributes: {
      title:
        'analytics-dashboard-overview-screenshot-with-annotations-2025-11-12-1080p-final-v3.png',
      description: 'Primary dashboard screenshot.',
      size: 524288,
      extension: 'png',
      mimeType: 'image/png',
      fileKind: 'images',
    },
    references: [],
  },
  // ts-dl — short filename + long description. Description wraps across
  // multiple lines while the filename stays on one.
  {
    id: 'file-003',
    type: 'file',
    updatedAt: '2025-11-08T16:30:00.000Z',
    createdAt: '2025-08-10T09:15:00.000Z',
    createdBy: 'u_admin_local',
    attributes: {
      title: 'config-backup.json',
      description:
        'Full Kibana configuration backup captured nightly before the rolling restart; restores require running the bootstrap migration in order and validating the audit log seed before re-enabling alerting rules. The dump includes the encrypted saved-object payload, every space-scoped UI setting override, the registered connector secrets (re-keyed against the backup KMS), and the role/role-mapping graph as of the snapshot timestamp. Used as the canonical input for both disaster-recovery drills and the quarterly migration rehearsals; the file kind is pinned so the retention policy keeps it for 13 months even when general file pruning runs.',
      size: 102400,
      extension: 'json',
      mimeType: 'application/json',
      fileKind: 'config',
    },
    references: [{ type: 'tag', id: 'tag-archived', name: 'Archived' }],
  },
  // tl-dl — kitchen-sink row: long filename + long description. Both
  // wrap at narrow widths; at wide viewports they share the wrap row.
  {
    id: 'file-004',
    type: 'file',
    updatedAt: '2025-10-30T13:20:00.000Z',
    updatedBy: 'u_john_smith',
    createdAt: '2025-07-25T15:45:00.000Z',
    createdBy: 'u_john_smith',
    attributes: {
      title:
        'sample-data-ecommerce-orders-customers-products-categories-2025-q4-extended-with-returns-and-refunds.csv',
      description:
        'Mixed sample dataset combining ecommerce orders, customers, products, categories, returns, and refunds for the entire 2025 Q4 demo — used by the onboarding tutorial, the integration tests, and the canonical ESQL training notebook. Schema mirrors the production `ecommerce-*` index template so example queries copy-paste against real data without changes, and the customer identifiers are synthetic but referentially consistent (every refund row resolves back to an order, every order resolves to a customer and a SKU). Refresh cadence is quarterly; new versions roll forward by appending a `-vN` suffix rather than overwriting so referenced notebooks pin to a stable snapshot.',
      size: 1048576,
      extension: 'csv',
      mimeType: 'text/csv',
      fileKind: 'data',
    },
    references: [{ type: 'tag', id: 'tag-development', name: 'Development' }],
  },
  // tm-d0 — medium filename, no description. Exercises the "title only"
  // path with a realistic filename.
  {
    id: 'file-005',
    type: 'file',
    updatedAt: '2025-09-20T08:45:00.000Z',
    createdAt: '2025-06-15T11:00:00.000Z',
    createdBy: 'u_analyst_1',
    attributes: {
      title: 'security-audit-log.txt',
      size: 5242880,
      extension: 'txt',
      mimeType: 'text/plain',
      fileKind: 'logs',
    },
    references: [{ type: 'tag', id: 'tag-security', name: 'Security' }],
  },
  // ts-d0 — most-sparse row: short filename, no description.
  {
    id: 'file-006',
    type: 'file',
    updatedAt: '2025-11-14T14:10:00.000Z',
    updatedBy: 'u_665722084_cloud',
    createdAt: '2025-05-30T16:20:00.000Z',
    createdBy: 'u_665722084_cloud',
    attributes: {
      title: 'arch.svg',
      size: 204800,
      extension: 'svg',
      mimeType: 'image/svg+xml',
      fileKind: 'images',
    },
    references: [{ type: 'tag', id: 'tag-production', name: 'Production' }],
  },
];
