/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * EIS connector discovery for `yarn start --eis`.
 *
 * Queries a running Elasticsearch instance for inference endpoints provided by
 * the Elastic Inference Service (GET _inference/chat_completion/_all), converts
 * them into Kibana preconfigured connector definitions, and returns the result
 * so bootstrap.ts can inject them into the Kibana config via an env var.
 *
 * This module does NOT start or stop Elasticsearch — that is handled separately
 * by `yarn es snapshot --eis`.
 */

import chalk from 'chalk';
import { eisHttpRequest } from '@kbn/es';
import type { EisElasticsearchConnection } from '@kbn/es';

import type { Log } from './log';

interface PreconfiguredConnector {
  name: string;
  actionTypeId: string;
  exposeConfig: boolean;
  config: {
    provider: string;
    taskType: string;
    inferenceId: string;
    providerConfig: { model_id: string };
  };
}

export interface EisConnectorResult {
  preconfiguredConnectors: Record<string, PreconfiguredConnector>;
}

const toConnectorId = (modelId: string): string =>
  modelId
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const toDisplayName = (modelId: string): string => {
  const withSpaces = modelId.replace(/[-._]/g, ' ');
  const withVersions = withSpaces.replace(/\b(\d+)\s+(\d+)\b/g, '$1.$2');
  return 'EIS ' + withVersions.replace(/\b\w/g, (c) => c.toUpperCase());
};

interface EisInferenceEndpoint {
  inference_id: string;
  task_type: string;
  service: string;
  service_settings?: { model_id?: string };
}

const createBasicAuth = (username: string, password: string): string =>
  Buffer.from(`${username}:${password}`).toString('base64');

/**
 * Polls ES for EIS inference endpoints with retries (endpoints may take a few
 * seconds to register after the CCM key is set). Converts each endpoint into a
 * Kibana preconfigured connector definition keyed by a sanitised model ID.
 */
const discoverConnectors = async (
  es: EisElasticsearchConnection,
  log: Log
): Promise<Record<string, PreconfiguredConnector>> => {
  const maxAttempts = 10;
  const baseDelayMs = 3000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const auth = createBasicAuth(es.credentials.username, es.credentials.password);
    let statusCode: number;
    let data: string;
    try {
      ({ statusCode, data } = await eisHttpRequest(
        `${es.baseUrl}/_inference/chat_completion/_all`,
        {
          method: 'GET',
          headers: { Authorization: `Basic ${auth}` },
          rejectUnauthorized: false,
        },
        undefined,
        es.ssl
      ));
    } catch (error) {
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * attempt;
        const msg = error instanceof Error ? error.message : error;
        log.toolingLog.debug(
          `Cannot reach Elasticsearch (${msg}), retrying in ${delay}ms... (${attempt}/${maxAttempts})`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw new Error(
        `Cannot reach Elasticsearch. Make sure it is running (e.g. yarn es snapshot --eis).`
      );
    }

    if (statusCode !== 200) {
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * attempt;
        log.toolingLog.debug(
          `Inference endpoints not ready (HTTP ${statusCode}), retrying in ${delay}ms... (${attempt}/${maxAttempts})`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw new Error(`Failed to discover inference endpoints: HTTP ${statusCode}`);
    }

    let body: { endpoints?: EisInferenceEndpoint[] };
    try {
      body = JSON.parse(data);
    } catch (parseError) {
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * attempt;
        log.toolingLog.debug(
          `Invalid JSON from inference endpoints, retrying in ${delay}ms... (${attempt}/${maxAttempts})`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      const msg = parseError instanceof Error ? parseError.message : parseError;
      throw new Error(`Failed to parse inference endpoints response: ${msg}`);
    }

    const endpoints: EisInferenceEndpoint[] = body.endpoints || [];
    const eisEndpoints = endpoints.filter((ep) => ep.service === 'elastic');

    if (eisEndpoints.length === 0) {
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * attempt;
        log.toolingLog.debug(
          `No EIS endpoints found yet, retrying in ${delay}ms... (${attempt}/${maxAttempts})`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      log.toolingLog.warning('No EIS inference endpoints found after all retries');
      return {};
    }

    eisEndpoints.sort((a, b) => (a.inference_id || '').localeCompare(b.inference_id || ''));

    const seen: Record<string, boolean> = {};
    const connectors: Record<string, PreconfiguredConnector> = {};

    for (const endpoint of eisEndpoints) {
      const modelId =
        endpoint.service_settings?.model_id ||
        endpoint.inference_id.replace(/^\./, '').replace(/-chat_completion$/, '');

      let baseId = toConnectorId(modelId);
      if (!baseId) {
        baseId = toConnectorId(endpoint.inference_id) || 'connector';
      }

      let id = baseId;
      let n = 1;
      while (seen[id]) {
        id = `${baseId}-${++n}`;
      }
      seen[id] = true;

      connectors[id] = {
        name: toDisplayName(modelId),
        actionTypeId: '.inference',
        exposeConfig: true,
        config: {
          provider: endpoint.service,
          taskType: endpoint.task_type,
          inferenceId: endpoint.inference_id,
          providerConfig: { model_id: modelId },
        },
      };
    }

    return connectors;
  }

  return {};
};

/** Entry point called from bootstrap.ts when `--eis` is passed to `yarn start`. */
export const discoverEisConnectors = async (log: Log): Promise<EisConnectorResult> => {
  log.good('eis', 'Discovering EIS connectors from Elasticsearch...');

  const es: EisElasticsearchConnection = {
    baseUrl: 'http://localhost:9200',
    credentials: { username: 'elastic', password: 'changeme' },
    ssl: false,
  };

  log.toolingLog.info('Waiting for EIS inference endpoints to become available...');
  const connectors = await discoverConnectors(es, log);
  const count = Object.keys(connectors).length;

  if (count > 0) {
    log.good('eis', `Discovered ${count} EIS connectors:`);
    for (const [id, connector] of Object.entries(connectors)) {
      log.write(`  ${chalk.cyan(id)}: ${connector.name}`);
    }
  } else {
    log.warn('eis', 'No EIS connectors discovered — AI features may not work');
  }

  log.write('');

  return { preconfiguredConnectors: connectors };
};
