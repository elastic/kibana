/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { renderPnpmWorkspace } from './render_pnpm_workspace';

describe('renderPnpmWorkspace', () => {
  const workspace = [
    'nodeLinker: hoisted',
    '# START GENERATED PACKAGES',
    'packages:',
    "  - 'src/a'",
    '# END GENERATED PACKAGES',
    '',
    '# Local patches.',
    'patchedDependencies:',
    '  # Why this one is patched.',
    '  some-dev-dep@1.0.0: patches/some-dev-dep@1.0.0.patch',
    '',
    '# Keep a last field entry.',
    'lockfile: true',
    '',
  ].join('\n');

  it('drops the packages and patchedDependencies blocks and keeps the rest', () => {
    expect(renderPnpmWorkspace(workspace)).toBe(
      ['nodeLinker: hoisted', '', '# Keep a last field entry.', 'lockfile: true', ''].join('\n')
    );
  });

  it('drops patchedDependencies from the repo workspace file', () => {
    const rendered = renderPnpmWorkspace(
      Fs.readFileSync(Path.resolve(REPO_ROOT, 'pnpm-workspace.yaml'), 'utf8')
    );
    expect(rendered).not.toContain('patchedDependencies');
    expect(rendered).not.toContain('.patch');
    expect(rendered).toContain('lockfile: true');
  });
});
