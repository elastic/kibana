/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const PACKAGE_ROOT = join(__dirname, '..');
const INDEX_PATH = join(PACKAGE_ROOT, 'index.ts');

const FORBIDDEN =
  /\ball_specs\b|\bconnectorsSpecs\b|from ['"]@kbn\/connector-specs(?:\/[^'"]*)?['"]/;

const REQUIRED_EXPORTS = [
  'fromConnectorSpecSchema',
  'narrowSecretsSchemaForAuthMode',
  'getMeta',
  'setMeta',
  'addMeta',
  'ConnectorIconsMap',
  'MAX_CONNECTOR_TYPE_ID_LENGTH',
  'MAX_HANDSHAKE_CHALLENGE_LENGTH',
  'TEST_CONNECTOR_SUB_ACTION',
  'INBOUND_WEBHOOK_CONNECTOR_TYPE_ID',
  'EARS_AUTH_ID',
  'RELAY_AUTH_ID',
  'OAUTH_AUTHORIZATION_CODE_AUTH_ID',
];

function collectSourceFiles(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'target' || entry === 'node_modules') {
      continue;
    }
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      collectSourceFiles(fullPath, files);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry) || /\.test\.(ts|tsx)$/.test(entry)) {
      continue;
    }
    files.push(fullPath);
  }
  return files;
}

describe('@kbn/connector-specs-common public entry', () => {
  it('does not import all_specs, connectorsSpecs, or @kbn/connector-specs', () => {
    const violations: string[] = [];
    for (const file of collectSourceFiles(PACKAGE_ROOT)) {
      const source = readFileSync(file, 'utf8');
      if (FORBIDDEN.test(source)) {
        violations.push(relative(PACKAGE_ROOT, file));
      }
    }
    expect(violations).toEqual([]);
  });

  it('exports browser-safe helpers from the public entry', () => {
    const indexSource = readFileSync(INDEX_PATH, 'utf8');
    expect(indexSource).not.toMatch(/export \*/);
    for (const name of REQUIRED_EXPORTS) {
      expect(indexSource).toContain(name);
    }
  });
});
