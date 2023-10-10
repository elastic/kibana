/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Readable, Transform } from 'stream';
import { ApmSynthtraceEsClient } from '../apm/client/apm_synthtrace_es_client';

export function addObserverVersionTransform(observerVersion: string) {
  return new Transform({
    objectMode: true,
    transform(chunk: { observer?: { version?: string } }, encoding, callback) {
      if (chunk?.observer?.version) {
        chunk.observer.version = observerVersion;
      }
      callback(null, document);
    },
  });
}

export function deleteSummaryFieldTransform() {
  return new Transform({
    objectMode: true,
    transform(chunk: { transaction?: { duration?: { summary?: number } } }, encoding, callback) {
      delete chunk?.transaction?.duration?.summary;
      callback(null, chunk);
    },
  });
}

export function appendTransformsToDefaultApmPipeline(
  synthtrace: ApmSynthtraceEsClient,
  transforms: Transform[]
) {
  return (base: Readable) => {
    // @ts-expect-error
    const defaultPipeline: NodeJS.ReadableStream = synthtrace.getDefaultPipeline()(base);

    return transforms.reduce((acc, transform) => {
      return acc.pipe(transform);
    }, defaultPipeline) as Transform;
  };
}
