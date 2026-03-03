/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESDocumentWithOperation, ApmOtelFields } from '@kbn/synthtrace-client';
import { Transform } from 'stream';

export function getOtelRoutingTransform() {
  return new Transform({
    objectMode: true,
    transform(document: ESDocumentWithOperation<ApmOtelFields>, encoding, callback) {
      const namespace = 'default';
      let index: string | undefined;

      switch (document['attributes.processor.event']) {
        case 'transaction':
        case 'span':
          index = `traces-generic.otel-${namespace}`;
          break;

        case 'error':
          index = `logs-generic.otel-${namespace}`;
          break;

        case 'metric':
          const metricsetName = document['attributes.metricset.name'];
          const metricsetInterval = document['attributes.metricset.interval'];
          if (
            metricsetName === 'transaction' ||
            metricsetName === 'service_transaction' ||
            metricsetName === 'service_destination' ||
            metricsetName === 'service_summary'
          ) {
            index = `metrics-${metricsetName}.${metricsetInterval}.otel-${namespace}`;
          } else {
            index = `metrics.otel-internal-${namespace}`;
          }
          break;
        default:
          break;
      }

      if (!index) {
        const error = new Error('Cannot determine index for event');
        Object.assign(error, { document });
      }

      document._index = index;

      callback(null, document);
    },
  });
}
