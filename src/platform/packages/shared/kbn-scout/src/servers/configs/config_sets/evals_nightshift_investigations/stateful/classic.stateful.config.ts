/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { servers as tracing } from '../../evals_tracing/stateful/classic.stateful.config';

const sandboxKey = process.env.SANDBOX_API_KEY;
if (!sandboxKey)
  throw new Error(
    'SANDBOX_API_KEY is required; start the external sandbox-api before running Nightshift evals.'
  );

const connectorPrefix = '--xpack.actions.preconfigured=';
const exporterPrefix = '--telemetry.tracing.exporters=';
const parentArgs = tracing.kbnTestServer.serverArgs;
const connectorArg = parentArgs.find((arg) => arg.startsWith(connectorPrefix));
const connectors: Record<string, object> = connectorArg
  ? JSON.parse(connectorArg.slice(connectorPrefix.length))
  : {};
const exporterArg = parentArgs.find((arg) => arg.startsWith(exporterPrefix));
const exporters: Array<{ http?: { url: string; headers?: Record<string, string> } }> = exporterArg
  ? JSON.parse(exporterArg.slice(exporterPrefix.length))
  : [];

// Telemetry defaults to the ephemeral Scout Elasticsearch. Setting the URL and an API key
// points the investigator's sandbox at a remote cluster instead (the Capability Baseline setup).
const telemetryUrl =
  process.env.NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL ??
  `http://host.docker.internal:${tracing.servers.elasticsearch.port}`;
const telemetryApiKey = process.env.NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY;
const readableIndices = process.env.NIGHTSHIFT_SANDBOX_READABLE_INDICES;
if (telemetryApiKey && !process.env.NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL)
  throw new Error(
    'NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY requires NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL.'
  );

export const servers: ScoutServerConfig = {
  ...tracing,
  kbnTestServer: {
    ...tracing.kbnTestServer,
    serverArgs: [
      ...parentArgs.filter((arg) => !arg.startsWith(connectorPrefix)),
      '--xpack.nightshift_investigations.enabled=true',
      '--xpack.nightshift_investigations.cortex.enabled=false',
      `--xpack.nightshift_investigations.sandbox=${JSON.stringify({
        sandbox_api_host: process.env.SANDBOX_API_HOST ?? 'localhost',
        sandbox_api_port: Number(process.env.SANDBOX_API_PORT ?? 9090),
        sandbox_api_key: sandboxKey,
        telemetry_connector_id: 'nightshift-evals-telemetry',
        ...(readableIndices ? { telemetry_readable_indices: readableIndices } : {}),
      })}`,
      `${connectorPrefix}${JSON.stringify({
        ...connectors,
        'nightshift-evals-telemetry': telemetryApiKey
          ? {
              // A remote cluster: the sandbox sends the API key as an Authorization header.
              name: 'Remote Elasticsearch telemetry',
              actionTypeId: '.webhook',
              config: { url: telemetryUrl, method: 'post', hasAuth: false, authType: null },
              secrets: { secretHeaders: { Authorization: `ApiKey ${telemetryApiKey}` } },
            }
          : {
              name: 'Scout Elasticsearch telemetry',
              actionTypeId: '.webhook',
              config: { url: telemetryUrl, method: 'post', hasAuth: true },
              secrets: {
                user: tracing.servers.kibana.username,
                password: tracing.servers.kibana.password,
              },
            },
      })}`,
      `--xpack.agentBuilder.tracing.exporters=${JSON.stringify(
        exporters.flatMap(({ http }) => (http ? [http] : []))
      )}`,
      '--uiSettings.overrides.workflows:ui:enabled=true',
      '--uiSettings.overrides.workflows:aiAgent:enabled=true',
      '--uiSettings.overrides.agentBuilder:experimentalFeatures=true',
      ...[
        'enabled',
        'includeUserPrompts',
        'includeSystemPrompt',
        'includeLlmResponses',
        'includeToolDetails',
        'includeRealNames',
        'includeRealIds',
        'includeUserData',
      ].map((setting) => `--uiSettings.overrides.agentBuilder:tracing:${setting}=true`),
    ],
  },
};
