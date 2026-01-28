/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AlertHit } from '@kbn/alerting-plugin/server/types';
import { unflattenObject } from '@kbn/object-utils';
import type { NormalizedAlert } from '../types/alert_types';

/**
 * Normalizes an alert document for workflow consumption.
 *
 * This function transforms raw alert documents from Elasticsearch (which use
 * flat ECS-style field names like "kibana.alert.rule.name") into a nested
 * object structure that can be accessed using dot notation in workflow templates.
 *
 * For backward compatibility, it preserves the original flat keys alongside
 * the expanded nested structure, allowing both old bracket notation and new
 * dot notation to work in Liquid templates.
 *
 * It also adds convenience properties at the root level for commonly accessed fields.
 *
 * @example
 * // Input (raw alert):
 * {
 *   "_id": "abc123",
 *   "_index": ".internal.alerts-...",
 *   "kibana.alert.rule.name": "my-rule",
 *   "kibana.alert.status": "active"
 * }
 *
 * // Output (normalized):
 * {
 *   "_id": "abc123",
 *   "_index": ".internal.alerts-...",
 *   "kibana.alert.rule.name": "my-rule",  // Preserved flat key (deprecated, for backward compat)
 *   "kibana.alert.status": "active",       // Preserved flat key (deprecated, for backward compat)
 *   "id": "abc123",                        // convenience accessor
 *   "status": "active",                     // convenience accessor
 *   "rule": { name: "my-rule", ... },      // convenience accessor
 *   "kibana": {
 *     "alert": {
 *       "rule": { "name": "my-rule" },     // Nested structure (new recommended access)
 *       "status": "active"
 *     }
 *   }
 * }
 */
export function normalizeAlert(alert: AlertHit): NormalizedAlert {
  // Expand dotted fields to nested structure
  const expanded = unflattenObject(alert as Record<string, unknown>) as Record<string, unknown>;

  // Preserve original flat keys for backward compatibility (DEPRECATED)
  // This allows {{ alert['kibana.alert.rule.name'] }} to still work in Liquid templates
  const flatKeys: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(alert)) {
    // Preserve keys that contain dots (ECS-style flat field names)
    // Skip _id and _index as they're handled separately
    if (key.includes('.') && key !== '_id' && key !== '_index') {
      flatKeys[key] = value;
    }
  }

  // Extract nested alert properties for convenience accessors
  const kibanaAlert = (expanded.kibana as Record<string, unknown>)?.alert as
    | Record<string, unknown>
    | undefined;

  // Combine flat keys (for backward compat), expanded structure (for new syntax),
  // and convenience accessors
  return {
    ...flatKeys, // Flat keys (deprecated, for backward compat)
    ...expanded, // Nested structure (new recommended access)
    // Convenience properties for common access patterns
    id: alert._id,
    index: alert._index,
    status: kibanaAlert?.status as string | undefined,
    severity: kibanaAlert?.severity as string | undefined,
    reason: kibanaAlert?.reason as string | undefined,
    rule: kibanaAlert?.rule as NormalizedAlert['rule'],
    // Preserve original metadata
    _id: alert._id,
    _index: alert._index,
  } as NormalizedAlert;
}
