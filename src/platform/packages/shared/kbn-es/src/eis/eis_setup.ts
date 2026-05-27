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

import http from 'http';
import https from 'https';
import { spawn } from 'child_process';
import execa from 'execa';
import chalk from 'chalk';
import { Client, HttpConnection } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';

import { readCachedKey, readStaleKey, writeCachedKey } from './ccm_key_cache';
import { waitUntilClusterReady } from '../utils/wait_until_cluster_ready';

/** QA environment URL for the Elastic Inference Service. */
export const EIS_QA_URL = 'https://inference.eu-west-1.aws.svc.qa.elastic.cloud';

/** Elasticsearch `-E` argument that points the inference plugin at the QA EIS. */
export const EIS_ES_ARG = `xpack.inference.elastic.url=${EIS_QA_URL}`;

const VAULT_SECRET_PATH = 'secret/kibana-issues/dev/inference/kibana-eis-ccm';

export interface EisElasticsearchConnection {
  baseUrl: string;
  credentials: { username: string; password: string };
  ssl: boolean;
}

/**
 * Minimal HTTP/HTTPS request helper. Returns the status code and raw body.
 * Shared between EIS setup (PUT _inference/_ccm) and connector discovery
 * (GET _inference/chat_completion/_all).
 */
export const eisHttpRequest = (
  requestUrl: string,
  options: http.RequestOptions | https.RequestOptions,
  body?: string,
  ssl: boolean = true
): Promise<{ statusCode: number; data: string }> =>
  new Promise((promiseResolve, reject) => {
    const requestFn = ssl ? https.request : http.request;
    const req = requestFn(requestUrl, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        promiseResolve({ statusCode: res.statusCode || 0, data });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });

export const createBasicAuth = (username: string, password: string): string =>
  Buffer.from(`${username}:${password}`).toString('base64');

const VAULT_NOT_INSTALLED_MESSAGE = [
  'Vault is not installed or not in PATH.',
  'Install it from https://developer.hashicorp.com/vault/install or follow the Elastic guide:',
  '  https://docs.elastic.dev/vault',
  '',
  'Alternatively, set the CCM API key manually:',
  '',
  `  export KIBANA_EIS_CCM_API_KEY="<key>"`,
].join('\n');

/**
 * Returns true when the local Vault token is still valid.
 * Throws with a helpful install message when vault is not found in PATH.
 */
const isVaultAuthenticated = async (vaultAddr: string): Promise<boolean> => {
  try {
    await execa('vault', ['token', 'lookup', '-format=json'], {
      env: { VAULT_ADDR: vaultAddr },
    });
    return true;
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      throw new Error(VAULT_NOT_INSTALLED_MESSAGE);
    }
    return false;
  }
};

/**
 * Spawns `vault login --method oidc` with inherited stdio so the user can
 * complete the OAuth flow in the terminal.
 * Handles the `error` event from spawn so the process does not hang when
 * vault is not in PATH.
 */
const vaultLogin = async (vaultAddr: string, log: ToolingLog): Promise<void> => {
  log.info('Opening browser for Vault OIDC login...');
  const child = spawn('vault', ['login', '--method', 'oidc'], {
    env: { ...process.env, VAULT_ADDR: vaultAddr },
    stdio: 'inherit',
  });

  const exitCode = await new Promise<number | null>((resolve, reject) => {
    child.on('error', (err) => {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(new Error(VAULT_NOT_INSTALLED_MESSAGE));
      } else {
        reject(err);
      }
    });
    child.on('exit', (code) => resolve(code));
  });

  if (exitCode !== 0) {
    throw new Error(
      [
        `Vault login failed (exit code ${exitCode}).`,
        '',
        'See https://docs.elastic.dev/vault for setup instructions.',
      ].join('\n')
    );
  }
};

const readVaultSecret = async (vaultAddr: string): Promise<string> => {
  const { stdout } = await execa('vault', ['read', '-field', 'key', VAULT_SECRET_PATH], {
    env: { VAULT_ADDR: vaultAddr },
  });

  const apiKey = stdout.trim();
  if (!apiKey) {
    throw new Error('Vault returned an empty API key.');
  }
  return apiKey;
};

/**
 * Fetches the CCM API key from Vault. Automatically triggers OIDC login when
 * the session is expired or missing, and retries once if the first read fails.
 */
const getEisApiKeyFromVault = async (vaultAddr: string, log: ToolingLog): Promise<string> => {
  const authenticated = await isVaultAuthenticated(vaultAddr);

  if (!authenticated) {
    log.warning(
      [
        'Vault session expired or not found. Launching OIDC login in your browser...',
        'If no browser opens, run: vault login --method oidc',
        'For setup help, see: https://docs.elastic.dev/vault',
        `You can also skip Vault by setting: export KIBANA_EIS_CCM_API_KEY="<key>"`,
      ].join('\n')
    );
    await vaultLogin(vaultAddr, log);
  }

  try {
    return await readVaultSecret(vaultAddr);
  } catch (firstError: unknown) {
    // The token check may have passed but the read still failed (e.g. expired
    // between check and read). Try one more login + read cycle.
    log.warning('Vault read failed — attempting login and retry...');
    try {
      await vaultLogin(vaultAddr, log);
      return await readVaultSecret(vaultAddr);
    } catch (secondError: unknown) {
      const vaultStderr =
        firstError && typeof firstError === 'object' && 'stderr' in firstError
          ? String((firstError as { stderr: unknown }).stderr).trim()
          : '';
      const secondMsg = secondError instanceof Error ? secondError.message : String(secondError);
      const parts = [
        'Failed to read EIS API key from vault.',
        ...(vaultStderr ? [`First attempt: ${vaultStderr}`] : []),
        ...(secondMsg ? [`Second attempt: ${secondMsg}`] : []),
        '',
        'You can also set the key manually:',
        '',
        `  ${chalk.cyan('export KIBANA_EIS_CCM_API_KEY="<key>"')}`,
        '',
        'See https://docs.elastic.dev/vault for setup instructions.',
      ];
      throw new Error(parts.join('\n'));
    }
  }
};

/**
 * Resolves the CCM API key from (in priority order):
 * 1. KIBANA_EIS_CCM_API_KEY env var
 * 2. Local file cache (~/.elastic/eis-ccm-key.json)
 * 3. Vault (with fallback to stale cache on failure)
 */
export const resolveCcmApiKey = async (log: ToolingLog): Promise<string> => {
  const envKey = process.env.KIBANA_EIS_CCM_API_KEY?.trim();
  if (envKey) {
    log.info('Using CCM API key from KIBANA_EIS_CCM_API_KEY environment variable');
    return envKey;
  }

  const cached = readCachedKey();
  if (cached) {
    log.info('Using cached CCM API key from ~/.elastic/eis-ccm-key.json');
    return cached;
  }

  const vaultAddr = process.env.VAULT_ADDR || 'https://secrets.elastic.co:8200';
  log.info('Fetching CCM API key from vault...');

  try {
    const key = await getEisApiKeyFromVault(vaultAddr, log);
    writeCachedKey(key, vaultAddr);
    log.info('CCM API key fetched and cached at ~/.elastic/eis-ccm-key.json');
    return key;
  } catch (error) {
    const stale = readStaleKey();
    if (stale) {
      log.warning(
        'Vault fetch failed but found a stale cached key — using it. Error: ' +
          (error instanceof Error ? error.message : String(error))
      );
      return stale;
    }
    throw error;
  }
};

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
export const waitForEisEsReady = async (
  es: EisElasticsearchConnection,
  log: ToolingLog,
  options: { readyTimeoutMs?: number } = {}
): Promise<void> => {
  const client = new Client({
    node: es.baseUrl,
    auth: {
      username: es.credentials.username,
      password: es.credentials.password,
    },
    tls: es.ssl ? { rejectUnauthorized: false } : undefined,
    Connection: HttpConnection,
    requestTimeout: 30_000,
  });

  try {
    await waitUntilClusterReady({
      client,
      expectedStatus: 'yellow',
      log,
      readyTimeout: options.readyTimeoutMs ?? 5 * 60 * 1000,
    });
  } finally {
    await client.close();
  }
};

/**
 * Sets the CCM API key in Elasticsearch via PUT _inference/_ccm.
 */
export const setCcmApiKey = async (
  apiKey: string,
  es: EisElasticsearchConnection,
  log: ToolingLog
): Promise<void> => {
  const maxRetries = 3;
  const retryDelayMs = 2000;
  const esUrl = `${es.baseUrl}/_inference/_ccm`;
  const auth = createBasicAuth(es.credentials.username, es.credentials.password);
  const body = JSON.stringify({ api_key: apiKey });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { statusCode } = await eisHttpRequest(
        esUrl,
        {
          method: 'PUT',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
          rejectUnauthorized: false,
        },
        body,
        es.ssl
      );

      if (statusCode >= 200 && statusCode < 300) {
        return;
      }

      if (statusCode === 401 || statusCode === 403) {
        throw new Error(`HTTP ${statusCode} — Elasticsearch rejected the CCM request.`);
      }

      throw new Error(`HTTP ${statusCode}`);
    } catch (error) {
      if (
        attempt < maxRetries &&
        !(error instanceof Error && /HTTP (401|403)/.test(error.message))
      ) {
        log.debug(`Attempt ${attempt} failed, retrying in ${retryDelayMs}ms...`);
        await new Promise((r) => setTimeout(r, retryDelayMs));
      } else {
        throw new Error('Failed to set CCM API key.', { cause: error as Error });
      }
    }
  }
};
