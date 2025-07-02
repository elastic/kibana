/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { getRepoFiles } from '@kbn/get-repo-files';
import { countEnzymeImports } from './count_enzyme_imports';

describe('count', () => {
  test('number of "enzyme" imports in this file', async () => {
    const { enzymeImportCount } = await countEnzymeImports([Path.resolve(__dirname, __filename)]);
    expect(enzymeImportCount).toBe(0);
  });

  test('number of "enzyme" imports in this directory', async () => {
    const allFiles = await getRepoFiles([__dirname]);
    const { enzymeImportCount } = await countEnzymeImports(Array.from(allFiles, (f) => f.abs));
    expect(enzymeImportCount).toBe(1);
  });
});
