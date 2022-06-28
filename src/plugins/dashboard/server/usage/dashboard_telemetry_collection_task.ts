/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, Logger, SavedObjectAttributes, SavedObjectReference } from '@kbn/core/server';
import moment from 'moment';
import {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { SavedDashboardPanel730ToLatest } from '../../common';
import {
  injectReferences,
  SavedObjectAttributesAndReferences,
} from '../../common/saved_dashboard_references';
import {
  controlsCollectorFactory,
  collectPanelsByType,
  getEmptyDashboardData,
  DashboardCollectorData,
} from './dashboard_telemetry';

// This task is responsible for running daily and aggregating all the Dashboard telemerty data
// into a single document. This is an effort to make sure the load of fetching/parsing all of the
// dashboards will only occur once per day
const TELEMETRY_TASK_TYPE = 'dashboard_telemetry';
export const TASK_ID = `Dashboard-${TELEMETRY_TASK_TYPE}`;

export interface DashboardTelemetryTaskState {
  runs: number;
  telemetry: DashboardCollectorData;
}

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
      createTaskRunner: dashboardTaskRunner(logger, core, embeddable),
    },
  });
}

async function scheduleTasks(logger: Logger, taskManager: TaskManagerStartContract) {
  try {
    return await taskManager.ensureScheduled({
      id: TASK_ID,
      taskType: TELEMETRY_TASK_TYPE,
      state: { byDate: {}, suggestionsByDate: {}, saved: {}, runs: 0 },
      params: {},
    });
  } catch (e) {
    logger.debug(`Error scheduling task, received ${e.message}`);
  }
}

export function dashboardTaskRunner(logger: Logger, core: CoreSetup, embeddable: EmbeddableSetup) {
  return ({ taskInstance }: RunContext) => {
    const { state } = taskInstance;

    const getEsClient = async () => {
      const [coreStart] = await core.getStartServices();
      return coreStart.elasticsearch.client.asInternalUser;
    };

    return {
      async run() {
        let dashboardData = getEmptyDashboardData();
        const controlsCollector = controlsCollectorFactory(embeddable);
        const processDashboards = (dashboards: SavedObjectAttributesAndReferences[]) => {
          for (const dashboard of dashboards) {
            const attributes = injectReferences(dashboard, {
              embeddablePersistableStateService: embeddable,
            });

            dashboardData = controlsCollector(attributes, dashboardData);

            try {
              const panels = JSON.parse(
                attributes.panelsJSON as string
              ) as unknown as SavedDashboardPanel730ToLatest[];

              collectPanelsByType(panels, dashboardData, embeddable);
            } catch (e) {
              logger.warn('Unable to parse panelsJSON for telemetry collection');
            }
          }

          return dashboardData;
        };

        const kibanaIndex = core.savedObjects.getKibanaIndex();
        const pageSize = 50;

        const searchParams = {
          size: pageSize,
          index: kibanaIndex,
          ignore_unavailable: true,
          filter_path: ['hits.hits', '_scroll_id'],
          body: { query: { bool: { filter: { term: { type: 'dashboard' } } } } },
          scroll: '30s',
        };

        // Get and process all of the dashboards
        try {
          const esClient = await getEsClient();

          let result = await esClient.search<{
            dashboard: SavedObjectAttributes;
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
              .filter<SavedObjectAttributesAndReferences>(
                (s): s is SavedObjectAttributesAndReferences => s !== undefined
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
                .filter<SavedObjectAttributesAndReferences>(
                  (s): s is SavedObjectAttributesAndReferences => s !== undefined
                )
            );
          }

          return {
            state: {
              runs: (state.runs || 0) + 1,
              telemetry: dashboardData,
            },
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
