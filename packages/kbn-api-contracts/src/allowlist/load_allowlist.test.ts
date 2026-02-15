/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loadAllowlist, isAllowlisted } from './load_allowlist';
import { writeFileSync, unlinkSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('loadAllowlist', () => {
  const testDir = join(tmpdir(), 'kbn-api-contracts-test');
  const testAllowlistPath = join(testDir, 'test-allowlist.json');

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    try {
      rmSync(testDir, { recursive: true });
    } catch {
      // ignore cleanup errors
    }
  });

  afterEach(() => {
    try {
      unlinkSync(testAllowlistPath);
    } catch {
      // ignore if file doesn't exist
    }
  });

  it('returns empty entries when file does not exist', () => {
    const result = loadAllowlist('/nonexistent/path/allowlist.json');

    expect(result.entries).toEqual([]);
  });

  it('loads and parses allowlist file', () => {
    const allowlist = {
      entries: [
        {
          path: '/api/saved_objects/{type}/{id}',
          method: 'delete',
          reason: 'Intentional removal',
          approvedBy: 'test-user',
        },
      ],
    };

    writeFileSync(testAllowlistPath, JSON.stringify(allowlist));
    const result = loadAllowlist(testAllowlistPath);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].path).toBe('/api/saved_objects/{type}/{id}');
    expect(result.entries[0].method).toBe('delete');
  });

  it('filters out expired entries', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const allowlist = {
      entries: [
        {
          path: '/api/expired',
          method: 'get',
          reason: 'Expired entry',
          approvedBy: 'test-user',
          expiresAt: yesterday.toISOString().split('T')[0],
        },
        {
          path: '/api/active',
          method: 'get',
          reason: 'Active entry',
          approvedBy: 'test-user',
          expiresAt: tomorrow.toISOString().split('T')[0],
        },
        {
          path: '/api/no-expiry',
          method: 'get',
          reason: 'No expiration',
          approvedBy: 'test-user',
        },
      ],
    };

    writeFileSync(testAllowlistPath, JSON.stringify(allowlist));
    const result = loadAllowlist(testAllowlistPath);

    expect(result.entries).toHaveLength(2);
    expect(result.entries.map((e) => e.path)).toEqual(['/api/active', '/api/no-expiry']);
  });
});

describe('isAllowlisted', () => {
  it('returns true for matching path and method', () => {
    const allowlist = {
      entries: [
        {
          path: '/api/saved_objects/{type}/{id}',
          method: 'delete',
          reason: 'Test',
          approvedBy: 'test-user',
        },
      ],
    };

    expect(isAllowlisted(allowlist, '/api/saved_objects/{type}/{id}', 'delete')).toBe(true);
    expect(isAllowlisted(allowlist, '/api/saved_objects/{type}/{id}', 'DELETE')).toBe(true);
  });

  it('returns false for non-matching path', () => {
    const allowlist = {
      entries: [
        {
          path: '/api/saved_objects/{type}/{id}',
          method: 'delete',
          reason: 'Test',
          approvedBy: 'test-user',
        },
      ],
    };

    expect(isAllowlisted(allowlist, '/api/other/path', 'delete')).toBe(false);
  });

  it('returns false for non-matching method', () => {
    const allowlist = {
      entries: [
        {
          path: '/api/saved_objects/{type}/{id}',
          method: 'delete',
          reason: 'Test',
          approvedBy: 'test-user',
        },
      ],
    };

    expect(isAllowlisted(allowlist, '/api/saved_objects/{type}/{id}', 'get')).toBe(false);
  });

  it('returns false for empty allowlist', () => {
    const allowlist = { entries: [] };

    expect(isAllowlisted(allowlist, '/api/any/path', 'get')).toBe(false);
  });
});
