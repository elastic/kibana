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
  buildAclReadFilter,
  compareLevels,
  evaluateAcl,
  normalizeAclSource,
  type EntryLevel,
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
/**
 * Levels a fixture's expectations are checked at. `manage` stands for access management.
 */
const FIXTURE_LEVELS: EntryLevel[] = ['view', 'use', 'edit', 'manage'];
const indexableFixtures = ACL_SHAPE_FIXTURES.map((fixture, index) => ({
  ...fixture,
  policy: fixture.policy ?? FIXTURE_POLICY,
  id: `fixture-${index}`,
})).filter(({ indexable }) => indexable);
const fixturePolicies = [...new Set(indexableFixtures.map(({ policy }) => policy))];

/**
 * Proves that the read filter and the point evaluator agree on every stored ACL shape, as
 * Elasticsearch actually indexes it. A disagreement would let a list show an object that a point
 * read denies, or the other way around.
 */
describe('ACL read filter and evaluator parity', () => {
  let root: Root;
  let esServer: TestElasticsearchUtils;
  let esClient: ElasticsearchClient;
  let repository: ISavedObjectsRepository;

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
      mappings: { dynamic: false, properties: {} },
      modelVersions: {},
    });
    const start = await root.start();
    esClient = start.elasticsearch.client.asInternalUser;
    repository = start.savedObjects.createInternalRepository();

    for (const { id, source } of indexableFixtures) {
      await esClient.index({
        index: MAIN_SAVED_OBJECT_INDEX,
        id: `${TYPE}:${id}`,
        document: { type: TYPE, namespaces: ['default'], references: [], [TYPE]: {}, ...source },
        refresh: 'wait_for',
      });
    }
  });

  afterAll(async () => {
    await root?.shutdown();
    await esServer?.stop();
  });

  it('rejects stored values the evaluator would not trust', async () => {
    for (const [index, { source }] of ACL_SHAPE_FIXTURES.entries()) {
      if (!ACL_SHAPE_FIXTURES[index].indexable) {
        await expect(
          esClient.index({
            index: MAIN_SAVED_OBJECT_INDEX,
            id: `${TYPE}:rejected-${index}`,
            document: {
              type: TYPE,
              namespaces: ['default'],
              references: [],
              [TYPE]: {},
              ...source,
            },
          })
        ).rejects.toMatchObject({ statusCode: 400 });
      }
    }
  });

  for (const [policyIndex, policy] of fixturePolicies.entries()) {
    for (const probe of Object.keys(FIXTURE_PROBES) as FixtureProbe[]) {
      for (const level of FIXTURE_LEVELS) {
        it(`finds exactly the objects the evaluator allows, for policy ${policyIndex}, the ${probe} probe, and ${level}`, async () => {
          const principal = FIXTURE_PROBES[probe];
          const operation = level === 'manage' ? 'manage_access' : level;
          const { hits } = await esClient.search({
            index: MAIN_SAVED_OBJECT_INDEX,
            size: 100,
            _source: false,
            query: {
              bool: {
                filter: [
                  { term: { type: TYPE } },
                  buildAclReadFilter({
                    policy,
                    principal,
                    level,
                    recoverySpaces: [],
                    ordinarySpaces: ['default'],
                  }),
                ],
              },
            },
          });
          const found = new Set(hits.hits.map(({ _id }) => _id?.replace(`${TYPE}:`, '')));

          for (const { id, name, access } of indexableFixtures.filter(
            (fixture) => fixture.policy === policy
          )) {
            const { _source: source } = await esClient.get<Record<string, unknown>>({
              index: MAIN_SAVED_OBJECT_INDEX,
              id: `${TYPE}:${id}`,
            });
            const fromRawSource = evaluateAcl({
              policy,
              acl: normalizeAclSource(source),
              principal,
            }).operations.has(operation);
            const fromRepository = evaluateAcl({
              policy,
              acl: (await repository.get(TYPE, id)).acl,
              principal,
            }).operations.has(operation);

            const probeLevel = access[probe];
            const expected = !!probeLevel && compareLevels(probeLevel, level) >= 0;
            expect({ name, filter: found.has(id), fromRawSource, fromRepository }).toEqual({
              name,
              filter: expected,
              fromRawSource: expected,
              fromRepository: expected,
            });
          }
        });
      }
    }
  }

  it('fails explicitly, rather than unfiltered, when expensive queries are disallowed', async () => {
    // Kibana's own user cannot change cluster settings, so the test cluster's superuser does.
    const adminClient = esServer.es.getClient();
    await adminClient.cluster.putSettings({
      persistent: { 'search.allow_expensive_queries': false },
    });
    try {
      await expect(
        esClient.search({
          index: MAIN_SAVED_OBJECT_INDEX,
          query: buildAclReadFilter({
            policy: FIXTURE_POLICY,
            principal: FIXTURE_PROBES.grantee,
            level: 'view',
            recoverySpaces: [],
            ordinarySpaces: ['default'],
          }),
        })
      ).rejects.toMatchObject({ statusCode: 400 });
    } finally {
      await adminClient.cluster.putSettings({
        persistent: { 'search.allow_expensive_queries': null },
      });
    }
  });
});
