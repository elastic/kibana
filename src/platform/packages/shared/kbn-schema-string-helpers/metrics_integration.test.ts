/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { metrics } from '@opentelemetry/api';
import { metrics as sdkMetrics } from '@elastic/opentelemetry-node/sdk';
import { reportStringLengthViolation } from './report_string_length_violation';

class TestMetricReader extends sdkMetrics.MetricReader {
  protected async onForceFlush(): Promise<void> {}
  protected async onShutdown(): Promise<void> {}
}

test('records after the global provider is initialized, even if reporting ran earlier', async () => {
  metrics.disable();
  reportStringLengthViolation({ helper: 'savedObjectId', library: 'zod', maxLength: 512 });

  const reader = new TestMetricReader();
  const provider = new sdkMetrics.MeterProvider({ readers: [reader] });
  metrics.setGlobalMeterProvider(provider);
  try {
    reportStringLengthViolation({ helper: 'savedObjectId', library: 'zod', maxLength: 512 });
    reportStringLengthViolation({ helper: 'savedObjectId', library: 'zod', maxLength: 512 });
    reportStringLengthViolation({ helper: 'spaceId', library: 'config-schema', maxLength: 512 });
    const { resourceMetrics } = await reader.collect();
    expect(resourceMetrics.scopeMetrics).toHaveLength(1);
    const [scope] = resourceMetrics.scopeMetrics;
    expect(scope.scope.name).toBe('kibana.schema');
    expect(scope.metrics).toHaveLength(1);
    expect(scope.metrics[0].descriptor.name).toBe('kibana.schema.string_length_violation');
    expect(scope.metrics[0].dataPoints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          attributes: {
            'schema.helper': 'savedObjectId',
            'schema.library': 'zod',
            'schema.max_length': 512,
          },
          value: 2,
        }),
        expect.objectContaining({
          attributes: {
            'schema.helper': 'spaceId',
            'schema.library': 'config-schema',
            'schema.max_length': 512,
          },
          value: 1,
        }),
      ])
    );
  } finally {
    metrics.disable();
    await provider.shutdown();
  }
});
