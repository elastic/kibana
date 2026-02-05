/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KbnClient, ScoutLogger } from '../../../../../../common';
import { measurePerformanceAsync } from '../../../../../../common';

export interface CreateRuleParams {
  name: string;
  ruleTypeId: string;
  params: Record<string, any>;
  consumer: string;
  actions?: Array<{
    id: string;
    group: string;
    params: Record<string, any>;
    frequency?: {
      summary: boolean;
      notifyWhen: string;
      throttle?: string;
    };
  }>;
  tags?: string[];
  schedule?: { interval: string };
  enabled?: boolean;
  notifyWhen?: string;
  throttle?: string;
}

export interface CreateConnectorParams {
  name: string;
  connectorTypeId: string;
  config?: Record<string, any>;
  secrets?: Record<string, any>;
}

export interface UpdateRuleParams {
  name?: string;
  params?: Record<string, any>;
  actions?: Array<{
    id: string;
    group: string;
    params: Record<string, any>;
    frequency?: {
      summary: boolean;
      notifyWhen: string;
      throttle?: string;
    };
  }>;
  tags?: string[];
  schedule?: { interval: string };
  throttle?: string;
  notifyWhen?: string;
}

export interface RequestOptions {
  ignoreErrors?: number[];
}

export interface AlertingApiService {
  rules: {
    create: (params: CreateRuleParams, spaceId?: string) => Promise<any>;
    get: (ruleId: string, spaceId?: string, options?: RequestOptions) => Promise<any>;
    update: (ruleId: string, updates: UpdateRuleParams, spaceId?: string) => Promise<any>;
    delete: (ruleId: string, spaceId?: string) => Promise<void>;
    find: (searchParams?: Record<string, any>, spaceId?: string) => Promise<any>;
    enable: (ruleId: string, spaceId?: string) => Promise<void>;
    disable: (ruleId: string, spaceId?: string) => Promise<void>;
    muteAll: (ruleId: string, spaceId?: string) => Promise<void>;
    unmuteAll: (ruleId: string, spaceId?: string) => Promise<void>;
    muteAlert: (ruleId: string, alertId: string, spaceId?: string) => Promise<void>;
    unmuteAlert: (ruleId: string, alertId: string, spaceId?: string) => Promise<void>;
    snooze: (ruleId: string, duration: number, spaceId?: string) => Promise<any>;
    unsnooze: (ruleId: string, scheduleIds?: string[], spaceId?: string) => Promise<any>;
    runSoon: (ruleId: string, spaceId?: string) => Promise<void>;
    getRuleTypes: (spaceId?: string) => Promise<any>;
    getExecutionLog: (ruleId: string, spaceId?: string) => Promise<any>;
    getHealth: () => Promise<any>;
  };
  connectors: {
    create: (params: CreateConnectorParams, spaceId?: string) => Promise<any>;
    get: (connectorId: string, spaceId?: string) => Promise<any>;
    update: (
      connectorId: string,
      updates: Partial<CreateConnectorParams>,
      spaceId?: string
    ) => Promise<any>;
    delete: (connectorId: string, spaceId?: string) => Promise<void>;
    getAll: (spaceId?: string) => Promise<any>;
    getTypes: (spaceId?: string) => Promise<any>;
    execute: (connectorId: string, params: Record<string, any>, spaceId?: string) => Promise<any>;
  };
  waiting: {
    waitForRuleStatus: (
      ruleId: string,
      expectedStatus: string,
      spaceId?: string,
      timeoutMs?: number
    ) => Promise<string>;
    waitForAlertInIndex: (indexName: string, ruleId: string, timeoutMs?: number) => Promise<any>;
    waitForExecutionCount: (
      ruleId: string,
      count: number,
      spaceId?: string,
      timeoutMs?: number,
      dateStart?: Date
    ) => Promise<void>;
    waitForNextExecution: (
      ruleId: string,
      spaceId?: string,
      timeoutMs?: number,
      dateStart?: Date
    ) => Promise<void>;
  };
  cleanup: {
    deleteAllRules: (spaceId?: string) => Promise<void>;
    deleteAllConnectors: (spaceId?: string) => Promise<void>;
    deleteRulesByTags: (tags: string[], spaceId?: string) => Promise<void>;
  };
}

export const getAlertingApiHelper = (
  log: ScoutLogger,
  kbnClient: KbnClient
): AlertingApiService => {
  const buildSpacePath = (spaceId?: string, path: string = '') => {
    return spaceId && spaceId !== 'default' ? `/s/${spaceId}${path}` : path;
  };

  const waitForCondition = async <T>(
    checkFn: () => Promise<T>,
    conditionFn: (result: T) => boolean,
    timeoutMs: number = 30000,
    intervalMs: number = 1000,
    conditionName: string = 'condition'
  ): Promise<T> => {
    const startTime = Date.now();
    let lastResult: T;

    while (Date.now() - startTime < timeoutMs) {
      try {
        lastResult = await checkFn();
        if (conditionFn(lastResult)) {
          return lastResult;
        }
      } catch (error) {
        log.debug(`Condition check failed: ${error}`);
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error(
      `Timeout waiting for ${conditionName} after ${timeoutMs}ms. Last result: ${JSON.stringify(
        lastResult!
      )}`
    );
  };

  return {
    rules: {
      create: async (params: CreateRuleParams, spaceId?: string) => {
        return await measurePerformanceAsync(
          log,
          `alertingApi.rules.create [${params.name}]`,
          async () => {
            return await kbnClient.request({
              method: 'POST',
              path: `${buildSpacePath(spaceId)}/api/alerting/rule`,
              retries: 3,
              body: {
                name: params.name,
                rule_type_id: params.ruleTypeId,
                params: params.params,
                consumer: params.consumer,
                actions: params.actions || [],
                tags: params.tags || [],
                schedule: params.schedule || { interval: '1m' },
                enabled: params.enabled ?? true,
                ...(params.notifyWhen && { notify_when: params.notifyWhen }),
                ...(params.throttle && { throttle: params.throttle }),
              },
            });
          }
        );
      },

      get: async (ruleId: string, spaceId?: string, options?: RequestOptions) => {
        return await measurePerformanceAsync(log, `alertingApi.rules.get [${ruleId}]`, async () => {
          return await kbnClient.request({
            method: 'GET',
            path: `${buildSpacePath(spaceId)}/api/alerting/rule/${ruleId}`,
            retries: 3,
            ignoreErrors: options?.ignoreErrors,
          });
        });
      },

      update: async (ruleId: string, updates: UpdateRuleParams, spaceId?: string) => {
        return await measurePerformanceAsync(
          log,
          `alertingApi.rules.update [${ruleId}]`,
          async () => {
            // First get the current rule to merge with updates
            const currentRule = await kbnClient.request({
              method: 'GET',
              path: `${buildSpacePath(spaceId)}/api/alerting/rule/${ruleId}`,
              retries: 3,
            });

            const currentRuleData = currentRule.data as any;

            const response = await kbnClient.request({
              method: 'PUT',
              path: `${buildSpacePath(spaceId)}/api/alerting/rule/${ruleId}`,
              retries: 3,
              body: {
                name: updates.name || currentRuleData.name,
                params: updates.params || currentRuleData.params,
                actions:
                  updates.actions ||
                  currentRuleData.actions.map((action: any) => ({
                    group: action.group,
                    params: action.params,
                    id: action.id,
                    frequency: action.frequency,
                  })),
                tags: updates.tags || currentRuleData.tags,
                schedule: updates.schedule || currentRuleData.schedule,
                throttle: updates.throttle || currentRuleData.throttle,
                notify_when: updates.notifyWhen || currentRuleData.notify_when,
              },
            });
            return response;
          }
        );
      },

      delete: async (ruleId: string, spaceId?: string) => {
        return await measurePerformanceAsync(
          log,
          `alertingApi.rules.delete [${ruleId}]`,
          async () => {
            await kbnClient.request({
              method: 'DELETE',
              path: `${buildSpacePath(spaceId)}/api/alerting/rule/${ruleId}`,
              retries: 0,
              ignoreErrors: [204, 404],
            });
          }
        );
      },

      find: async (searchParams?: Record<string, any>, spaceId?: string) => {
        return await measurePerformanceAsync(log, 'alertingApi.rules.find', async () => {
          return await kbnClient.request({
            method: 'GET',
            path: `${buildSpacePath(spaceId)}/api/alerting/rules/_find`,
            retries: 3,
            query: searchParams,
          });
        });
      },

      enable: async (ruleId: string, spaceId?: string) => {
        return await measurePerformanceAsync(
          log,
          `alertingApi.rules.enable [${ruleId}]`,
          async () => {
            await kbnClient.request({
              method: 'POST',
              path: `${buildSpacePath(spaceId)}/api/alerting/rule/${ruleId}/_enable`,
              retries: 3,
            });
          }
        );
      },

      disable: async (ruleId: string, spaceId?: string) => {
        return await measurePerformanceAsync(
          log,
          `alertingApi.rules.disable [${ruleId}]`,
          async () => {
            await kbnClient.request({
              method: 'POST',
              path: `${buildSpacePath(spaceId)}/api/alerting/rule/${ruleId}/_disable`,
              retries: 3,
            });
          }
        );
      },

      muteAll: async (ruleId: string, spaceId?: string) => {
        return await measurePerformanceAsync(
          log,
          `alertingApi.rules.muteAll [${ruleId}]`,
          async () => {
            await kbnClient.request({
              method: 'POST',
              path: `${buildSpacePath(spaceId)}/api/alerting/rule/${ruleId}/_mute_all`,
              retries: 3,
            });
          }
        );
      },

      unmuteAll: async (ruleId: string, spaceId?: string) => {
        return await measurePerformanceAsync(
          log,
          `alertingApi.rules.unmuteAll [${ruleId}]`,
          async () => {
            await kbnClient.request({
              method: 'POST',
              path: `${buildSpacePath(spaceId)}/api/alerting/rule/${ruleId}/_unmute_all`,
              retries: 3,
            });
          }
        );
      },

      muteAlert: async (ruleId: string, alertId: string, spaceId?: string) => {
        return await measurePerformanceAsync(
          log,
          `alertingApi.rules.muteAlert [${ruleId}/${alertId}]`,
          async () => {
            await kbnClient.request({
              method: 'POST',
              path: `${buildSpacePath(
                spaceId
              )}/api/alerting/rule/${ruleId}/alert/${alertId}/_mute?validate_alerts_existence=false`,
              retries: 3,
            });
          }
        );
      },

      unmuteAlert: async (ruleId: string, alertId: string, spaceId?: string) => {
        return await measurePerformanceAsync(
          log,
          `alertingApi.rules.unmuteAlert [${ruleId}/${alertId}]`,
          async () => {
            await kbnClient.request({
              method: 'POST',
              path: `${buildSpacePath(
                spaceId
              )}/api/alerting/rule/${ruleId}/alert/${alertId}/_unmute`,
              retries: 3,
            });
          }
        );
      },

      snooze: async (ruleId: string, duration: number, spaceId?: string) => {
        return await measurePerformanceAsync(
          log,
          `alertingApi.rules.snooze [${ruleId}]`,
          async () => {
            return await kbnClient.request({
              method: 'POST',
              path: `${buildSpacePath(spaceId)}/internal/alerting/rule/${ruleId}/_snooze`,
              retries: 3,
              body: {
                snooze_schedule: {
                  duration,
                  rRule: {
                    count: 1,
                    dtstart: new Date().toISOString(),
                    tzid: 'UTC',
                  },
                },
              },
            });
          }
        );
      },

      unsnooze: async (ruleId: string, scheduleIds?: string[], spaceId?: string) => {
        return await measurePerformanceAsync(
          log,
          `alertingApi.rules.unsnooze [${ruleId}]`,
          async () => {
            return await kbnClient.request({
              method: 'POST',
              path: `${buildSpacePath(spaceId)}/internal/alerting/rule/${ruleId}/_unsnooze`,
              retries: 3,
              body: scheduleIds ? { schedule_ids: scheduleIds } : {},
            });
          }
        );
      },

      runSoon: async (ruleId: string, spaceId?: string) => {
        return await measurePerformanceAsync(
          log,
          `alertingApi.rules.runSoon [${ruleId}]`,
          async () => {
            await kbnClient.request({
              method: 'POST',
              path: `${buildSpacePath(spaceId)}/internal/alerting/rule/${ruleId}/_run_soon`,
              retries: 3,
            });
          }
        );
      },

      getRuleTypes: async (spaceId?: string) => {
        return await measurePerformanceAsync(log, 'alertingApi.rules.getRuleTypes', async () => {
          const response = await kbnClient.request({
            method: 'GET',
            path: `${buildSpacePath(spaceId)}/api/alerting/rule_types`,
            retries: 3,
          });
          return response.data;
        });
      },

      getExecutionLog: async (ruleId: string, spaceId?: string, dateStart = new Date()) => {
        return await measurePerformanceAsync(
          log,
          `alertingApi.rules.getExecutionLog [${ruleId}]`,
          async () => {
            const response = await kbnClient.request({
              method: 'GET',
              path: `${buildSpacePath(spaceId)}/internal/alerting/rule/${ruleId}/_execution_log`,
              retries: 3,
              query: { date_start: dateStart.toISOString() },
            });
            return response.data;
          }
        );
      },

      getHealth: async () => {
        return await measurePerformanceAsync(log, 'alertingApi.rules.getHealth', async () => {
          const response = await kbnClient.request({
            method: 'GET',
            path: '/api/alerting/_health',
            retries: 3,
          });
          return response.data;
        });
      },
    },

    connectors: {
      create: async (params: CreateConnectorParams, spaceId?: string) => {
        return await measurePerformanceAsync(
          log,
          `alertingApi.connectors.create [${params.name}]`,
          async () => {
            const response = await kbnClient.request({
              method: 'POST',
              path: `${buildSpacePath(spaceId)}/api/actions/connector`,
              retries: 3,
              body: {
                name: params.name,
                connector_type_id: params.connectorTypeId,
                config: params.config || {},
                secrets: params.secrets || {},
              },
            });
            return response.data;
          }
        );
      },

      get: async (connectorId: string, spaceId?: string) => {
        return await measurePerformanceAsync(
          log,
          `alertingApi.connectors.get [${connectorId}]`,
          async () => {
            const response = await kbnClient.request({
              method: 'GET',
              path: `${buildSpacePath(spaceId)}/api/actions/connector/${connectorId}`,
              retries: 3,
            });
            return response.data;
          }
        );
      },

      update: async (
        connectorId: string,
        updates: Partial<CreateConnectorParams>,
        spaceId?: string
      ) => {
        return await measurePerformanceAsync(
          log,
          `alertingApi.connectors.update [${connectorId}]`,
          async () => {
            const response = await kbnClient.request({
              method: 'PUT',
              path: `${buildSpacePath(spaceId)}/api/actions/connector/${connectorId}`,
              retries: 3,
              body: {
                name: updates.name,
                config: updates.config || {},
                secrets: updates.secrets || {},
              },
            });
            return response.data;
          }
        );
      },

      delete: async (connectorId: string, spaceId?: string) => {
        return await measurePerformanceAsync(
          log,
          `alertingApi.connectors.delete [${connectorId}]`,
          async () => {
            await kbnClient.request({
              method: 'DELETE',
              path: `${buildSpacePath(spaceId)}/api/actions/connector/${connectorId}`,
              retries: 3,
              ignoreErrors: [404],
            });
          }
        );
      },

      getAll: async (spaceId?: string) => {
        return await measurePerformanceAsync(log, 'alertingApi.connectors.getAll', async () => {
          const response = await kbnClient.request({
            method: 'GET',
            path: `${buildSpacePath(spaceId)}/api/actions/connectors`,
            retries: 3,
          });
          return response.data;
        });
      },

      getTypes: async (spaceId?: string) => {
        return await measurePerformanceAsync(log, 'alertingApi.connectors.getTypes', async () => {
          const response = await kbnClient.request({
            method: 'GET',
            path: `${buildSpacePath(spaceId)}/api/actions/connector_types`,
            retries: 3,
          });
          return response.data;
        });
      },

      execute: async (connectorId: string, params: Record<string, any>, spaceId?: string) => {
        return await measurePerformanceAsync(
          log,
          `alertingApi.connectors.execute [${connectorId}]`,
          async () => {
            const response = await kbnClient.request({
              method: 'POST',
              path: `${buildSpacePath(spaceId)}/api/actions/connector/${connectorId}/_execute`,
              retries: 3,
              body: { params },
            });
            return response.data;
          }
        );
      },
    },

    waiting: {
      waitForRuleStatus: async (
        ruleId: string,
        expectedStatus: string,
        spaceId?: string,
        timeoutMs: number = 30000
      ) => {
        return await measurePerformanceAsync(
          log,
          `alertingApi.waiting.waitForRuleStatus [${ruleId}/${expectedStatus}]`,
          async () => {
            return await waitForCondition(
              async () => {
                const rule = await kbnClient.request({
                  method: 'GET',
                  path: `${buildSpacePath(spaceId)}/api/alerting/rule/${ruleId}`,
                  retries: 1, // Lower retries for frequent polling operations
                });
                const ruleData = rule.data as any;
                return ruleData.execution_status?.status;
              },
              (status) => status === expectedStatus,
              timeoutMs,
              1000,
              `rule ${ruleId} to have status ${expectedStatus}`
            );
          }
        );
      },

      waitForAlertInIndex: async (indexName: string, ruleId: string, timeoutMs: number = 30000) => {
        return await measurePerformanceAsync(
          log,
          `alertingApi.waiting.waitForAlertInIndex [${indexName}/${ruleId}]`,
          async () => {
            return await waitForCondition(
              async () => {
                const response = await kbnClient.request({
                  method: 'POST',
                  path: '/_search',
                  retries: 1, // Lower retries for frequent polling operations
                  body: {
                    index: indexName,
                    query: {
                      term: {
                        'kibana.alert.rule.uuid': ruleId,
                      },
                    },
                  },
                });
                return response.data;
              },
              (result) => {
                const resultData = result as any;
                return resultData.hits?.hits?.length > 0;
              },
              timeoutMs,
              1000,
              `alert for rule ${ruleId} to appear in index ${indexName}`
            );
          }
        );
      },

      waitForExecutionCount: async (
        ruleId: string,
        count: number,
        spaceId?: string,
        timeoutMs: number = 30000,
        dateStart: Date = new Date()
      ) => {
        return await measurePerformanceAsync(
          log,
          `alertingApi.waiting.waitForExecutionCount [${ruleId}/${count}]`,
          async () => {
            await waitForCondition(
              async () => {
                const executionLog = await kbnClient.request({
                  method: 'GET',
                  path: `${buildSpacePath(
                    spaceId
                  )}/internal/alerting/rule/${ruleId}/_execution_log`,
                  retries: 1, // Lower retries for frequent polling operations,
                  query: { date_start: dateStart.toISOString() },
                });
                const logData = executionLog.data as any;
                return logData.total;
              },
              (total) => total >= count,
              timeoutMs,
              1000,
              `rule ${ruleId} to have at least ${count} executions`
            );
          }
        );
      },

      waitForNextExecution: async (
        ruleId: string,
        spaceId?: string,
        timeoutMs: number = 30000,
        dateStart: Date = new Date()
      ) => {
        return await measurePerformanceAsync(
          log,
          `alertingApi.waiting.waitForNextExecution [${ruleId}]`,
          async () => {
            // Get current execution count
            const initialLog = await kbnClient.request({
              method: 'GET',
              path: `${buildSpacePath(spaceId)}/internal/alerting/rule/${ruleId}/_execution_log`,
              retries: 3,
              query: { date_start: dateStart.toISOString() },
            });
            const initialLogData = initialLog.data as any;
            const initialCount = initialLogData.total;

            await waitForCondition(
              async () => {
                const executionLog = await kbnClient.request({
                  method: 'GET',
                  path: `${buildSpacePath(
                    spaceId
                  )}/internal/alerting/rule/${ruleId}/_execution_log`,
                  retries: 1, // Lower retries for frequent polling operations,
                  query: { date_start: dateStart.toISOString() },
                });
                const logData = executionLog.data as any;
                return logData.total;
              },
              (total) => total > initialCount,
              timeoutMs,
              1000,
              `rule ${ruleId} to execute at least once more`
            );
          }
        );
      },
    },

    cleanup: {
      deleteAllRules: async (spaceId?: string) => {
        return await measurePerformanceAsync(
          log,
          'alertingApi.cleanup.deleteAllRules',
          async () => {
            const rules = await kbnClient.request({
              method: 'GET',
              path: `${buildSpacePath(spaceId)}/api/alerting/rules/_find`,
              retries: 3,
              query: { per_page: 10000 },
            });

            const rulesData = rules.data as any;
            await Promise.all(
              rulesData.data.map(async (rule: any) => {
                await kbnClient.request({
                  method: 'DELETE',
                  path: `${buildSpacePath(spaceId)}/api/alerting/rule/${rule.id}`,
                  retries: 3,
                  ignoreErrors: [404],
                });
              })
            );
          }
        );
      },

      deleteAllConnectors: async (spaceId?: string) => {
        return await measurePerformanceAsync(
          log,
          'alertingApi.cleanup.deleteAllConnectors',
          async () => {
            const connectors = await kbnClient.request({
              method: 'GET',
              path: `${buildSpacePath(spaceId)}/api/actions/connectors`,
              retries: 3,
            });

            const connectorsData = connectors.data as any;
            await Promise.all(
              connectorsData.map(async (connector: any) => {
                await kbnClient.request({
                  method: 'DELETE',
                  path: `${buildSpacePath(spaceId)}/api/actions/connector/${connector.id}`,
                  retries: 3,
                  ignoreErrors: [404],
                });
              })
            );
          }
        );
      },

      deleteRulesByTags: async (tags: string[], spaceId?: string) => {
        return await measurePerformanceAsync(
          log,
          `alertingApi.cleanup.deleteRulesByTags [${tags.join(',')}]`,
          async () => {
            const filter = tags.map((tag) => `alert.attributes.tags:"${tag}"`).join(' OR ');
            const rules = await kbnClient.request({
              method: 'GET',
              path: `${buildSpacePath(spaceId)}/api/alerting/rules/_find`,
              retries: 3,
              query: { filter, per_page: 10000 },
            });

            const rulesData = rules.data as any;
            await Promise.all(
              rulesData.data.map(async (rule: any) => {
                await kbnClient.request({
                  method: 'DELETE',
                  path: `${buildSpacePath(spaceId)}/api/alerting/rule/${rule.id}`,
                  retries: 3,
                  ignoreErrors: [404],
                });
              })
            );
          }
        );
      },
    },
  };
};
