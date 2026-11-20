/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { URL } from 'url';
import {
  evaluateAcl,
  type AccessPolicy,
  type AclAccess,
  type EntryAccess,
  type StoredAcl,
} from '@kbn/ols';
import {
  ACL_SHAPE_FIXTURES,
  FIXTURE_POLICY,
  FIXTURE_PROBES,
  type FixtureProbe,
} from '@kbn/ols/src/__fixtures__';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import { MAIN_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { Root } from '@kbn/core-root-server-internal';
import {
  createRootWithCorePlugins,
  createTestServers,
  type TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';

const TYPE = 'acl_parity';
/** A type whose only model version rebuilds every document without its ACL. */
const REBUILD_TYPE = 'acl_parity_rebuild';
/** A type whose only model version sets an ACL, the way a conversion from legacy access fields would. */
const SET_TYPE = 'acl_parity_set';
const TITLE = 'fixture';
const OWNER_ID = 'u_owner';
const MIGRATION_ACL: StoredAcl = {
  version: [1],
  owner: { type: ['user'], id: [OWNER_ID] },
  general: { access: ['none'] },
  entries: [],
};

/**
 * Levels a fixture's expectations are checked at. `manage` stands for access management.
 */
// Lowest to highest. `@kbn/ols` keeps the order internal, so the test states it.
const FIXTURE_LEVELS: EntryAccess[] = ['view', 'use', 'edit', 'manage'];
const grantsAtLeast = (granted: AclAccess, level: EntryAccess) =>
  FIXTURE_LEVELS.indexOf(granted as EntryAccess) >= FIXTURE_LEVELS.indexOf(level);
const indexableFixtures = ACL_SHAPE_FIXTURES.map((fixture, index) => ({
  ...fixture,
  policy: fixture.policy ?? FIXTURE_POLICY,
  id: `fixture-${index}`,
})).filter(({ indexable }) => indexable);

const getFixture = (name: string) => {
  const fixture = indexableFixtures.find((candidate) => candidate.name === name);
  if (!fixture) {
    throw new Error(`Unknown fixture: ${name}`);
  }
  return fixture;
};

/** Fixtures whose ACL has dotted keys, which a rewrite turns into one `acl` object. */
const REWRITE_FIXTURES = [
  getFixture('dotted root keys are indexed'),
  getFixture('dotted root value merges with a lower nested value'),
  getFixture('general access edit with entries'),
];

/** What each probe principal can do with an object, as the access rules decide it. */
const decide = (policy: AccessPolicy, acl: StoredAcl | undefined) =>
  Object.fromEntries(
    (Object.keys(FIXTURE_PROBES) as FixtureProbe[]).map((probe) => {
      const { state, operations } = evaluateAcl({ policy, acl, principal: FIXTURE_PROBES[probe] });
      return [probe, { state, operations: [...operations].sort() }];
    })
  );

/**
 * Proves that Saved Objects store and read ACLs the way `@kbn/ols` expects. The package's own
 * integration tests check the fixture table, the read filter, and the evaluator against
 * Elasticsearch with `ACL_MAPPING`. This test checks what only Core does: that the Saved Objects
 * index applies that mapping, that the repository returns the ACL that Elasticsearch indexed only
 * to callers who ask for it, that rewrites keep it, and that queries cannot reach it.
 */
describe('ACL storage in Saved Objects', () => {
  let root: Root;
  let esServer: TestElasticsearchUtils;
  let esClient: ElasticsearchClient;
  let repository: ISavedObjectsRepository;

  const indexFixture = (
    id: string,
    source: Record<string, unknown>,
    {
      type = TYPE,
      typeMigrationVersion,
      refresh = 'wait_for',
    }: { type?: string; typeMigrationVersion?: string; refresh?: 'wait_for' | false } = {}
  ) =>
    esClient.index({
      index: MAIN_SAVED_OBJECT_INDEX,
      id: `${type}:${id}`,
      document: {
        type,
        namespaces: ['default'],
        references: [],
        [type]: { title: TITLE },
        ...(typeMigrationVersion && { typeMigrationVersion }),
        ...source,
      },
      refresh,
    });

  const getRawSource = async (type: string, id: string) =>
    (await esClient.get({ index: MAIN_SAVED_OBJECT_INDEX, id: `${type}:${id}` }))._source as Record<
      string,
      unknown
    >;

  const getAcl = async (type: string, id: string) =>
    (await repository.get(type, id, {}, { includeAcl: true })).acl;

  beforeAll(async () => {
    const { startES } = createTestServers({ adjustTimeout: (t: number) => jest.setTimeout(t) });
    esServer = await startES();
    const { hostname, port } = new URL(esServer.hosts[0]);

    root = createRootWithCorePlugins({ elasticsearch: { hosts: [`http://${hostname}:${port}`] } });
    await root.preboot();
    const setup = await root.setup();
    setup.savedObjects.registerType({
      name: TYPE,
      hidden: false,
      namespaceType: 'multiple-isolated',
      mappings: { dynamic: false, properties: { title: { type: 'text' } } },
      modelVersions: {},
    });
    setup.savedObjects.registerType({
      name: REBUILD_TYPE,
      hidden: false,
      namespaceType: 'multiple-isolated',
      mappings: { dynamic: false, properties: { title: { type: 'text' } } },
      modelVersions: {
        1: {
          changes: [
            {
              type: 'unsafe_transform',
              transformFn: (typeSafeGuard) =>
                typeSafeGuard((doc) => {
                  const { acl, ...withoutAcl } = doc;
                  return { document: withoutAcl };
                }),
            },
          ],
        },
      },
    });
    setup.savedObjects.registerType({
      name: SET_TYPE,
      hidden: false,
      namespaceType: 'multiple-isolated',
      mappings: { dynamic: false, properties: { title: { type: 'text' } } },
      modelVersions: {
        1: {
          changes: [
            {
              type: 'unsafe_transform',
              transformFn: (typeSafeGuard) =>
                typeSafeGuard((doc) => ({ document: { ...doc, acl: MIGRATION_ACL } })),
            },
          ],
        },
      },
    });
    const start = await root.start();
    esClient = start.elasticsearch.client.asInternalUser;
    repository = start.savedObjects.createInternalRepository();

    for (const { id, source } of indexableFixtures) {
      await indexFixture(id, source);
    }
  });

  afterAll(async () => {
    await root?.shutdown();
    await esServer?.stop();
  });

  it('applies the acl mapping, so the index rejects the shapes the fixtures mark as not indexable', async () => {
    for (const [index, { name, source, indexable }] of ACL_SHAPE_FIXTURES.entries()) {
      if (!indexable) {
        const result = await indexFixture(`rejected-${index}`, source).then(
          () => 'accepted',
          (error) => error.statusCode
        );
        expect({ name, result }).toEqual({ name, result: 400 });
      }
    }
  });

  it('returns the indexed ACL to a caller who asks for it, so it grants exactly the expected access', async () => {
    for (const { id, name, policy, access } of indexableFixtures) {
      const acl = await getAcl(TYPE, id);
      for (const probe of Object.keys(FIXTURE_PROBES) as FixtureProbe[]) {
        for (const level of FIXTURE_LEVELS) {
          const operation = level === 'manage' ? 'manage_access' : level;
          const probeLevel = access[probe];
          expect({
            name,
            probe,
            level,
            allowed: evaluateAcl({ policy, acl, principal: FIXTURE_PROBES[probe] }).operations.has(
              operation
            ),
          }).toEqual({
            name,
            probe,
            level,
            allowed: !!probeLevel && grantsAtLeast(probeLevel, level),
          });
        }
      }
    }
  });

  it('leaves the ACL out of results by default', async () => {
    const { id } = getFixture('dotted root keys are indexed');
    expect(await repository.get(TYPE, id)).not.toHaveProperty('acl');
    const { saved_objects: bulkGot } = await repository.bulkGet([{ type: TYPE, id }]);
    expect(bulkGot[0]).not.toHaveProperty('acl');
    expect((await repository.resolve(TYPE, id)).saved_object).not.toHaveProperty('acl');

    const { saved_objects: objects } = await repository.find({ type: TYPE, perPage: 1000 });
    expect(objects.length).toBe(indexableFixtures.length);
    expect(objects.filter((object) => 'acl' in object)).toEqual([]);
  });

  it('leaves out an ACL that a read-time migration sets, unless the caller asks for it', async () => {
    // Written by an older node: no ACL, at the version before the model version that sets one.
    const id = 'migrated-on-read';
    await indexFixture(id, {}, { type: SET_TYPE, typeMigrationVersion: '10.0.0' });

    expect(await repository.get(SET_TYPE, id)).not.toHaveProperty('acl');
    const { saved_objects: bulkGot } = await repository.bulkGet([{ type: SET_TYPE, id }]);
    expect(bulkGot[0]).not.toHaveProperty('acl');
    expect((await repository.resolve(SET_TYPE, id)).saved_object).not.toHaveProperty('acl');
    const { saved_objects: found } = await repository.find({ type: SET_TYPE });
    expect(found).toHaveLength(1);
    expect(found[0]).not.toHaveProperty('acl');
    const { hits } = await repository.search({
      type: SET_TYPE,
      namespaces: ['default'],
      query: { match_all: {} },
    });
    expect(hits.hits).toHaveLength(1);
    expect(hits.hits[0]._source).not.toHaveProperty('acl');

    expect((await repository.get(SET_TYPE, id, {}, { includeAcl: true })).acl).toEqual(
      MIGRATION_ACL
    );
    const { saved_objects: foundWithAcl } = await repository.find(
      { type: SET_TYPE },
      { includeAcl: true }
    );
    expect(foundWithAcl[0].acl).toEqual(MIGRATION_ACL);
  });

  it('returns the same ACL from find with fields as from get, dotted root keys included', async () => {
    const { saved_objects: objects } = await repository.find(
      { type: TYPE, fields: ['title'], perPage: 1000 },
      { includeAcl: true }
    );
    expect(objects.length).toBe(indexableFixtures.length);
    for (const object of objects) {
      expect({ id: object.id, acl: object.acl }).toEqual({
        id: object.id,
        acl: await getAcl(TYPE, object.id),
      });
    }

    const { id } = getFixture('dotted root keys are indexed');
    expect(objects.find((object) => object.id === id)?.acl?.owner.id).toEqual([OWNER_ID]);
  });

  it('update keeps the access decision of every fixture and drops dotted keys', async () => {
    // Gets are real-time, so neither the writes nor the reads need a refresh.
    const idOf = (fixture: (typeof indexableFixtures)[number]) => `update-every-${fixture.id}`;
    await Promise.all(
      indexableFixtures.map((fixture) =>
        indexFixture(idOf(fixture), fixture.source, { refresh: false })
      )
    );
    for (const fixture of indexableFixtures) {
      const id = idOf(fixture);
      const before = decide(fixture.policy, await getAcl(TYPE, id));

      await repository.update(TYPE, id, { title: 'updated' }, { refresh: false });

      const source = await getRawSource(TYPE, id);
      expect({
        fixture: fixture.name,
        dottedKeys: Object.keys(source).filter((key) => key.startsWith('acl.')),
        after: decide(fixture.policy, await getAcl(TYPE, id)),
      }).toEqual({ fixture: fixture.name, dottedKeys: [], after: before });
    }
  });

  describe('rewrites keep the access decision and drop dotted keys', () => {
    const writes: Array<{
      name: string;
      write: (type: string, id: string) => Promise<unknown>;
    }> = [
      { name: 'update', write: (type, id) => repository.update(type, id, { title: 'updated' }) },
      {
        name: 'bulkUpdate',
        write: (type, id) =>
          repository.bulkUpdate([{ type, id, attributes: { title: 'updated' } }]),
      },
      {
        name: 'create with overwrite',
        write: (type, id) => repository.create(type, { title: 'created' }, { id, overwrite: true }),
      },
      {
        name: 'bulkCreate with overwrite',
        write: (type, id) =>
          repository.bulkCreate([{ type, id, attributes: { title: 'created' } }], {
            overwrite: true,
          }),
      },
    ];

    for (const { name: writeName, write } of writes) {
      for (const type of [TYPE, REBUILD_TYPE]) {
        it(`${writeName} on ${type}`, async () => {
          for (const fixture of REWRITE_FIXTURES) {
            const id = `${writeName.replace(/\W+/g, '-')}-${fixture.id}`;
            await indexFixture(id, fixture.source, {
              type,
              // The rebuilding model version runs when the stored document is read.
              ...(type === REBUILD_TYPE && { typeMigrationVersion: '10.0.0' }),
            });
            const aclBefore = await getAcl(type, id);
            expect({ fixture: fixture.name, hasAcl: aclBefore !== undefined }).toEqual({
              fixture: fixture.name,
              hasAcl: true,
            });
            const before = decide(fixture.policy, aclBefore);

            await write(type, id);

            const source = await getRawSource(type, id);
            expect({
              fixture: fixture.name,
              dottedKeys: Object.keys(source).filter((key) => key.startsWith('acl.')),
              hasAcl: 'acl' in source,
            }).toEqual({ fixture: fixture.name, dottedKeys: [], hasAcl: true });
            expect({
              fixture: fixture.name,
              after: decide(fixture.policy, await getAcl(type, id)),
            }).toEqual({ fixture: fixture.name, after: before });
          }
        });
      }
    }
  });

  describe('queries cannot reach the ACL', () => {
    it('does not find objects by their owner in a search across all fields', async () => {
      const titleSearch = await repository.find({ type: TYPE, search: TITLE, perPage: 0 });
      expect(titleSearch.total).toBeGreaterThan(0);

      const ownerSearch = await repository.find({ type: TYPE, search: OWNER_ID, perPage: 0 });
      expect(ownerSearch.total).toBe(0);
    });

    it('leaves the ACL out of the hits that top_hits returns', async () => {
      type Hit = Record<'_source' | 'fields' | 'highlight', Record<string, unknown> | undefined>;
      const { aggregations } = await repository.find<unknown, { top: { hits: { hits: Hit[] } } }>({
        type: TYPE,
        perPage: 0,
        aggs: {
          top: {
            top_hits: {
              size: 100,
              _source: ['acl', `${TYPE}.title`],
              // Patterns stay accepted. Elasticsearch returns ACL values for them, and `find`
              // removes those.
              docvalue_fields: ['type', 'acl.*'],
              highlight: {
                fields: { '*': {} },
                highlight_query: { match: { 'acl.owner.id': OWNER_ID } },
              },
            },
          },
        },
      });
      const hits = aggregations!.top.hits.hits;
      expect(hits.length).toBeGreaterThan(0);
      expect(hits.every((hit) => hit.fields?.type !== undefined)).toBe(true);
      expect(
        hits
          .flatMap((hit) => [
            ...Object.keys(hit._source ?? {}),
            ...Object.keys(hit.fields ?? {}),
            ...Object.keys(hit.highlight ?? {}),
          ])
          .filter((key) => key === 'acl' || key.startsWith('acl.'))
      ).toEqual([]);
    });

    it.each([
      ['a filter', { filter: `${TYPE}.acl.owner.id: ${OWNER_ID}` }],
      ['an aggregation', { aggs: { owners: { terms: { field: `${TYPE}.acl.owner.id` } } } }],
      ['a sort', { sortField: 'acl.owner.id' }],
      ['a top_hits option', { aggs: { top: { top_hits: { docvalue_fields: ['acl.owner.id'] } } } }],
    ])('rejects the ACL in %s', async (_, options) => {
      await expect(repository.find({ type: TYPE, ...options })).rejects.toMatchObject({
        output: { statusCode: 400 },
      });
    });

    it('rejects the ACL as a root search field', async () => {
      await expect(
        repository.find({ type: TYPE, search: OWNER_ID, rootSearchFields: ['acl'] })
      ).rejects.toThrow('rootSearchFields entry "acl" is invalid: cannot search the ACL');
    });
  });
});
