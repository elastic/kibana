/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import type { ExtractSlots, SlotDataSourcesFor } from './extension_point_ids';

export type { ExtractSlots, SlotDataSourcesFor };

/**
 * Helper to author a tree's slot data-source map with full type inference. Each key
 * must be a `slotId` placed in the tree, and each value an `Observable` emitting the
 * row type the referenced extension declared in `NavExtensionRegistry`.
 */
export const defineSlotDataSources = <T extends NavigationTreeDefinition>(
  slotDataSources: SlotDataSourcesFor<T>
): SlotDataSourcesFor<T> => slotDataSources;
