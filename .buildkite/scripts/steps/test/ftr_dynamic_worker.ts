/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync, spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

interface Endpoint {
  url: string;
  token: string;
}

type Claim = { config: string; leaseId: string } | { wait: true } | { done: true };

const workerId = process.env.BUILDKITE_JOB_ID;
const queue = process.env.FTR_DYNAMIC_QUEUE;
if (!workerId || !queue) throw new Error('Missing BUILDKITE_JOB_ID or FTR_DYNAMIC_QUEUE');

const discoverEndpoint = async (): Promise<Endpoint> => {
  const deadline = Date.now() + 120_000;
  let attempt = 0;
  while (Date.now() < deadline) {
    const value = execFileSync(
      'buildkite-agent',
      ['meta-data', 'get', 'ftr-dynamic-coordinator', '--default', ''],
      { encoding: 'utf8' }
    ).trim();
    if (value) {
      const endpoint = JSON.parse(value) as Endpoint;
      try {
        const response = await fetch(`${endpoint.url}/health`, {
          headers: { authorization: `Bearer ${endpoint.token}` },
          signal: AbortSignal.timeout(5000),
        });
        if (response.ok) {
          console.log(`Connected to FTR coordinator at ${endpoint.url}`);
          return endpoint;
        }
      } catch (error) {
        if (attempt % 10 === 0) console.log(`Waiting for coordinator: ${String(error)}`);
      }
    }
    attempt++;
    await delay(1000);
  }
  throw new Error('Cannot reach the FTR coordinator from this job after 2 minutes');
};

const endpoint = await discoverEndpoint();
const request = async <T>(path: string, body: object): Promise<T> => {
  const response = await fetch(`${endpoint.url}${path}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${endpoint.token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(`${path} failed (${response.status}): ${JSON.stringify(result)}`);
  return result as T;
};

const runConfig = async (config: string, leaseId: string): Promise<number> => {
  console.log(`--- Running claimed FTR config ${config}`);
  const child = spawn('bash', ['.buildkite/scripts/steps/test/ftr_configs.sh'], {
    detached: true,
    stdio: 'inherit',
    env: {
      ...process.env,
      FTR_CONFIG: config,
      FTR_CONFIG_GROUP_KEY: process.env.BUILDKITE_STEP_KEY || workerId,
    },
  });
  let heartbeatError: Error | undefined;
  let running = true;
  const heartbeat = setInterval(() => {
    request('/heartbeat', { leaseId }).catch((error: Error) => {
      if (!running) return;
      heartbeatError = error;
      try {
        if (child.pid) process.kill(-child.pid, 'SIGTERM');
      } catch {
        // The process group may have exited while the heartbeat was in flight.
      }
    });
  }, 30_000);
  const exitCode = await new Promise<number>((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code) => resolve(code ?? 1));
  }).finally(() => {
    running = false;
    clearInterval(heartbeat);
  });
  if (heartbeatError) throw heartbeatError;
  return exitCode;
};

if (!process.argv.includes('--probe')) {
  while (true) {
    const claim = await request<Claim>('/claim', { queue, workerId });
    if ('done' in claim) break;
    if ('wait' in claim) {
      await delay(5000);
      continue;
    }
    const exitCode = await runConfig(claim.config, claim.leaseId);
    await request('/complete', { leaseId: claim.leaseId, exitCode });
  }
  await request('/done', { workerId });
}
