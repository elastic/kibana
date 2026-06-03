/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Hard-coded mock data backing the entity-centric lab flyout. All numbers and
 * labels come from the design mockup — there is no real backend.
 */

import { getStoryOverview } from './payflow_story';
import { getEffectiveEntityHealth } from './chaos_mode';
import {
  buildKindTemplate,
  entityTypeToKind,
  inferEntityKind,
  normalizeEntityHealth,
  type EntityKind,
} from './kind_templates';

export type EntityHealth = 'healthy' | 'degraded' | 'unhealthy';

export interface EntityTag {
  readonly label: string;
  readonly color: 'hollow' | 'success' | 'warning' | 'danger' | 'accent' | 'primary';
}

export type GoldenSignalLevel = 'warning' | 'danger' | 'success';

export interface GoldenSignal {
  readonly id: 'latency' | 'errorRate' | 'throughput';
  readonly label: string;
  /** Numeric value powering the metric tile. Formatted via {@link formatGoldenSignalValue}. */
  readonly value: number;
  /** Unit suffix appended to the formatted value (e.g. `s`, `%`, `req/s`). */
  readonly unit: string;
  /** Subtitle copy under the metric value (e.g. `+12% in last 5 min`). */
  readonly delta: string;
  /** Severity level — drives the tile background tint. */
  readonly color: GoldenSignalLevel;
  /**
   * Mocked timeseries powering the trend area background of the metric tile.
   * 24 evenly-spaced samples is enough for the prototype.
   */
  readonly trend: readonly number[];
  /**
   * Long-form description shown on hover (replaces the legacy `(?)` icon —
   * surfaced through `EuiToolTip` rather than a click target).
   */
  readonly description: string;
}

/**
 * Format a {@link GoldenSignal} numeric value back into its display string.
 * Kept colocated with the data so the tile component stays presentational.
 */
export const formatGoldenSignalValue = (signal: GoldenSignal): string => {
  switch (signal.id) {
    case 'latency':
      return `${signal.value.toFixed(1)}${signal.unit}`;
    case 'errorRate':
      return `${signal.value.toFixed(1)}${signal.unit}`;
    case 'throughput':
      return `${Math.round(signal.value)}${signal.unit}`;
  }
};

export interface EntityDetailRow {
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

export interface OwnershipContact {
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

/**
 * Structured AI summary surfaced at the top of the Overview tab. Renders as
 * three distinct paragraphs:
 *
 *   1. `headline`   — single high-level sentence (the "what")
 *   2. `issues`     — bullet list under "{N} issues found" (the "why")
 *   3. `nextSteps`  — bullet list under "Suggested next steps" (the "now what")
 *
 * Keeping the three sections as separate fields (rather than a single freeform
 * string) lets the UI render them with consistent visual hierarchy and lets
 * the agent-builder attachment forward each section to the AI verbatim.
 */
export interface EntityAiSummary {
  readonly headline: string;
  readonly issues: readonly string[];
  readonly nextSteps: readonly string[];
  readonly generatedAt: string;
}

export interface EntityOverview {
  readonly displayName: string;
  readonly lastUpdate: string;
  readonly tags: readonly EntityTag[];
  readonly summary: EntityAiSummary;
  readonly goldenSignals: readonly GoldenSignal[];
  readonly details: readonly EntityDetailRow[];
  readonly ownership: readonly OwnershipContact[];
  readonly securityIssueCount: number;
}

/**
 * Build a fake overview for a given entity name.
 *
 * Dispatch order:
 *
 *   1. PayFlow story — curated overview for the 4 click-path entities
 *      (`payments-service`, `checkout-service`, `payments-pod-7f9b2`,
 *      `node-prod-eu-04`).
 *   2. Per-kind + per-health template — when the entity's kind can be
 *      resolved (passed in via `entityType` from the caller, or inferred
 *      from the name), return a kind-shaped overview (service / host / pod /
 *      node / cluster / namespace / database / cloud / middleware / llm)
 *      tinted by `entityHealth` (healthy / atRisk / unhealthy).
 *   3. Generic fallback — last-resort mock that mirrors the original design
 *      mockup; mostly never reached now that the kind templates cover the
 *      common shapes.
 */
export const buildFakeEntityOverview = (
  entityName: string,
  entityType?: string,
  entityHealth?: string
): EntityOverview => {
  const storyOverview = getStoryOverview(entityName);
  if (storyOverview) {
    return storyOverview;
  }
  const kind: EntityKind | undefined = entityTypeToKind(entityType) ?? inferEntityKind(entityName);
  // Apply the chaos-mode override BEFORE normalising so a PayFlow
  // storyline entity (e.g. `payments-service`) flips to the healthy
  // template the moment the user rolls back. Non-storyline entities
  // pass through unchanged.
  const effectiveHealth = getEffectiveEntityHealth(
    entityName,
    normalizeEntityHealth(entityHealth)
  );
  const kindTemplate = buildKindTemplate(entityName, kind, effectiveHealth, entityType);
  if (kindTemplate) {
    return kindTemplate.overview;
  }
  return buildGenericEntityOverview(entityName);
};

const buildGenericEntityOverview = (entityName: string): EntityOverview => ({
  displayName: entityName,
  lastUpdate: '2026-04-20',
  tags: [
    { label: 'Service', color: 'hollow' },
    { label: 'Unhealthy', color: 'danger' },
    { label: 'Production', color: 'hollow' },
    { label: `${entityName} subset`, color: 'hollow' },
  ],
  summary: {
    headline: `${entityName} is degraded — error rate spiked 4 min ago following deployment v2.4.1.`,
    issues: [
      'Error rate at 4.5% (warning threshold 3%) since 4 min ago',
      'db-primary latency is elevated — p95 climbing for the last 10 min',
      'Downstream checkout-service reports correlated failures',
    ],
    nextSteps: [
      'Rollback v2.4.1 or investigate db-primary connection pool',
      'Page checkout-platform if error rate stays above threshold for another 5 min',
    ],
    generatedAt: 'Dec 12th, 2025 at 11:30',
  },
  goldenSignals: [
    {
      id: 'latency',
      label: 'Latency',
      value: 0.9,
      unit: 's',
      delta: '+12% in last 5 min',
      color: 'warning',
      trend: [
        0.42, 0.45, 0.43, 0.48, 0.47, 0.5, 0.52, 0.55, 0.6, 0.62, 0.66, 0.7, 0.72, 0.74, 0.78, 0.81,
        0.83, 0.84, 0.85, 0.87, 0.88, 0.89, 0.9, 0.9,
      ],
      description:
        'Average end-to-end request latency across all instances of this entity over the selected time window.',
    },
    {
      id: 'errorRate',
      label: 'Error rate',
      value: 4.5,
      unit: '%',
      delta: '+3.1% in last 5 min',
      color: 'danger',
      trend: [
        0.4, 0.5, 0.6, 0.7, 0.9, 1.1, 1.2, 1.4, 1.6, 1.9, 2.2, 2.5, 2.8, 3.1, 3.4, 3.6, 3.9, 4.1,
        4.2, 4.3, 4.35, 4.4, 4.45, 4.5,
      ],
      description:
        'Percentage of failed requests (status >= 500 or trace error tag) over the selected time window.',
    },
    {
      id: 'throughput',
      label: 'Throughput',
      value: 312,
      unit: 'req/s',
      delta: 'Stable in last 5 min',
      color: 'success',
      trend: [
        298, 305, 310, 308, 312, 315, 311, 313, 316, 314, 312, 310, 311, 313, 312, 314, 313, 312,
        311, 312, 313, 312, 312, 312,
      ],
      description:
        'Requests per second served by this entity across all instances over the selected time window.',
    },
  ],
  details: [
    { id: 'entityId', label: 'Entity id', value: 'entid1234567890' },
    { id: 'creationDate', label: 'Creation date', value: '2025-02-21' },
    { id: 'lastUpdate', label: 'Last update', value: '2026-04-20 @ 10:01:21.313' },
    { id: 'version', label: 'Version', value: 'V.4.2.11 (deployed 21min ago)' },
    { id: 'previousVersion', label: 'Previous version', value: 'V.4.2.10' },
  ],
  ownership: [
    { id: 'team', label: 'Checkout-platform', value: 'slack #checkout-platform' },
    { id: 'contact', label: 'Another contact', value: 'contact@example.com' },
  ],
  securityIssueCount: 5,
});
