/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Minimal shape for the anonymizationContext capability value.
 * Structurally satisfied by AnonymizationContextHandle (inference_workflows).
 * This entry will be removed in the next commit once the token map flows as
 * event/output data instead of a side-channel capability.
 */
interface AnonymizationContextCapability {
  readonly salt: string;
  readonly tokenMap: Map<string, { original: string; entityClass: string }>;
  setField(key: string, value: unknown): void;
  getField(key: string): unknown;
}

/**
 * Closed registry of all capabilities the workflow engine recognises.
 *
 * Triggers declare which keys they provide via `providesCapabilities`.
 * Steps declare which keys they require via `requiresCapabilities`.
 * The engine validates key-set inclusion at registration time and parses
 * each capability value via capabilitySchemas at dispatch time.
 *
 * Extending this interface: add one entry here, one Zod schema in
 * capabilitySchemas, declare it on the relevant trigger(s) and step(s).
 * No other change is needed.
 */
export interface KnownCapabilities {
  /** Around-hook proceed function — provided only by the aroundCompletion trigger. */
  proceedFn: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  /**
   * Anonymization context — removed in the next commit once the token map
   * flows as event/output data instead of a side-channel capability.
   */
  anonymizationContext: AnonymizationContextCapability;
}

export type CapabilityKey = keyof KnownCapabilities;
