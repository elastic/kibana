/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getLocalFileDependencyPaths } from './local_file_dependencies';

const workspaceYaml = `
overrides:
  from-workspace: file:./archives/workspace.tgz
`;

it('finds unique local dependency files from package manifests and pnpm overrides', () => {
  const pkg = {
    dependencies: {
      local: 'file:./archives/dependency.tgz',
      registry: '1.0.0',
    },
    devDependencies: {
      duplicate: 'file:./archives/dependency.tgz',
    },
    resolutions: {
      transitive: 'file:./archives/resolution.tgz',
    },
  };

  expect(getLocalFileDependencyPaths(pkg, workspaceYaml)).toEqual([
    'archives/dependency.tgz',
    'archives/resolution.tgz',
    'archives/workspace.tgz',
  ]);
});

it.each(['file:../outside.tgz', 'file:/outside.tgz'])(
  'rejects local dependencies outside the repository: %s',
  (specifier) => {
    const pkg = {
      dependencies: {
        local: specifier,
      },
    };

    expect(() => getLocalFileDependencyPaths(pkg, 'overrides: {}')).toThrow(
      `local dependency must reference a file inside the repository: ${specifier}`
    );
  }
);
