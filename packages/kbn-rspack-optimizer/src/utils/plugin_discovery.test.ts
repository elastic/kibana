/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fs from 'fs';
import { REPO_ROOT } from '@kbn/repo-info';
import { discoverPlugins } from './plugin_discovery';

describe('plugin_discovery', () => {
  describe('discoverPlugins', () => {
    let plugins: Awaited<ReturnType<typeof discoverPlugins>>;

    beforeAll(async () => {
      plugins = await discoverPlugins({
        repoRoot: REPO_ROOT,
        examples: false,
        testPlugins: false,
      });
    }, 30000);

    it('should discover plugins', () => {
      expect(plugins.length).toBeGreaterThan(0);
    });

    it('should discover more than 200 plugins (sanity check)', () => {
      expect(plugins.length).toBeGreaterThan(200);
    });

    it('each plugin should have required properties', () => {
      for (const plugin of plugins.slice(0, 10)) {
        expect(plugin.id).toBeDefined();
        expect(typeof plugin.id).toBe('string');
        expect(plugin.contextDir).toBeDefined();
        expect(plugin.manifestPath).toBeDefined();
      }
    });

    it('should include core plugins', () => {
      const corePlugins = ['data', 'kibanaReact', 'dashboard', 'discover'];
      for (const name of corePlugins) {
        const found = plugins.find((p) => p.id === name);
        expect(found).toBeDefined();
      }
    });

    it('should include x-pack plugins', () => {
      const xpackPlugins = ['security', 'spaces', 'alerting'];
      for (const name of xpackPlugins) {
        const found = plugins.find((p) => p.id === name);
        expect(found).toBeDefined();
      }
    });

    it('plugin directories should exist', () => {
      for (const plugin of plugins.slice(0, 10)) {
        expect(Fs.existsSync(plugin.contextDir)).toBe(true);
      }
    });

    it('plugin manifests should exist', () => {
      for (const plugin of plugins.slice(0, 10)) {
        expect(Fs.existsSync(plugin.manifestPath)).toBe(true);
      }
    });
  });

  describe('discoverPlugins with examples', () => {
    let pluginsWithExamples: Awaited<ReturnType<typeof discoverPlugins>>;
    let pluginsWithoutExamples: Awaited<ReturnType<typeof discoverPlugins>>;

    beforeAll(async () => {
      pluginsWithExamples = await discoverPlugins({
        repoRoot: REPO_ROOT,
        examples: true,
        testPlugins: false,
      });
      pluginsWithoutExamples = await discoverPlugins({
        repoRoot: REPO_ROOT,
        examples: false,
        testPlugins: false,
      });
    }, 60000);

    it('should discover more plugins when examples=true', () => {
      expect(pluginsWithExamples.length).toBeGreaterThan(pluginsWithoutExamples.length);
    });
  });

  describe('discoverPlugins with allowlistPluginGroups', () => {
    let allPlugins: Awaited<ReturnType<typeof discoverPlugins>>;
    let platformPlugins: Awaited<ReturnType<typeof discoverPlugins>>;

    beforeAll(async () => {
      allPlugins = await discoverPlugins({
        repoRoot: REPO_ROOT,
        examples: false,
        testPlugins: false,
      });
      platformPlugins = await discoverPlugins({
        repoRoot: REPO_ROOT,
        examples: false,
        testPlugins: false,
        allowlistPluginGroups: ['platform'],
      });
    }, 60000);

    it('discovers fewer plugins when restricted to the platform group', () => {
      expect(platformPlugins.length).toBeLessThan(allPlugins.length);
      expect(platformPlugins.length).toBeGreaterThan(0);
    });

    it('keeps platform plugins and drops solution plugins', () => {
      const ids = new Set(platformPlugins.map((p) => p.id));
      expect(ids.has('data')).toBe(true);
      expect(ids.has('discover')).toBe(true);
      expect(ids.has('securitySolution')).toBe(false);
    });
  });

  describe('discoverPlugins with testPlugins', () => {
    let pluginsWithTest: Awaited<ReturnType<typeof discoverPlugins>>;
    let pluginsWithoutTest: Awaited<ReturnType<typeof discoverPlugins>>;

    beforeAll(async () => {
      pluginsWithTest = await discoverPlugins({
        repoRoot: REPO_ROOT,
        examples: false,
        testPlugins: true,
      });
      pluginsWithoutTest = await discoverPlugins({
        repoRoot: REPO_ROOT,
        examples: false,
        testPlugins: false,
      });
    }, 60000);

    it('should discover more plugins when testPlugins=true', () => {
      expect(pluginsWithTest.length).toBeGreaterThanOrEqual(pluginsWithoutTest.length);
    });
  });
});

describe('discoverPlugins with explicit paths', () => {
  it('includes an explicitly selected test plugin', async () => {
    const pluginPath = Path.resolve(
      REPO_ROOT,
      'src/platform/test/analytics/plugins/analytics_ftr_helpers'
    );
    const plugins = await discoverPlugins({
      repoRoot: REPO_ROOT,
      examples: false,
      testPlugins: false,
      paths: [pluginPath],
    });

    expect(plugins).toContainEqual(
      expect.objectContaining({
        id: 'analyticsFtrHelpers',
        contextDir: pluginPath,
      })
    );
  }, 30000);
});
