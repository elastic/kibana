/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

require('../src/setup_node_env');

// Use dynamic import for ESM module
async function main() {
  const { run } = await import('@kbn/transpile-packages-cli');
  await run();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
