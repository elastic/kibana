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
      const target = dedot(document, {});
      delete target.meta;
      target['@timestamp'] = new Date(target['@timestamp']!).toISOString();
      callback(null, target);
    },
  });
}
