/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Transform } from 'stream';
import { ApmFields } from '@kbn/apm-synthtrace-client';

export function getApmServerMetadataTransform(version: string) {
  const versionMajor = Number(version.split('.')[0]);

  return new Transform({
    objectMode: true,
    transform(document: ApmFields, encoding, callback) {
      document['observer.type'] = 'synthtrace';
      document['observer.version'] = version;
      document['observer.version_major'] = versionMajor;
      callback(null, document);
    },
  });
}
