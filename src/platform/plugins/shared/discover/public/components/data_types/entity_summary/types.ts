/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement, ReactNode } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { EntitySummaryLink, EntitySummaryMetric } from '@kbn/discover-contextual-components';
import type { DiscoverFeaturesServiceStart } from '@kbn/discover-shared-plugin/public';
import type { DiscoverServices } from '../../../build_services';

/** The `discover_shared` features registry each definition fetches its concrete data through. */
export type DiscoverFeaturesRegistry = DiscoverFeaturesServiceStart['registry'];

export interface EntitySummaryTimeRange {
  start: string;
  end: string;
}

/** Identity + presentation extracted from a row for one entity occurrence. */
export interface EntitySummaryEntity {
  /** Stable identifier used to fetch the summary (e.g. the service name). */
  identifier: string;
  /** Plain-text label used for the trigger fallback and ARIA. */
  label: string;
  /** Popover header subtitle (e.g. `environment · agent`). */
  subtitle?: ReactNode;
  /** Tooltip shown over the trigger/header icon. */
  iconTooltip?: string;
  /** Renders the entity icon at the requested EUI size, shared by the trigger and the header. */
  renderIcon?: (size: 's' | 'm' | 'l') => ReactElement;
  /** Extra parameters threaded through to `fetch` (e.g. the environment filter). */
  fetchParams?: Record<string, string | undefined>;
}

/** Generic popover content a definition derives from its concrete fetched data. */
export interface EntitySummaryContent {
  metrics: EntitySummaryMetric[];
  /** Base links, id-keyed, before any per-profile customization. */
  links: EntitySummaryLink[];
  /** When set, the popover title links here (opens in a new tab). */
  titleHref?: string;
}

export interface EntitySummaryCustomizeLinksContext<RawData> {
  data: RawData | null;
  entity: EntitySummaryEntity;
  services: DiscoverServices;
}

/** A profile-supplied reducer that appends, replaces (by id), reorders, or hides the base links. */
export type EntitySummaryCustomizeLinks<RawData> = (
  baseLinks: EntitySummaryLink[],
  context: EntitySummaryCustomizeLinksContext<RawData>
) => EntitySummaryLink[];

/**
 * A per-entity-type contract that keeps the cross-plugin data concrete while the field dispatch and
 * the popover UI stay generic. Discover assembles these; the fetched data stays owned by the
 * fulfilling plugin (e.g. APM for services), reached through the `discover_shared` registry.
 */
export interface EntitySummaryDefinition<RawData = unknown> {
  /** Entity-type id, for debugging/telemetry (e.g. `service`). */
  entityType: string;
  /** Whether the backing data feature is registered (e.g. APM enabled). */
  isAvailable: (registry: DiscoverFeaturesRegistry) => boolean;
  /** Extracts identity + presentation from a row. Returns undefined when the row has no entity. */
  getEntity: (args: { row: DataTableRecord; fieldName: string }) => EntitySummaryEntity | undefined;
  /** Fetches the concrete summary through the registry. Returns null when unavailable. */
  fetch: (args: {
    registry: DiscoverFeaturesRegistry;
    entity: EntitySummaryEntity;
    timeRange: EntitySummaryTimeRange;
    signal: AbortSignal;
  }) => Promise<RawData | null>;
  /** Maps concrete fetched data (or null, while loading) into generic popover content. */
  mapToContent: (args: {
    data: RawData | null;
    entity: EntitySummaryEntity;
  }) => EntitySummaryContent;
  /** Optional per-profile reducer over the base links. */
  customizeLinks?: EntitySummaryCustomizeLinks<RawData>;
}
