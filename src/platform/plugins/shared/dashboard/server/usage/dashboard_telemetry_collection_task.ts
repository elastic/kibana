/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';

import {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { CoreSetup, Logger, SavedObjectReference } from '@kbn/core/server';
import { stateSchemaByVersion, emptyState, type LatestTaskStateSchema } from './task_state';

import {
  controlsCollectorFactory,
  collectPanelsByType,
  getEmptyDashboardData,
} from './dashboard_telemetry';
import type {
  DashboardSavedObjectAttributes,
  SavedDashboardPanel,
} from '../dashboard_saved_object';

interface DashboardSavedObjectAttributesAndReferences {
  attributes: DashboardSavedObjectAttributes;
  references: SavedObjectReference[];
}

// This task is responsible for running daily and aggregating all the Dashboard telemerty data
// into a single document. This is an effort to make sure the load of fetching/parsing all of the
// dashboards will only occur once per day
const TELEMETRY_TASK_TYPE = 'dashboard_telemetry';
export const TASK_ID = `Dashboard-${TELEMETRY_TASK_TYPE}`;

export function initializeDashboardTelemetryTask(
  logger: Logger,
  core: CoreSetup,
  taskManager: TaskManagerSetupContract,
  embeddable: EmbeddableSetup
) {
  registerDashboardTelemetryTask(logger, core, taskManager, embeddable);
}

export function scheduleDashboardTelemetry(logger: Logger, taskManager: TaskManagerStartContract) {
  return scheduleTasks(logger, taskManager);
}

function registerDashboardTelemetryTask(
  logger: Logger,
  core: CoreSetup,
  taskManager: TaskManagerSetupContract,
  embeddable: EmbeddableSetup
) {
  taskManager.registerTaskDefinitions({
    [TELEMETRY_TASK_TYPE]: {
      title: 'Dashboard telemetry collection task',
      timeout: '2m',
      stateSchemaByVersion,
      createTaskRunner: dashboardTaskRunner(logger, core, embeddable),
    },
  });
}

async function scheduleTasks(logger: Logger, taskManager: TaskManagerStartContract) {
  try {
    return await taskManager.ensureScheduled({
      id: TASK_ID,
      taskType: TELEMETRY_TASK_TYPE,
      state: emptyState,
      params: {},
    });
  } catch (e) {
    logger.debug(`Error scheduling task, received ${e.message}`);
  }
}

export function dashboardTaskRunner(logger: Logger, core: CoreSetup, embeddable: EmbeddableSetup) {
  return ({ taskInstance }: RunContext) => {
    const state = taskInstance.state as LatestTaskStateSchema;

    const getEsClient = async () => {
      const [coreStart] = await core.getStartServices();
      return coreStart.elasticsearch.client.asInternalUser;
    };

    return {
      async run() {
        let dashboardData = getEmptyDashboardData();
        const controlsCollector = controlsCollectorFactory(embeddable);
        const processDashboards = (dashboards: DashboardSavedObjectAttributesAndReferences[]) => {
          for (const dashboard of dashboards) {
            // TODO is this injecting references really necessary?
            // const attributes = injectReferences(dashboard, {
            //   embeddablePersistableStateService: embeddable,
            // });

            dashboardData = controlsCollector(dashboard.attributes, dashboardData);

            try {
              const panels = JSON.parse(
                dashboard.attributes.panelsJSON as string
              ) as unknown as SavedDashboardPanel[];

              collectPanelsByType(panels, dashboardData, embeddable);
            } catch (e) {
              logger.warn('Unable to parse panelsJSON for telemetry collection');
            }
          }

          return dashboardData;
        };

        const dashboardIndex = await core
          .getStartServices()
          .then(([coreStart]) => coreStart.savedObjects.getIndexForType('dashboard'));
        const pageSize = 50;

        const searchParams = {
          size: pageSize,
          index: dashboardIndex,
          ignore_unavailable: true,
          filter_path: ['hits.hits', '_scroll_id'],
          body: { query: { bool: { filter: { term: { type: 'dashboard' } } } } },
          scroll: '30s',
        };

        // Get and process all of the dashboards
        try {
          const esClient = await getEsClient();

          let result = await esClient.search<{
            dashboard: DashboardSavedObjectAttributes;
            references: SavedObjectReference[];
          }>(searchParams);

          dashboardData = processDashboards(
            result.hits.hits
              .map((h) => {
                if (h._source) {
                  return {
                    attributes: h._source.dashboard,
                    references: h._source.references,
                  };
                }
                return undefined;
              })
              .filter<DashboardSavedObjectAttributesAndReferences>(
                (s): s is DashboardSavedObjectAttributesAndReferences => s !== undefined
              )
          );

          while (result._scroll_id && result.hits.hits.length > 0) {
            result = await esClient.scroll({ scroll_id: result._scroll_id, scroll: '30s' });

            dashboardData = processDashboards(
              result.hits.hits
                .map((h) => {
                  if (h._source) {
                    return {
                      attributes: h._source.dashboard,
                      references: h._source.references,
                    };
                  }
                  return undefined;
                })
                .filter<DashboardSavedObjectAttributesAndReferences>(
                  (s): s is DashboardSavedObjectAttributesAndReferences => s !== undefined
                )
            );
          }

          const updatedState: LatestTaskStateSchema = {
            runs: state.runs + 1,
            telemetry: dashboardData,
          };
          return {
            state: updatedState,
            runAt: getNextMidnight(),
          };
        } catch (e) {
          return {
            state: {
              runs: state.runs + 1,
            },
            runAt: getNextFailureRetry(),
          };
        }
      },
      async cancel() {},
    };
  };
}

function getNextMidnight() {
  return moment().add(1, 'day').startOf('day').toDate();
}

function getNextFailureRetry() {
  return moment().add(1, 'hour').toDate();
}
