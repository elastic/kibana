/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializedPanelState } from '@kbn/presentation-publishing';
import { DASHBOARD_GRID_COLUMN_COUNT, PanelPlacementStrategy } from '@kbn/dashboard-plugin/public';
import { LINKS_HORIZONTAL_LAYOUT } from '../../common/content_management';
import type { LinksEmbeddableState } from '../../common';
import type { LinksState } from '../../server';
import { loadFromLibrary } from '../content_management/load_from_library';

export async function getPanelPlacement(
  serializedState?: SerializedPanelState<LinksEmbeddableState>
) {
  if (!serializedState) return {};

  let layout = LINKS_HORIZONTAL_LAYOUT;
  let numLinks = 1;
  try {
    const savedObjectId = (serializedState.rawState as { savedObjectId?: string }).savedObjectId;
    const linksState = savedObjectId
      ? await loadFromLibrary(savedObjectId)
      : (serializedState.rawState as LinksState);
    if (linksState.layout) layout = linksState.layout;
    if (linksState.links) numLinks = linksState.links.length;
  } catch (error) {
    // ignore saved object load error and just use default values
  }
  const isHorizontal = layout === LINKS_HORIZONTAL_LAYOUT;
  const width = isHorizontal ? DASHBOARD_GRID_COLUMN_COUNT : 8;
  const height = isHorizontal ? 4 : numLinks * 3 + 4;
  return { width, height, strategy: PanelPlacementStrategy.placeAtTop };
}
