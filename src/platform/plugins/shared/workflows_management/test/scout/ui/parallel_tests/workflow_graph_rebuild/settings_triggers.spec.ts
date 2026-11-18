/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest as test } from '../../fixtures';
import { cleanupWorkflowsAndRules } from '../../fixtures/cleanup';
import { GRAPH_REBUILD_FIXTURES } from '../../fixtures/graph_rebuild/fixtures';
import { runGraphRebuildFixture } from '../../fixtures/graph_rebuild/run_graph_rebuild_fixture';

const EXPERIMENTAL_FEATURES_SETTING = 'workflows:experimentalFeatures';
const FIXTURE = 'settings_triggers';

test.describe(
  'Workflow graph rebuild — settings triggers',
  { tag: [...tags.stateful.classic] },
  () => {
    test.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.set({ [EXPERIMENTAL_FEATURES_SETTING]: true });
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    test.afterAll(async ({ scoutSpace, apiServices }) => {
      await scoutSpace.uiSettings.unset(EXPERIMENTAL_FEATURES_SETTING);
      await cleanupWorkflowsAndRules({ scoutSpace, apiServices });
    });

    test('rebuilds the workflow through the graph, matching the input', async ({
      page,
      pageObjects,
      apiServices,
      scoutSpace,
    }) => {
      test.setTimeout(GRAPH_REBUILD_FIXTURES[FIXTURE].timeoutMs);
      const result = await runGraphRebuildFixture(FIXTURE, {
        page,
        pageObjects,
        apiServices,
        spaceId: scoutSpace.id,
      });
      // The comparison itself is asserted by the runner; this is that it had steps to compare.
      expect(result.total).toBeGreaterThan(0);
    });
  }
);
