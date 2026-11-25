/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import { createUnifiedEntry } from './entry_generation';

describe('createUnifiedEntry', () => {
  let repoRoot: string;
  let wrapperDir: string;

  beforeEach(() => {
    repoRoot = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'kbn-rspack-entry-'));
    wrapperDir = Path.join(repoRoot, 'wrappers');
    Fs.mkdirSync(wrapperDir, { recursive: true });
  });

  afterEach(() => {
    Fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  it('generates statically analyzable loaders gated by the server selection', () => {
    const entryPaths = ['core', 'security', 'security_oauth', 'discover'].map((name) => {
      const entryPath = Path.join(repoRoot, `${name}.js`);
      Fs.writeFileSync(entryPath, `export const name = ${JSON.stringify(name)};\n`);
      return entryPath;
    });

    const unifiedEntryPath = createUnifiedEntry(wrapperDir, repoRoot, [
      {
        id: 'core',
        path: entryPaths[0],
        bundleId: 'entry/core/public',
        pluginId: 'core',
      },
      {
        id: 'security',
        path: entryPaths[1],
        bundleId: 'plugin/security/public',
        pluginId: 'security',
      },
      {
        id: 'security/common/oauth',
        path: entryPaths[2],
        bundleId: 'plugin/security/common/oauth',
        pluginId: 'security',
      },
      {
        id: 'discover',
        path: entryPaths[3],
        bundleId: 'plugin/discover/public',
        pluginId: 'discover',
      },
    ]);

    const content = Fs.readFileSync(unifiedEntryPath, 'utf-8');

    expect(content).toContain('window.__kbnPluginIdsToLoad__');
    expect(content).toContain("pluginId === 'core' || selectedPluginIds.has(pluginId)");
    expect(content).toContain(': pluginLoaders;');
    expect(content.match(/pluginId: "security"/g)).toHaveLength(2);
    expect(content).toContain('plugin/security/public');
    expect(content).toContain('plugin/security/common/oauth');
    expect(content).toContain('plugin/discover/public');
    expect(content).toContain('webpackChunkName: "plugin-security"');
  });
});
