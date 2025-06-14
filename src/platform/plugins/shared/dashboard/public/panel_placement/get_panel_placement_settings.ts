/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SerializedPanelState } from '@kbn/presentation-publishing';
import { getRegistryItem } from './panel_placement_registry';
import { PanelPlacementSettings } from './types';

export async function getPanelPlacementSetting(
  embeddableType: string,
  serializedState?: SerializedPanelState<object>
): Promise<undefined | PanelPlacementSettings> {
  const registryItem = getRegistryItem(embeddableType);
  if (!registryItem) return;

  try {
    return await registryItem(serializedState);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(
      `Unable to get panel placement settings; embeddableType: ${embeddableType}, serializedState: ${serializedState}, error: ${e}`
    );
  }
}
