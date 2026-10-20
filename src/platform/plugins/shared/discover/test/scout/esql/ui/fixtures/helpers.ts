/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import type { DiscoverPageObjects } from '../../../common/ui/fixtures';

/**
 * Opens the inspector's Requests view and asserts the listed request names, leaving
 * the panel open. Reopens rather than waiting on the open panel: `getInspectorRequestAdapters`
 * (use_inspector.ts) freezes the set of adapters when the panel opens, and the chart
 * publishes its adapter only once its own search has loaded — so a panel opened too
 * early never picks the visualization entry up, however long it stays open.
 */
export const expectRequestNames = async (
  { inspector, unifiedTabs }: Pick<DiscoverPageObjects, 'inspector' | 'unifiedTabs'>,
  names: string[]
) => {
  await expect
    .poll(async () => {
      if (await inspector.panel.isVisible()) {
        await inspector.close();
      }
      await unifiedTabs.openInspectorForActiveTab();
      await inspector.openInspectorRequestsView();
      return inspector.getRequestNames();
    })
    .toStrictEqual(names);
};
