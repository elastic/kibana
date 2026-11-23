/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Redis } from 'ioredis';
import { setResponseLimit } from '../../lib/clients/mssql_response_limit';
import { getKey, listKeys, parseInfo } from './key_reader';

const makeClient = (overrides: Record<string, jest.Mock>): Redis => overrides as unknown as Redis;

describe('listKeys', () => {
  it('passes pattern, count and type to SCAN', async () => {
    const scan = jest.fn().mockResolvedValue(['0', ['user:1']]);

    const result = await listKeys(makeClient({ scan }), {
      pattern: 'user:*',
      type: 'hash',
      count: 50,
    });

    expect(scan).toHaveBeenCalledWith('0', 'MATCH', 'user:*', 'COUNT', 50, 'TYPE', 'hash');
    expect(result).toEqual({ keys: ['user:1'], nextCursor: null });
  });

  it('defaults to every key, 100 per page, and omits TYPE when no type is given', async () => {
    const scan = jest.fn().mockResolvedValue(['0', []]);

    await listKeys(makeClient({ scan }), {});

    expect(scan).toHaveBeenCalledWith('0', 'MATCH', '*', 'COUNT', 100);
  });

  it('keeps scanning past empty pages until it has enough keys', async () => {
    const scan = jest
      .fn()
      .mockResolvedValueOnce(['17', []])
      .mockResolvedValueOnce(['42', ['a', 'b']])
      .mockResolvedValueOnce(['0', ['c']]);

    const result = await listKeys(makeClient({ scan }), { count: 3 });

    expect(scan.mock.calls.map((call) => call[0])).toEqual(['0', '17', '42']);
    expect(result).toEqual({ keys: ['a', 'b', 'c'], nextCursor: null });
  });

  it('returns the cursor to continue from when the target is reached before the scan ends', async () => {
    const scan = jest.fn().mockResolvedValue(['99', ['a', 'b']]);

    const result = await listKeys(makeClient({ scan }), { count: 2, cursor: '7' });

    expect(scan).toHaveBeenCalledTimes(1);
    expect(scan).toHaveBeenCalledWith('7', 'MATCH', '*', 'COUNT', 2);
    expect(result).toEqual({ keys: ['a', 'b'], nextCursor: '99' });
  });

  it('keeps a whole page rather than skipping keys past the target', async () => {
    const scan = jest.fn().mockResolvedValue(['5', ['a', 'b', 'c', 'd']]);

    const result = await listKeys(makeClient({ scan }), { count: 2 });

    expect(result.keys).toEqual(['a', 'b', 'c', 'd']);
  });

  it('leaves out names that getKey would reject', async () => {
    const scan = jest.fn().mockResolvedValue(['0', ['ok', '', 'x'.repeat(1025), 'y'.repeat(1024)]]);

    const result = await listKeys(makeClient({ scan }), {});

    expect(result.keys).toEqual(['ok', 'y'.repeat(1024)]);
  });

  it('fails instead of skipping keys when the names exceed the response size limit', async () => {
    const scan = jest.fn().mockResolvedValue(['0', ['a'.repeat(30), 'b'.repeat(30)]]);
    const client = makeClient({ scan });
    setResponseLimit(client, 40);

    await expect(listKeys(client, {})).rejects.toThrow('response size limit');
  });

  it('removes keys that SCAN returned more than once', async () => {
    const scan = jest
      .fn()
      .mockResolvedValueOnce(['3', ['a', 'b']])
      .mockResolvedValueOnce(['0', ['b', 'c']]);

    const result = await listKeys(makeClient({ scan }), { count: 10 });

    expect(result.keys).toEqual(['a', 'b', 'c']);
  });

  it('stops after a bounded number of pages and returns the cursor', async () => {
    const scan = jest.fn().mockResolvedValue(['8', []]);

    const result = await listKeys(makeClient({ scan }), { count: 10 });

    expect(scan).toHaveBeenCalledTimes(50);
    expect(result).toEqual({ keys: [], nextCursor: '8' });
  });
});

describe('getKey', () => {
  const base = { type: jest.fn(), pttl: jest.fn() };

  beforeEach(() => {
    base.type.mockReset();
    base.pttl.mockReset().mockResolvedValue(-1);
  });

  it('reports a missing key without reading a value', async () => {
    base.type.mockResolvedValue('none');

    const result = await getKey(makeClient(base), { key: 'gone' });

    expect(result).toEqual({ key: 'gone', exists: false });
    expect(base.pttl).not.toHaveBeenCalled();
  });

  it('reads a string and reports its expiry in seconds', async () => {
    base.type.mockResolvedValue('string');
    base.pttl.mockResolvedValue(1500);
    const client = makeClient({
      ...base,
      strlen: jest.fn().mockResolvedValue(3),
      get: jest.fn().mockResolvedValue('Ada'),
    });

    expect(await getKey(client, { key: 'name' })).toEqual({
      key: 'name',
      type: 'string',
      ttlSeconds: 2,
      size: 3,
      value: 'Ada',
      truncated: false,
    });
  });

  it('reports a key that expired between TYPE and PTTL as missing', async () => {
    base.type.mockResolvedValue('string');
    base.pttl.mockResolvedValue(-2);

    expect(await getKey(makeClient(base), { key: 'gone' })).toEqual({ key: 'gone', exists: false });
  });

  it('reports no expiry for a key without a TTL', async () => {
    base.type.mockResolvedValue('string');
    const client = makeClient({
      ...base,
      strlen: jest.fn().mockResolvedValue(1),
      get: jest.fn().mockResolvedValue('x'),
    });

    expect(await getKey(client, { key: 'k' })).toMatchObject({ ttlSeconds: null });
  });

  it('cuts a large string to the preview size and flags it', async () => {
    base.type.mockResolvedValue('string');
    const getrange = jest.fn().mockResolvedValue('x'.repeat(65536));
    const get = jest.fn();
    const client = makeClient({
      ...base,
      strlen: jest.fn().mockResolvedValue(1_000_000),
      getrange,
      get,
    });

    const result = await getKey(client, { key: 'blob' });

    expect(getrange).toHaveBeenCalledWith('blob', 0, 65535);
    expect(get).not.toHaveBeenCalled();
    expect(result).toMatchObject({ size: 1_000_000, truncated: true });
  });

  it('cuts a collection that exceeds the response size limit', async () => {
    base.type.mockResolvedValue('list');
    const lrange = jest.fn().mockResolvedValue(['a'.repeat(10), 'b'.repeat(10), 'c'.repeat(10)]);
    const client = makeClient({ ...base, llen: jest.fn().mockResolvedValue(3), lrange });
    setResponseLimit(client, 30);

    const result = (await getKey(client, { key: 'l' })) as { value: string[]; truncated: boolean };

    expect(result.value).toEqual(['a'.repeat(10), 'b'.repeat(10)]);
    expect(result.truncated).toBe(true);
  });

  it('reads a small hash whole', async () => {
    base.type.mockResolvedValue('hash');
    const client = makeClient({
      ...base,
      hlen: jest.fn().mockResolvedValue(2),
      hscan: jest.fn().mockResolvedValue(['0', ['a', '1', 'b', '2']]),
    });

    expect(await getKey(client, { key: 'h', limit: 5 })).toMatchObject({
      value: { a: '1', b: '2' },
      size: 2,
      truncated: false,
    });
  });

  it('keeps a hash field named __proto__', async () => {
    base.type.mockResolvedValue('hash');
    const hscan = jest.fn().mockResolvedValue(['0', ['__proto__', 'x', 'a', '1']]);
    const client = makeClient({ ...base, hlen: jest.fn().mockResolvedValue(2), hscan });

    const result = await getKey(client, { key: 'h', limit: 5 });

    const { value } = result as { value: Record<string, string> };
    expect(Object.keys(value)).toEqual(['__proto__', 'a']);
    expect(value.__proto__).toBe('x');
    expect(JSON.parse(JSON.stringify(value))).toEqual(JSON.parse('{"__proto__":"x","a":"1"}'));
  });

  it('follows the HSCAN cursor to read a whole small hash and drops repeated fields', async () => {
    base.type.mockResolvedValue('hash');
    const hscan = jest
      .fn()
      .mockResolvedValueOnce(['7', ['a', '1']])
      .mockResolvedValueOnce(['0', ['a', '1', 'b', '2']]);
    const client = makeClient({ ...base, hlen: jest.fn().mockResolvedValue(2), hscan });

    const result = await getKey(client, { key: 'h', limit: 5 });

    expect(hscan).toHaveBeenNthCalledWith(2, 'h', '7', 'COUNT', 5);
    expect(result).toMatchObject({ value: { a: '1', b: '2' }, truncated: false });
  });

  it('samples a hash larger than the limit', async () => {
    base.type.mockResolvedValue('hash');
    const hscan = jest.fn().mockResolvedValue(['9', ['a', '1', 'b', '2', 'c', '3']]);
    const client = makeClient({ ...base, hlen: jest.fn().mockResolvedValue(1000), hscan });

    const result = await getKey(client, { key: 'h', limit: 2 });

    expect(hscan).toHaveBeenCalledWith('h', '0', 'COUNT', 2);
    expect(result).toMatchObject({ value: { a: '1', b: '2' }, size: 1000, truncated: true });
  });

  it('reads the first elements of a list and flags a longer one', async () => {
    base.type.mockResolvedValue('list');
    const lrange = jest.fn().mockResolvedValue(['x', 'y']);
    const client = makeClient({ ...base, llen: jest.fn().mockResolvedValue(10), lrange });

    const result = await getKey(client, { key: 'l', limit: 2 });

    expect(lrange).toHaveBeenCalledWith('l', 0, 1);
    expect(result).toMatchObject({ value: ['x', 'y'], size: 10, truncated: true });
  });

  it('reads a small set whole and samples a large one with SSCAN', async () => {
    base.type.mockResolvedValue('set');
    const smembers = jest.fn().mockResolvedValue(['a']);
    const sscan = jest.fn().mockResolvedValue(['4', ['a', 'b', 'c']]);

    const small = await getKey(
      makeClient({ ...base, scard: jest.fn().mockResolvedValue(1), smembers, sscan }),
      { key: 's', limit: 2 }
    );
    const large = await getKey(
      makeClient({ ...base, scard: jest.fn().mockResolvedValue(50), smembers, sscan }),
      { key: 's', limit: 2 }
    );

    expect(small).toMatchObject({ value: ['a'], truncated: false });
    expect(large).toMatchObject({ value: ['a', 'b'], size: 50, truncated: true });
    expect(smembers).toHaveBeenCalledTimes(1);
  });

  it('pairs sorted set members with numeric scores', async () => {
    base.type.mockResolvedValue('zset');
    const zrange = jest.fn().mockResolvedValue(['ada', '1.5', 'bob', '2']);
    const client = makeClient({ ...base, zcard: jest.fn().mockResolvedValue(2), zrange });

    const result = await getKey(client, { key: 'z', limit: 10 });

    expect(zrange).toHaveBeenCalledWith('z', 0, '9', 'WITHSCORES');
    expect(result).toMatchObject({
      value: [
        { member: 'ada', score: 1.5 },
        { member: 'bob', score: 2 },
      ],
      truncated: false,
    });
  });

  it('keeps infinite sorted set scores as strings', async () => {
    base.type.mockResolvedValue('zset');
    const zrange = jest.fn().mockResolvedValue(['lo', '-inf', 'hi', 'inf']);
    const client = makeClient({ ...base, zcard: jest.fn().mockResolvedValue(2), zrange });

    const result = await getKey(client, { key: 'z', limit: 10 });

    expect(result).toMatchObject({
      value: [
        { member: 'lo', score: '-inf' },
        { member: 'hi', score: 'inf' },
      ],
    });
  });

  it('turns stream entries into an id and ordered field pairs', async () => {
    base.type.mockResolvedValue('stream');
    const xrange = jest.fn().mockResolvedValue([['1-0', ['temp', '21', 'unit', 'C']]]);
    const client = makeClient({ ...base, xlen: jest.fn().mockResolvedValue(5), xrange });

    const result = await getKey(client, { key: 'events', limit: 1 });

    expect(xrange).toHaveBeenCalledWith('events', '-', '+', 'COUNT', 1);
    expect(result).toMatchObject({
      value: [
        {
          id: '1-0',
          fields: [
            ['temp', '21'],
            ['unit', 'C'],
          ],
        },
      ],
      size: 5,
      truncated: true,
    });
  });

  it('returns the type with no value for a module type it cannot read', async () => {
    base.type.mockResolvedValue('ReJSON-RL');

    expect(await getKey(makeClient(base), { key: 'doc' })).toMatchObject({
      type: 'ReJSON-RL',
      value: null,
      size: null,
    });
  });
});

describe('parseInfo', () => {
  it('maps INFO fields to values and drops section headers', () => {
    const raw =
      '# Server\r\nredis_version:7.2.4\r\nuptime_in_seconds:42\r\n\r\n# Keyspace\r\ndb0:keys=3,expires=0\r\n';

    expect(parseInfo(raw)).toEqual({
      redis_version: '7.2.4',
      uptime_in_seconds: '42',
      db0: 'keys=3,expires=0',
    });
  });

  it('keeps colons inside a value', () => {
    expect(parseInfo('executable:/usr/local/bin/redis-server\nconfig_file:C:\\redis.conf')).toEqual(
      {
        executable: '/usr/local/bin/redis-server',
        config_file: 'C:\\redis.conf',
      }
    );
  });
});
