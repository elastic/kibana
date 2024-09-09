/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ApmFields } from '@kbn/apm-synthtrace-client';
import { Transform } from 'stream';
import { dedot } from '@kbn/apm-synthtrace-client';

export function getDedotTransform(keepFlattenedFields: boolean = false) {
  return new Transform({
    objectMode: true,
    transform(document: ApmFields, encoding, callback) {
      let target: Record<string, any>;

      if (keepFlattenedFields) {
        // no need to dedot metric events, just document.observer
        // use it when you want to reduce CPU time
        // @ts-expect-error
        document.observer = {
          type: document['observer.type'],
          version: document['observer.version'],
          version_major: document['observer.version_major'],
        };
        delete document['observer.type'];
        delete document['observer.version'];
        delete document['observer.version_major'];

        target = document['processor.event'] === 'metric' ? document : dedot(document, {});
      } else {
        target = dedot(document, {});
      }

      delete target.meta;
      if (target['@timestamp']) {
        target['@timestamp'] = new Date(target['@timestamp']).toISOString();
      }

      callback(null, target);
    },
  });
}
