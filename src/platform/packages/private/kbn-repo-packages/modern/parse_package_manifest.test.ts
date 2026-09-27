/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import { readPackageManifest } from './parse_package_manifest';

const REPO_ROOT = Path.resolve(__dirname, '..', '..', '..', '..', '..', '..');

const writeManifest = (plugin: Record<string, unknown>): string => {
  const dir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'kbn-manifest-'));
  const path = Path.join(dir, 'kibana.jsonc');
  Fs.writeFileSync(
    path,
    JSON.stringify({
      type: 'plugin',
      id: '@kbn/test-lazy-plugin',
      owner: '@elastic/kibana-core',
      group: 'platform',
      visibility: 'private',
      plugin,
    })
  );
  return path;
};

describe('enableLazyInitialize manifest parse', () => {
  it('accepts the flag when the plugin has a server entry', () => {
    const path = writeManifest({
      id: 'testLazyPlugin',
      browser: true,
      server: true,
      enableLazyInitialize: true,
    });

    expect(readPackageManifest(REPO_ROOT, path).plugin.enableLazyInitialize).toBe(true);
  });

  it('rejects the flag when the plugin has no server entry', () => {
    const path = writeManifest({
      id: 'testLazyPlugin',
      browser: true,
      server: false,
      enableLazyInitialize: true,
    });

    expect(() => readPackageManifest(REPO_ROOT, path)).toThrow(/requires plugin.server to be true/);
  });
});
