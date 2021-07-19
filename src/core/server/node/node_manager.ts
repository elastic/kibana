/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import cluster from 'cluster';
import { omit } from 'lodash';
import { Logger, LoggerFactory } from '@kbn/logging';
import { ConfigService } from '../config';
import { BaseLogger } from '../logging/logger';
import { LoggingConfig } from '../logging/logging_config';
import {
  NodeConfigType,
  WorkersConfigType,
  WorkerConfig,
  config as nodeConfig,
} from './node_config';
import { TransferBroadcastMessage } from './types';
import { isBroadcastMessage, isLogRecordMessage } from './utils';

/**
 * Coordinator-side node clustering service
 */
export class NodeManager {
  private config?: NodeConfigType;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerFactory,
    private readonly log: Logger
  ) {}

  public async setup() {
    this.config = this.configService.atPathSync<NodeConfigType>(nodeConfig.path);
    if (this.config.enabled && cluster.isMaster) {
      this.forkWorkers();
    }
  }

  public async stopWorkers() {
    try {
      await shutdownWorkers();
    } catch (e) {
      await killWorkers('SIGTERM');
      await killWorkers('SIGKILL');
    }
  }

  public broadcast(message: TransferBroadcastMessage, sender?: number) {
    const sendToSelf = message.options?.sendToSelf ?? false;
    Object.values(cluster.workers).forEach((worker) => {
      if (sendToSelf || worker?.id !== sender) {
        worker?.send(message);
      }
    });
  }

  private forkWorkers() {
    const handleWorkerMessage = (workerId: number, message: any) => {
      if (isBroadcastMessage(message)) {
        this.broadcast(message, workerId);
      } else if (isLogRecordMessage(message)) {
        const context = LoggingConfig.getLoggerContextParts(message.payload.context);
        const log = this.logger.get(...context);
        log.log(BaseLogger.fromSerializableLogRecord(message.payload));
      }
    };

    const getWorkerConfigs = (): WorkerConfig[] => {
      const results: WorkerConfig[] = [];
      let configs: Map<string, WorkersConfigType>;

      if (this.config!.workers instanceof Map) {
        configs = this.config!.workers;
      } else {
        configs = new Map([['worker', this.config!.workers]]);
      }

      for (const [name, config] of configs.entries()) {
        for (let i = 0; i < config.count; i++) {
          results.push({ ...omit(config, 'count'), worker_type: name });
        }
      }

      return results;
    };

    const createWorker = (config: WorkerConfig) => {
      this.log.info(`*** Creating worker: ${JSON.stringify(config)}`);
      // Passes all config through to the worker's `env`.
      // Will probably need to do some additional processing here eventually.
      const worker = cluster.fork(config);
      worker.on('message', (message: any) => {
        handleWorkerMessage(worker.id, message);
      });
    };

    cluster.on('online', (worker) => {
      this.log.info(`*** Worker online: ${worker.id}`);
    });

    cluster.on('exit', (worker, code) => {
      if (worker.exitedAfterDisconnect || code === 0) {
        // shutting down
      } else if (true /* closing */) {
        // died while closing
      } else {
        // died needs restart:
        // createWorker();
      }
    });

    for (const config of getWorkerConfigs()) {
      createWorker(config);
    }
  }
}

async function shutdownWorkers() {
  const workers = Object.values(cluster.workers).filter((worker) => !worker!.isDead());
  return Promise.all(
    workers.map((worker) => {
      return new Promise((resolve, reject) => {
        worker!.once('exit', (code) => code !== 0 && reject());
        worker!.once('disconnect', () => resolve(void 0));
        worker!.send({ type: 'shutdown-worker' });
      });
    })
  );
}

async function killWorkers(signal: 'SIGTERM' | 'SIGKILL') {
  const workers = Object.values(cluster.workers).filter((worker) => !worker!.isDead());
  return Promise.all(
    workers.map((worker) => {
      return new Promise((resolve) => {
        worker!.once('exit', () => resolve(void 0));
        worker!.process.kill(signal);
      });
    })
  );
}
