/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Transform } from 'stream';
import { dedot } from '../../../utils/dedot';
import { ApmFields } from '../../apm_fields';

export function getDedotTransform() {
  return new Transform({
    objectMode: true,
    transform(document: ApmFields, encoding, callback) {
      // no need to dedot metric events, just document.observer
      // @ts-expect-error
      document.observer = {
        type: document['observer.type'],
        version: document['observer.version'],
        version_major: document['observer.version_major'],
      };
      delete document['observer.type'];
      delete document['observer.version'];
      delete document['observer.version_major'];

      const target = document['processor.event'] === 'metric' ? document : dedot(document, {});
      delete target.meta;
      target['@timestamp'] = new Date(target['@timestamp']!).toISOString();
      callback(null, target);
    },
  });
}
