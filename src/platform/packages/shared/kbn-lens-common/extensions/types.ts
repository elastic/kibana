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
 * Narrow, stable view of a chart layer exposed to extensions, so they never read Lens internal state.
 */
export interface LensExtensionLayer {
  readonly layerId: string;
  /** ES|QL query of the layer; undefined for form-based layers. */
  readonly esql?: string;
}

/**
 * Everything an extension rule can inspect to decide whether it applies to a chart.
 */
export interface LensExtensionMatchContext {
  readonly visualizationType: string;
  readonly layers: readonly LensExtensionLayer[];
  /** Identifies the surface rendering the chart (Discover, Dashboards, ...). */
  readonly executionContext?: KibanaExecutionContext;
}

/**
 * Context passed to an extension when fetching its overlay for one layer.
 */
export interface LensExtensionFetchContext {
  readonly layer: LensExtensionLayer;
  readonly timeRange?: TimeRange;
  readonly filters?: readonly Filter[];
  readonly query?: Query | AggregateQuery;
  readonly esqlVariables?: readonly ESQLControlVariable[];
  readonly abortSignal: AbortSignal;
  /** Runs an ES|QL query through Lens, so it shares the search session and shows in the inspector. */
  readonly executeEsql: (esql: string) => Promise<Datatable>;
}

export interface LensOverlayPoint {
  /** Stable id, sent back on click so the extension can resolve its own data. */
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

/**
 * Points drawn over an XY chart, bound to the Y axis of the layer they belong to.
 */
export interface LensPointsOverlay {
  readonly type: 'points';
  readonly extensionId: string;
  readonly layerId: string;
  readonly title: string;
  readonly points: readonly LensOverlayPoint[];
}

export type LensExtensionOverlay = LensPointsOverlay;

/** Overlay as returned by an extension; Lens adds the owning extension and layer ids. */
export type LensExtensionOverlayData = Omit<LensExtensionOverlay, 'extensionId' | 'layerId'>;

export interface LensOverlayPointClickEvent {
  readonly extensionId: string;
  readonly layerId: string;
  readonly pointId: string;
}

/**
 * A capability a plugin adds to existing Lens charts. Nothing is persisted: Lens evaluates
 * `isApplicable` at render time for every layer of every chart of a supported visualization type.
 *
 * @experimental
 */
export interface LensExtension {
  /** Namespaced id, e.g. `observability.exemplars`. */
  readonly id: string;
  readonly visualizationTypes: readonly string[];
  readonly isApplicable: (context: LensExtensionMatchContext, layer: LensExtensionLayer) => boolean;
  /** Resolves to undefined when there is nothing to draw. Rejections never break the base chart. */
  readonly fetchOverlay: (
    context: LensExtensionFetchContext
  ) => Promise<LensExtensionOverlayData | undefined>;
  readonly onPointClick?: (event: LensOverlayPointClickEvent) => void;
}

/**
 * Runtime-only switches set by the host rendering the chart, keyed by extension id.
 * `false` turns an extension off; `true` or a missing entry lets its rules decide.
 */
export type LensExtensionsRuntimeConfig = Readonly<Record<string, boolean>>;
