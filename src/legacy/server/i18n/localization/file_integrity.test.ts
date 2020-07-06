/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import './file_integrity.test.mocks';

import { getIntegrityHash, getIntegrityHashes } from './file_integrity';

describe('Integrity Hash', () => {
  it('creates a hash from a file given a file path', async () => {
    const filePath = 'somepath.json';
    const expectedHash = '3295d40d2f35ac27145d37fcd5cdc80b';
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
      'somepath1.json': '8cbfe6a9f8174b2d7e77c2111a84f0e6',
      'somepath2.json': '4177c075ade448d6e69fd94b39d0be15',
    });
  });
});
