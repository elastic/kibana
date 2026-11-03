/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { of } from 'rxjs';
import type { ActionsTasksStart } from '@kbn/actions-plugin/server/tasks';
import { schema } from '@kbn/config-schema';
import type {
  CoreTasksSetup,
  CoreTasksStart,
  PluginConfigDescriptor,
  PluginInitializerContext,
  TasksPlugin,
} from '@kbn/core/server';
import { ServiceStatusLevels } from '@kbn/core-status-common';
import type { LicensingTasksStart } from '@kbn/licensing-plugin/server/tasks';
import type { SecurityTasksStart } from '@kbn/security-plugin/server/tasks';
import type { SpacesTasksStart } from '@kbn/spaces-plugin/server/tasks';
import type { TaskManagerTasksStart } from '@kbn/task-manager-plugin/server/tasks';
import type { WorkflowsExecutionEngineTasksStart } from '@kbn/workflows-execution-engine/server/tasks';
import type { WorkflowsExtensionsTasksStart } from '@kbn/workflows-extensions/server/tasks';
import { workflowsManagementBridge } from './bridge';
import { createWorkflowsManagement } from '../api/create_workflows_management';
import type { WorkflowsServerPluginSetup } from '../types';

const configSchema = schema.object(
  { available: schema.boolean({ defaultValue: true }) },
  { unknowns: 'allow' }
);
type WorkflowsManagementTasksConfig = ReturnType<typeof configSchema.validate>;

export const config: PluginConfigDescriptor<WorkflowsManagementTasksConfig> = {
  schema: configSchema,
};

interface TasksStartDeps {
  taskManager: TaskManagerTasksStart;
  actions: ActionsTasksStart;
  licensing: LicensingTasksStart;
  spaces: SpacesTasksStart;
  security?: SecurityTasksStart;
  workflowsExecutionEngine: WorkflowsExecutionEngineTasksStart;
  workflowsExtensions: WorkflowsExtensionsTasksStart;
}

/**
 * The Workflows Management API for task runtimes: the very `WorkflowsManagementApi` that Kibana
 * serves (reads, CRUD, executions, validation, scheduling), built over the tasks contracts of its
 * dependencies. In Kibana the plugin owns it and this hands out that instance (see `bridge.ts`).
 * In a task pod the service is read-only against Elasticsearch: it uses the workflow index and the
 * change history data stream that Kibana installed and never creates or changes them. Routes, UI,
 * managed workflow installs and the inbox belong to Kibana.
 */
export type WorkflowsManagementTasksSetup = WorkflowsServerPluginSetup;

export interface BulkScheduleItem {
  workflow: { id: string } & Record<string, unknown>;
  spaceId: string;
  inputs: Record<string, unknown>;
  triggeredBy?: string;
  metadata?: Record<string, unknown>;
}

class WorkflowsManagementTasksPlugin
  implements TasksPlugin<WorkflowsManagementTasksSetup, void, {}, TasksStartDeps>
{
  private readonly startDeps: {
    promise: Promise<[CoreTasksStart, TasksStartDeps, unknown]>;
    resolve: (value: [CoreTasksStart, TasksStartDeps, unknown]) => void;
  };
  private readonly setupDeps: Record<string, unknown> = {};
  private bridged = false;

  constructor(private readonly context: PluginInitializerContext<WorkflowsManagementTasksConfig>) {
    let resolve!: (value: [CoreTasksStart, TasksStartDeps, unknown]) => void;
    const promise = new Promise<[CoreTasksStart, TasksStartDeps, unknown]>((r) => {
      resolve = r;
    });
    promise.catch(() => undefined);
    this.startDeps = { promise, resolve };
  }

  setup(_core: CoreTasksSetup): WorkflowsManagementTasksSetup {
    const real = workflowsManagementBridge.getSetup();
    if (real) {
      this.bridged = true;
      return real;
    }

    const { api } = createWorkflowsManagement({
      core: {
        getStartServices: () => this.startDeps.promise,
        // A pod has Elasticsearch by definition (it is how it runs).
        status: { core$: of({ elasticsearch: { level: ServiceStatusLevels.available } }) },
      } as never,
      plugins: this.setupDeps as never,
      logger: this.context.logger.get(),
      kibanaVersion: this.context.env.packageInfo.version,
      available: this.context.config.get().available,
      options: { readOnly: true },
    });
    return { management: api };
  }

  start(core: CoreTasksStart, deps: TasksStartDeps) {
    if (this.bridged) return;
    // Setup dependencies the service reads at call time.
    this.setupDeps.spaces = deps.spaces;
    this.startDeps.resolve([core, deps, undefined]);
  }
}

export const plugin = async (context: PluginInitializerContext<never>) =>
  new WorkflowsManagementTasksPlugin(context);
