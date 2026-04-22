/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('@kbn/setup-node-env');

const fs = require('fs');
const { load } = require('js-yaml');
const { transpileOtelCollector } = require('@kbn/streamlang');

async function main() {
  const filePath = process.argv[2];
  let input;
  if (filePath && filePath !== '-') {
    input = fs.readFileSync(filePath, 'utf-8');
  } else {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    input = Buffer.concat(chunks).toString('utf-8');
  }

  const dsl = load(input);
  const result = await transpileOtelCollector(dsl);

  for (const warning of result.warnings) {
    process.stderr.write(`# warning: ${warning}\n`);
  }
  process.stdout.write(result.yaml);
}

main().catch((err) => {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
});
