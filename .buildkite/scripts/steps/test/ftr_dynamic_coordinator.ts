/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { execFileSync } from 'node:child_process';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { createFtrScheduler } from './ftr_dynamic_scheduler.ts';
import type { FtrPlan } from './ftr_dynamic_scheduler.ts';

const plan = JSON.parse(readFileSync('ftr_dynamic_plan.json', 'utf8')) as FtrPlan;
const token = randomBytes(32).toString('hex');
const { server, summary } = createFtrScheduler(plan, token);

server.listen(0, '0.0.0.0');
await once(server, 'listening');

let metadataAddress: string | undefined;
try {
  const response = await fetch(
    'http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/ip',
    {
      headers: { 'Metadata-Flavor': 'Google' },
      signal: AbortSignal.timeout(2000),
    }
  );
  if (response.ok) metadataAddress = (await response.text()).trim();
} catch {
  // Non-GCE agents can use the local interface address below.
}
const address =
  metadataAddress ||
  Object.values(networkInterfaces())
    .flat()
    .find((item) => item?.family === 'IPv4' && !item.internal)?.address;
if (!address) throw new Error('No private IPv4 address found for FTR coordinator');
const port = (server.address() as AddressInfo).port;
const url = `http://${address}:${port}`;
execFileSync('buildkite-agent', [
  'meta-data',
  'set',
  'ftr-dynamic-coordinator',
  JSON.stringify({ url, token }),
]);
console.log(
  `FTR coordinator listening at ${url}; ${plan.tasks.length} configs, ${plan.workerCount} workers`
);

const deadline = Date.now() + 55 * 60_000;
while (Date.now() < deadline) {
  const result = summary();
  if (result.finished) {
    console.log(`FTR coordinator complete: ${result.failures.length} failed configs`);
    server.close();
    process.exitCode = result.failures.length ? 10 : 0;
    break;
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
if (server.listening) {
  console.error(`FTR coordinator timed out: ${JSON.stringify(summary())}`);
  server.close();
  process.exitCode = 1;
}
