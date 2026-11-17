/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dedot } from '@kbn/synthtrace-client';
import { Transform } from 'stream';

/**
 * Turns the flat, dotted keys of a document (`monitor.id`) into the nested objects that the
 * Synthetics agent writes, and the timestamp into an ISO string. The Synthetics app reads
 * `_source` as it is, so it expects both. Unlike the APM transform, this one keeps `meta`,
 * which holds the `space_id` that the app filters on.
 */
export function getSyntheticsDedotTransform() {
  return new Transform({
    objectMode: true,
    transform(document: Record<string, unknown>, encoding, callback) {
      const target = dedot(document, {});

      const timestamp = target['@timestamp'];
      if (typeof timestamp === 'number') {
        target['@timestamp'] = new Date(timestamp).toISOString();
      }

      callback(null, target);
    },
  });
}
