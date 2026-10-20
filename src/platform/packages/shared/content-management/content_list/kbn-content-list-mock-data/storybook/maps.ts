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
 * Mock map items.
 *
 * Tuned to span the name-cell permutation matrix (short/long title ×
 * empty/short/long description × no/few/many tags) so the Maps stories
 * exercise both narrow-viewport column-stack and ≥ 2560px wrap-on-overflow
 * layouts without a dedicated fixture. The matrix uses `t{s,m,l}` for
 * title length, `d{0,s,l}` for description length, and `g{0,f,m}` for tag
 * count.
 *
 * Pinned IDs preserved for story call-sites:
 *
 * - `map-001` — initial favorite (see `services.ts`).
 */
export const MOCK_MAPS: MapMockItem[] = [
  // ts-ds-gm — sparse-but-favorited (short title, short description, many
  // tags). At wide viewports this row packs onto a single line.
  {
    id: 'map-001',
    type: 'map',
    updatedAt: '2025-11-14T10:30:00.000Z',
    updatedBy: 'u_665722084_cloud',
    createdAt: '2025-09-01T08:00:00.000Z',
    createdBy: 'u_665722084_cloud',
    managed: false,
    attributes: {
      title: 'Orders',
      description: 'Orders by storefront region.',
    },
    references: [
      { type: 'tag', id: 'tag-production', name: 'Production' },
      { type: 'tag', id: 'tag-important', name: 'Important' },
      { type: 'tag', id: 'tag-security', name: 'Security' },
      { type: 'tag', id: 'tag-development', name: 'Development' },
      { type: 'tag', id: 'fleet-managed-default', name: 'Managed' },
    ],
  },
  // tl-dl-gf — prototypical rich row. At wide viewports the long title
  // sits on its own line and the description wraps below.
  {
    id: 'map-002',
    type: 'map',
    updatedAt: '2025-11-10T15:45:00.000Z',
    updatedBy: 'u_jane_doe',
    createdAt: '2025-08-15T12:00:00.000Z',
    createdBy: 'u_jane_doe',
    managed: false,
    attributes: {
      title: 'Flight Routes — Carrier, Aircraft Type, Arrival Punctuality & Seasonal Demand',
      description:
        'Interactive map of mock flight routes for ES-Air, Logstash Airways, and Kibana Airlines with overlays for carrier, aircraft type, on-time performance, and seasonal demand variance — designed for the Network Planning team during quarterly route reviews. Includes a great-circle layer for scheduled corridors, a heatmap of cancellation-cause attribution at the destination airport, and a per-route load-factor choropleth that crossfilters with the codeshare partner picker in the legend. Time slider snaps to the quarterly review window by default; tooltips link out to the originating flight log, the maintenance backlog for the assigned tail number, and the slot-allocation sheet for both endpoints.',
    },
    references: [{ type: 'tag', id: 'tag-development', name: 'Development' }],
  },
  // ts-dl-gf — short title + long description; description wraps within
  // its cell while the short title and few tags stay inline.
  {
    id: 'map-003',
    type: 'map',
    updatedAt: '2025-10-25T09:15:00.000Z',
    updatedBy: 'u_admin_local',
    createdAt: '2025-07-20T14:30:00.000Z',
    createdBy: 'u_admin_local',
    managed: false,
    attributes: {
      title: 'Traffic',
      description:
        'Heatmap of elastic.co visitors aggregated by geographic location with drill-downs by country, region, and acquisition channel; refreshed daily and intended for the Growth and Marketing teams. The base layer is a clustered hexbin of session origins enriched with the regional sales-territory overlay so marketing campaigns can be scoped to a specific GTM motion. A second layer plots inbound link sources (search, social, partner referral, organic docs) and animates intra-day cadence so the team can spot campaign blasts that briefly distort the underlying organic baseline. Click-through on any cell opens the matching pre-filtered Lens dashboard.',
    },
    references: [
      { type: 'tag', id: 'tag-production', name: 'Production' },
      { type: 'tag', id: 'tag-important', name: 'Important' },
    ],
  },
  // tl-ds-g0 — managed long-title row with a short description and no
  // tags. Wide viewports surface the long title alone on its line.
  {
    id: 'map-004',
    type: 'map',
    updatedAt: '2025-09-30T11:00:00.000Z',
    createdAt: '2025-06-10T10:45:00.000Z',
    createdBy: 'u_john_smith',
    managed: true,
    attributes: {
      title: 'Infrastructure Locations — Cross-Region Data Centers, Edge POPs & On-Call Coverage',
      description: 'Per-site rollups.',
    },
    references: [],
  },
  // ts-d0-g0 — most-sparse row: title only, nothing else. At wide
  // viewports the cell renders a single inline element.
  {
    id: 'map-005',
    type: 'map',
    updatedAt: '2025-08-15T16:20:00.000Z',
    updatedBy: 'u_analyst_1',
    createdAt: '2025-05-05T13:30:00.000Z',
    createdBy: 'u_analyst_1',
    managed: false,
    attributes: {
      title: 'Threats',
    },
    references: [],
  },
];
