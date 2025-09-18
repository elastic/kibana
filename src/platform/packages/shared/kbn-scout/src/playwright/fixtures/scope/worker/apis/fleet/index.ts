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
import type {
  AgentPolicyCreateBody,
  BulkGetBody,
  FleetOutputBody,
  FleetServerHostCreateBody,
  AgentPolicyUpdateBody,
} from './data_helper';

export interface FleetApiService {
  integration: {
    install: (name: string) => Promise<void>;
    delete: (name: string) => Promise<void>;
  };
  agent_policies: {
    get: (params: Record<string, any>) => Promise<any>;
    create: (
      policyName: string,
      policyNamespace: string,
      sysMonitoring?: boolean,
      params?: AgentPolicyCreateBody
    ) => Promise<any>;
    update: (
      policyName: string,
      policyNamespace: string,
      agentPolicyId: string,
      params?: AgentPolicyUpdateBody,
      queryParams?: Record<string, string>
    ) => Promise<any>;
    bulkGet: (
      bulkGetIds: string[],
      params: BulkGetBody,
      queryParams?: Record<string, string>
    ) => Promise<any>;
    delete: (id: string) => Promise<void>;
  };
  outputs: {
    getOutputs: () => Promise<any>;
    getOutput: (id: string) => Promise<any>;
    create: (
      outputName: string,
      outputHosts: string[],
      outputType: string,
      params?: FleetOutputBody
    ) => Promise<any>;
    delete: (outputId: string) => Promise<void>;
  };
  server_hosts: {
    get: () => Promise<any>;
    create: (
      hostName: string,
      hostUrls: string[],
      params?: FleetServerHostCreateBody
    ) => Promise<any>;
    delete: (id: string) => Promise<void>;
  };
  agent: {
    setup: () => Promise<any>;
  };
}

export const getFleetApiHelper = (log: ScoutLogger, kbnClient: KbnClient): FleetApiService => {
  return {
    integration: {
      install: async (name: string) => {
        await measurePerformanceAsync(log, `fleetApi.integration.install [${name}]`, async () => {
          await kbnClient.request({
            method: 'POST',
            path: `/api/fleet/epm/custom_integrations`,
            body: {
              force: true,
              integrationName: name,
              datasets: [
                { name: `${name}.access`, type: 'logs' },
                { name: `${name}.error`, type: 'metrics' },
                { name: `${name}.warning`, type: 'logs' },
              ],
            },
          });
        });
      },

      delete: async (name: string) => {
        await measurePerformanceAsync(log, `fleetApi.integration.delete [${name}]`, async () => {
          await kbnClient
            .request({
              method: 'DELETE',
              path: `/api/fleet/epm/packages/${name}`,
              ignoreErrors: [400],
            })
            .then((response) => {
              return response.status;
            });
        });
      },
    },
    agent_policies: {
      get: async (params: Record<string, any>) => {
        return await measurePerformanceAsync(log, `fleetApi.agent_policies.get`, async () => {
          return await kbnClient.request({
            method: 'GET',
            path: `/api/fleet/agent_policies`,
            query: params,
          });
        });
      },
      create: async (
        policyName: string,
        policyNamespace: string,
        sysMonitoring?: boolean,
        params?: AgentPolicyCreateBody
      ) => {
        await measurePerformanceAsync(
          log,
          `fleetApi.agent_policies.create [${policyName}]`,
          async () => {
            await kbnClient
              .request({
                method: 'POST',
                path: `/api/fleet/agent_policies`,
                headers: {
                  'Content-Type': 'application/json',
                },
                query: {
                  ...(typeof sysMonitoring !== 'undefined'
                    ? { sys_monitoring: sysMonitoring }
                    : {}),
                },
                body: {
                  name: policyName,
                  namespace: policyNamespace,
                  ...params,
                },
              })
              .then((response) => {
                return { data: response.data, status: response.status };
              });
          }
        );
      },

      update: async (
        policyName: string,
        policyNamespace: string,
        agentPolicyId: string,
        params?: AgentPolicyUpdateBody,
        queryParams?: Record<string, string>
      ) => {
        return await measurePerformanceAsync(
          log,
          `fleetApi.agent_policies.update [${agentPolicyId}]`,
          async () => {
            return await kbnClient.request({
              method: 'PUT',
              path: `/api/fleet/agent_policies/${agentPolicyId}`,
              headers: {
                'Content-Type': 'application/json',
              },
              query: queryParams,
              body: {
                name: policyName,
                namespace: policyNamespace,
                ...params,
              },
            });
          }
        );
      },

      bulkGet: async (
        bulkGetIds: string[],
        params: BulkGetBody,
        queryParams?: Record<string, string>
      ) => {
        return await measurePerformanceAsync(
          log,
          `fleetApi.agent_policies.bulkGet [${bulkGetIds.length} policies]`,
          async () => {
            return await kbnClient.request({
              method: 'POST',
              path: `/api/fleet/agent_policies/_bulk_get`,
              headers: {
                'Content-Type': 'application/json',
              },
              query: queryParams,
              body: {
                ids: bulkGetIds,
                ...params,
              },
            });
          }
        );
      },

      delete: async (id: string, isForceSet?: boolean) => {
        await measurePerformanceAsync(log, `fleetApi.agent_policies.delete [${id}]`, async () => {
          await kbnClient.request({
            method: 'POST',
            path: `/api/fleet/agent_policies/delete`,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              agentPolicyId: id,
              ...(typeof isForceSet !== 'undefined' ? { force: isForceSet } : {}),
            },
            ignoreErrors: [400],
          });
        });
      },
    },
    outputs: {
      getOutputs: async () => {
        return await measurePerformanceAsync(log, `fleetApi.outputs.get`, async () => {
          return await kbnClient.request({
            method: 'GET',
            path: `/api/fleet/outputs`,
          });
        });
      },
      getOutput: async (outputId: string) => {
        return await measurePerformanceAsync(
          log,
          `fleetApi.outputs.getOutput [${outputId}]`,
          async () => {
            return await kbnClient.request({
              method: 'GET',
              path: `/api/fleet/outputs/${outputId}`,
            });
          }
        );
      },
      create: async (
        outputName: string,
        outputHosts: string[],
        outputType: string,
        params?: FleetOutputBody
      ) => {
        return await measurePerformanceAsync(
          log,
          `fleetApi.outputs.create [${outputName}]`,
          async () => {
            return await kbnClient.request({
              method: 'POST',
              path: `/api/fleet/outputs`,
              headers: {
                'Content-Type': 'application/json',
              },
              body: { name: outputName, hosts: outputHosts, type: outputType, ...params },
            });
          }
        );
      },
      delete: async (outputId: string) => {
        await measurePerformanceAsync(log, `fleetApi.outputs.delete [${outputId}]`, async () => {
          await kbnClient.request({
            method: 'DELETE',
            path: `/api/fleet/outputs/${outputId}`,
            ignoreErrors: [400, 404],
          });
        });
      },
    },
    server_hosts: {
      get: async () => {
        await measurePerformanceAsync(log, `fleetApi.server_hosts.get`, async () => {
          await kbnClient.request({
            method: 'GET',
            path: `/api/fleet/fleet_server_hosts`,
          });
        });
      },
      create: async (hostName: string, hostUrls: string[], params?: FleetServerHostCreateBody) => {
        return await measurePerformanceAsync(
          log,
          `fleetApi.server_hosts.create [${hostName}]`,
          async () => {
            return await kbnClient.request({
              method: 'POST',
              path: `/api/fleet/fleet_server_hosts`,
              headers: {
                'Content-Type': 'application/json',
              },
              body: {
                name: hostName,
                host_urls: hostUrls,
                ...params,
              },
            });
          }
        );
      },

      delete: async (fleetServerHostId: string) => {
        await measurePerformanceAsync(
          log,
          `fleetApi.server_hosts.delete [${fleetServerHostId}]`,
          async () => {
            await kbnClient.request({
              method: 'DELETE',
              path: `/api/fleet/fleet_server_hosts/${fleetServerHostId}`,
              ignoreErrors: [400, 404],
            });
          }
        );
      },
    },
    agent: {
      setup: async () => {
        return await measurePerformanceAsync(log, `fleetApi.agent.setup`, async () => {
          return await kbnClient.request({
            method: 'POST',
            path: `/api/fleet/agents/setup`,
            headers: {
              'Content-Type': 'application/json',
            },
          });
        });
      },
    },
  };
};
