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
 * Mock dashboard items.
 *
 * The set is deliberately tuned to span the name-cell content permutation
 * matrix — short/long title × empty/short/long description × no/few/many
 * tags — so every story that consumes `MOCK_DASHBOARDS` exercises the
 * column-stack (narrow) and wrap-on-overflow row (≥ 2560px) layouts
 * without a dedicated fixture. Each entry's leading comment names its
 * permutation; the matrix uses `t{s,m,l}` for title length, `d{0,s,l}`
 * for description length, and `g{0,f,m}` for tag count.
 *
 * Pinned IDs preserved for story call-sites:
 *
 * - `dashboard-001`, `dashboard-003`, `dashboard-007` — initial favorites
 *   (see `services.ts` and `dashboard_listing.stories.tsx`).
 * - `dashboard-002`, `dashboard-005` — managed dashboards used by the
 *   bulk-delete partition story.
 */
export const MOCK_DASHBOARDS: DashboardMockItem[] = [
  // ts-ds-gm — sparse-but-favorited (short title, short description, many
  // tags). At wide viewports this row collapses tightly onto one line,
  // demonstrating the "pull cells together" intent of the row layout.
  {
    id: 'dashboard-001',
    type: 'dashboard',
    updatedAt: '2025-11-15T14:30:00.000Z',
    updatedBy: 'u_665722084_cloud',
    createdAt: '2025-10-01T09:00:00.000Z',
    createdBy: 'u_665722084_cloud',
    attributes: {
      title: 'Sales Pulse',
      description: 'Daily revenue and conversion KPIs.',
      timeRestore: true,
    },
    references: [
      { type: 'tag', id: 'tag-production', name: 'Production' },
      { type: 'tag', id: 'tag-important', name: 'Important' },
      { type: 'tag', id: 'tag-security', name: 'Security' },
      { type: 'tag', id: 'tag-development', name: 'Development' },
      { type: 'tag', id: 'tag-archived', name: 'Archived' },
      { type: 'tag', id: 'fleet-managed-default', name: 'Managed' },
    ],
    managed: false,
    canFavorite: true,
  },
  // tl-ds-gf — managed long-title row. Exercises wrap behavior with a
  // title that alone consumes most of the cell width.
  {
    id: 'dashboard-002',
    type: 'dashboard',
    updatedAt: '2025-11-10T08:15:00.000Z',
    updatedBy: 'u_jane_doe',
    createdAt: '2025-09-15T11:30:00.000Z',
    createdBy: 'u_admin_local',
    attributes: {
      title: 'Detection Rule Monitoring — Coverage, Suppressions, Backlog & SLA',
      description: 'Per-rule health snapshots.',
      timeRestore: false,
    },
    references: [
      { type: 'tag', id: 'tag-security', name: 'Security' },
      { type: 'tag', id: 'fleet-managed-default', name: 'Managed' },
    ],
    managed: true,
    canFavorite: true,
  },
  // ts-dl-gf — short title + long description (favorited). At wide
  // viewports the long description wraps within the cell, while the short
  // title and few tags stay inline.
  {
    id: 'dashboard-003',
    type: 'dashboard',
    updatedAt: '2025-11-12T16:45:00.000Z',
    updatedBy: 'u_665722084_cloud',
    createdAt: '2025-08-20T14:00:00.000Z',
    createdBy: 'u_665722084_cloud',
    attributes: {
      title: 'Flights',
      description:
        'Aggregated mock flight data for ES-Air, Logstash Airways, and Kibana Airlines — broken down by carrier, route, and arrival punctuality, with comparative weekly and seasonal trend overlays. Includes a cancellation-cause attribution funnel (weather, mechanical, crew, ATC, upstream-leg) and a per-airport on-time-arrival heatmap that the Operations team reviews in the daily standup. Panels are bound to the sample `kibana_sample_data_flights` index pattern so the dashboard works out of the box on a fresh deployment, and the time range defaults to the previous 30 days when restored.',
      timeRestore: true,
    },
    references: [{ type: 'tag', id: 'tag-development', name: 'Development' }],
    managed: false,
    canFavorite: true,
  },
  // tl-dl-gf — the prototypical "rich" row. At wide viewports the title
  // sits on its own line and the description wraps below.
  {
    id: 'dashboard-004',
    type: 'dashboard',
    updatedAt: '2025-10-28T10:00:00.000Z',
    updatedBy: 'u_analyst_1',
    createdAt: '2025-07-10T08:30:00.000Z',
    createdBy: 'u_john_smith',
    attributes: {
      title:
        '[Logs] Global Web Traffic Analysis — Sessions, Page Views, Geo Breakdown & Funnel Conversion',
      description:
        "Analyzes web traffic log data for Elastic's website across regions and acquisition channels with day-over-day comparisons; intended to be the canonical traffic source-of-truth for Marketing and Growth. Drill-downs cover landing page, referrer, campaign UTM, device class, and authenticated vs. anonymous sessions, with a sticky conversion funnel that tracks first-touch → docs-read → trial-signup → activation. Backed by the `kibana_sample_data_logs` rollover stream plus the `marketing-attribution-*` data view, and gated behind the Marketing space so partner-shared exports never leak sensitive UTM parameters. The weekly review meeting opens this dashboard pinned to the `prev_7d` time range.",
      timeRestore: true,
    },
    references: [{ type: 'tag', id: 'tag-production', name: 'Production' }],
    managed: false,
    canFavorite: true,
  },
  // tm-ds-g0 — managed medium-title row with a short description and no
  // tags. Visually quiet but still stacks in narrow viewports.
  {
    id: 'dashboard-005',
    type: 'dashboard',
    updatedAt: '2025-11-01T12:00:00.000Z',
    createdAt: '2025-06-01T10:00:00.000Z',
    createdBy: 'u_admin_local',
    attributes: {
      title: 'Infrastructure Overview',
      description: 'Server and container metrics overview.',
      timeRestore: false,
    },
    references: [],
    managed: false,
    canFavorite: true,
  },
  // ts-d0-g0 — most-sparse row: title only, nothing else. At wide
  // viewports there is nothing to wrap so the cell renders a single
  // inline element.
  {
    id: 'dashboard-006',
    type: 'dashboard',
    updatedAt: '2025-09-15T09:30:00.000Z',
    updatedBy: 'u_jane_doe',
    createdAt: '2025-05-20T15:45:00.000Z',
    createdBy: 'u_jane_doe',
    attributes: {
      title: 'APM',
      timeRestore: false,
    },
    references: [],
    managed: false,
    canFavorite: true,
  },
  // tl-dl-gm — favorited kitchen-sink row: long title + long description
  // + many tags. At wide viewports each part wraps to its own line,
  // mirroring the narrow-viewport column stack.
  {
    id: 'dashboard-007',
    type: 'dashboard',
    updatedAt: '2025-11-14T11:20:00.000Z',
    updatedBy: 'u_665722084_cloud',
    createdAt: '2025-04-10T13:00:00.000Z',
    createdBy: 'u_admin_local',
    attributes: {
      title: 'ML Anomaly Explorer — Cross-Cluster Detector Coverage and Severity by Service',
      description:
        'Surfaces machine-learning anomaly detection outcomes across all configured detectors with drill-downs into service, cluster, and severity. Pairs with the on-call rotation page for incident triage: each anomaly row links into the corresponding APM trace, the upstream log stream filtered to the affected pod, and a pre-canned timeline overlay that aligns deploys, feature flag flips, and infrastructure changes against the anomaly window. Coverage is reconciled nightly against the service catalog so newly-onboarded services surface as `uncovered` rather than silently dropping out of the explorer. Owners: ML platform team; consumers: SRE on-call, Customer Engineering, and the Incident Commander rotation.',
      timeRestore: false,
    },
    references: [
      { type: 'tag', id: 'tag-development', name: 'Development' },
      { type: 'tag', id: 'tag-important', name: 'Important' },
      { type: 'tag', id: 'tag-security', name: 'Security' },
      { type: 'tag', id: 'tag-archived', name: 'Archived' },
      { type: 'tag', id: 'fleet-pkg-endpoint-default', name: 'Elastic Defend' },
      { type: 'tag', id: 'fleet-managed-default', name: 'Managed' },
    ],
    managed: false,
    canFavorite: true,
  },
  // ts-ds-gf — baseline short/short/few row, the most "typical" content
  // shape.
  {
    id: 'dashboard-008',
    type: 'dashboard',
    updatedAt: '2025-08-20T14:00:00.000Z',
    createdAt: '2025-03-05T09:15:00.000Z',
    createdBy: 'u_john_smith',
    attributes: {
      title: 'Uptime',
      description: 'Service uptime and availability.',
      timeRestore: true,
    },
    references: [{ type: 'tag', id: 'tag-production', name: 'Production' }],
    managed: false,
    canFavorite: true,
  },
  // tm-d0-gf — medium title + no description + few tags. Exercises the
  // "tags only" wrap behavior (tags fill the row alongside the title).
  {
    id: 'dashboard-009',
    type: 'dashboard',
    updatedAt: '2025-07-12T10:00:00.000Z',
    createdAt: '2025-02-18T08:00:00.000Z',
    attributes: {
      title: 'Legacy Metrics Overview',
      timeRestore: false,
    },
    references: [
      { type: 'tag', id: 'tag-archived', name: 'Archived' },
      { type: 'tag', id: 'tag-development', name: 'Development' },
    ],
    managed: false,
    canFavorite: true,
  },
  // tl-ds-gm — long title + short description + many tags. Title and tag
  // chain compete for horizontal space when the row tries to pack inline.
  {
    id: 'dashboard-010',
    type: 'dashboard',
    updatedAt: '2025-06-05T16:30:00.000Z',
    createdAt: '2025-01-10T12:00:00.000Z',
    attributes: {
      title:
        'API-Created Dashboard With An Auto-Generated Name From Continuous Saved-Objects Imports',
      description: 'Imported via the saved-objects API without a user context.',
      timeRestore: false,
    },
    references: [
      { type: 'tag', id: 'tag-production', name: 'Production' },
      { type: 'tag', id: 'tag-archived', name: 'Archived' },
      { type: 'tag', id: 'tag-development', name: 'Development' },
      { type: 'tag', id: 'fleet-managed-default', name: 'Managed' },
      { type: 'tag', id: 'fleet-pkg-endpoint-default', name: 'Elastic Defend' },
    ],
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
