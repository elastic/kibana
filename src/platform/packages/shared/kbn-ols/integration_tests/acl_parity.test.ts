/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { createTestEsCluster } from '@kbn/test-es-server';
import { ToolingLog } from '@kbn/tooling-log';
import {
  ACL_FIELD,
  ACL_MAPPING,
  buildAclReadFilter,
  evaluateAcl,
  getAclState,
  normalizeAclSource,
  prepareAclChange,
  prepareInitialAcl,
  toAclSource,
  type AccessPolicy,
  type EntryAccess,
  type Principal,
} from '..';
import { compareLevels } from '../src/levels';
import {
  ACL_SHAPE_FIXTURES,
  FIXTURE_POLICY,
  FIXTURE_POLICY_ALL_LEVELS,
  FIXTURE_POLICY_MANAGE_ENTRIES,
  FIXTURE_PROBES,
  type FixtureProbe,
} from '../src/__fixtures__';

/** Every indexable fixture, once in each space layout. */
const FIXTURES_INDEX = 'ols-acl-fixtures';
/** Every indexable fixture, written back with `toAclSource`. */
const ROUND_TRIP_INDEX = 'ols-acl-round-trip';
/** ACLs that `prepareInitialAcl` and `prepareAclChange` build. */
const WRITTEN_INDEX = 'ols-acl-written';
/** ACLs with numbers in `keyword` fields, written as raw JSON. */
const NUMBERS_INDEX = 'ols-acl-numbers';

/**
 * Levels a fixture's expectations are checked at. `manage` stands for access management.
 */
const FIXTURE_LEVELS: EntryAccess[] = ['view', 'use', 'edit', 'manage'];
const PROBES = Object.keys(FIXTURE_PROBES) as FixtureProbe[];
const ADMIN: Principal = { type: 'user', id: 'u_admin' };
const NOW = '2026-11-16T00:00:00.000Z';

/**
 * Where a stored copy of a fixture lives. `all` is an object shared to every space.
 */
const SPACE_LAYOUTS = { a: ['space-a'], b: ['space-b'], all: ['*'] } as const;
type SpaceLayout = keyof typeof SPACE_LAYOUTS;

/**
 * The space lists a search passes to the filter, and the README rule each one checks.
 */
const SCENARIOS = [
  { name: 'one ordinary space', ordinarySpaces: ['space-a'], recoverySpaces: [] },
  {
    name: 'a recovery and an ordinary space',
    ordinarySpaces: ['space-b'],
    recoverySpaces: ['space-a'],
  },
  { name: 'a space in both lists', ordinarySpaces: ['space-a'], recoverySpaces: ['space-a'] },
  { name: 'every space, ordinary', ordinarySpaces: ['*'], recoverySpaces: [] },
  { name: 'every space, recovery', ordinarySpaces: [], recoverySpaces: ['*'] },
  { name: 'no space', ordinarySpaces: [], recoverySpaces: [] },
];
type Scenario = (typeof SCENARIOS)[number];

const fixtures = ACL_SHAPE_FIXTURES.map((fixture, index) => ({
  ...fixture,
  policy: fixture.policy ?? FIXTURE_POLICY,
  id: `fixture-${index}`,
}));
type Fixture = (typeof fixtures)[number];
const indexableFixtures = fixtures.filter(({ indexable }) => indexable);
const fixturePolicies = [...new Set(indexableFixtures.map(({ policy }) => policy))];

const toOperation = (level: EntryAccess) => (level === 'manage' ? 'manage_access' : level);

/** Whether the fixture says the probe reaches the level, with ordinary access only. */
const reaches = ({ access }: Fixture, probe: FixtureProbe, level: EntryAccess) => {
  const probeLevel = access[probe];
  return !!probeLevel && compareLevels(probeLevel, level) >= 0;
};

/** Whether a stored object is in one of the listed spaces, as the README defines it. */
const isIn = (objectSpaces: readonly string[], listed: readonly string[]) =>
  listed.length > 0 &&
  (listed.includes('*') ||
    objectSpaces.includes('*') ||
    objectSpaces.some((space) => listed.includes(space)));

/**
 * The README rules for the filter: recovery shows every object at `view` in recovery spaces,
 * every other listed space and level gets the ordinary rules, and an unlisted space nothing.
 */
const expectedMatch = (
  fixture: Fixture,
  layout: SpaceLayout,
  scenario: Scenario,
  probe: FixtureProbe,
  level: EntryAccess
) => {
  const spaces = SPACE_LAYOUTS[layout];
  const inRecovery = isIn(spaces, scenario.recoverySpaces);
  if (inRecovery && level === 'view') {
    return true;
  }
  return (inRecovery || isIn(spaces, scenario.ordinarySpaces)) && reaches(fixture, probe, level);
};

const buildFilter = (
  policy: AccessPolicy,
  probe: FixtureProbe,
  level: EntryAccess,
  { ordinarySpaces, recoverySpaces }: Pick<Scenario, 'ordinarySpaces' | 'recoverySpaces'>
) =>
  buildAclReadFilter({
    policy,
    principal: FIXTURE_PROBES[probe],
    access: level,
    ordinarySpaces: [...ordinarySpaces],
    recoverySpaces: [...recoverySpaces],
  });

const containsNested = (filter: QueryDslQueryContainer) =>
  JSON.stringify(filter).includes('"nested"');

/**
 * Checks everything in `@kbn/ols` that depends on how Elasticsearch indexes and searches an ACL,
 * against a real Elasticsearch with `ACL_MAPPING`, and without Kibana:
 *
 * - Elasticsearch accepts or rejects each stored shape as the fixture table says.
 * - The read filter and the evaluator, on the `_source` that Elasticsearch returns, grant exactly
 *   the access the fixtures expect, in every combination of ordinary and recovery spaces.
 * - With `search.allow_expensive_queries` off, a filter with a `nested` query fails, and every
 *   other filter still filters completely.
 * - What Kibana writes, `toAclSource` and the ACLs that the change functions build, indexes to
 *   values that grant what the change intends.
 *
 * A disagreement would let a list show an object that opening it denies, or the other way around.
 */
describe('ACLs in Elasticsearch', () => {
  // Elasticsearch alone, without Kibana: the package only needs the mapping and the client.
  const es = createTestEsCluster({
    license: 'basic',
    log: new ToolingLog({ level: 'warning', writeTo: process.stdout }),
  });
  jest.setTimeout(es.getStartTimeout() + 60_000);
  let esClient: Client;
  const sources = new Map<string, Record<string, unknown> | undefined>();

  const createIndex = (index: string) =>
    esClient.indices.create({
      index,
      // Root fields are strict, as in a Saved Objects index, so a stray key fails the write.
      mappings: {
        dynamic: 'strict',
        properties: { namespaces: { type: 'keyword' }, [ACL_FIELD]: ACL_MAPPING },
      },
    });

  const search = async (index: string, filter: QueryDslQueryContainer) => {
    const { hits } = await esClient.search({ index, size: 1000, _source: false, query: filter });
    return new Set(hits.hits.map(({ _id }) => _id));
  };

  const setExpensiveQueries = (allowed: boolean | null) =>
    esClient.cluster.putSettings({ persistent: { 'search.allow_expensive_queries': allowed } });

  beforeAll(async () => {
    await es.start();
    esClient = es.getClient();
    // The read filter needs expensive queries, so the default is set explicitly.
    await setExpensiveQueries(true);
    await Promise.all(
      [FIXTURES_INDEX, ROUND_TRIP_INDEX, WRITTEN_INDEX, NUMBERS_INDEX].map(createIndex)
    );

    for (const { id, source } of indexableFixtures) {
      for (const [layout, namespaces] of Object.entries(SPACE_LAYOUTS)) {
        await esClient.index({
          index: FIXTURES_INDEX,
          id: `${id}:${layout}`,
          document: { namespaces, ...source },
        });
      }
    }
    await esClient.indices.refresh({ index: FIXTURES_INDEX });

    for (const { id } of indexableFixtures) {
      const { _source: source } = await esClient.get<Record<string, unknown>>({
        index: FIXTURES_INDEX,
        id: `${id}:a`,
      });
      sources.set(id, source);
    }
  });

  afterAll(async () => {
    await es.cleanup();
  });

  it('rejects exactly the stored shapes the fixtures mark as not indexable', async () => {
    for (const { id, name, source } of fixtures.filter(({ indexable }) => !indexable)) {
      const result = await esClient
        .index({
          index: FIXTURES_INDEX,
          id: `rejected-${id}`,
          document: { namespaces: ['space-a'], ...source },
        })
        .then(
          () => 'accepted',
          (error) => error.statusCode
        );
      expect({ name, result }).toEqual({ name, result: 400 });
    }
  });

  describe('reading', () => {
    for (const [policyIndex, policy] of fixturePolicies.entries()) {
      const policyFixtures = indexableFixtures.filter((fixture) => fixture.policy === policy);

      for (const probe of PROBES) {
        for (const level of FIXTURE_LEVELS) {
          it(`filters and evaluates as expected, for policy ${policyIndex}, the ${probe} probe, and ${level}`, async () => {
            for (const scenario of SCENARIOS) {
              const found = await search(
                FIXTURES_INDEX,
                buildFilter(policy, probe, level, scenario)
              );

              for (const fixture of policyFixtures) {
                for (const layout of Object.keys(SPACE_LAYOUTS) as SpaceLayout[]) {
                  const expected = expectedMatch(fixture, layout, scenario, probe, level);
                  expect({
                    scenario: scenario.name,
                    fixture: fixture.name,
                    layout,
                    filter: found.has(`${fixture.id}:${layout}`),
                  }).toEqual({
                    scenario: scenario.name,
                    fixture: fixture.name,
                    layout,
                    filter: expected,
                  });
                }
              }
            }

            // The evaluator decides on the `_source` that Elasticsearch returns. Recovery adds
            // only `view`, as the filter does in recovery spaces.
            for (const fixture of policyFixtures) {
              const acl = normalizeAclSource(sources.get(fixture.id));
              const principal = FIXTURE_PROBES[probe];
              const ordinary = evaluateAcl({ policy, acl, principal }).operations.has(
                toOperation(level)
              );
              const viaRecovery = evaluateAcl({
                policy,
                acl,
                principal,
                recovery: true,
              }).operations.has('view');
              expect({ fixture: fixture.name, ordinary, viaRecovery }).toEqual({
                fixture: fixture.name,
                ordinary: reaches(fixture, probe, level),
                viaRecovery: true,
              });
            }
          });
        }
      }
    }
  });

  describe('numbers in keyword fields', () => {
    /**
     * A number in a `keyword` field indexes as the text the document used, while the reader
     * gets parsed JSON. `raw` is the JSON text of an owner or entry ID, and `parsed` is what the
     * reader returns for it. The two differ only when the number isn't in its shortest form.
     */
    const NUMBERS = [
      { raw: '1', parsed: '1' },
      { raw: '1.0', parsed: '1' },
      { raw: '1e2', parsed: '100' },
    ];

    // The client serializes objects, which would rewrite `1.0` as `1`, so the body is raw JSON.
    const indexRaw = (id: string, body: string) =>
      esClient.transport.request(
        {
          method: 'PUT',
          path: `/${NUMBERS_INDEX}/_doc/${id}`,
          querystring: { refresh: 'wait_for' },
          body,
        },
        { headers: { 'content-type': 'application/json' } }
      );

    beforeAll(async () => {
      for (const { raw } of NUMBERS) {
        await indexRaw(
          `owner-${raw}`,
          `{"namespaces":["space-a"],"acl":{"version":1,"owner":{"type":"user","id":${raw}},"general":{"access":"none"}}}`
        );
        await indexRaw(
          `entry-${raw}`,
          `{"namespaces":["space-a"],"acl":{"version":1,"owner":{"type":"user","id":"u_owner"},"general":{"access":"none"},"entries":[{"type":"user","id":${raw},"access":"use"}]}}`
        );
      }
    });

    it('indexes a number as the text the document used', async () => {
      for (const { raw, parsed } of NUMBERS) {
        const asWritten = await search(NUMBERS_INDEX, { term: { 'acl.owner.id': raw } });
        const asParsed = await search(NUMBERS_INDEX, { term: { 'acl.owner.id': parsed } });
        expect({
          raw,
          asWritten: asWritten.has(`owner-${raw}`),
          asParsed: asParsed.has(`owner-${raw}`),
        }).toEqual({
          raw,
          asWritten: true,
          asParsed: raw === parsed,
        });
      }
    });

    // The known gap that the README describes, in both directions: for a number that isn't in its
    // shortest form, the evaluator matches a principal whose ID is the parsed text, and the filter
    // matches one whose ID is the text the document used. No user or service account has either ID,
    // so access can't change. Closing the gap makes the filter and the evaluator agree here.
    it('disagrees only for a principal whose ID is the parsed or the written number', async () => {
      for (const { raw, parsed } of NUMBERS) {
        const principals = [
          { id: parsed, filter: raw === parsed, evaluator: true },
          { id: raw, filter: true, evaluator: raw === parsed },
        ];
        for (const [doc, level] of [
          [`owner-${raw}`, 'manage'],
          [`entry-${raw}`, 'use'],
        ] as const) {
          const { _source: source } = await esClient.get<Record<string, unknown>>({
            index: NUMBERS_INDEX,
            id: doc,
          });
          for (const { id, ...expected } of principals) {
            const principal: Principal = { type: 'user', id };
            const found = await search(
              NUMBERS_INDEX,
              buildAclReadFilter({
                policy: FIXTURE_POLICY,
                principal,
                access: level,
                ordinarySpaces: ['space-a'],
                recoverySpaces: [],
              })
            );
            const evaluator = evaluateAcl({
              policy: FIXTURE_POLICY,
              acl: normalizeAclSource(source),
              principal,
            }).operations.has(toOperation(level));
            expect({ doc, id, filter: found.has(doc), evaluator }).toEqual({
              doc,
              id,
              ...expected,
            });
          }
        }
      }
    });

    it('agrees for every other principal, so the gap grants nobody anything', async () => {
      for (const { raw } of NUMBERS) {
        for (const doc of [`owner-${raw}`, `entry-${raw}`]) {
          const { _source: source } = await esClient.get<Record<string, unknown>>({
            index: NUMBERS_INDEX,
            id: doc,
          });
          const acl = normalizeAclSource(source);
          for (const probe of PROBES.filter((name) => name !== 'numericIdUser')) {
            for (const level of FIXTURE_LEVELS) {
              const found = await search(
                NUMBERS_INDEX,
                buildFilter(FIXTURE_POLICY, probe, level, SCENARIOS[0])
              );
              const evaluator = evaluateAcl({
                policy: FIXTURE_POLICY,
                acl,
                principal: FIXTURE_PROBES[probe],
              }).operations.has(toOperation(level));
              expect({ doc, probe, level, filter: found.has(doc) }).toEqual({
                doc,
                probe,
                level,
                filter: evaluator,
              });
            }
          }
        }
      }
    });
  });

  describe('with search.allow_expensive_queries disabled', () => {
    beforeAll(() => setExpensiveQueries(false));
    afterAll(() => setExpensiveQueries(true));

    it('fails every filter with a nested query and still filters completely with the others', async () => {
      let failed = 0;
      let filtered = 0;
      for (const policy of fixturePolicies) {
        const policyFixtures = indexableFixtures.filter((fixture) => fixture.policy === policy);
        for (const probe of PROBES) {
          for (const level of FIXTURE_LEVELS) {
            for (const scenario of SCENARIOS) {
              const filter = buildFilter(policy, probe, level, scenario);
              const label = { probe, level, scenario: scenario.name };
              if (containsNested(filter)) {
                await expect(search(FIXTURES_INDEX, filter)).rejects.toMatchObject({
                  statusCode: 400,
                });
                failed++;
                continue;
              }

              const found = await search(FIXTURES_INDEX, filter);
              for (const fixture of policyFixtures) {
                for (const layout of Object.keys(SPACE_LAYOUTS) as SpaceLayout[]) {
                  expect({
                    ...label,
                    fixture: fixture.name,
                    layout,
                    filter: found.has(`${fixture.id}:${layout}`),
                  }).toEqual({
                    ...label,
                    fixture: fixture.name,
                    layout,
                    filter: expectedMatch(fixture, layout, scenario, probe, level),
                  });
                }
              }
              filtered++;
            }
          }
        }
      }

      // Both outcomes have to occur, or the test would prove nothing about one of them.
      expect(failed).toBeGreaterThan(0);
      expect(filtered).toBeGreaterThan(0);
    });
  });

  describe('writing', () => {
    it('indexes a rewrite with toAclSource to values that grant the same access', async () => {
      for (const { id } of indexableFixtures) {
        const acl = normalizeAclSource(sources.get(id));
        await esClient.index({
          index: ROUND_TRIP_INDEX,
          id,
          document: { namespaces: ['space-a'], ...(acl && { [ACL_FIELD]: toAclSource(acl) }) },
        });
      }
      await esClient.indices.refresh({ index: ROUND_TRIP_INDEX });

      for (const policy of fixturePolicies) {
        const policyFixtures = indexableFixtures.filter((fixture) => fixture.policy === policy);
        for (const probe of PROBES) {
          for (const level of FIXTURE_LEVELS) {
            const found = await search(
              ROUND_TRIP_INDEX,
              buildFilter(policy, probe, level, SCENARIOS[0])
            );
            for (const fixture of policyFixtures) {
              const { _source: source } = await esClient.get<Record<string, unknown>>({
                index: ROUND_TRIP_INDEX,
                id: fixture.id,
              });
              const evaluated = evaluateAcl({
                policy,
                acl: normalizeAclSource(source),
                principal: FIXTURE_PROBES[probe],
              }).operations.has(toOperation(level));
              const expected = reaches(fixture, probe, level);
              expect({
                fixture: fixture.name,
                probe,
                level,
                filter: found.has(fixture.id),
                evaluated,
              }).toEqual({
                fixture: fixture.name,
                probe,
                level,
                filter: expected,
                evaluated: expected,
              });
            }
          }
        }
      }
    });

    it('indexes an initial ACL to values that grant what it asked for', async () => {
      const prepared = prepareInitialAcl({
        policy: FIXTURE_POLICY,
        principal: FIXTURE_PROBES.owner,
        requested: {
          general: { access: 'none' },
          entries: [{ ...FIXTURE_PROBES.grantee, access: 'use' }],
        },
        enabled: true,
        now: NOW,
      });
      await esClient.index({
        index: WRITTEN_INDEX,
        id: 'initial',
        document: { namespaces: ['space-a'], [ACL_FIELD]: prepared?.next },
        refresh: 'wait_for',
      });

      const expected: Partial<Record<FixtureProbe, EntryAccess>> = {
        owner: 'manage',
        grantee: 'use',
      };
      for (const probe of PROBES) {
        for (const level of FIXTURE_LEVELS) {
          const found = await search(
            WRITTEN_INDEX,
            buildFilter(FIXTURE_POLICY, probe, level, SCENARIOS[0])
          );
          const probeLevel = expected[probe];
          expect({ probe, level, filter: found.has('initial') }).toEqual({
            probe,
            level,
            filter: !!probeLevel && compareLevels(probeLevel, level) >= 0,
          });
        }
      }
    });

    // Hand-written transfers of an ACL with an entry for the former owner, an entry for the new
    // owner, and an unrelated entry. The former owner keeps only what general access gives
    // everyone, the new owner manages the object, and every other grant stays as it was.
    it.each([
      {
        name: 'general access that the policy allows is kept',
        policy: FIXTURE_POLICY_ALL_LEVELS,
        stored: {
          version: 1,
          owner: { type: 'user', id: 'u_owner' },
          general: { access: 'view' },
          entries: [
            { type: 'user', id: 'u_owner', access: 'use', added_at: NOW },
            { type: 'user', id: 'u_grantee', access: 'edit', added_at: NOW },
            { type: 'user', id: 'u_stranger', access: 'use', added_at: NOW },
          ],
        },
        expected: {
          owner: 'view',
          grantee: 'edit',
          stranger: 'manage',
          ownerIdServiceAccount: 'view',
          numericIdUser: 'view',
          anonymous: 'view',
        },
      },
      {
        name: 'a private ACL stays private',
        policy: FIXTURE_POLICY,
        stored: {
          version: 1,
          owner: { type: 'user', id: 'u_owner' },
          general: { access: 'none' },
          entries: [
            { type: 'user', id: 'u_owner', access: 'use', added_at: NOW },
            { type: 'user', id: 'u_grantee', access: 'use', added_at: NOW },
            { type: 'user', id: 'u_stranger', access: 'use', added_at: NOW },
          ],
        },
        expected: { grantee: 'use', stranger: 'manage' },
      },
      {
        name: 'a manage grant is kept',
        policy: FIXTURE_POLICY_MANAGE_ENTRIES,
        stored: {
          version: 1,
          owner: { type: 'user', id: 'u_owner' },
          general: { access: 'view' },
          entries: [
            { type: 'user', id: 'u_owner', access: 'manage', added_at: NOW },
            { type: 'user', id: 'u_grantee', access: 'manage', added_at: NOW },
            { type: 'user', id: 'u_stranger', access: 'use', added_at: NOW },
          ],
        },
        expected: {
          owner: 'view',
          grantee: 'manage',
          stranger: 'manage',
          ownerIdServiceAccount: 'view',
          numericIdUser: 'view',
          anonymous: 'view',
        },
      },
    ] as Array<{
      name: string;
      policy: AccessPolicy;
      stored: Record<string, unknown>;
      expected: Partial<Record<FixtureProbe, EntryAccess>>;
    }>)(
      'indexes a transfer that keeps exactly the other grants: $name',
      async ({ name, policy, stored, expected }) => {
        const id = `transfer-${name}`;
        const current = normalizeAclSource({ [ACL_FIELD]: stored });
        const { next } = prepareAclChange({
          policy,
          current,
          decision: evaluateAcl({ policy, acl: current, principal: FIXTURE_PROBES.owner }),
          principal: FIXTURE_PROBES.owner,
          change: { kind: 'transfer', owner: FIXTURE_PROBES.stranger },
          enabled: true,
          now: NOW,
        });
        await esClient.index({
          index: WRITTEN_INDEX,
          id,
          document: { namespaces: ['space-a'], [ACL_FIELD]: next },
          refresh: 'wait_for',
        });
        const { _source: source } = await esClient.get<Record<string, unknown>>({
          index: WRITTEN_INDEX,
          id,
        });
        const acl = normalizeAclSource(source);

        for (const probe of PROBES) {
          for (const level of FIXTURE_LEVELS) {
            const found = await search(
              WRITTEN_INDEX,
              buildFilter(policy, probe, level, SCENARIOS[0])
            );
            const evaluated = evaluateAcl({
              policy,
              acl,
              principal: FIXTURE_PROBES[probe],
            }).operations.has(toOperation(level));
            const probeLevel = expected[probe];
            const allowed = !!probeLevel && compareLevels(probeLevel, level) >= 0;
            expect({ probe, level, filter: found.has(id), evaluated }).toEqual({
              probe,
              level,
              filter: allowed,
              evaluated: allowed,
            });
          }
        }
      }
    );

    it('indexes a transfer of every stored ACL to a valid ACL that the new owner controls', async () => {
      const newOwner = FIXTURE_PROBES.grantee;
      for (const { id, name, policy, state } of indexableFixtures.filter(
        (fixture) => fixture.state !== 'absent'
      )) {
        const current = normalizeAclSource(sources.get(id));
        const { next } = prepareAclChange({
          policy,
          current,
          decision: evaluateAcl({ policy, acl: current, principal: ADMIN, recovery: true }),
          principal: ADMIN,
          change: { kind: 'transfer', owner: newOwner },
          enabled: true,
          now: NOW,
        });
        await esClient.index({
          index: WRITTEN_INDEX,
          id: `transfer-${id}`,
          document: { namespaces: ['space-a'], [ACL_FIELD]: next },
          refresh: 'wait_for',
        });

        const { _source: source } = await esClient.get<Record<string, unknown>>({
          index: WRITTEN_INDEX,
          id: `transfer-${id}`,
        });
        const stored = normalizeAclSource(source);
        const found = await search(
          WRITTEN_INDEX,
          buildFilter(policy, 'grantee', 'manage', SCENARIOS[0])
        );
        expect({
          name,
          from: state,
          state: getAclState(stored),
          ownerManages: evaluateAcl({ policy, acl: stored, principal: newOwner }).operations.has(
            'manage_access'
          ),
          filter: found.has(`transfer-${id}`),
        }).toEqual({ name, from: state, state: 'valid', ownerManages: true, filter: true });
      }
    });
  });
});
