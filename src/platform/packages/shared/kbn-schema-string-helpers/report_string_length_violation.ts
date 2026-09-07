/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { metrics, ValueType } from '@opentelemetry/api';
import type { Counter, MeterProvider } from '@opentelemetry/api';
import type { StringHelperName } from './limits';

const counters = new WeakMap<MeterProvider, Counter>();

const getCounter = (): Counter => {
  // Schema libraries can load before telemetry initializes the global provider.
  const provider = metrics.getMeterProvider();
  const existing = counters.get(provider);
  if (existing) {
    return existing;
  }
  const counter = provider
    .getMeter('kibana.schema')
    .createCounter('kibana.schema.string_length_violation', {
      description: 'String validations exceeding the configured maximum length in reporting mode.',
      unit: '{violation}',
      valueType: ValueType.INT,
    });
  counters.set(provider, counter);
  return counter;
};

/** Counts overlong values without recording input contents or request-specific lengths. */
export const reportStringLengthViolation = ({
  helper,
  library,
  maxLength,
  label,
}: {
  helper: StringHelperName;
  library: 'config-schema' | 'zod';
  maxLength: number;
  label?: string;
}): void => {
  try {
    getCounter().add(1, {
      'schema.helper': helper,
      'schema.library': library,
      'schema.max_length': maxLength,
      ...(label === undefined ? {} : { 'schema.label': label }),
    });
  } catch {
    // Reporting must never change whether request validation succeeds.
  }
};
