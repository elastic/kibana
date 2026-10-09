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

import { parse } from 'yaml';
import { renderPnpmWorkspace } from './render_pnpm_workspace';

const workspace = `# START GENERATED PACKAGES
packages:
  - packages/example
# END GENERATED PACKAGES
nodeLinker: hoisted
patchedDependencies:
  zod@4.4.3: patches/zod.patch
  '@elastic/eui@123.0.0': patches/eui.patch
  '@scope/unversioned': patches/unversioned.patch
  ordered-binary@1.6.1: patches/ordered_binary.patch
`;

it('keeps patches for direct, transitive, and unversioned production dependencies', () => {
  const rendered = renderPnpmWorkspace(
    workspace,
    new Set(['zod', '@elastic/eui', '@scope/unversioned'])
  );
  expect(parse(rendered)).toEqual({
    nodeLinker: 'hoisted',
    patchedDependencies: {
      'zod@4.4.3': 'patches/zod.patch',
      '@elastic/eui@123.0.0': 'patches/eui.patch',
      '@scope/unversioned': 'patches/unversioned.patch',
    },
  });
});

it('retains a patch for a used package so pnpm still validates its version', () => {
  expect(renderPnpmWorkspace(workspace, new Set(['zod']))).toContain('zod@4.4.3');
});

it('removes an empty patch map when production uses none of the patched packages', () => {
  expect(parse(renderPnpmWorkspace(workspace, new Set()))).toEqual({ nodeLinker: 'hoisted' });
});

it('preserves all authored settings when a dependency graph is not supplied', () => {
  expect(renderPnpmWorkspace(workspace)).toContain('ordered-binary@1.6.1');
  expect(renderPnpmWorkspace(workspace)).not.toContain('packages:');
});
