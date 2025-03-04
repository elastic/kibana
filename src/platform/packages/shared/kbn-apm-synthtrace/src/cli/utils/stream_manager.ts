/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { once, pull } from 'lodash';
import { ToolingLog } from '@kbn/tooling-log';
import { PassThrough, finished } from 'stream';

function attach(logger: ToolingLog, cb: () => Promise<void>) {
  const wrapped = once(() => {
    cb()
      .then(() => {
        process.exit(0);
      })
      .catch((err) => {
        logger.error(err);
        process.exit(1);
      });
  });

  process.on('SIGINT', wrapped);
  process.on('SIGTERM', wrapped);
  process.on('SIGQUIT', wrapped);
}

export class StreamManager {
  private currentStreams: PassThrough[] = [];
  constructor(
    private readonly logger: ToolingLog,
    private readonly teardownCallback: () => Promise<void>
  ) {}

  trackStream(stream: PassThrough) {
    this.currentStreams.push(stream);
  }

  untrackStream(stream: PassThrough) {
    pull(this.currentStreams, stream);
  }

  teardown = once(async () => {
    attach(this.logger, async () => {
      process.exit(1);
    });

    await Promise.all([
      ...this.currentStreams.map((stream) => {
        stream.end();
        return new Promise<void>((resolve, reject) => {
          finished(stream, (err) => {
            if (err) {
              return reject(err);
            }
            resolve();
          });
        });
      }),
      this.teardownCallback(),
    ]);
  });

  init = once(() => {
    attach(this.logger, () => this.teardown());
  });
}
