/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ACL_SHAPE_FIXTURES,
  FIXTURE_POLICY,
  FIXTURE_PROBES,
  type FixtureProbe,
} from '../__fixtures__';
import { normalizeAclSource } from '../acl';
import { compareLevels, type EntryLevel } from '../levels';
import type { AccessPolicy } from '../policy';
import { buildAclReadFilter } from './build_acl_read_filter';

const SPACE = 'default';
const LEVELS: EntryLevel[] = ['view', 'use', 'edit', 'manage'];
const PROBES = Object.keys(FIXTURE_PROBES).filter(
  (name): name is FixtureProbe => name in FIXTURE_PROBES
);
// Elasticsearch never stores the other shapes, so a search can't return them.
const INDEXABLE_FIXTURES = ACL_SHAPE_FIXTURES.filter(({ indexable }) => indexable).map(
  (fixture) => [fixture.name, fixture] as const
);
/** A valid ACL that only the owner can access. */
const PRIVATE = {
  version: 1,
  owner: { type: 'user', id: 'u_owner' },
  general_access: 'none',
};

/** The values indexed for each field of one document, by the field's full dotted path. */
type Fields = ReadonlyMap<string, readonly unknown[]>;

/** A document as a search sees it: its fields and its nested entry documents. */
interface IndexedDocument {
  fields: Fields;
  entries: Fields[];
}

/**
 * Indexes a document source, taking the values from `normalizeAclSource`. The parity test that
 * comes with the `acl` mapping checks the same table against Elasticsearch itself.
 */
const indexDocument = (source: Record<string, unknown>, spaces = [SPACE]): IndexedDocument => {
  const acl = normalizeAclSource(source);
  return {
    fields: new Map<string, readonly unknown[]>([
      ['namespaces', spaces],
      ['acl.version', acl?.version ?? []],
      ['acl.owner.type', acl?.owner.type ?? []],
      ['acl.owner.id', acl?.owner.id ?? []],
      ['acl.general_access', acl?.general_access ?? []],
    ]),
    entries: (acl?.entries ?? []).map(
      (entry) =>
        new Map([
          ['acl.entries.type', entry.type],
          ['acl.entries.id', entry.id],
          ['acl.entries.access', entry.access],
          ['acl.entries.added_at', entry.added_at],
        ])
    ),
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asList = (value: unknown): unknown[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

const onlyKey = (value: unknown): [string, unknown] => {
  const keys = isRecord(value) ? Object.entries(value) : [];
  if (keys.length !== 1) {
    throw new Error(`Expected an object with one key, got ${JSON.stringify(value)}`);
  }
  return keys[0];
};

/**
 * Evaluates the query features the read filter uses, with Elasticsearch semantics, against one
 * document. Anything else throws, so a new kind of clause can't pass unchecked.
 */
const matches = (query: unknown, fields: Fields, entries: Fields[]): boolean => {
  const [kind, body] = onlyKey(query);
  const valuesOf = (field: string) => fields.get(field) ?? [];
  const matchesAny = (clauses: unknown) =>
    asList(clauses).filter((clause) => matches(clause, fields, entries));

  if (kind === 'match_all') {
    return true;
  }
  if (kind === 'match_none') {
    return false;
  }
  if (kind === 'term') {
    const [field, value] = onlyKey(body);
    return valuesOf(field).includes(value);
  }
  if (kind === 'terms') {
    const [field, values] = onlyKey(body);
    return valuesOf(field).some((value) => asList(values).includes(value));
  }
  if (kind === 'exists' && isRecord(body) && typeof body.field === 'string') {
    return valuesOf(body.field).length > 0;
  }
  if (kind === 'range') {
    const [field, bounds] = onlyKey(body);
    const { lt, gt } = isRecord(bounds) ? bounds : {};
    return valuesOf(field).some(
      (value) =>
        typeof value === 'number' &&
        (typeof lt !== 'number' || value < lt) &&
        (typeof gt !== 'number' || value > gt)
    );
  }
  if (kind === 'nested' && isRecord(body) && body.path === 'acl.entries') {
    return entries.some((entry) => matches(body.query, entry, []));
  }
  if (kind === 'bool' && isRecord(body)) {
    const { filter, must_not: mustNot, should, minimum_should_match: minimum, ...rest } = body;
    if (Object.keys(rest).length > 0) {
      throw new Error(`Unsupported bool clauses: ${Object.keys(rest)}`);
    }

    // Elasticsearch makes `should` optional next to `filter`, unless `minimum_should_match` is set.
    const required =
      typeof minimum === 'number' ? minimum : filter === undefined && should !== undefined ? 1 : 0;
    return (
      matchesAny(filter).length === asList(filter).length &&
      matchesAny(mustNot).length === 0 &&
      matchesAny(should).length >= required
    );
  }

  throw new Error(`Unsupported query: ${JSON.stringify(query)}`);
};

const isVisible = (query: unknown, { fields, entries }: IndexedDocument) =>
  matches(query, fields, entries);

const levelsUpTo = (level: EntryLevel | undefined) =>
  level ? LEVELS.filter((other) => compareLevels(other, level) <= 0) : [];

/**
 * Checks that the filter finds each probe at exactly the levels up to the one in `access`.
 */
const expectAccess = (
  source: Record<string, unknown>,
  policy: AccessPolicy,
  access: Partial<Record<FixtureProbe, EntryLevel>>
) => {
  const document = indexDocument(source);
  const levelsFound = (probe: FixtureProbe) =>
    LEVELS.filter((level) =>
      isVisible(
        buildAclReadFilter({
          policy,
          principal: FIXTURE_PROBES[probe],
          level,
          recoverySpaces: [],
          ordinarySpaces: [SPACE],
        }),
        document
      )
    );

  expect(Object.fromEntries(PROBES.map((probe) => [probe, levelsFound(probe)]))).toEqual(
    Object.fromEntries(PROBES.map((probe) => [probe, levelsUpTo(access[probe])]))
  );
};

describe('buildAclReadFilter', () => {
  describe('with the fixture table', () => {
    it.each(INDEXABLE_FIXTURES)(
      'finds each probe at the levels it has: %s',
      (_, { source, policy = FIXTURE_POLICY, access }) => {
        expectAccess(source, policy, access);
      }
    );

    it.each(INDEXABLE_FIXTURES)(
      'finds the object in a recovery space, whatever its ACL: %s',
      (_, { source, policy = FIXTURE_POLICY }) => {
        const document = indexDocument(source);
        for (const level of LEVELS) {
          expect(
            isVisible(
              buildAclReadFilter({ policy, level, recoverySpaces: [SPACE], ordinarySpaces: [] }),
              document
            )
          ).toBe(true);
        }
      }
    );
  });

  describe('with shapes that only the normalizer tests cover', () => {
    const EVERYONE_EDITS = Object.fromEntries(PROBES.map((probe) => [probe, 'edit' as const]));

    it.each([
      ['a key the mapping does not know is no ACL', { acl: { foo: 'bar' } }, EVERYONE_EDITS],
      [
        'an entry with only added_at is a damaged ACL',
        { acl: { entries: [{ added_at: '2026-10-21T00:00:00Z' }] } },
        {},
      ],
      ['an empty general access string is a damaged ACL', { acl: { general_access: '' } }, {}],
      [
        'sibling dotted entry keys grant nothing',
        {
          acl: {
            ...PRIVATE,
            'entries.type': 'user',
            'entries.id': 'u_grantee',
            'entries.access': 'use',
          },
        },
        { owner: 'manage' as const },
      ],
    ])('%s', (_, source, access) => {
      expectAccess(source, FIXTURE_POLICY, access);
    });
  });

  describe('spaces', () => {
    const publicObject = indexDocument({}, ['other']);

    it('matches nothing without spaces', () => {
      expect(
        buildAclReadFilter({
          policy: FIXTURE_POLICY,
          level: 'view',
          recoverySpaces: [],
          ordinarySpaces: [],
        })
      ).toEqual({ match_none: {} });
    });

    it('finds objects only in the listed spaces', () => {
      for (const params of [
        { recoverySpaces: [SPACE], ordinarySpaces: [] },
        { recoverySpaces: [], ordinarySpaces: [SPACE] },
      ]) {
        expect(
          isVisible(
            buildAclReadFilter({ policy: FIXTURE_POLICY, level: 'view', ...params }),
            publicObject
          )
        ).toBe(false);
      }
    });

    it('finds objects in every space the search covers for *', () => {
      for (const params of [
        { recoverySpaces: ['*'], ordinarySpaces: [] },
        { recoverySpaces: [], ordinarySpaces: ['*'] },
      ]) {
        expect(
          isVisible(
            buildAclReadFilter({ policy: FIXTURE_POLICY, level: 'view', ...params }),
            publicObject
          )
        ).toBe(true);
      }
    });
  });

  describe('with an object shared to all spaces', () => {
    const ordinaryOnly = { recoverySpaces: [], ordinarySpaces: [SPACE] };

    /** Whether `probe` finds an object stored with `namespaces: ['*']` at `view`. */
    const findsSharedObject = (
      source: Record<string, unknown>,
      probe: FixtureProbe,
      spaces: { recoverySpaces: string[]; ordinarySpaces: string[] }
    ) =>
      isVisible(
        buildAclReadFilter({
          policy: FIXTURE_POLICY,
          principal: FIXTURE_PROBES[probe],
          level: 'view',
          ...spaces,
        }),
        indexDocument(source, ['*'])
      );

    it('finds it in an ordinary space under the ACL rules', () => {
      expect(findsSharedObject({}, 'stranger', ordinaryOnly)).toBe(true);
      expect(findsSharedObject({ acl: PRIVATE }, 'stranger', ordinaryOnly)).toBe(false);
      expect(findsSharedObject({ acl: PRIVATE }, 'owner', ordinaryOnly)).toBe(true);
    });

    it('finds it in a recovery space, whatever its ACL', () => {
      expect(
        findsSharedObject({ acl: PRIVATE }, 'stranger', {
          recoverySpaces: [SPACE],
          ordinarySpaces: [],
        })
      ).toBe(true);
    });
  });

  describe('with recovery and ordinary spaces together', () => {
    const privateObject = { acl: PRIVATE };
    const objectWithoutAcl = {};

    /** Whether the stranger finds the object in `space` at `view`. */
    const strangerFinds = (
      source: Record<string, unknown>,
      space: string,
      spaces: { recoverySpaces: string[]; ordinarySpaces: string[] }
    ) =>
      isVisible(
        buildAclReadFilter({
          policy: FIXTURE_POLICY,
          principal: FIXTURE_PROBES.stranger,
          level: 'view',
          ...spaces,
        }),
        indexDocument(source, [space])
      );

    it('applies recovery only in recovery spaces, and the ACL only in ordinary spaces', () => {
      const spaces = { recoverySpaces: ['recovery'], ordinarySpaces: ['ordinary'] };

      expect(strangerFinds(privateObject, 'recovery', spaces)).toBe(true);
      expect(strangerFinds(privateObject, 'ordinary', spaces)).toBe(false);
      expect(strangerFinds(privateObject, 'other', spaces)).toBe(false);
      expect(strangerFinds(objectWithoutAcl, 'ordinary', spaces)).toBe(true);
      expect(strangerFinds(objectWithoutAcl, 'other', spaces)).toBe(false);
    });

    it('applies recovery in a space that is in both lists', () => {
      expect(
        strangerFinds(privateObject, 'both', { recoverySpaces: ['both'], ordinarySpaces: ['both'] })
      ).toBe(true);
    });

    it('applies recovery in every space for *, next to a listed ordinary space', () => {
      const spaces = { recoverySpaces: ['*'], ordinarySpaces: ['ordinary'] };

      expect(strangerFinds(privateObject, 'ordinary', spaces)).toBe(true);
      expect(strangerFinds(privateObject, 'other', spaces)).toBe(true);
    });
  });

  it('sets minimum_should_match on every bool that has should clauses', () => {
    const boolsWithShould: unknown[] = [];
    const visit = (node: unknown) => {
      if (Array.isArray(node)) {
        node.forEach(visit);
      } else if (isRecord(node)) {
        if (isRecord(node.bool) && node.bool.should !== undefined) {
          boolsWithShould.push(node.bool);
        }
        Object.values(node).forEach(visit);
      }
    };

    visit(
      buildAclReadFilter({
        policy: FIXTURE_POLICY,
        principal: FIXTURE_PROBES.owner,
        level: 'use',
        recoverySpaces: ['admin-space'],
        ordinarySpaces: [SPACE],
      })
    );

    expect(boolsWithShould.length).toBeGreaterThan(0);
    for (const bool of boolsWithShould) {
      expect(bool).toHaveProperty('minimum_should_match', 1);
    }
  });
});
