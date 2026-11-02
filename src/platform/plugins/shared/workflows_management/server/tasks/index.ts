/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type {
  CoreTasksStart,
  KibanaRequest,
  PluginConfigDescriptor,
  PluginInitializerContext,
  TasksPlugin,
} from '@kbn/core/server';
import type { LicensingTasksStart } from '@kbn/licensing-plugin/server/tasks';
import type { WorkflowsExecutionEngineTasksStart } from '@kbn/workflows-execution-engine/server/tasks';
import { getWorkflowsByIdsForRequests } from '../api/lib/get_workflows_by_ids_for_requests';
import { getWorkflowsByIds } from '../services/get_workflows_by_ids';
import { WorkflowAccessControlService } from '../services/workflow_access_control';
import { createStorage } from '../storage/workflow_storage';

const configSchema = schema.object(
  { available: schema.boolean({ defaultValue: true }) },
  { unknowns: 'allow' }
);
type WorkflowsManagementTasksConfig = ReturnType<typeof configSchema.validate>;

export const config: PluginConfigDescriptor<WorkflowsManagementTasksConfig> = {
  schema: configSchema,
};

/** What a request needs from a workflows call: who scheduled it, as a request. */
export interface BulkScheduleItem {
  workflow: { id: string } & Record<string, unknown>;
  spaceId: string;
  inputs: Record<string, unknown>;
  triggeredBy?: string;
  metadata?: Record<string, unknown>;
}

interface TasksStartDeps {
  licensing: LicensingTasksStart;
  workflowsExecutionEngine: WorkflowsExecutionEngineTasksStart;
}

/**
 * The part of Workflows Management a task uses: looking up workflows by id for a request and bulk
 * scheduling them. Everything else (the management API, UI, CRUD) is not available.
 */
export interface WorkflowsManagementTasksSetup {
  management: {
    getWorkflowsByIdsForRequests: (lookups: never) => Promise<unknown>;
    getClient: (request: KibanaRequest) => {
      bulkScheduleWorkflow: (items: BulkScheduleItem[]) => Promise<unknown[]>;
    };
  };
}

class WorkflowsManagementTasksPlugin
  implements TasksPlugin<WorkflowsManagementTasksSetup, void, {}, TasksStartDeps>
{
  private started?: {
    core: CoreTasksStart;
    engine: WorkflowsExecutionEngineTasksStart;
    licensing: LicensingTasksStart;
  };

  constructor(private readonly context: PluginInitializerContext<WorkflowsManagementTasksConfig>) {}

  setup(): WorkflowsManagementTasksSetup {
    const getStarted = () => {
      if (!this.started) throw new Error('Workflows management is not started');
      return this.started;
    };
    const logger = this.context.logger.get();
    return {
      management: {
        getWorkflowsByIdsForRequests: (lookups) => {
          const { core } = getStarted();
          const esClient = core.elasticsearch.client.asInternalUser;
          const workflowStorage = createStorage({ logger, esClient });
          const accessControl = new WorkflowAccessControlService(
            core as never,
            {} as never,
            undefined
          );
          return getWorkflowsByIdsForRequests(
            {
              getWorkflowsByIds: (ids, spaceId) => getWorkflowsByIds(workflowStorage, ids, spaceId),
              getAccessControl: async () => accessControl,
            },
            lookups
          );
        },
        getClient: (request) => ({
          bulkScheduleWorkflow: (items) => {
            const { engine } = getStarted();
            // Same mapping as the management API's `bulkScheduleWorkflow` (workflows that delegate
            // their identity to a parent can't be run standalone).
            const results: unknown[] = new Array(items.length);
            const forwarded: number[] = [];
            const engineItems = items.flatMap((item, index) => {
              if (
                (item.workflow as { requiresDelegatedIdentity?: boolean }).requiresDelegatedIdentity
              ) {
                results[index] = {
                  status: 'error',
                  error: {
                    message: `Workflow '${item.workflow.id}' delegates its execution identity to a parent workflow and cannot be run standalone.`,
                  },
                };
                return [];
              }
              forwarded.push(index);
              const { event, ...manualInputs } = item.inputs;
              return [
                {
                  workflow: item.workflow,
                  context: {
                    event,
                    spaceId: item.spaceId,
                    inputs: manualInputs,
                    triggeredBy: item.triggeredBy,
                    ...(item.metadata ? { metadata: item.metadata } : {}),
                  },
                },
              ];
            });
            return engine
              .bulkScheduleWorkflow(engineItems as never, request)
              .then((engineResults) => {
                forwarded.forEach((itemIndex, resultIndex) => {
                  results[itemIndex] = (engineResults as unknown[])[resultIndex];
                });
                return results;
              });
          },
        }),
      },
    };
  }

  start(core: CoreTasksStart, { licensing, workflowsExecutionEngine }: TasksStartDeps) {
    this.started = { core, engine: workflowsExecutionEngine, licensing };
  }
}

export const plugin = async (context: PluginInitializerContext<never>) =>
  new WorkflowsManagementTasksPlugin(context);
