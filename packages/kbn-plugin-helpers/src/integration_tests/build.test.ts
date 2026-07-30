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
import extract from 'extract-zip';
import del from 'del';
import globby from 'globby';

const PLUGIN_DIR = Path.resolve(REPO_ROOT, 'plugins/foo_test_plugin');
const PLUGIN_BUILD_DIR = Path.resolve(PLUGIN_DIR, 'build');
const PLUGIN_ARCHIVE = Path.resolve(PLUGIN_BUILD_DIR, 'fooTestPlugin-7.5.0.zip');
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

    const buildProc = await execa(
      process.execPath,
      ['../../scripts/plugin_helpers', 'build', '--kibana-version', '7.5.0'],
      { cwd: PLUGIN_DIR, all: true }
    );

    expect(buildProc.all).toContain('running @kbn/optimizer');
    expect(buildProc.all).toContain('browser bundle created');
    expect(buildProc.all).toContain('plugin archive created');

    await extract(PLUGIN_ARCHIVE, { dir: TMP_DIR });
    const files = await globby(['**/*'], { cwd: TMP_DIR, dot: true });
    const publicFiles = files.filter((file) => file.includes('target/public/'));

    expect(publicFiles.length).toBeGreaterThanOrEqual(1);
    expect(
      publicFiles.find((file) => file.endsWith('.plugin.js') || file.endsWith('.plugin.js.br'))
    ).toBeDefined();
    expect(files.some((file) => file.includes('server/'))).toBe(true);
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
