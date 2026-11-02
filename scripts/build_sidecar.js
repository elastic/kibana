/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { execSync } = require('child_process');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SIDECAR_DIR = path.join(REPO_ROOT, 'src/platform/sidecar');
const OUTPUT = path.join(SIDECAR_DIR, 'kbn-sidecar');

const goos = process.argv[2] || process.platform === 'win32' ? 'windows' : process.platform;
const goarch = process.argv[3] || (process.arch === 'arm64' ? 'arm64' : 'amd64');

console.log(`Building kbn-sidecar for ${goos}/${goarch}...`);

execSync(`go build -o ${OUTPUT} ./cmd/kbn-sidecar/`, {
  cwd: SIDECAR_DIR,
  stdio: 'inherit',
  env: {
    ...process.env,
    GOOS: goos === 'win32' ? 'windows' : goos,
    GOARCH: goarch,
    CGO_ENABLED: '0',
  },
});

console.log(`Built: ${OUTPUT}`);
