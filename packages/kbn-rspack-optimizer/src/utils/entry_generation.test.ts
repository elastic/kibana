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
import { runInNewContext } from 'vm';
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

  it('runs only core and the server-selected plugin loaders', async () => {
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
    const importExpression =
      /import\(\/\* webpackChunkName: "[^"]+" \*\/ "[^"]+"\)\.then\(m => registerPlugin\(("[^"]+"), m\)\)/g;
    const importExpressions = [...content.matchAll(importExpression)];
    const executableContent = content.replace(
      importExpression,
      'Promise.resolve({}).then(m => registerPlugin($1, m))'
    );

    expect(importExpressions).toHaveLength(4);
    expect(content).toContain('webpackChunkName: "plugin-security"');

    const runGeneratedEntry = async (selectedPluginIds?: string[]) => {
      const registeredBundleIds: string[] = [];
      const browserWindow: {
        __kbnPluginIdsToLoad__?: string[];
        __kbnPluginsLoaded?: Promise<void>;
      } = {};
      if (selectedPluginIds !== undefined) {
        browserWindow.__kbnPluginIdsToLoad__ = selectedPluginIds;
      }

      runInNewContext(executableContent, {
        window: browserWindow,
        document: { querySelector: () => null },
        __kbnBundles__: {
          define: (bundleId: string) => registeredBundleIds.push(bundleId),
        },
        console: { log: jest.fn(), error: jest.fn() },
        setTimeout,
      });

      await browserWindow.__kbnPluginsLoaded;
      return registeredBundleIds;
    };

    await expect(runGeneratedEntry(['security'])).resolves.toEqual([
      'entry/core/public',
      'plugin/security/public',
      'plugin/security/common/oauth',
    ]);
    await expect(runGeneratedEntry([])).resolves.toEqual(['entry/core/public']);
    await expect(runGeneratedEntry()).resolves.toEqual([
      'entry/core/public',
      'plugin/security/public',
      'plugin/security/common/oauth',
      'plugin/discover/public',
    ]);
  });
});
