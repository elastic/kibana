/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { instrumentAsyncMethods } from '@kbn/apm-utils';
import type { CoreSetup, CoreStart, Logger } from '@kbn/core/server';
import { PlainIndexDataClientBundle } from './plain_index/plain_index_data_client_bundle';
import type {
  DataClient,
  DataClientBundle,
  ExecutionStorageSource,
  StepExecutionsDataClient,
  WorkflowExecutionsDataClient,
} from '../types';

export interface DeferredDataClientBundleDeps {
  source: ExecutionStorageSource;
  logger: Logger;
}

export class DeferredDataClientBundle implements DataClientBundle {
  private readonly dataClientBundle: DataClientBundle;
  private startPromise: Promise<void> | undefined;
  private setupPromise: Promise<void> | undefined;
  private workflowClient: WorkflowExecutionsDataClient | undefined;
  private stepClient: StepExecutionsDataClient | undefined;

  constructor(private readonly deps: DeferredDataClientBundleDeps) {
    this.dataClientBundle = this.createDataClientBundle();
  }

  initSetup(coreSetup: CoreSetup): Promise<void> {
    if (!this.setupPromise) {
      this.setupPromise = this.dataClientBundle.initSetup(coreSetup);
    }
    return this.setupPromise;
  }

  initStart(coreStart: CoreStart): Promise<void> {
    if (!this.setupPromise) {
      throw new Error('initSetup must be called first');
    }

    if (!this.startPromise) {
      this.startPromise = this.setupPromise.then(() => this.dataClientBundle.initStart(coreStart));
    }
    return this.startPromise;
  }

  stop(): Promise<void> {
    return this.dataClientBundle.stop();
  }

  createWorkflowDataClient(): WorkflowExecutionsDataClient {
    return (this.workflowClient ??= this.deferClient(() =>
      this.dataClientBundle.createWorkflowDataClient()
    ));
  }

  createStepDataClient(): StepExecutionsDataClient {
    return (this.stepClient ??= this.deferClient(() =>
      this.dataClientBundle.createStepDataClient()
    ));
  }

  private createDataClientBundle(): DataClientBundle {
    const { deps } = this;
    switch (deps.source) {
      case 'system_index':
        return new PlainIndexDataClientBundle(deps);
      default:
        throw new Error(`Unsupported storage source: ${deps.source}`);
    }
  }

  private deferClient<TExecution extends { id: string }>(
    factory: () => DataClient<TExecution>
  ): DataClient<TExecution> {
    const { startPromise: initPromise } = this;
    if (!initPromise) {
      throw new Error('initStart must be called before creating data clients');
    }
    let resolved: DataClient<TExecution> | undefined;
    const get = () => initPromise.then(() => (resolved ??= factory()));
    const deferredClient: DataClient<TExecution> = {
      search: async (r) => get().then((c) => c.search(r)),
      count: async (r) => get().then((c) => c.count(r)),
      getByIds: async (ids, opts) => get().then((c) => c.getByIds(ids, opts)),
      bulk: async (r) => get().then((c) => c.bulk(r)),
      scriptUpdate: async (r) => get().then((c) => c.scriptUpdate(r)),
      deleteByQuery: async (r) => get().then((c) => c.deleteByQuery(r)),
    };

    instrumentAsyncMethods(`DataClientBundle(${this.deps.source})`, deferredClient);

    return deferredClient;
  }
}
