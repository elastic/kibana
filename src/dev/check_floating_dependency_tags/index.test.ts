/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import os from 'os';
import path from 'path';

import { findUnpinnedFloatingDependencies } from '.';

test('finds nested latest dependencies and accepts matching parent overrides', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'kibana-floating-deps-'));
  const modulesDir = path.join(directory, 'node_modules');
  const parentDir = path.join(modulesDir, '@example', 'parent');
  const childDir = path.join(parentDir, 'node_modules', 'child');
  fs.mkdirSync(childDir, { recursive: true });
  fs.writeFileSync(
    path.join(parentDir, 'package.json'),
    JSON.stringify({
      name: '@example/parent',
      version: '1.0.0',
      dependencies: { moving: 'latest', aliased: 'npm:@example/actual-package@latest' },
      peerDependencies: { peer: 'latest' },
    })
  );
  fs.writeFileSync(
    path.join(childDir, 'package.json'),
    JSON.stringify({
      name: 'child',
      version: '2.0.0',
      optionalDependencies: { optional: 'latest' },
    })
  );

  expect(findUnpinnedFloatingDependencies([modulesDir], {})).toEqual([
    { parent: '@example/parent', version: '1.0.0', dependency: 'moving' },
    { parent: '@example/parent', version: '1.0.0', dependency: 'aliased' },
    { parent: 'child', version: '2.0.0', dependency: 'optional' },
  ]);
  expect(
    findUnpinnedFloatingDependencies([modulesDir], {
      '@example/parent>moving': '1.2.3',
      '@example/parent>aliased': 'npm:@example/actual-package@2.3.4',
      optional: '2.3.4',
    })
  ).toEqual([]);
  expect(
    findUnpinnedFloatingDependencies([modulesDir], {
      '@example/parent>moving': 'latest',
      '@example/parent>aliased': 'npm:@example/actual-package@latest',
      optional: '*',
    }).length
  ).toBe(3);
  for (const override of [
    '^1.2.3',
    '>=1.2.3',
    'next',
    'catalog:',
    'npm:@example/actual-package@latest',
  ]) {
    expect(
      findUnpinnedFloatingDependencies([modulesDir], {
        moving: override,
        aliased: '2.3.4',
        optional: '2.3.4',
      })
    ).toEqual([{ parent: '@example/parent', version: '1.0.0', dependency: 'moving' }]);
  }
  expect(
    findUnpinnedFloatingDependencies([modulesDir], {
      moving: '1.2.3',
      '@example/parent>moving': 'latest',
      aliased: '2.3.4',
      optional: '2.3.4',
    })
  ).toEqual([{ parent: '@example/parent', version: '1.0.0', dependency: 'moving' }]);
  expect(
    findUnpinnedFloatingDependencies([modulesDir], {
      '@example/parent@^1.0.0>moving': '1.2.3',
      aliased: '2.3.4',
      optional: '2.3.4',
    })
  ).toEqual([]);
  expect(
    findUnpinnedFloatingDependencies([modulesDir], {
      '@example/parent@^2.0.0>moving': '1.2.3',
      aliased: '2.3.4',
      optional: '2.3.4',
    })
  ).toEqual([{ parent: '@example/parent', version: '1.0.0', dependency: 'moving' }]);

  const workspaceModulesDir = path.join(directory, 'workspace', 'node_modules');
  const workspacePackageDir = path.join(workspaceModulesDir, 'workspace-only');
  fs.mkdirSync(workspacePackageDir, { recursive: true });
  fs.writeFileSync(
    path.join(workspacePackageDir, 'package.json'),
    JSON.stringify({
      name: 'workspace-only',
      version: '1.0.0',
      dependencies: { drifting: 'latest' },
    })
  );
  expect(
    findUnpinnedFloatingDependencies([modulesDir, workspaceModulesDir], {
      '@example/parent>moving': '1.2.3',
      aliased: '2.3.4',
      optional: '2.3.4',
    })
  ).toEqual([{ parent: 'workspace-only', version: '1.0.0', dependency: 'drifting' }]);
  fs.rmSync(directory, { recursive: true, force: true });
});
