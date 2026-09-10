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
import { loadJsonFile } from '@kbn/utils';

import execa from 'execa';
import { REPO_ROOT } from '@kbn/repo-info';
import AdmZip from 'adm-zip';
import del from 'del';
import { globby } from 'globby';

const PLUGIN_DIR = Path.resolve(REPO_ROOT, 'plugins/foo_test_plugin');
const PLUGIN_BUILD_DIR = Path.resolve(PLUGIN_DIR, 'build');
const PLUGIN_ARCHIVE = Path.resolve(PLUGIN_BUILD_DIR, `fooTestPlugin-7.5.0.zip`);
const TMP_DIR = Path.resolve(__dirname, '__tmp__');

describe('scripts/generate_plugin', () => {
  beforeEach(async () => {
    await del([PLUGIN_DIR, TMP_DIR]);
    Fs.mkdirSync(TMP_DIR);
  });
  afterEach(async () => await del([PLUGIN_DIR, TMP_DIR]));

  it('builds a generated plugin into a viable archive', async () => {
    await execa(process.execPath, ['scripts/generate_plugin', '-y', '--name', 'fooTestPlugin'], {
      cwd: REPO_ROOT,
      all: true,
    });

    const filterLogs = (logs: string | undefined) => {
      return logs
        ?.split('\n')
        .filter((l) => !l.includes('failed to reach ci-stats service'))
        .join('\n');
    };

    const buildProc = await execa(
      process.execPath,
      ['../../scripts/plugin_helpers', 'build', '--kibana-version', '7.5.0'],
      {
        cwd: PLUGIN_DIR,
        all: true,
      }
    );

    const logs = filterLogs(buildProc.all) ?? '';
    expect(logs).toContain('browser bundle created');
    expect(logs).toContain('plugin archive created');

    const zip = new AdmZip(PLUGIN_ARCHIVE);
    await zip.extractAllToAsync(TMP_DIR);

    const files = await globby(['**/*'], { cwd: TMP_DIR, dot: true });

    const publicFiles = files.filter((f) => f.includes('target/public/'));
    expect(publicFiles.length).toBeGreaterThanOrEqual(1);

    const mainBundle = publicFiles.find(
      (f) => f.endsWith('.plugin.js') || f.endsWith('.plugin.js.br')
    );
    expect(mainBundle).toBeDefined();

    const serverFiles = files.filter((f) => f.includes('server/'));
    expect(serverFiles.length).toBeGreaterThan(0);

    expect(
      loadJsonFile(Path.resolve(TMP_DIR, 'kibana', 'fooTestPlugin', 'kibana.json'))
    ).toMatchObject({
      id: 'fooTestPlugin',
      kibanaVersion: '7.5.0',
      server: true,
      ui: true,
    });
  });
});
