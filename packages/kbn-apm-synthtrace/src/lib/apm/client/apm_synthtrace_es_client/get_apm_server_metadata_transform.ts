/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Transform } from 'stream';
import { ApmFields } from '@kbn/apm-synthtrace-client';

export function getApmServerMetadataTransform(version: string) {
  console.log('### caue  getApmServerMetadataTransform  version:', version);
  const versionMajor = Number(version.split('.')[0]);
  console.log('### caue  getApmServerMetadataTransform  versionMajor:', versionMajor);

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
