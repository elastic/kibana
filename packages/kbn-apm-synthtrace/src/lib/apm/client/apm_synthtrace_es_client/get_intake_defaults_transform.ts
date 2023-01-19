/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApmFields } from '@kbn/apm-synthtrace-client';
import { Transform } from 'stream';

export function getIntakeDefaultsTransform() {
  return new Transform({
    objectMode: true,
    transform(document: ApmFields, encoding, callback) {
      document['service.node.name'] =
        document['service.node.name'] || document['container.id'] || document['host.name'];
      callback(null, document);
    },
  });
}
