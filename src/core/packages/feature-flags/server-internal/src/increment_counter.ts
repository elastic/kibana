/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { metrics, ValueType } from '@opentelemetry/api';

const flagEvaluationCounter = metrics
  .getMeter('kibana.feature-flags')
  .createCounter('flag.evaluation.count', {
    description: 'Count of feature flag evaluations',
    unit: '1',
    valueType: ValueType.INT,
  });

/**
 * Increments the counter for the flag evaluation.
 * @param flagName The name of the flag
 * @param value The value of the flag
 * @internal
 */
export function incrementCounter(flagName: string, value: boolean | number | string): void {
  flagEvaluationCounter.add(1, {
    // Attribute names follow the convention defined in https://opentelemetry.io/docs/specs/semconv/feature-flags/feature-flags-events/
    'feature_flag.key': flagName,
    // Intentionally converting the value to a string to avoid any potential mapping issues.
    'feature_flag.value': `${value}`,
  });
}
