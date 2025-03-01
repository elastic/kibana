/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { once, pull } from 'lodash';
import { PassThrough, finished } from 'stream';

export class StreamManager {
  private currentStreams: PassThrough[] = [];
  constructor(private readonly teardownCallback: () => Promise<void>) {}

  trackStream(stream: PassThrough) {
    this.currentStreams.push(stream);
  }

  untrackStream(stream: PassThrough) {
    pull(this.currentStreams, stream);
  }

  private teardown() {
    this.teardownCallback().then(() => {});

    Promise.all(
      this.currentStreams.map((stream) => {
        stream.end();
        return new Promise<void>((resolve, reject) => {
          finished(stream, (err) => {
            if (err) {
              return reject(err);
            }
            resolve();
          });
        });
      })
    )
      .then(() => {
        process.exit(0);
      })
      .catch(() => {
        process.exit(1);
      });
  }

  init = once(() => {
    process.on('SIGINT', () => this.teardown());
    process.on('SIGTERM', () => this.teardown());
    process.on('SIGQUIT', () => this.teardown());
  });
}
