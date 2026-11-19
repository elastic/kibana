/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { URL } from 'url';
import { evaluateAcl, type AclAccess, type EntryAccess } from '@kbn/ols';
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
// Lowest to highest. `@kbn/ols` keeps the order internal, so the test states it.
const FIXTURE_LEVELS: EntryAccess[] = ['view', 'use', 'edit', 'manage'];
const grantsAtLeast = (granted: AclAccess, level: EntryAccess) =>
  FIXTURE_LEVELS.indexOf(granted as EntryAccess) >= FIXTURE_LEVELS.indexOf(level);
const indexableFixtures = ACL_SHAPE_FIXTURES.map((fixture, index) => ({
  ...fixture,
  policy: fixture.policy ?? FIXTURE_POLICY,
  id: `fixture-${index}`,
})).filter(({ indexable }) => indexable);

/**
 * Proves that Saved Objects store and read ACLs the way `@kbn/ols` expects. The package's own
 * integration tests check the fixture table, the read filter, and the evaluator against
 * Elasticsearch with `ACL_MAPPING`. This test checks what only Core does: that the Saved Objects
 * index applies that mapping, and that the repository returns the ACL that Elasticsearch indexed.
 */
describe('ACL storage in Saved Objects', () => {
  let root: Root;
  let esServer: TestElasticsearchUtils;
  let esClient: ElasticsearchClient;
  let repository: ISavedObjectsRepository;

  const indexFixture = (id: string, source: Record<string, unknown>) =>
    esClient.index({
      index: MAIN_SAVED_OBJECT_INDEX,
      id: `${TYPE}:${id}`,
      document: { type: TYPE, namespaces: ['default'], references: [], [TYPE]: {}, ...source },
      refresh: 'wait_for',
    });

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

  it('returns the indexed ACL from the repository, so it grants exactly the expected access', async () => {
    for (const { id, name, policy, access } of indexableFixtures) {
      const { acl } = await repository.get(TYPE, id);
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
});
