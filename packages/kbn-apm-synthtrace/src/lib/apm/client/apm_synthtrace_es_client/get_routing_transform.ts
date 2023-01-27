/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApmFields, ESDocumentWithOperation } from '@kbn/apm-synthtrace-client';
import { Transform } from 'stream';

export function getRoutingTransform() {
  return new Transform({
    objectMode: true,
    transform(document: ESDocumentWithOperation<ApmFields>, encoding, callback) {
      let index: string | undefined;

      switch (document['processor.event']) {
        case 'transaction':
        case 'span':
          index =
            document['agent.name'] === 'rum-js' ? 'traces-apm.rum-default' : 'traces-apm-default';
          break;

        case 'error':
          index = 'logs-apm.error-default';
          break;

        case 'metric':
          const metricsetName = document['metricset.name'];

          if (metricsetName === 'app') {
            index = `metrics-apm.app.${document['service.name']}-default`;
          } else {
            index = `metrics-apm.internal-default`;
          }
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
