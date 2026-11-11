/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { metrics, ValueType, type Counter } from '@opentelemetry/api';
import { StandardResolutionReasons } from '@openfeature/server-sdk';

/** @internal */
export type FeatureFlagOverrideSource = 'runtime_override' | 'config_override';

/**
 * Where an evaluated value came from. Runtime overrides win over config overrides,
 * and both win over the provider. `fallback` is the value passed by the caller.
 * @internal
 */
export type FeatureFlagEvaluationSource = FeatureFlagOverrideSource | 'provider' | 'fallback';

/** @internal */
export interface FeatureFlagEvaluationDetails {
  source: FeatureFlagEvaluationSource;
  /** OpenFeature resolution reason, such as `TARGETING_MATCH` or `ERROR`. */
  reason?: string;
}

/** Reason reported by the OpenFeature NOOP provider, which always returns the fallback value. */
const NOOP_PROVIDER_REASON = 'No-op';

/**
 * Whether the OpenFeature resolution reason means the caller's fallback value was returned.
 * @internal
 */
export function isFallbackReason(reason: string | undefined): boolean {
  return reason === StandardResolutionReasons.ERROR || reason === NOOP_PROVIDER_REASON;
}

let flagEvaluationCounter: Counter | undefined;

/**
 * Increments the counter for the flag evaluation.
 * @param flagName The name of the flag
 * @param value The value of the flag
 * @param details Where the value came from
 * @internal
 */
export function incrementCounter(
  flagName: string,
  value: boolean | number | string,
  { source, reason }: FeatureFlagEvaluationDetails
): void {
  if (!flagEvaluationCounter) {
    // Lazy initialize the counter to avoid creating it if it's not used.
    // It also ensures that it waits for the global meter to be initialized.
    flagEvaluationCounter = metrics
      .getMeter('kibana.feature-flags')
      .createCounter('flag.evaluation.count', {
        description: 'Count of feature flag evaluations',
        unit: '1',
        valueType: ValueType.INT,
      });
  }

  flagEvaluationCounter.add(1, {
    // Attribute names follow the convention defined in https://opentelemetry.io/docs/specs/semconv/feature-flags/feature-flags-events/
    'feature_flag.key': flagName,
    // Intentionally converting the value to a string to avoid any potential mapping issues.
    'feature_flag.value': `${value}`,
    'feature_flag.result.reason': reason?.toLowerCase() ?? 'unknown',
    // Kibana-specific: semconv has no attribute to tell overrides apart from provider values.
    'kibana.feature_flag.source': source,
  });
}
