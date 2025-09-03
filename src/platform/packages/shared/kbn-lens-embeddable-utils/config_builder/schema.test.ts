/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MetricState, lensApiStateSchema } from './schema/index';

describe('Lens API State Schema', () => {
  describe('MetricState validation', () => {
    it('validates a basic metric configuration with index dataset', () => {
      const a: MetricState = {
        type: 'metric',
        dataset: {
          type: 'index',
          index: 'my-index-*',
        },
        metric: {
          operation: 'count',
        },
        secondary_metric: {
          operation: 'count',
        },
        breakdown_by: {
          operation: 'terms',
          fields: ['geo.src'],
        }
      };

      try {
        const b: MetricState = lensApiStateSchema.validate(a);

        console.log('Input object a:');
        console.log(a);
        console.log('Validated object b:');
        console.log(b);

      } catch (e) {
        console.error('Validation failed:', e);
      }

      
    });
  });
});