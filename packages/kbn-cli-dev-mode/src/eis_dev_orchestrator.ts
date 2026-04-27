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
 * Queries a running Elasticsearch instance for all inference endpoints provided
 * by the Elastic Inference Service (GET _inference/_all, filtered to
 * service === 'elastic'), converts them into Kibana preconfigured connector
 * definitions, and returns the result so bootstrap.ts can inject them into the
 * Kibana config via an env var.
 *
 * All EIS task types (chat_completion, sparse_embedding, text_embedding, etc.)
 * are picked up — the gateway-defined task type is preserved on each connector.
 *
 * This module does NOT start or stop Elasticsearch — that is handled separately
 * by `yarn es snapshot --eis`.
 */

import chalk from 'chalk';
import { createBasicAuth, eisHttpRequest } from '@kbn/es';
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
  const withVersions = withSpaces.replace(/\b(\d{1,2})\s+(\d{1,2})\b/g, '$1.$2');
  return 'EIS ' + withVersions.replace(/\b\w/g, (c) => c.toUpperCase());
};

interface EisInferenceEndpoint {
  inference_id: string;
  task_type: string;
  service: string;
  service_settings?: { model_id?: string };
}

/**
 * Polls ES for EIS inference endpoints with retries (endpoints may take a few
 * seconds to register after the CCM key is set). Converts each endpoint into a
 * Kibana preconfigured connector definition keyed by a sanitised model ID.
 */
const discoverConnectors = async (
  es: EisElasticsearchConnection,
  log: Log
): Promise<Record<string, PreconfiguredConnector>> => {
  const maxAttempts = 5;
  const baseDelayMs = 3000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const auth = createBasicAuth(es.credentials.username, es.credentials.password);

    let statusCode: number;
    let data: string;

    try {
      ({ statusCode, data } = await eisHttpRequest(
        `${es.baseUrl}/_inference/_all`,
        {
          method: 'GET',
          headers: { Authorization: `Basic ${auth}` },
          rejectUnauthorized: false,
        },
        undefined,
        es.ssl
      ));
    } catch (error) {
      if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ECONNREFUSED') {
        throw new Error(
          [
            `Cannot connect to Elasticsearch at ${es.baseUrl} — is it running?`,
            'Start it first with: yarn es snapshot --eis',
          ].join('\n')
        );
      }
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * attempt;
        const msg = error instanceof Error ? error.message : error;
        log.write(
          `Cannot reach Elasticsearch (${msg}), retrying in ${delay}ms... (${attempt}/${maxAttempts})`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw new Error(
        `Cannot reach Elasticsearch after ${maxAttempts} attempts. Make sure it is running with: yarn es snapshot --eis`
      );
    }

    if (statusCode !== 200) {
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * attempt;
        log.write(
          `EIS inference endpoints not ready yet (HTTP ${statusCode}), retrying in ${delay}ms... (${attempt}/${maxAttempts})`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw new Error(
        `EIS inference endpoints not available after ${maxAttempts} attempts (last status: HTTP ${statusCode}). ` +
          `Make sure Elasticsearch was started with: yarn es snapshot --eis`
      );
    }

    let body: { endpoints?: EisInferenceEndpoint[] };
    try {
      body = JSON.parse(data);
    } catch (parseError) {
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * attempt;
        log.write(
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
        log.write(
          `No EIS inference endpoints found yet, retrying in ${delay}ms... (${attempt}/${maxAttempts})`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      return {};
    }

    eisEndpoints.sort((a, b) => (a.inference_id || '').localeCompare(b.inference_id || ''));

    const seen: Record<string, boolean> = {};
    const connectors: Record<string, PreconfiguredConnector> = {};

    for (const endpoint of eisEndpoints) {
      // Fallback model id: strip a leading '.' and any trailing '-<task_type>'
      // suffix from the inference id. This works for chat_completion,
      // sparse_embedding, text_embedding, and any future task types.
      const fallbackModelId = endpoint.inference_id
        .replace(/^\./, '')
        .replace(new RegExp(`-${endpoint.task_type}$`), '');
      const modelId = endpoint.service_settings?.model_id || fallbackModelId;

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

  throw new Error('Unreachable: discoverConnectors loop exhausted without returning');
};

/** Entry point called from bootstrap.ts when `--eis` is passed to `yarn start`. */
export const discoverEisConnectors = async (log: Log): Promise<EisConnectorResult> => {
  log.good('eis', 'Discovering EIS connectors from Elasticsearch...');

  // yarn start --eis always targets a local dev ES instance started via
  // yarn es snapshot --eis, which binds to http://localhost:9200 without SSL.
  const es: EisElasticsearchConnection = {
    baseUrl: 'http://localhost:9200',
    credentials: {
      username: process.env.KBN_EIS_ES_USERNAME || 'elastic',
      password: process.env.KBN_EIS_ES_PASSWORD || 'changeme',
    },
    ssl: false,
  };

  log.write('Waiting for EIS inference endpoints to become available...');
  const connectors = await discoverConnectors(es, log);
  const count = Object.keys(connectors).length;

  if (count === 0) {
    throw new Error(
      'No EIS inference endpoints found — cannot start Kibana with --eis.\n' +
        'Make sure Elasticsearch is running with: yarn es snapshot --eis'
    );
  }

  log.good('eis', `Discovered ${count} EIS connectors:`);
  for (const [id, connector] of Object.entries(connectors)) {
    log.write(`  ${chalk.cyan(id)}: ${connector.name}`);
  }

  log.write('');

  return { preconfiguredConnectors: connectors };
};
