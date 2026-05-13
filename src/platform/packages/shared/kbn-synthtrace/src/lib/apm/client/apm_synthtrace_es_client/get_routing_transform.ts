/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApmFields, ESDocumentWithOperation } from '@kbn/synthtrace-client';
import { Transform } from 'stream';

export function getRoutingTransform() {
  return new Transform({
    objectMode: true,
    transform(document: ESDocumentWithOperation<ApmFields>, encoding, callback) {
      let index: string | undefined;

      const namespace = 'default';
      switch (document['processor.event']) {
        case 'transaction':
        case 'span':
          index =
            document['agent.name'] === 'rum-js'
              ? `traces-apm.rum-${namespace}`
              : `traces-apm-${namespace}`;
          break;

        case 'error':
          index = `logs-apm.error-${namespace}`;
          break;

        case 'metric':
          const metricsetName = document['metricset.name'];

          if (metricsetName === 'app') {
            index = `metrics-apm.app.${document['service.name']}-${namespace}`;
          } else if (
            metricsetName === 'transaction' ||
            metricsetName === 'service_transaction' ||
            metricsetName === 'service_destination' ||
            metricsetName === 'service_summary'
          ) {
            index = `metrics-apm.${metricsetName}.${document['metricset.interval']!}-${namespace}`;
          } else {
            index = `metrics-apm.internal-${namespace}`;
          }
          break;
        default:
          if (document['event.action'] != null) {
            index = `logs-apm.app-${namespace}`;
          }
          break;
      }

      if (!index) {
        const error = new Error('Cannot determine index for event');
        Object.assign(error, { document });
      }

      // Automatically populate data_stream fields from the determined index name
      // Index format: {type}-{dataset}-{namespace} (e.g., "metrics-apm.transaction.1m-default")
      if (index) {
        const [type, dataset] = index.split('-');
        document['data_stream.type'] = type;
        document['data_stream.dataset'] = dataset;
        document['data_stream.namespace'] = namespace;
      }

      document._index = index;

      callback(null, document);
    },
  });
}
