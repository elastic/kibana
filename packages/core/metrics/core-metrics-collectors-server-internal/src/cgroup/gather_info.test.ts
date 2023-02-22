/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import mockFs from 'mock-fs';
import { gatherInfo } from './gather_info';

describe('gatherInfo', () => {
  afterEach(() => mockFs.restore());

  test('parse cgroup file entries', async () => {
    mockFs({
      '/proc/self/cgroup': `0:controller:/path
      1:controller2,controller3:/otherpath`,
    });
    const { data } = await gatherInfo();
    expect(data).toEqual({
      controller: '/path',
      controller2: '/otherpath',
      controller3: '/otherpath',
    });
  });

  test('detect cgroup version', async () => {
    mockFs({
      '/proc/self/cgroup': `0:controller:/path
      1:controller2,controller3:/otherpath`,
    });
    await expect(gatherInfo()).resolves.toMatchObject({ v2: false });
    mockFs({
      '/proc/self/cgroup': `

      0::/path

`,
    });
    await expect(gatherInfo()).resolves.toMatchObject({ v2: true });
  });

  test('missing cgroup file', async () => {
    mockFs({});
    await expect(gatherInfo()).rejects.toMatchObject({ code: 'ENOENT' });
  });

  test('invalid cgroup file', async () => {
    mockFs({
      '/proc/self/cgroup': `invalid`,
    });
    await expect(gatherInfo()).resolves.toEqual({ data: {}, v2: false });
  });
});
