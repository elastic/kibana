/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import http from 'http';
import https from 'https';
import { spawn } from 'child_process';
import execa from 'execa';
import chalk from 'chalk';
import type { ToolingLog } from '@kbn/tooling-log';

import { readCachedKey, readStaleKey, writeCachedKey } from './ccm_key_cache';

export const EIS_QA_URL = 'https://inference.eu-west-1.aws.svc.qa.elastic.cloud';
export const EIS_ES_ARG = `xpack.inference.elastic.url=${EIS_QA_URL}`;

const VAULT_SECRET_PATH = 'secret/kibana-issues/dev/inference/kibana-eis-ccm';

export interface EisElasticsearchConnection {
  baseUrl: string;
  credentials: { username: string; password: string };
  ssl: boolean;
}

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

const createBasicAuth = (username: string, password: string): string =>
  Buffer.from(`${username}:${password}`).toString('base64');

const isVaultAuthenticated = async (vaultAddr: string): Promise<boolean> => {
  try {
    await execa('vault', ['token', 'lookup', '-format=json'], {
      env: { VAULT_ADDR: vaultAddr },
    });
    return true;
  } catch {
    return false;
  }
};

const vaultLogin = async (vaultAddr: string, log: ToolingLog): Promise<void> => {
  log.info('Opening browser for Vault OIDC login...');
  const child = spawn('vault', ['login', '--method', 'oidc'], {
    env: { ...process.env, VAULT_ADDR: vaultAddr },
    stdio: 'inherit',
  });

  const exitCode = await new Promise<number | null>((resolve) =>
    child.on('exit', (code) => resolve(code))
  );

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

const getEisApiKeyFromVault = async (vaultAddr: string, log: ToolingLog): Promise<string> => {
  const authenticated = await isVaultAuthenticated(vaultAddr);

  if (!authenticated) {
    log.warning('Vault session expired or not authenticated.');
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
    } catch {
      const vaultStderr =
        firstError && typeof firstError === 'object' && 'stderr' in firstError
          ? String((firstError as { stderr: unknown }).stderr).trim()
          : '';
      const parts = [
        'Failed to read EIS API key from vault.',
        ...(vaultStderr ? [`Vault output: ${vaultStderr}`] : []),
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
