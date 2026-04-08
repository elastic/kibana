/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import crypto from 'node:crypto';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { createTestServers, type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
// @ts-expect-error json-merge-patch has no type definitions
import { generate as generateMergePatch } from 'json-merge-patch';

// ── Inline flatten/unflatten (stand-in for @kbn/object-utils) ──────────────────

function flatten(
  obj: Record<string, any>,
  prefix = '',
  result: Record<string, any> = {}
): Record<string, any> {
  for (const key of Object.keys(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      flatten(value, newKey, result);
    } else {
      result[newKey] = value;
    }
  }
  return result;
}

function unflatten(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const parts = key.split('.');
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }
  return result;
}

const INDEX_NAME = 'diff_persistence_test';

const { startES } = createTestServers({
  adjustTimeout: (t: number) => jest.setTimeout(t),
  settings: {
    es: {
      license: 'basic',
    },
  },
});

// ── Inlined types (from original ChangeTracking module) ────────────────────────

interface ChangeTrackingDataMaskingFields {
  [key: string]: boolean | ChangeTrackingDataMaskingFields;
}

interface ChangeTrackingDiffOptions {
  a: Record<string, any>;
  b: Record<string, any>;
  ignoreFields?: ChangeTrackingDataMaskingFields;
}

interface ChangeTrackingDiff {
  stats: {
    total: number;
    additions: number;
    deletions: number;
    updates: number;
  };
  ignored: string[];
  fieldChanges: string[];
  oldvalues: Record<string, any>;
  newvalues: Record<string, any>;
}

// ── Inlined standardDiffDocCalculation (exact original) ────────────────────────

const sha256 = (text: string) => crypto.createHash('sha256').update(text).digest('hex');

function standardDiffDocCalculation(opts: ChangeTrackingDiffOptions): ChangeTrackingDiff {
  const result: ChangeTrackingDiff = {
    stats: {
      total: 0,
      additions: 0,
      deletions: 0,
      updates: 0,
    },
    ignored: [],
    fieldChanges: [],
    oldvalues: {},
    newvalues: {},
  };

  // Flatten both objects and work out diff
  const { a, b, ignoreFields } = opts;
  const stats = result.stats;
  const flatA = flatten(a ?? {});
  const flatB = flatten(b ?? {});
  const allKeys = new Set([...Object.keys(flatA), ...Object.keys(flatB)]);
  const flatFilter = (ignoreFields && flatten(ignoreFields)) || undefined;
  // TODO: Might need better array comparison here though this works for now
  const arrayDeepEquals = (a1: any[] | ArrayBufferView, a2: any[] | ArrayBufferView) =>
    JSON.stringify(a1) === JSON.stringify(a2);
  // ElasticSearch source objects are JSON-equivalent data.
  // Object nesting is taken care of during flattening.
  // We need to take care of Arrays, TypedArrays and primitives
  // and ignore things deliberately excluded by JSON like functions and bigint
  const check = (v: any) => {
    switch (typeof v) {
      // eslint-disable-next-line prettier/prettier
      case 'number': case 'string': case 'boolean': return v;
      // eslint-disable-next-line prettier/prettier
      case 'object': return v; // -> Arrays, TypedArrays, Date
      // eslint-disable-next-line prettier/prettier
      case 'function': case 'symbol': case 'undefined': return undefined;
      // eslint-disable-next-line prettier/prettier
      case 'bigint': default: throw new TypeError('Please use JSON-compatible types');
    }
  };
  // We ignore fields when the key (or an ancestor) is in ignoreFields with a truthy value.
  // I.e. ignoreFields = { type: true, status: true } ignores type and status from the diff.
  const ignore = (key: string) =>
    !!flatFilter &&
    Object.entries(flatFilter).some(([k, v]) => !!v && (key === k || key.startsWith(k + '.')));
  for (const key of allKeys) {
    if (ignore(key)) result.ignored.push(key);
    else {
      const valA = check(flatA[key]);
      const valB = check(flatB[key]);

      if (Array.isArray(valB) || ArrayBuffer.isView(valB)) {
        if (!arrayDeepEquals(valA, valB)) {
          if (valA === undefined) stats.additions++;
          else stats.updates++;
          result.oldvalues[key] = valA;
          result.newvalues[key] = valB;
        } else {
          // Array has not changed
          // So we're good.
        }
      } else if (valA !== valB) {
        // Remaining types are primitives, Date and `null`
        // all of which can be compared directly (as in valA === valB)
        if (valA === undefined) stats.additions++;
        else if (valB === undefined) stats.deletions++;
        else stats.updates++;
        result.oldvalues[key] = valA;
        result.newvalues[key] = valB;
      }
    }
  }

  // Gather stats, list of changed fields and return.
  result.stats.total = stats.additions + stats.deletions + stats.updates;
  result.fieldChanges = Object.keys(result.newvalues);
  return result;
}

// ── Inlined maskSensitiveFields (exact original) ──────────────────────────────

function maskSensitiveFields(
  snapshot: Record<string, any>,
  maskFields?: ChangeTrackingDataMaskingFields
): { masked: Array<string>; snapshot: Record<string, any> } {
  const masked: string[] = [];
  if (!maskFields) {
    return { masked, snapshot };
  }
  const flatSnapshot = flatten(snapshot);
  const flatMaskings = flatten(maskFields);
  const isMasked = (key: string) =>
    Object.entries(flatMaskings).some(([k, v]) => !!v && (key === k || key.startsWith(k + '.')));

  for (const key of Object.keys(flatSnapshot)) {
    const value = flatSnapshot[key];
    if (isMasked(key) && typeof value === 'string') {
      masked.push(key);
      flatSnapshot[key] = `****************${sha256(value).slice(-12)}`;
    }
  }

  return {
    masked,
    snapshot: unflatten(flatSnapshot),
  };
}

// ── RFC 7396 merge-patch diff ──────────────────────────────────────────────────

function mergePatchDiff(
  original: Record<string, any>,
  modified: Record<string, any>
): { previous: Record<string, any>; changes: Record<string, any> } | null {
  const changes = generateMergePatch(original, modified);
  if (!changes) return null;
  const previous = generateMergePatch(modified, original);
  return { previous, changes };
}

// ── ES helpers ─────────────────────────────────────────────────────────────────

const indexDiff = async (client: ElasticsearchClient, id: string, diff: Record<string, any>) => {
  await client.index({ index: INDEX_NAME, id, body: diff, refresh: 'wait_for' });
};

const readDiff = async <T>(client: ElasticsearchClient, id: string): Promise<T> => {
  const { _source } = await client.get<T>({ index: INDEX_NAME, id });
  return _source!;
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Diff persistence: standardDiff vs RFC 7396 merge-patch', () => {
  let client: ElasticsearchClient;
  let esServer: TestElasticsearchUtils;

  beforeAll(async () => {
    esServer = await startES();
    client = esServer.es.getClient();

    await client.indices.create({
      index: INDEX_NAME,
      body: { mappings: { dynamic: true, properties: {} } },
    });
  });

  afterAll(async () => {
    await client?.indices.delete({ index: INDEX_NAME }).catch(() => {});
    await esServer?.stop();
  });

  describe('general field changes (updates, additions, deletions)', () => {
    const before = {
      host: { name: 'server-1', ip: null },
      tags: ['production', 'us-east'],
      'event.category': 'process',
      status: 'enabled',
      config: { retries: 3 },
    };
    const after = {
      host: { name: 'server-1', ip: '10.0.0.1' },
      tags: ['production', 'us-east', 'critical'],
      'event.category': 'network',
      config: { retries: 3, timeout: 30 },
      // status removed
    };

    const flatDiff = standardDiffDocCalculation({ a: before, b: after });
    const rfcDiff = mergePatchDiff(before, after)!;

    it('both algorithms detect the same changes in memory', () => {
      // Both detect 5 field-level changes
      expect(flatDiff.stats.total).toBe(5);
      expect(Object.keys(flatten(rfcDiff.changes))).toHaveLength(5);
    });

    it('in-memory representations differ structurally', () => {
      // standardDiff uses flat dot-notation keys (array syntax for literal dot-key)
      expect(flatDiff.oldvalues).toHaveProperty(['host.ip']);
      expect(flatDiff.oldvalues).not.toHaveProperty('host');

      // RFC 7396 preserves nested structure
      expect(rfcDiff.previous).toHaveProperty('host');
      expect(rfcDiff.previous.host).toEqual({ ip: null });
    });

    it('standardDiff uses undefined for absent values; RFC 7396 uses null', () => {
      // standardDiff: deleted field → undefined in newvalues; added field → undefined in oldvalues
      expect(flatDiff.newvalues.status).toBeUndefined();
      expect(flatDiff.oldvalues['config.timeout']).toBeUndefined();

      // RFC 7396: deleted field → null in changes; added field → null in previous
      expect(rfcDiff.changes.status).toBeNull();
      expect(rfcDiff.previous.config).toEqual({ timeout: null });
    });

    it('RFC 7396 diff survives ES round-trip unchanged', async () => {
      await indexDiff(client, 'rfc-general', rfcDiff);
      const fromEs = await readDiff<typeof rfcDiff>(client, 'rfc-general');

      expect(fromEs).toEqual(rfcDiff);
    });

    it('standardDiff loses undefined values after ES round-trip', async () => {
      await indexDiff(client, 'flat-general', flatDiff);
      const fromEs = await readDiff<typeof flatDiff>(client, 'flat-general');

      // undefined keys were dropped during JSON serialization.
      // Jest toEqual treats undefined and missing-key as equivalent,
      // so we verify with explicit key-presence checks instead.
      expect('status' in flatDiff.newvalues).toBe(true); // present in memory (as undefined)
      expect('status' in fromEs.newvalues).toBe(false); // gone after ES round-trip

      expect('config.timeout' in flatDiff.oldvalues).toBe(true); // present in memory
      expect('config.timeout' in fromEs.oldvalues).toBe(false); // gone after ES round-trip
    });
  });

  describe('dot-containing keys vs nested paths', () => {
    // A document where "event.category" is BOTH a literal key AND a nested path
    const before = {
      'event.category': 'process',
      event: { category: 'authentication' },
    };
    const after = {
      'event.category': 'network',
      event: { category: 'session' },
    };

    it('standardDiff conflates two distinct fields into one', () => {
      const flatDiff = standardDiffDocCalculation({ a: before, b: after });

      // Flattening merges the literal key and the nested path into "event.category"
      const matchingKeys = flatDiff.fieldChanges.filter((k) => k === 'event.category');
      expect(matchingKeys).toHaveLength(1); // only one, despite two fields changing
    });

    it('RFC 7396 preserves both fields distinctly through ES', async () => {
      const rfcDiff = mergePatchDiff(before, after)!;
      await indexDiff(client, 'rfc-dotkey', rfcDiff);
      const fromEs = await readDiff<typeof rfcDiff>(client, 'rfc-dotkey');

      // Literal dot-key and nested path are both present and distinct
      // (array syntax tells Jest to match a literal property name, not traverse)
      expect(fromEs.changes).toHaveProperty(['event.category'], 'network');
      expect(fromEs.changes.event).toEqual({ category: 'session' });
      expect(fromEs.previous).toHaveProperty(['event.category'], 'process');
      expect(fromEs.previous.event).toEqual({ category: 'authentication' });
    });
  });

  describe('null values in source documents', () => {
    // deletedAt is explicitly null; archivedAt exists then gets removed
    const before = { deletedAt: null, archivedAt: '2026-01-01' };
    const after = { deletedAt: '2026-03-20' };

    it('both algorithms produce different in-memory representations', () => {
      const flatDiff = standardDiffDocCalculation({ a: before, b: after });
      const rfcDiff = mergePatchDiff(before, after)!;

      // standardDiff: "was null" (null) vs "didn't exist" (undefined)
      expect(flatDiff.oldvalues.deletedAt).toBeNull();
      expect(flatDiff.oldvalues.archivedAt).toBe('2026-01-01');
      expect(flatDiff.newvalues.archivedAt).toBeUndefined();

      // RFC 7396: both are null — "was null" and "was removed" look the same
      expect(rfcDiff.previous.deletedAt).toBeNull();
      expect(rfcDiff.changes.archivedAt).toBeNull();
    });

    it('after ES round-trip, both algorithms have the same null ambiguity', async () => {
      const flatDiff = standardDiffDocCalculation({ a: before, b: after });
      const rfcDiff = mergePatchDiff(before, after)!;

      await indexDiff(client, 'flat-null', flatDiff);
      await indexDiff(client, 'rfc-null', rfcDiff);

      const flatFromEs = await readDiff<typeof flatDiff>(client, 'flat-null');
      const rfcFromEs = await readDiff<typeof rfcDiff>(client, 'rfc-null');

      // standardDiff: archivedAt (was undefined) is now simply missing
      expect(flatFromEs.newvalues).not.toHaveProperty('archivedAt');
      // deletedAt old value null survives
      expect(flatFromEs.oldvalues.deletedAt).toBeNull();

      // RFC 7396: round-trips perfectly — identical to in-memory
      expect(rfcFromEs).toEqual(rfcDiff);
    });
  });
});
