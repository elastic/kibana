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
  AgentPolicyCreateOptions,
  AgentPolicyUpdateOptions,
  BulkGetBody,
  FleetOutputBody,
  FleetServerHostCreateBody,
  PackagePolicyCreateBody,
} from './types';

export interface FleetApiService {
  internal: {
    setup: () => Promise<any>;
  };
  integration: {
    install: (name: string) => Promise<any>;
    delete: (name: string) => Promise<any>;
  };
  package_policies: {
    get: (queryParams?: Record<string, any>) => Promise<any>;
    getById: (id: string) => Promise<any>;
    create: (body: PackagePolicyCreateBody, queryParams?: Record<string, string>) => Promise<any>;
    delete: (id: string) => Promise<any>;
    bulkDelete: (ids: [string]) => Promise<any>;
  };
  agent_policies: {
    get: (queryParams?: Record<string, any>) => Promise<any>;
    create: (options: AgentPolicyCreateOptions) => Promise<any>;
    update: (options: AgentPolicyUpdateOptions) => Promise<any>;
    bulkGet: (
      bulkGetIds: string[],
      params?: BulkGetBody,
      queryParams?: Record<string, string>
    ) => Promise<any>;
    delete: (id: string, isForceSet?: boolean) => Promise<any>;
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
    delete: (outputId: string) => Promise<any>;
  };
  server_hosts: {
    get: () => Promise<any>;
    create: (
      hostName: string,
      hostUrls: string[],
      params?: FleetServerHostCreateBody
    ) => Promise<any>;
    delete: (id: string) => Promise<any>;
  };
  agent: {
    setup: () => Promise<any>;
    get: (queryParams: Record<string, any>) => Promise<any>;
    delete: (agentId: string) => Promise<any>;
  };
}

export const getFleetApiHelper = (log: ScoutLogger, kbnClient: KbnClient): FleetApiService => {
  return {
    internal: {
      setup: async () => {
        return await measurePerformanceAsync(log, `fleetApi.internal.setup`, async () => {
          return await kbnClient.request({
            method: 'POST',
            path: '/api/fleet/setup',
          });
        });
      },
    },
    integration: {
      install: async (name: string) => {
        return await measurePerformanceAsync(
          log,
          `fleetApi.integration.install [${name}]`,
          async () => {
            const response = await kbnClient.request({
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
            return { status: response.status };
          }
        );
      },

      delete: async (name: string) => {
        return await measurePerformanceAsync(
          log,
          `fleetApi.integration.delete [${name}]`,
          async () => {
            const response = await kbnClient.request({
              method: 'DELETE',
              path: `/api/fleet/epm/packages/${name}`,
              ignoreErrors: [400],
            });
            return { status: response.status };
          }
        );
      },
    },
    package_policies: {
      get: async (queryParams?: Record<string, any>) => {
        return await measurePerformanceAsync(log, `fleetApi.package_policies.get`, async () => {
          return await kbnClient.request({
            method: 'GET',
            path: '/api/fleet/package_policies',
            headers: {
              'Content-Type': 'application/json',
            },
            query: queryParams,
          });
        });
      },
      getById: async (id: string) => {
        return await measurePerformanceAsync(
          log,
          `fleetApi.package_policies.getById [${id}]`,
          async () => {
            return await kbnClient.request({
              method: 'GET',
              path: `/api/fleet/package_policies/${id}`,
            });
          }
        );
      },
      create: async (body: PackagePolicyCreateBody, queryParams?: Record<string, string>) => {
        return await measurePerformanceAsync(
          log,
          `fleetApi.package_policies.create [${body.name}]`,
          async () => {
            return await kbnClient.request({
              method: 'POST',
              path: `/api/fleet/package_policies`,
              headers: {
                'Content-Type': 'application/json',
              },
              query: queryParams,
              body,
            });
          }
        );
      },
      delete: async (id: string) => {
        return await measurePerformanceAsync(
          log,
          `fleetApi.package_policies.delete [${id}]`,
          async () => {
            const response = await kbnClient.request({
              method: 'DELETE',
              path: `/api/fleet/package_policies/${id}`,
              ignoreErrors: [400],
            });
            return { status: response.status };
          }
        );
      },
      bulkDelete: async (ids: [string]) => {
        return await measurePerformanceAsync(
          log,
          `fleetApi.package_policies.delete ${ids}`,
          async () => {
            return await kbnClient.request({
              method: 'DELETE',
              path: `/api/fleet/package_policies`,
              body: { ids },
            });
          }
        );
      },
    },
    agent_policies: {
      get: async (queryParams?: Record<string, any>) => {
        return await measurePerformanceAsync(log, `fleetApi.agent_policies.get`, async () => {
          return await kbnClient.request({
            method: 'GET',
            path: `/api/fleet/agent_policies`,
            query: queryParams,
          });
        });
      },
      create: async ({
        policyName,
        policyNamespace,
        sysMonitoring,
        params,
      }: AgentPolicyCreateOptions) => {
        return await measurePerformanceAsync(
          log,
          `fleetApi.agent_policies.create [${policyName}]`,
          async () => {
            return await kbnClient.request({
              method: 'POST',
              path: `/api/fleet/agent_policies`,
              headers: {
                'Content-Type': 'application/json',
              },
              query: {
                ...(typeof sysMonitoring !== 'undefined' ? { sys_monitoring: sysMonitoring } : {}),
              },
              body: {
                name: policyName,
                namespace: policyNamespace,
                ...params,
              },
            });
          }
        );
      },

      update: async ({
        policyName,
        policyNamespace,
        agentPolicyId,
        params,
        queryParams,
      }: AgentPolicyUpdateOptions) => {
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
        params?: BulkGetBody,
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
        return await measurePerformanceAsync(
          log,
          `fleetApi.agent_policies.delete [${id}]`,
          async () => {
            const response = await kbnClient.request({
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
            return { status: response.status };
          }
        );
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
        return await measurePerformanceAsync(
          log,
          `fleetApi.outputs.delete [${outputId}]`,
          async () => {
            const response = await kbnClient.request({
              method: 'DELETE',
              path: `/api/fleet/outputs/${outputId}`,
              ignoreErrors: [400, 404],
            });
            return { status: response.status };
          }
        );
      },
    },
    server_hosts: {
      get: async () => {
        return await measurePerformanceAsync(log, `fleetApi.server_hosts.get`, async () => {
          return await kbnClient.request({
            method: 'GET',
            path: `/api/fleet/fleet_server_hosts`,
          });
        });
      },
      create: async (hostName, hostUrls: string[], params?: FleetServerHostCreateBody) => {
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
        return await measurePerformanceAsync(
          log,
          `fleetApi.server_hosts.delete [${fleetServerHostId}]`,
          async () => {
            const response = await kbnClient.request({
              method: 'DELETE',
              path: `/api/fleet/fleet_server_hosts/${fleetServerHostId}`,
              ignoreErrors: [400, 404],
            });
            return { status: response.status };
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
      get: async (queryParams: Record<string, any>) => {
        return await measurePerformanceAsync(log, `fleetApi.agent.get`, async () => {
          return await kbnClient.request({
            method: 'GET',
            path: `/api/fleet/agents`,
            headers: {
              'Content-Type': 'application/json',
            },
            query: queryParams,
          });
        });
      },
      delete: async (agentId: string) => {
        return await measurePerformanceAsync(
          log,
          `fleetApi.agent.delete [${agentId}]`,
          async () => {
            const response = await kbnClient.request({
              method: 'DELETE',
              path: `/api/fleet/agents/${agentId}`,
              ignoreErrors: [400, 404],
            });
            return { status: response.status };
          }
        );
      },
    },
  };
};
