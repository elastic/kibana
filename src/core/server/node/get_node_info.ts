/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import cluster from 'cluster';
import { RawConfigService } from '../config';
import { loadNodeConfig } from './load_config';

/**
 * @internal
 */
export interface NodeInfo {
  /** is node clustering enabled */
  isEnabled: boolean;
  /**
   * Is the current process the master process.
   * Will be true either when node clustering is disabled or when the process is the coordinator
   */
  isMaster: boolean;
  /**
   * Is the current process the coordinator process
   * (master process when node clustering is enabled)
   */
  isCoordinator: boolean;
  /** */
  isWorker: boolean;
  /** */
  workerId: number;
}

export const getNodeInfo = async (rawConfigService: RawConfigService): Promise<NodeInfo> => {
  const config = await loadNodeConfig(rawConfigService);
  return {
    isEnabled: config.enabled,
    isMaster: cluster.isMaster,
    isCoordinator: config.enabled && cluster.isMaster,
    isWorker: cluster.isWorker,
    workerId: cluster.isWorker ? cluster.worker.id : -1,
  };
};
