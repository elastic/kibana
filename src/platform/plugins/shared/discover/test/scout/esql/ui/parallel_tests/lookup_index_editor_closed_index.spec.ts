/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../common/ui/fixtures';
import { LOOKUP_INDEX_EDITOR_ROLE } from '../../../common/feature_controls/roles';

const getIndexName = (scoutSpaceId: string) => `test-lookup-index-closed-${scoutSpaceId}`;

spaceTest.describe(
  'Discover ES|QL lookup-join index editor - closed index',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects, scoutSpace, esClient }) => {
      const indexName = getIndexName(scoutSpace.id);

      await esClient.indices.create({ index: indexName, settings: { mode: 'lookup' } });
      await esClient.indices.close({ index: indexName });

      await browserAuth.loginWithCustomRole(LOOKUP_INDEX_EDITOR_ROLE);
      await pageObjects.discover.goto({ queryMode: 'esql' });
      await pageObjects.discover.waitUntilTabIsLoaded();
      await pageObjects.discover.codeEditor.waitCodeEditorReady('ESQLEditor');
    });

    spaceTest.afterEach(async ({ esClient, scoutSpace }) => {
      const indexName = getIndexName(scoutSpace.id);
      // Closed indices can't be deleted directly.
      await esClient.indices.open({ index: indexName, ignore_unavailable: true });
      await esClient.indices.delete({ index: indexName, ignore_unavailable: true });
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'shows a closed-index warning instead of the create/edit actions',
      async ({ pageObjects, scoutSpace }) => {
        const { discover } = pageObjects;
        const indexName = getIndexName(scoutSpace.id);

        await discover.codeEditor.setCodeEditorValue(
          `from logstash-* | LOOKUP JOIN ${indexName} ON customer_id`
        );

        const hoverText = await discover.codeEditor.getDecorationHoverText(
          'lookupIndexClosedBadge'
        );
        expect(hoverText).toContain('closed');
        expect(hoverText).not.toContain('Create lookup index');
        expect(hoverText).not.toContain('Edit lookup index');
      }
    );
  }
);
