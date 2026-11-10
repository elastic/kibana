/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync, spawnSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { basename, dirname, join, resolve } from 'path';
import { bin } from 'oxlint/package.json';

const PACKAGE_DIR = resolve(__dirname, '../..');
const OXLINT_BIN = join(dirname(require.resolve('oxlint/package.json')), bin.oxlint);

interface OxlintDiagnostic {
  code: string;
  filename: string;
  labels: Array<{ span: { line: number } }>;
}

it('passes every rule test case in Oxlint', () => {
  execFileSync(process.execPath, [resolve(__dirname, '__fixtures__/run_rule_tests.mjs')], {
    cwd: resolve(PACKAGE_DIR, '../..'),
    stdio: 'inherit',
  });
});

describe('in the Oxlint CLI', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'kbn-eslint-plugin-disable-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('reports disable comments that would otherwise suppress their own report', () => {
    const files = {
      'naked_block_at_file_start.ts': '/* eslint-disable */\nconst a = 1;\n',
      'naked_block.ts': 'const a = 1;\n/* oxlint-disable */\nconst b = 2;\n',
      'naked_line.ts': "alert('a'); // eslint-disable-line\n",
      'protected_block.ts': '/* eslint-disable @kbn/disable/no_protected_eslint_disable */\n',
      'protected_line.ts':
        "alert('a'); // oxlint-disable-line @kbn/disable/no_protected_eslint_disable\n",
    };
    for (const [name, code] of Object.entries(files)) {
      writeFileSync(join(dir, name), code);
    }
    const configPath = join(dir, 'oxlint.config.json');
    writeFileSync(
      configPath,
      JSON.stringify({
        jsPlugins: [{ name: '@kbn/disable', specifier: join(PACKAGE_DIR, 'oxlint_plugin.js') }],
        categories: { correctness: 'off' },
        rules: {
          '@kbn/disable/no_naked_eslint_disable': 'error',
          '@kbn/disable/no_protected_eslint_disable': 'error',
        },
      })
    );

    const { stdout } = spawnSync(
      process.execPath,
      [OXLINT_BIN, '--config', configPath, '--format', 'json', dir],
      { encoding: 'utf8' }
    );
    const { diagnostics } = JSON.parse(stdout) as { diagnostics: OxlintDiagnostic[] };

    expect(
      diagnostics
        .map(({ code, filename, labels }) => `${basename(filename)}:${labels[0].span.line} ${code}`)
        .sort()
    ).toEqual([
      'naked_block.ts:2 @kbn/disable(no_naked_eslint_disable)',
      'naked_block_at_file_start.ts:1 @kbn/disable(no_naked_eslint_disable)',
      'naked_line.ts:1 @kbn/disable(no_naked_eslint_disable)',
      'protected_block.ts:1 @kbn/disable(no_protected_eslint_disable)',
      'protected_line.ts:1 @kbn/disable(no_protected_eslint_disable)',
    ]);
  });
});
