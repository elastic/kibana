/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface AlertSelection {
  _id: string;
  _index: string;
}

export interface AlertTriggerInput {
  event: {
    alertIds: AlertSelection[];
    triggerType: 'alert';
  };
}

export interface AlertEventRule {
  id: string;
  name: string;
  tags: string[];
  consumer: string;
  producer: string;
  ruleTypeId: string;
}

/**
 * Represents an alert rule extracted from the nested kibana.alert.rule structure.
 * This is the convenience accessor available at alert.rule
 */
export interface NormalizedAlertRule {
  uuid?: string;
  name?: string;
  tags?: string[];
  consumer?: string;
  producer?: string;
  rule_type_id?: string;
  parameters?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * A normalized alert document with expanded dotted fields and convenience accessors.
 *
 * Raw alerts from Elasticsearch use flat ECS-style field names (e.g., "kibana.alert.rule.name").
 * This interface represents the normalized structure where:
 * - Dotted fields are expanded to nested objects (e.g., kibana.alert.rule.name)
 * - Convenience properties are added at the root level (e.g., id, status, rule)
 */
export interface NormalizedAlert {
  // Convenience accessors for common fields
  /** Alert ID (same as _id) */
  id: string;
  /** Alert index (same as _index) */
  index: string;
  /** Alert status from kibana.alert.status */
  status?: string;
  /** Alert severity from kibana.alert.severity */
  severity?: string;
  /** Alert reason from kibana.alert.reason */
  reason?: string;
  /** Rule information from kibana.alert.rule */
  rule?: NormalizedAlertRule;

  // Original metadata
  _id: string;
  _index: string;

  // Expanded nested structure (from unflattenObject)
  kibana?: {
    alert?: {
      status?: string;
      severity?: string;
      reason?: string;
      rule?: NormalizedAlertRule;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };

  // Allow other fields from the expanded alert
  [key: string]: unknown;
}

export interface AlertEvent {
  alerts: NormalizedAlert[];
  rule: AlertEventRule;
  ruleUrl?: string;
  spaceId: string;
}
