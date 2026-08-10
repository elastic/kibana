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
 * Two-phase flow:
 *
 *  1. Wait for Elasticsearch to be reachable and healthy (yellow/green) —
 *     generous timeout (5 min), since a cold ES snapshot install/start can
 *     legitimately take minutes.
 *  2. Poll `GET /_inference/_all` for EIS-provided endpoints
 *     (`service === 'elastic'`) — bounded retry budget (~30s). If ES is
 *     healthy but no EIS endpoints exist, that is a configuration error
 *     (typically `yarn es snapshot` was run without `--eis`, or the CCM
 *     API key was not set).
 *
 * Converts each endpoint into a Kibana preconfigured connector definition
 * keyed by a sanitised model ID, and returns the result so bootstrap.ts can
 * inject them into the Kibana config via an env var.
 *
 * All EIS task types (chat_completion, sparse_embedding, text_embedding, etc.)
 * are picked up — the gateway-defined task type is preserved on each connector.
 *
 * This module does NOT start or stop Elasticsearch — that is handled separately
 * by `yarn es snapshot --eis`.
 */

import chalk from 'chalk';
import { createBasicAuth, eisHttpRequest, waitForEisEsReady } from '@kbn/es';
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
 * Phase 1: wait for Elasticsearch to be reachable and reporting a yellow (or
 * green) cluster health status. Delegates to `waitForEisEsReady`, which is
 * backed by `@kbn/es`'s `waitUntilClusterReady`. SIGINT is honoured (it forces
 * process exit, matching the rest of the dev tooling).
 */
const waitForEsReachable = async (es: EisElasticsearchConnection, log: Log): Promise<void> => {
  log.write(`Waiting for Elasticsearch at ${chalk.cyan(es.baseUrl)} to be ready...`);
  await waitForEisEsReady(es, log.toolingLog);
};

/**
 * Phase 2: poll `GET /_inference/_all` until we see at least one endpoint with
 * `service === 'elastic'`. Bounded retries — if ES is up but EIS endpoints are
 * not registered, this is a real misconfiguration that should fail fast.
 */
const discoverEisEndpoints = async (
  es: EisElasticsearchConnection,
  log: Log
): Promise<EisInferenceEndpoint[]> => {
  const maxAttempts = 10;
  const delayMs = 3000;
  const auth = createBasicAuth(es.credentials.username, es.credentials.password);

  let lastStatus: number | undefined;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { statusCode, data } = await eisHttpRequest(
        `${es.baseUrl}/_inference/_all`,
        {
          method: 'GET',
          headers: { Authorization: `Basic ${auth}` },
          rejectUnauthorized: false,
        },
        undefined,
        es.ssl
      );
      lastStatus = statusCode;

      if (statusCode === 200) {
        const body = JSON.parse(data) as { endpoints?: EisInferenceEndpoint[] };
        const eisEndpoints = (body.endpoints ?? []).filter((ep) => ep.service === 'elastic');

        if (eisEndpoints.length > 0) {
          return eisEndpoints;
        }

        log.write(
          `No EIS inference endpoints registered yet, retrying in ${delayMs}ms... (${attempt}/${maxAttempts})`
        );
      } else {
        log.write(
          `Inference endpoints not available (HTTP ${statusCode}), retrying in ${delayMs}ms... (${attempt}/${maxAttempts})`
        );
      }
    } catch (error) {
      lastError = error;
      const msg = error instanceof Error ? error.message : String(error);
      log.write(
        `Failed to query inference endpoints (${msg}), retrying in ${delayMs}ms... (${attempt}/${maxAttempts})`
      );
    }

    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  const detail = lastError
    ? `last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`
    : `last HTTP status: ${lastStatus ?? 'unknown'}`;

  throw new Error(
    [
      `No EIS inference endpoints found after ${maxAttempts} attempts (${detail}).`,
      'Elasticsearch is responding but EIS endpoints are not registered.',
      'Make sure Elasticsearch was started with `yarn es snapshot --eis` and that the CCM API key was set successfully.',
    ].join('\n')
  );
};

/** Builds the Kibana preconfigured-connectors map from the discovered endpoints. */
const buildConnectors = (
  endpoints: EisInferenceEndpoint[]
): Record<string, PreconfiguredConnector> => {
  endpoints.sort((a, b) => (a.inference_id || '').localeCompare(b.inference_id || ''));

  const seen: Record<string, boolean> = {};
  const connectors: Record<string, PreconfiguredConnector> = {};

  for (const endpoint of endpoints) {
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
};

/** Entry point called from bootstrap.ts when `--eis` is passed to `yarn start`. */
export const discoverEisConnectors = async (log: Log): Promise<EisConnectorResult> => {
  log.good('eis', 'Setting up EIS connectors from Elasticsearch...');

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

  // Phase 1: wait for ES itself (generous timeout).
  await waitForEsReachable(es, log);

  // Phase 2: wait for EIS endpoints to register (bounded — fail fast on misconfig).
  log.write('Discovering EIS connectors...');
  const endpoints = await discoverEisEndpoints(es, log);
  const connectors = buildConnectors(endpoints);
  const count = Object.keys(connectors).length;

  log.good('eis', `Discovered ${count} EIS connectors:`);
  for (const [id, connector] of Object.entries(connectors)) {
    log.write(`  ${chalk.cyan(id)}: ${connector.name}`);
  }

  log.write('');

  return { preconfiguredConnectors: connectors };
};
