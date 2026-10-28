/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { InflightReads } from './inflight_reads';

describe('InflightReads', () => {
  it('calls read once when concurrent runs share a key', async () => {
    const reads = new InflightReads<string>();
    let calls = 0;
    const read = () => {
      calls += 1;
      return Promise.resolve('value');
    };

    const [first, second] = await Promise.all([reads.run('key', read), reads.run('key', read)]);

    expect(first).toBe('value');
    expect(second).toBe('value');
    expect(calls).toBe(1);
  });

  it('reads again after the previous read resolves', async () => {
    const reads = new InflightReads<number>();
    let calls = 0;
    const read = () => {
      calls += 1;
      return Promise.resolve(calls);
    };

    await expect(reads.run('key', read)).resolves.toBe(1);
    await expect(reads.run('key', read)).resolves.toBe(2);
    expect(calls).toBe(2);
  });

  it('reads again after the previous read rejects', async () => {
    const reads = new InflightReads<string>();
    let calls = 0;
    const read = () => {
      calls += 1;
      return Promise.reject(new Error(`nope ${calls}`));
    };

    await expect(reads.run('key', read)).rejects.toThrow('nope 1');
    await expect(reads.run('key', read)).rejects.toThrow('nope 2');
    expect(calls).toBe(2);
  });

  it('keeps different keys independent', async () => {
    const reads = new InflightReads<string>();
    const calls: string[] = [];
    let release = (_value: string) => {};
    const pending = new Promise<string>((resolve) => {
      release = resolve;
    });

    const first = reads.run('a', () => {
      calls.push('a');
      return pending;
    });
    await expect(
      reads.run('b', () => {
        calls.push('b');
        return Promise.resolve('from-b');
      })
    ).resolves.toBe('from-b');

    expect(calls).toEqual(['a', 'b']);
    release('from-a');
    await expect(first).resolves.toBe('from-a');
  });
});
