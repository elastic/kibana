/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const TARGET = path.resolve(ROOT, 'target');

function needsRebuild() {
  const outputFile = path.join(TARGET, 'index.js');
  if (!fs.existsSync(outputFile)) {
    return true;
  }

  const outputStat = fs.statSync(outputFile);

  // Check the grammar file
  const grammarPath = path.join(ROOT, 'chain.peggy');
  if (fs.existsSync(grammarPath)) {
    const stat = fs.statSync(grammarPath);
    if (stat.mtimeMs > outputStat.mtimeMs) {
      return true;
    }
  }

  return false;
}

async function build() {
  if (!needsRebuild()) {
    return;
  }

  console.log('@kbn/timelion-grammar: building...');

  if (!fs.existsSync(TARGET)) {
    fs.mkdirSync(TARGET, { recursive: true });
  }

  // Use peggy to compile the grammar to ESM
  const Peggy = require('peggy');
  const grammarPath = path.join(ROOT, 'chain.peggy');
  const grammarSource = fs.readFileSync(grammarPath, 'utf8');

  const parserSource = Peggy.generate(grammarSource, {
    format: 'es',
    output: 'source',
  });

  // The peggy output for ESM uses 'export { ... }' syntax with renamed exports
  // We need to wrap it to also provide a default export using the peg$ prefixed names
  const outputSource = `${parserSource}

// Default export for compatibility
export default { parse: peg$parse, SyntaxError: peg$SyntaxError };
`;

  fs.writeFileSync(path.join(TARGET, 'index.js'), outputSource);

  // Create a package.json in target to mark it as ESM
  fs.writeFileSync(path.join(TARGET, 'package.json'), JSON.stringify({ type: 'module' }, null, 2));

  console.log('@kbn/timelion-grammar: build complete');
}

build().catch((err) => {
  console.error('@kbn/timelion-grammar: build failed', err);
  process.exit(1);
});
