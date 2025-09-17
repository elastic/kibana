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
import type { AgentPolicyCreateOptions, FleetOutputCreateOptions } from './data_helper';

export interface FleetApiService {
  integration: {
    install: (name: string) => Promise<void>;
    delete: (name: string) => Promise<void>;
  };
  agent_policies: {
    create: (name: string, options?: AgentPolicyCreateOptions) => Promise<void>;
    delete: (name: string) => Promise<void>;
  };
  outputs: {
    getOutputs: () => Promise<any>;
    getOutput: (outputId: string) => Promise<any>;
    create: (name: string, hosts: string[], options?: FleetOutputCreateOptions) => Promise<any>;
    delete: (outputId: string) => Promise<void>;
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
          await kbnClient.request({
            method: 'DELETE',
            path: `/api/fleet/epm/packages/${name}`,
            ignoreErrors: [400],
          });
        });
      },
    },
    agent_policies: {
      create: async (name: string, options?: AgentPolicyCreateOptions) => {
        await measurePerformanceAsync(log, `fleetApi.agent_policies.create [${name}]`, async () => {
          await kbnClient.request({
            method: 'POST',
            path: `/api/fleet/agent_policies`,
            headers: {
              'kbn-xsrf': 'true',
              'Content-Type': 'application/json',
            },
            body: {
              name,
              ...options,
            },
          });
        });
      },

      delete: async (agentPolicyId: string, force: boolean = true) => {
        await measurePerformanceAsync(
          log,
          `fleetApi.agent_policies.delete [${agentPolicyId}]`,
          async () => {
            await kbnClient.request({
              method: 'POST',
              path: `/api/fleet/agent_policies/delete`,
              headers: {
                'kbn-xsrf': 'true',
                'Content-Type': 'application/json',
              },
              body: {
                agentPolicyId,
                force,
              },
              ignoreErrors: [400],
            });
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
      create: async (name: string, hosts: string[], options?: FleetOutputCreateOptions) => {
        return await measurePerformanceAsync(log, `fleetApi.outputs.create [${name}]`, async () => {
          return await kbnClient.request({
            method: 'POST',
            path: `/api/fleet/outputs`,
            headers: {
              'kbn-xsrf': 'true',
              'Content-Type': 'application/json',
            },
            body: { name, hosts, ...options },
          });
        });
      },
      delete: async (outputId: string) => {
        await measurePerformanceAsync(log, `fleetApi.outputs.delete [${outputId}]`, async () => {
          await kbnClient.request({
            method: 'DELETE',
            path: `/api/fleet/outputs/${outputId}`,
            headers: { 'kbn-xsrf': 'true' },
            ignoreErrors: [400, 404],
          });
        });
      },
    },
  };
};
