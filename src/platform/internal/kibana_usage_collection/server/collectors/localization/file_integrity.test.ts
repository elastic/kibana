/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './file_integrity.test.mocks';

import { getIntegrityHash, getIntegrityHashes } from './file_integrity';

describe('Integrity Hash', () => {
  it('creates a hash from a file given a file path', async () => {
    const filePath = 'somepath.json';
    const expectedHash = '9bcf0afb8da5b3193be0d359c543eeca8ee85de2446c36e3aa64caccec18f7e3';
    const integrityHash = await getIntegrityHash(filePath);
    expect(integrityHash).toEqual(expectedHash);
  });

  it('returns null on error', async () => {
    const filePath = 'ERROR';
    const integrityHash = await getIntegrityHash(filePath);
    expect(integrityHash).toEqual(null);
  });
});

describe('Integrity Hashes', () => {
  it('returns an object with each filename and its hash', async () => {
    const filePaths = ['somepath1.json', 'somepath2.json'];
    const integrityHashes = await getIntegrityHashes(filePaths);
    expect(integrityHashes).toEqual({
      'somepath1.json': '28482a9b0465621cc5ff3050abd4f87ae051afc5f0088b90d26dbaa62f5f57b5',
      'somepath2.json': '2172443c25237c7f9a987f0ff460d360830452e32a14d97237fdddb52661e153',
    });
  });
});
