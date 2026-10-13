/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type normalizePackageData from 'normalize-package-data';

import { detectLicenses } from './detect_licenses';

const packageJson = (fields: Partial<normalizePackageData.Package>) =>
  ({
    name: 'pkg',
    version: '1.0.0',
    readme: 'ERROR: No README data found!',
    ...fields,
  } as normalizePackageData.Package);

describe('detectLicenses', () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'detect-licenses-'));
  });

  afterEach(() => {
    rmSync(directory, { recursive: true });
  });

  it('keeps valid SPDX expressions as declared', () => {
    expect(detectLicenses(directory, packageJson({ license: '(MIT OR Apache-2.0)' }))).toEqual([
      '(MIT OR Apache-2.0)',
    ]);
  });

  it('guesses non-SPDX license names', () => {
    expect(detectLicenses(directory, packageJson({ license: 'MIT License' }))).toEqual(['MIT*']);
  });

  it('reads the LICENSE file when package.json points to it', () => {
    writeFileSync(
      join(directory, 'LICENSE.txt'),
      '\n  Apache License\n  Version 2.0, January 2004'
    );

    expect(
      detectLicenses(directory, packageJson({ license: 'SEE LICENSE IN LICENSE.txt' }))
    ).toEqual(['Apache*']);
  });
});
