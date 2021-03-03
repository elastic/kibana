/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import cluster from 'cluster';
import { Logger, LoggerFactory } from '@kbn/logging';
import { ConfigService } from '../config';
import { ClusteringConfigType, config as clusteringConfig } from './clustering_config';
import { TransferBroadcastMessage } from './types';
import { isBroadcastMessage } from './utils';

/**
 * Coordinator-side clustering service
 */
export class ClusterManager {
  private config?: ClusteringConfigType;
  private readonly logger: Logger;

  constructor(private readonly configService: ConfigService, logger: LoggerFactory) {
    this.logger = logger.get('cluster-manager');
  }

  public async setup() {
    this.config = this.configService.atPathSync<ClusteringConfigType>(clusteringConfig.path);
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
      }
    };

    const createWorker = () => {
      const worker = cluster.fork({});
      worker.on('message', (message: any) => {
        handleWorkerMessage(worker.id, message);
      });
    };

    cluster.on('online', (worker) => {
      this.logger.info(`*** Worker online: ${worker.id}`);
    });

    cluster.on('exit', (worker, code) => {
      if (worker.exitedAfterDisconnect || code === 0) {
        // shutting down
      } else if (true /* closing */) {
        // died while closing
      } else {
        // died needs restart:
        createWorker();
      }
    });

    for (let i = 0; i < this.config!.workers; i++) {
      createWorker();
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
