/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createPrefixFileResolver } from './create_prefix_file_resolver';

describe('createPrefixFileResolver', () => {
  it('should strip the repo root and return the base file name', async () => {
    const resolve = createPrefixFileResolver({ repoRoot: '/Users/dev/repos/cloud-ui/' });

    await expect(resolve('/Users/dev/repos/cloud-ui/cloud-ui/public/app.tsx')).resolves.toEqual({
      relativePath: 'cloud-ui/public/app.tsx',
      baseFileName: 'app.tsx',
    });
  });

  it('should accept a repo root without a trailing slash', async () => {
    const resolve = createPrefixFileResolver({ repoRoot: '/Users/dev/repos/cloud-ui' });

    await expect(resolve('/Users/dev/repos/cloud-ui/public/app.tsx')).resolves.toEqual({
      relativePath: 'public/app.tsx',
      baseFileName: 'app.tsx',
    });
  });

  it('should normalize Windows separators', async () => {
    const resolve = createPrefixFileResolver({ repoRoot: 'C:\\repos\\cloud-ui\\' });

    await expect(resolve('C:\\repos\\cloud-ui\\public\\app.tsx')).resolves.toEqual({
      relativePath: 'public/app.tsx',
      baseFileName: 'app.tsx',
    });
  });

  it('should return null for files outside the repo root', async () => {
    const resolve = createPrefixFileResolver({ repoRoot: '/Users/dev/repos/cloud-ui/' });

    await expect(resolve('/Users/dev/repos/cloud-ui-other/public/app.tsx')).resolves.toBeNull();
    await expect(resolve('/Users/dev/repos/cloud-ui/')).resolves.toBeNull();
  });
});
