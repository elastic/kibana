/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Writes build metadata for a distributable `@kbn/ui-*` tarball.
 *
 * Shared by every package under `src/platform/kbn-ui/`; invoked from each
 * package's `packaging/scripts/build.sh`. Reads the package manifest that
 * the build has already copied into the target directory, derives the git
 * SHA, and writes `metadata.json` alongside the manifest.
 *
 * Usage: node metadata.js <target-dir>
 *
 * Inputs:
 *   - <target-dir>/package.json
 *   - Current git HEAD (falls back to env BUILD_GIT_SHA, then "unknown")
 *
 * Output:
 *   - <target-dir>/metadata.json
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const targetDir = process.argv[2];
if (!targetDir) {
  console.error('Usage: node metadata.js <target-dir>');
  process.exit(1);
}

const pkgJsonPath = path.join(targetDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

function gitSha() {
  if (process.env.BUILD_GIT_SHA) return process.env.BUILD_GIT_SHA;
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
}

const metadata = {
  name: pkg.name,
  version: pkg.version,
  gitSha: gitSha(),
  buildTimestamp: new Date().toISOString(),
  peerDependencies: pkg.peerDependencies || {},
};

fs.writeFileSync(path.join(targetDir, 'metadata.json'), JSON.stringify(metadata, null, 2) + '\n');

console.log(`    ${metadata.name}@${metadata.version} ${metadata.gitSha.slice(0, 8)}`);
