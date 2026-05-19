/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Shared utilities for the Elastic Inference Service (EIS) development setup.
 *
 * Provides:
 *  - CCM (Cloud Connected Mode) API key resolution with a three-tier fallback:
 *    env var → local file cache → Vault (with automatic OIDC login).
 *  - `setCcmApiKey` to push the resolved key into a running Elasticsearch via
 *    `PUT _inference/_ccm`.
 *  - `eisHttpRequest`, a minimal HTTP helper used by both this module and the
 *    connector discovery orchestrator in kbn-cli-dev-mode.
 *
 * Used by `yarn es snapshot --eis` (sets the key) and `yarn start --eis`
 * (discovers connectors).
 */
import type http from 'http';
import type https from 'https';
import type { ToolingLog } from '@kbn/tooling-log';
/** QA environment URL for the Elastic Inference Service. */
export declare const EIS_QA_URL = 'https://inference.eu-west-1.aws.svc.qa.elastic.cloud';
/** Elasticsearch `-E` argument that points the inference plugin at the QA EIS. */
export declare const EIS_ES_ARG =
  'xpack.inference.elastic.url=https://inference.eu-west-1.aws.svc.qa.elastic.cloud';
export interface EisElasticsearchConnection {
  baseUrl: string;
  credentials: {
    username: string;
    password: string;
  };
  ssl: boolean;
}
/**
 * Minimal HTTP/HTTPS request helper. Returns the status code and raw body.
 * Shared between EIS setup (PUT _inference/_ccm) and connector discovery
 * (GET _inference/chat_completion/_all).
 */
export declare const eisHttpRequest: (
  requestUrl: string,
  options: http.RequestOptions | https.RequestOptions,
  body?: string,
  ssl?: boolean
) => Promise<{
  statusCode: number;
  data: string;
}>;
export declare const createBasicAuth: (username: string, password: string) => string;
/**
 * Resolves the CCM API key from (in priority order):
 * 1. KIBANA_EIS_CCM_API_KEY env var
 * 2. Local file cache (~/.elastic/eis-ccm-key.json)
 * 3. Vault (with fallback to stale cache on failure)
 */
export declare const resolveCcmApiKey: (log: ToolingLog) => Promise<string>;
/**
 * Waits for the Elasticsearch cluster to report a yellow (or green) status by
 * delegating to `waitUntilClusterReady` from `@kbn/es`. Builds a transient
 * `@elastic/elasticsearch` Client from the given `EisElasticsearchConnection`
 * so callers (e.g. `kbn-cli-dev-mode`) don't have to depend on the ES client
 * directly.
 *
 * Defaults `readyTimeoutMs` to 5 minutes — large enough to cover a cold
 * snapshot install/start, small enough to surface real problems.
 */
export declare const waitForEisEsReady: (
  es: EisElasticsearchConnection,
  log: ToolingLog,
  options?: {
    readyTimeoutMs?: number;
  }
) => Promise<void>;
/**
 * Sets the CCM API key in Elasticsearch via PUT _inference/_ccm.
 */
export declare const setCcmApiKey: (
  apiKey: string,
  es: EisElasticsearchConnection,
  log: ToolingLog
) => Promise<void>;
