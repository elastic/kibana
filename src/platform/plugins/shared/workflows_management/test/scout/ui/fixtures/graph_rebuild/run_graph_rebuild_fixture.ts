/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';
import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { expectRebuildMatches } from './expect_rebuild';
import type { GraphRebuildFixture, GraphRebuildFixtureKey } from './fixtures';
import { GRAPH_REBUILD_FIXTURES, loadGraphRebuildFixtureYaml } from './fixtures';
import type { RebuildResult } from './rebuild_workflow';
import { rebuildWorkflowInGraph } from './rebuild_workflow';
import type { WorkflowsApiServicesFixture } from '..';
import type { WorkflowsPageObjects } from '../page_objects';

const BYTES_PER_MB = 1024 * 1024;

/** The JS heap the page holds once garbage is collected, in MB. */
const readRetainedHeapMb = async (page: ScoutPage): Promise<number> => {
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('HeapProfiler.collectGarbage');
    const { usedSize } = await session.send('Runtime.getHeapUsage');
    return usedSize / BYTES_PER_MB;
  } finally {
    await session.detach();
  }
};

/**
 * Rebuilds a fixture through the graph and fails on any problem that is not one of the fixture's known gaps. For a
 * fixture with a heap budget it also fails when the page holds more than the budget afterwards.
 */
export const runGraphRebuildFixture = async (
  key: GraphRebuildFixtureKey,
  services: {
    page: ScoutPage;
    pageObjects: WorkflowsPageObjects;
    apiServices: WorkflowsApiServicesFixture;
    spaceId: string;
  }
): Promise<RebuildResult> => {
  const { spaceId, ...rebuildServices } = services;
  const fixture: GraphRebuildFixture = GRAPH_REBUILD_FIXTURES[key];
  const { connectors } = rebuildServices.apiServices.alerting;
  const created: Array<{ placeholder: string; id: string }> = [];
  for (const { placeholder, name, connectorTypeId, config, secrets } of fixture.connectors ?? []) {
    const { id } = await connectors.create({ name, connectorTypeId, config, secrets }, spaceId);
    created.push({ placeholder, id });
  }
  try {
    return await rebuildAndCheck(
      key,
      fixture,
      rebuildServices,
      Object.fromEntries(created.map(({ placeholder, id }) => [placeholder, id]))
    );
  } finally {
    for (const { id } of created) await connectors.delete(id, spaceId);
  }
};

const rebuildAndCheck = async (
  key: GraphRebuildFixtureKey,
  fixture: GraphRebuildFixture,
  services: {
    page: ScoutPage;
    pageObjects: WorkflowsPageObjects;
    apiServices: WorkflowsApiServicesFixture;
  },
  connectorIds: Record<string, string>
): Promise<RebuildResult> => {
  const result = await rebuildWorkflowInGraph({
    ...services,
    yaml: loadGraphRebuildFixtureYaml(key, connectorIds),
    name: `scout-rebuild-${key}`,
  });
  // The keys in a failure say where; the values say what, so they go with every run.
  await test.info().attach('graph-rebuild-result', {
    body: JSON.stringify(result, null, 2),
    contentType: 'application/json',
  });
  expectRebuildMatches(result, fixture.knownGaps);
  if (fixture.heapBudgetMb !== undefined) {
    const retainedMb = await readRetainedHeapMb(services.page);
    await test
      .info()
      .attach('retained-heap-mb', { body: retainedMb.toFixed(1), contentType: 'text/plain' });
    expect(retainedMb).toBeLessThan(fixture.heapBudgetMb);
  }
  return result;
};
