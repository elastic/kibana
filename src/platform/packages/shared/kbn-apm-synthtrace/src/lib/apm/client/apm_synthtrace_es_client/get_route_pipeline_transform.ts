/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ApmFields, ApmOtelFields, ESDocumentWithOperation } from '@kbn/apm-synthtrace-client';
import { Transform } from 'stream';
import { getOtelPipeline } from './otel/get_apm_otel_pipeline';
import { getApmServerPipeline } from './get_apm_server_pipeline';

export function getPipelineTransform(version: string) {
  return new Transform({
    objectMode: true,
    transform(document: ESDocumentWithOperation<ApmFields | ApmOtelFields>, encoding, callback) {
      if ('resource.attributes.telemetry.sdk.name' in document) {
        getOtelPipeline();
      } else {
        getApmServerPipeline(version);
      }

      callback(null, document);
    },
  });
}
