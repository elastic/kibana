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

import { collectSharedDepsFingerprint } from './shared_deps_fingerprint';

const writeTree = (root: string, files: Record<string, string>) => {
  for (const [rel, content] of Object.entries(files)) {
    Fs.mkdirSync(Path.dirname(Path.join(root, rel)), { recursive: true });
    Fs.writeFileSync(Path.join(root, rel), content);
  }
};

const pkg = (name: string, version: string, extra: object = {}) =>
  JSON.stringify({ name, version, ...extra });

describe('collectSharedDepsFingerprint', () => {
  let repoRoot: string;

  beforeAll(() => {
    repoRoot = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'shared-deps-fp-'));
    writeTree(repoRoot, {
      'pkg/moon.yml': [
        'fileGroups:',
        '  src:',
        "    - 'src/**/*'",
        "    - '!target/**/*'",
        'tasks:',
        '  build-webpack:',
        '    inputs:',
        "      - '@group(src)'",
        '      - webpack.config.js',
        "      - '/other/**/*.{js,ts,tsx}'",
        '',
      ].join('\n'),
      'pkg/src/entry.js': `
        require('a');
        import { x } from '@kbn/some-pkg';
        import type { T } from 'types-only/sub/path';
        const label = i18n.translate('x', { defaultMessage: 'from {name}' });
        import './local';
      `,
      'pkg/src/entry.test.js': `require('should-not-be-scanned');`,
      'pkg/webpack.config.js': `module.exports = { entry: { main: ['./src/worker.ts', 'e/sub'] } };`,
      'pkg/src/worker.ts': `import 'worker-dep';`,
      'other/mod.ts': `export * from 'other-dep';`,
      'node_modules/a/package.json': pkg('a', '1.0.0', {
        dependencies: { b: '*' },
        optionalDependencies: { missing: '*' },
      }),
      'node_modules/a/node_modules/b/package.json': pkg('b', '2.0.0'),
      'node_modules/b/package.json': pkg('b', '1.0.0'),
      'node_modules/types-only/package.json': pkg('types-only', '3.0.0'),
      'node_modules/e/package.json': pkg('e', '5.0.0', { dependencies: { b: '*' } }),
      'node_modules/worker-dep/package.json': pkg('worker-dep', '6.0.0'),
      'node_modules/other-dep/package.json': pkg('other-dep', '7.0.0'),
      'node_modules/extra/package.json': pkg('extra', '8.0.0'),
    });
  });

  afterAll(() => {
    Fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  it('closes imports found in moon inputs and webpack entries over node_modules', () => {
    const lines = collectSharedDepsFingerprint({
      repoRoot,
      moonProjects: ['pkg'],
      webpackConfigs: ['pkg/webpack.config.js'],
      packages: ['extra'],
    });

    expect(lines).toEqual([
      'a@1.0.0',
      'b@1.0.0',
      'b@2.0.0',
      'e@5.0.0',
      'extra@8.0.0',
      'other-dep@7.0.0',
      'types-only@3.0.0',
      'worker-dep@6.0.0',
    ]);
  });
});
