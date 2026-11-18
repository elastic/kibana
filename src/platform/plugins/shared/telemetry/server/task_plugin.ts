/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { of } from 'rxjs';
import { schema } from '@kbn/config-schema';
import type {
  TaskCoreSetup as CoreSetup,
  TaskPluginInitializer,
} from '@kbn/core-plugins-server-internal';
import { PluginType } from '@kbn/core-base-common';
import type { TaskStaticPlugin } from '@kbn/core-plugins-server-internal';
import type { ILicense } from '@kbn/licensing-types';
import { getTaskProcessContext } from '@kbn/task-manager-plugin/server/task_process/context';
import { reviveSettings } from '@kbn/task-manager-plugin/server/task_process/settings';
import { registerCloudDeploymentMetadataAnalyticsContext } from '@kbn/cloud-plugin/common/register_cloud_deployment_id_analytics_context';
import { registerAnalyticsContextProvider as registerLicenseAnalyticsContext } from '@kbn/licensing-plugin/common/register_analytics_context_provider';
import { dynamicCjsExport } from '@kbn/std';
import { buildShipperHeaders, createBuildShipperUrl } from '../common/ebt_v3_endpoint';
import type { TelemetryTaskProcessSettings } from './task_process_settings';

/**
 * What a task process is sent to ship analytics events as Kibana does: what the telemetry plugin
 * says (opt-in status, where usage goes, labels) and the context of events that only other plugins
 * know in Kibana (the license and the cloud deployment or project).
 */

/** How long a flush waits for the endpoint to answer the first connectivity check. */
const CONNECTIVITY_TIMEOUT_MS = 3000;

const labelsSchema = {
  labels: {
    type: 'pass_through' as const,
    _meta: {
      description:
        'Custom labels added to the telemetry.labels config in the kibana.yml. Validated and limited to a known set of labels.',
    },
  },
};

const plugin: TaskPluginInitializer<void, void> = async (initializerContext) => {
  const context = getTaskProcessContext();
  const settings = reviveSettings(
    context.init.settings?.['telemetry'] ?? null
  ) as TelemetryTaskProcessSettings | null;
  const { version } = initializerContext.env.packageInfo;
  const logger = initializerContext.logger.get('telemetry');

  return {
    async setup(core: CoreSetup) {
      const { analytics } = core;
      // As Kibana: nothing is shipped until its opt-in is known, and nothing when it is opted out.
      if (settings?.optIn !== true) {
        logger.debug('Analytics events are not shipped: Kibana is not opted in to telemetry');
        return;
      }
      const ElasticV3ServerShipper = dynamicCjsExport<
        typeof import('@elastic/ebt/shippers/elastic_v3/server').ElasticV3ServerShipper
      >(await import('@elastic/ebt/shippers/elastic_v3/server'), 'ElasticV3ServerShipper');
      analytics.optIn({ global: { enabled: true } });

      // The shipper of the client, kept to flush it: Core's analytics does not expose `flush`.
      let shipper: FlushableShipper | undefined;
      class FlushableShipper extends ElasticV3ServerShipper {
        constructor(...args: ConstructorParameters<typeof ElasticV3ServerShipper>) {
          super(...args);
          shipper = this;
        }

        /**
         * The shipper sends only once it knows the endpoint is reachable, which it learns with a request
         * it makes when it is opted in. A process that lives for one run may flush before that answer
         * came, which would drop the events, so what is queued waits for it (for a limited time).
         */
        public async flushWhenOnline(timeoutMs: number) {
          const state = this as unknown as { internalQueue: unknown[]; firstTimeOffline?: unknown };
          const giveUpAt = Date.now() + timeoutMs;
          while (
            state.internalQueue.length > 0 &&
            state.firstTimeOffline === undefined &&
            Date.now() < giveUpAt
          ) {
            await new Promise((resolve) => setTimeout(resolve, 25));
          }
          await this.flush();
        }
      }
      analytics.registerShipper(FlushableShipper, {
        channelName: 'kibana-server',
        version,
        buildShipperHeaders,
        buildShipperUrl: settings.shipperUrl
          ? () => settings.shipperUrl!
          : createBuildShipperUrl(settings.sendUsageTo === 'prod' ? 'production' : 'staging'),
      });
      context.flushers.push(
        () => shipper?.flushWhenOnline(CONNECTIVITY_TIMEOUT_MS) ?? Promise.resolve()
      );

      analytics.registerContextProvider({
        name: 'telemetry labels',
        context$: of({ labels: settings.labels }),
        schema: labelsSchema,
      });
      if (settings.license) {
        registerLicenseAnalyticsContext(analytics, of(settings.license as unknown as ILicense));
      }
      if (settings.cloud) {
        registerCloudDeploymentMetadataAnalyticsContext(analytics, settings.cloud);
      }
    },
    start() {},
  };
};

/**
 * The telemetry plugin as a plugin of a task process: the analytics client of Core gets the shipper
 * that Kibana registers, opted in as Kibana is and with the same context, so the events of a run
 * leave from the process, which flushes them before it answers.
 */
export const createTelemetryTaskPlugin = (kibanaVersion: string): TaskStaticPlugin => ({
  manifest: {
    id: 'telemetry',
    version: kibanaVersion,
    kibanaVersion,
    type: PluginType.standard,
    configPath: ['telemetry'],
    requiredPlugins: [],
    optionalPlugins: [],
    requiredBundles: [],
    runtimePluginDependencies: [],
    server: true,
    ui: false,
    owner: { name: 'Kibana Core', githubTeam: 'kibana-core' },
  },
  definition: {
    config: { schema: schema.object({}, { unknowns: 'allow' }) },
    taskPlugin: plugin,
  },
});
