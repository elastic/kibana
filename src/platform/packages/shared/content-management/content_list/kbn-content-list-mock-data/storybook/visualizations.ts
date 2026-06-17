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
 * Mock visualization items.
 *
 * Tuned to span the name-cell permutation matrix (short/long title ×
 * empty/short/long description × no/few/many tags) so consumers of this
 * fixture exercise both narrow-viewport column-stack and ≥ 2560px
 * wrap-on-overflow layouts. The matrix uses `t{s,m,l}` for title length,
 * `d{0,s,l}` for description length, and `g{0,f,m}` for tag count.
 * `visType` is held variety-rich so the fixture also covers the
 * type-icon code path.
 *
 * Pinned IDs preserved for story call-sites:
 *
 * - `vis-001` — initial favorite (see `services.ts`).
 */
export const MOCK_VISUALIZATIONS: VisualizationMockItem[] = [
  // ts-ds-gm — sparse-but-favorited (short title, short description, many
  // tags). Wide viewports pack this row onto a single line.
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
      title: 'Revenue',
      description: 'Daily revenue trend.',
      visType: 'lens',
      typeTitle: 'Lens',
      icon: 'lensApp',
      readOnly: false,
    },
    editor: {
      editUrl: '/app/lens#/edit/vis-001',
      editApp: 'lens',
    },
    references: [
      { type: 'tag', id: 'tag-production', name: 'Production' },
      { type: 'tag', id: 'tag-important', name: 'Important' },
      { type: 'tag', id: 'tag-security', name: 'Security' },
      { type: 'tag', id: 'tag-development', name: 'Development' },
      { type: 'tag', id: 'fleet-managed-default', name: 'Managed' },
    ],
  },
  // tm-ds-gf — baseline medium/short/few row, the most "typical" shape.
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
      description: 'Pie chart of orders by product category.',
      visType: 'pie',
      typeTitle: 'Pie',
      icon: 'chartPie',
      readOnly: false,
    },
    editor: {
      editUrl: '/app/visualize#/edit/vis-002',
    },
    references: [{ type: 'tag', id: 'tag-important', name: 'Important' }],
  },
  // ts-dl-g0 — short title, long description, no tags. Description wraps
  // within its cell at wide viewports.
  {
    id: 'vis-003',
    type: 'visualization',
    updatedAt: '2025-11-08T09:30:00.000Z',
    createdAt: '2025-08-15T16:00:00.000Z',
    createdBy: 'u_admin_local',
    managed: false,
    attributes: {
      id: 'vis-003',
      title: 'Top Products',
      description:
        'Data table of best-selling SKUs across all storefronts with breakdowns by region, channel, and seasonal demand variance — refreshed nightly and intended as the canonical source for Merchandising weekly reviews. Columns include 7-day units sold, 28-day rolling revenue, return rate, in-stock percentage at the regional DC, and the assigned merchandising owner; each row links into the SKU master record, the demand-forecast notebook, and the markdown-decision audit trail. Seasonality is normalized against the prior-year curve so a launch week does not visually dominate the long tail. Anchored to `ecommerce-*` plus the regional inventory data view.',
      visType: 'table',
      typeTitle: 'Data Table',
      icon: 'table',
      readOnly: false,
    },
    editor: {
      editUrl: '/app/visualize#/edit/vis-003',
    },
    references: [],
  },
  // tl-ds-gf — long title, short description, few tags. Title and the
  // tag chain compete for horizontal space when the row tries to pack.
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
      title:
        'Server Response Times — p50, p95, p99 Latencies by Region, Endpoint & Deployment Channel',
      description: 'Per-endpoint latency.',
      visType: 'area',
      typeTitle: 'Area',
      icon: 'chartArea',
      readOnly: false,
    },
    editor: {
      editUrl: '/app/visualize#/edit/vis-004',
    },
    references: [{ type: 'tag', id: 'tag-development', name: 'Development' }],
  },
  // tl-dl-gm — managed kitchen-sink row: long title + long description +
  // many tags. At wide viewports each part wraps to its own line.
  {
    id: 'vis-005',
    type: 'visualization',
    updatedAt: '2025-09-30T15:55:00.000Z',
    createdAt: '2025-06-25T10:10:00.000Z',
    createdBy: 'u_analyst_1',
    managed: true,
    attributes: {
      id: 'vis-005',
      title:
        'Alert Count — Cross-Cluster Totals With Severity, Source, and On-Call Rotation Breakdowns',
      description:
        'Single metric showing the cluster-wide alert count rolled up across all configured detectors, with drill-downs into severity, originating source, and the on-call rotation assignment in effect at firing time. Pairs with the incident triage workspace and is embedded at the top of the Security and SRE landing pages so the on-call always sees the live total before opening any individual rule. The metric reconciles dedupe windows across the Defend, Endpoint, and stack-monitoring rule packs so a single root cause that fires across packs counts once; suppressions, snoozes, and acknowledged-but-open alerts are tracked in companion sparklines and surfaced as the trend annotation.',
      visType: 'metric',
      typeTitle: 'Metric',
      icon: 'chartMetric',
      readOnly: true,
    },
    editor: {
      editUrl: '/app/visualize#/edit/vis-005',
    },
    references: [
      { type: 'tag', id: 'tag-security', name: 'Security' },
      { type: 'tag', id: 'tag-important', name: 'Important' },
      { type: 'tag', id: 'tag-archived', name: 'Archived' },
      { type: 'tag', id: 'fleet-pkg-endpoint-default', name: 'Elastic Defend' },
      { type: 'tag', id: 'fleet-managed-default', name: 'Managed' },
    ],
  },
  // ts-d0-g0 — most-sparse row: title only.
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
      title: 'Keywords',
      visType: 'tagcloud',
      typeTitle: 'Tag Cloud',
      icon: 'chartTagCloud',
      readOnly: false,
    },
    editor: {
      editUrl: '/app/visualize#/edit/vis-006',
    },
    references: [],
  },
  // tl-dl-gf — prototypical rich row: long title + long description with
  // few tags. Title sits on its own line and the description wraps below.
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
      title: 'Custom Vega Chart — Multi-Series Latency Distribution With Cohort Annotations',
      description:
        'Advanced visualization rendered with Vega-Lite that overlays multi-series latency distributions with rolling-window cohort annotations; intended for performance regression triage during release sign-off. Each series renders the p50/p95/p99 ribbon for one upstream service with a faceted overlay for the requesting client cohort so a regression isolated to a single client SDK version is visually obvious. Annotation layers cross-reference the deploy stream, feature-flag flips, and any active scheduled load test so a spike that coincides with a soak-test window does not get mis-attributed to a deploy. Vega spec lives in the saved-object body; a sibling ES|QL panel exposes the underlying query for engineers who want to fork the chart for ad-hoc analysis.',
      visType: 'vega',
      typeTitle: 'Vega',
      icon: 'code',
      readOnly: false,
    },
    editor: {
      editUrl: '/app/visualize#/edit/vis-007',
    },
    references: [{ type: 'tag', id: 'tag-development', name: 'Development' }],
  },
  // tm-d0-gf — medium title, no description, few tags. Exercises the
  // "tags only" wrap behavior (tags fill the row alongside the title).
  // Also exercises the `error` rendering path.
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
      visType: 'line',
      typeTitle: 'Line',
      icon: 'chartLine',
      readOnly: false,
      error: 'Index pattern not found: logs-*',
    },
    error: 'Index pattern not found: logs-*',
    references: [
      { type: 'tag', id: 'tag-archived', name: 'Archived' },
      { type: 'tag', id: 'tag-development', name: 'Development' },
    ],
  },
];
