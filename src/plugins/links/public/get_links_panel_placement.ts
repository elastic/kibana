/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DASHBOARD_GRID_COLUMN_COUNT, PanelPlacementStrategy } from '@kbn/dashboard-plugin/public';
import { LinksRuntimeState, LinksSerializedState } from './types';
import { deserializeLinksSavedObject } from './lib/deserialize_from_library';
import { linksClient } from './content_management';

export async function getLinksPanelPlacement(
  serializedState?: LinksSerializedState,
  runtimeState?: LinksRuntimeState
) {
  if (serializedState && 'savedObjectId' in serializedState && serializedState.savedObjectId) {
    const linksSavedObject = await linksClient.get(serializedState.savedObjectId);
    return getPanelPlacementFromRuntimeState(
      await deserializeLinksSavedObject(linksSavedObject.item)
    );
  }

  return runtimeState ? getPanelPlacementFromRuntimeState(runtimeState) : {};
}

function getPanelPlacementFromRuntimeState(runtimeState: LinksRuntimeState) {
  const isHorizontal = runtimeState.layout === 'horizontal';
  const width = isHorizontal ? DASHBOARD_GRID_COLUMN_COUNT : 8;
  const height = isHorizontal ? 4 : (runtimeState.links?.length ?? 1 * 3) + 4;
  return { width, height, strategy: PanelPlacementStrategy.placeAtTop };
}
