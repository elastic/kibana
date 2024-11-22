/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Transform } from 'stream';

export function addObserverVersionTransform(observerVersion: string) {
  return new Transform({
    objectMode: true,
    transform(chunk: { observer?: { version?: string } }, encoding, callback) {
      if (chunk?.observer?.version) {
        chunk.observer.version = observerVersion;
      }
      callback(null, chunk);
    },
  });
}

export function deleteSummaryFieldTransform() {
  return new Transform({
    objectMode: true,
    transform(chunk: { transaction?: { duration?: { summary?: number } } }, encoding, callback) {
      if (chunk?.transaction?.duration?.summary) {
        delete chunk.transaction.duration.summary;
      }
      callback(null, chunk);
    },
  });
}
