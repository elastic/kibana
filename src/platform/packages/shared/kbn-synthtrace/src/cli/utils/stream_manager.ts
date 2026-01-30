/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { castArray, once, pull } from 'lodash';
import type { ToolingLog } from '@kbn/tooling-log';
import { PassThrough, Readable, Writable, finished } from 'stream';
import type { Fields } from '@kbn/synthtrace-client';
import { isGeneratorObject } from 'util/types';
import type { Worker } from 'worker_threads';
import { parentPort } from 'worker_threads';
import type { SynthtraceEsClient } from '../../lib/shared/base_client';
import type { SynthGenerator } from '../../lib/utils/with_client';
import { awaitStream } from '../../lib/utils/wait_until_stream_finished';

// execute a callback when one of the kill signals is received
function attach(logger: ToolingLog, cb: () => Promise<void>) {
  const disconnect = () => {
    process.off('SIGINT', wrapped);
    process.off('SIGTERM', wrapped);
    process.off('SIGQUIT', wrapped);
  };

  const wrapped = once(() => {
    disconnect();
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
/**
 * StreamManager waits until streams have completed,
 * and then calls a teardown callback.
 */

const asyncNoop = async () => {};

export class StreamManager {
  private readonly clientStreams: Map<SynthtraceEsClient<Fields>, PassThrough> = new Map();
  private readonly clientIndexPromises: Map<SynthtraceEsClient<Fields>, Promise<void>> = new Map();
  private readonly trackedGeneratorStreams: Writable[] = [];
  public readonly trackedWorkers: Worker[] = [];

  constructor(
    private readonly logger: ToolingLog,
    private readonly teardownCallback: () => Promise<void> = asyncNoop
  ) {
    attach(this.logger, () => {
      this.logger.info('Tearing down after kill signal');
      return this.teardown();
    });

    parentPort?.on('message', (message) => {
      if (message === 'shutdown') {
        this.logger.info('Tearing down worker after shutdown message');
        this.teardown()
          .then(() => {
            process.exit(0);
          })
          .catch(() => {
            process.exit(1);
          });
      }
    });
  }

  trackWorker(worker: Worker) {
    const untrack = () => {
      pull(this.trackedWorkers, worker);
    };
    worker.on('error', () => {
      untrack();
    });
    worker.on('exit', () => {
      untrack();
    });
    this.trackedWorkers.push(worker);
  }

  /**
   * Create a single stream per client, and index data
   * received from the generator into that stream.
   */
  async index(
    client: SynthtraceEsClient<Fields>,
    generator: SynthGenerator<Fields>
  ): Promise<void> {
    const clientStream = this.createOrReuseClientStream(client);
    const generatorStream = new PassThrough({ objectMode: true });
    const generatorArray = castArray(generator);
    const streams: Readable[] = [];

    generatorArray.reverse().forEach((current) => {
      const currentStream = isGeneratorObject(current) ? Readable.from(current) : current;
      currentStream.pipe(generatorStream, { end: false });
      streams.push(currentStream);

      currentStream.on('end', () => {
        pull(streams, currentStream);
        if (streams.length === 0) {
          generatorStream.end();
        }
      });

      currentStream.on('error', (err) => {
        generatorStream.destroy(err);
        clientStream.destroy(err);
        streams.forEach((stream) => {
          stream.destroy(err);
        });

        pull(streams, currentStream);
      });
    });

    // the generator stream should write to the client
    // stream, but not end it, as the next buckets will
    // create a new generator
    generatorStream.pipe(clientStream, { end: false });

    // track the stream for later to end it if needed
    this.trackedGeneratorStreams.push(generatorStream);

    await awaitStream(generatorStream).finally(() => {
      pull(this.trackedGeneratorStreams, generatorStream);
      pull(streams, generatorStream);
    });
  }

  private createOrReuseClientStream(client: SynthtraceEsClient<Fields>) {
    let stream: PassThrough;

    if (this.clientStreams.has(client)) {
      stream = this.clientStreams.get(client)!;
    } else {
      stream = new PassThrough({ objectMode: true });
      this.clientStreams.set(client, stream);
      this.clientIndexPromises.set(client, client.index(stream));
    }

    return stream;
  }

  teardown = once(async () => {
    // If a signal is received during teardown,
    // we just quit forcefully.
    attach(this.logger, async () => {
      this.logger.error(`Force-quitting after receiving kill signal`);
      process.exit(1);
    });

    // end all streams and listen until they've
    // completed
    function endStream(stream: Writable | Readable) {
      return new Promise<void>((resolve, reject) => {
        if (stream instanceof Writable) {
          stream.end();
        }

        finished(stream, (err) => {
          if (err) {
            return reject(err);
          }
          resolve();
        });
      });
    }

    if (this.trackedGeneratorStreams.length) {
      // ending generator streams
      this.logger.debug(`Ending ${this.trackedGeneratorStreams.length} generator streams`);

      await Promise.all(this.trackedGeneratorStreams.map(endStream));
    }

    if (this.trackedWorkers.length) {
      // give workers a chance to gracefully shut down
      this.logger.debug(`Shutting down ${this.trackedWorkers.length} workers`);

      await Promise.all(
        this.trackedWorkers.map((worker) => {
          return new Promise<void>((resolve, reject) => {
            worker.postMessage('shutdown');
            worker.on('exit', () => {
              resolve();
            });
            setTimeout(() => {
              reject(`Failed to gracefully shutdown worker in time, terminating`);
            }, 10000);
          });
        })
      );
    }

    const clientStreams = Array.from(this.clientStreams.values());

    if (clientStreams.length) {
      // ending client streams
      this.logger.debug(`Ending ${clientStreams.length} client streams`);

      await Promise.all(clientStreams.map(endStream));
    }
    const clientIndexPromises = Array.from(this.clientIndexPromises.values());

    if (clientIndexPromises.length) {
      // ending client index promises
      this.logger.debug(`Ending ${clientIndexPromises.length} client index promises`);

      await Promise.all(clientIndexPromises);
    }

    await this.teardownCallback();
  });
}
