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
import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
import {
  STEP_EXECUTIONS_DATA_STREAM_DEFINITION,
  WORKFLOW_EXECUTIONS_DATA_STREAM_DEFINITION,
} from './data_stream/data_stream_definitions';
import { DataStreamEntityDataClient } from './data_stream/data_stream_entity_data_client';
import { PlainIndexEntityDataClient } from './plain_index/plain_index_entity_data_client';
import {
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
} from '../constants/execution_indexes';
import { WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS } from '../mappings/step_executions_mappings';
import { WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS } from '../mappings/workflow_executions_mappings';
import type {
  DataClient,
  DataClientBundle,
  EntityDataClient,
  ExecutionStorageSource,
  StepExecutionsDataClient,
  WorkflowExecutionsDataClient,
} from '../types';

export interface DeferredDataClientBundleDeps {
  source: ExecutionStorageSource;
  dataRetention: string;
  logger: Logger;
}

interface StoragePair {
  workflow: EntityDataClient<WorkflowExecutionsDataClient>;
  step: EntityDataClient<StepExecutionsDataClient>;
}

export class DeferredDataClientBundle implements DataClientBundle {
  private readonly workflow: EntityDataClient<WorkflowExecutionsDataClient>;
  private readonly step: EntityDataClient<StepExecutionsDataClient>;
  private startPromise: Promise<void> | undefined;
  private setupPromise: Promise<void> | undefined;

  constructor(private readonly deps: DeferredDataClientBundleDeps) {
    const pair = this.createStoragePair(deps.source);
    this.workflow = pair.workflow;
    this.step = pair.step;
  }

  initSetup(coreSetup: CoreSetup): Promise<void> {
    if (!this.setupPromise) {
      this.setupPromise = Promise.all([
        this.workflow.initSetup(coreSetup),
        this.step.initSetup(coreSetup),
      ]).then(() => undefined);
    }
    return this.setupPromise;
  }

  initStart(coreStart: CoreStart): Promise<void> {
    if (!this.setupPromise) {
      throw new Error('initSetup must be called first');
    }

    if (!this.startPromise) {
      const setupPromise = this.setupPromise;
      this.startPromise = setupPromise.then(() =>
        Promise.all([this.workflow.initStart(coreStart), this.step.initStart(coreStart)]).then(
          () => undefined
        )
      );
    }
    return this.startPromise;
  }

  stop(): Promise<void> {
    return Promise.all([this.workflow.stop(), this.step.stop()]).then(() => undefined);
  }

  createWorkflowDataClient(): WorkflowExecutionsDataClient {
    return this.deferClient(() => this.workflow.createClient());
  }

  createStepDataClient(): StepExecutionsDataClient {
    return this.deferClient(() => this.step.createClient());
  }

  private createStoragePair(source: ExecutionStorageSource): StoragePair {
    const { logger, dataRetention } = this.deps;
    switch (source) {
      case 'plain_index':
        return {
          workflow: new PlainIndexEntityDataClient<EsWorkflowExecution>({
            logger,
            indexName: WORKFLOWS_EXECUTIONS_INDEX,
            mappings: WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
          }),
          step: new PlainIndexEntityDataClient<EsWorkflowStepExecution>({
            logger,
            indexName: WORKFLOWS_STEP_EXECUTIONS_INDEX,
            mappings: WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
          }),
        };
      case 'data_stream':
        return {
          workflow: new DataStreamEntityDataClient<EsWorkflowExecution>({
            logger,
            dataRetention,
            definition: WORKFLOW_EXECUTIONS_DATA_STREAM_DEFINITION,
            dateField: 'createdAt',
            additionalIndexesToQuery: ['.workflows-executions'],
          }),
          step: new DataStreamEntityDataClient<EsWorkflowStepExecution>({
            logger,
            dataRetention,
            definition: STEP_EXECUTIONS_DATA_STREAM_DEFINITION,
            dateField: 'startedAt',
            additionalIndexesToQuery: ['.workflows-step-executions'],
          }),
        };
      default: {
        const unexpected: never = source;
        throw new Error(`Unsupported storage source: ${unexpected}`);
      }
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
      deleteByQuery: async (r) => get().then((c) => c.deleteByQuery(r)),
      refresh: async () => get().then((c) => c.refresh()),
    };

    instrumentAsyncMethods(`DataClientBundle(${this.deps.source})`, deferredClient);

    return deferredClient;
  }
}
