/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ProcRunner } from '@kbn/dev-proc-runner';
import { ToolingLog } from '@kbn/tooling-log';
import { registerServerShutdown } from '../server_shutdown';

const markerDir = process.argv[2];
const procs = new ProcRunner(new ToolingLog());
const childScript = `
  const { writeFileSync } = require('node:fs');
  writeFileSync(process.argv[1], String(process.pid));
  console.log('child ready');
  setInterval(() => {}, 1000);
`;

async function main() {
  await procs.run('kibana', {
    cmd: 'node',
    args: ['-e', childScript, join(markerDir, 'child.pid')],
    cwd: process.cwd(),
    wait: /child ready/,
  });

  registerServerShutdown(procs, async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    writeFileSync(join(markerDir, 'es-stopped'), 'done');
  });

  process.stdout.write('SCOUT_SHUTDOWN_READY\n');
}

main().catch((error) => {
  process.stderr.write(String(error));
  process.exitCode = 1;
});
