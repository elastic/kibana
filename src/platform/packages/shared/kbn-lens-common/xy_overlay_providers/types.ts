/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaExecutionContext } from '@kbn/core/public';
import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { Datatable } from '@kbn/expressions-plugin/common';

/**
 * Narrow, stable view of an XY chart layer exposed to overlay providers, so they never read Lens internal state.
 */
export interface LensXYOverlayLayer {
  readonly layerId: string;
  /** ES|QL query of the layer; undefined for form-based layers. */
  readonly esql?: string;
}

/**
 * Everything an overlay provider can inspect to decide whether it applies to an XY chart.
 */
export interface LensXYOverlayMatchContext {
  readonly layers: readonly LensXYOverlayLayer[];
  /** Identifies the surface rendering the chart (Discover, Dashboards, ...). */
  readonly executionContext?: KibanaExecutionContext;
}

/**
 * How a request made through `executeEsql` is labelled in the Inspector.
 */
export interface LensXYOverlayRequestMeta {
  readonly title: string;
  readonly description?: string;
}

/**
 * Context passed to an overlay provider when fetching its overlay for one layer.
 */
export interface LensXYOverlayFetchContext {
  readonly layer: LensXYOverlayLayer;
  readonly timeRange?: TimeRange;
  readonly filters?: readonly Filter[];
  readonly query?: Query | AggregateQuery;
  readonly esqlVariables?: readonly ESQLControlVariable[];
  readonly abortSignal: AbortSignal;
  /**
   * Runs an ES|QL query with the same search scope, session and datatable mapping as the chart,
   * and lists the request in the chart Inspector under `meta.title`.
   */
  readonly executeEsql: (esql: string, meta: LensXYOverlayRequestMeta) => Promise<Datatable>;
}

export interface LensXYOverlayPoint {
  /** Stable id, sent back on click so the provider can resolve its own data. */
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

/**
 * Points drawn over an XY chart, bound to the Y axis of the layer they belong to.
 */
export interface LensXYPointsOverlay {
  readonly type: 'points';
  readonly providerId: string;
  readonly layerId: string;
  readonly title: string;
  readonly points: readonly LensXYOverlayPoint[];
}

export type LensXYOverlay = LensXYPointsOverlay;

/** Overlay as returned by a provider; Lens adds the owning provider and layer ids. */
export type LensXYOverlayData = Omit<LensXYOverlay, 'providerId' | 'layerId'>;

export interface LensXYOverlayPointClickEvent {
  readonly providerId: string;
  readonly layerId: string;
  readonly pointId: string;
}

/**
 * Draws an overlay on top of existing Lens XY charts, the only charts that render overlays.
 * Nothing is persisted: Lens evaluates `isApplicable` at render time for every layer of every XY chart.
 *
 * @experimental
 */
export interface LensXYOverlayProvider {
  /** Namespaced id, e.g. `observability.exemplars`. */
  readonly id: string;
  readonly isApplicable: (context: LensXYOverlayMatchContext, layer: LensXYOverlayLayer) => boolean;
  /** Resolves to undefined when there is nothing to draw. Rejections never break the base chart. */
  readonly fetchOverlay: (
    context: LensXYOverlayFetchContext
  ) => Promise<LensXYOverlayData | undefined>;
  readonly onPointClick?: (event: LensXYOverlayPointClickEvent) => void;
}

/**
 * Runtime-only switches set by the host rendering the chart, keyed by overlay provider id.
 * `false` turns a provider off; `true` or a missing entry lets its rules decide.
 */
export type LensXYOverlayProvidersConfig = Readonly<Record<string, boolean>>;
