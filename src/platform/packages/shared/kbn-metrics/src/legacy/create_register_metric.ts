/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Meter } from '@opentelemetry/api-metrics';

type RegisterMetric = (name: string, cb: () => number) => void;

export function createRegisterMetric({ meter }: { meter: Meter }): RegisterMetric {
  return (name, cb) => {
    meter.createObservableGauge(name).addCallback((result) => {
      const val = cb();
      result.observe(val);
    });
  };
}
