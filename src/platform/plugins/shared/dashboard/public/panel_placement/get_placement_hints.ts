/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PlacementStrategy } from '@kbn/embeddable-plugin/public';
import { embeddableService } from '../services/kibana_services';
import { DEFAULT_PANEL_HEIGHT, DEFAULT_PANEL_WIDTH } from '../../common/constants';

export async function getPlacementHints(embeddableType: string, serializedState?: object) {
  const hints = {
    strategy: PlacementStrategy.findTopLeftMostOpenSpace,
    height: DEFAULT_PANEL_HEIGHT,
    width: DEFAULT_PANEL_WIDTH,
  };
  try {
    const embeddableDefinition = await embeddableService.getEmbeddableDefinition(embeddableType);
    if (embeddableDefinition && embeddableDefinition.getPlacementHints) {
      return {
        ...hints,
        ...(await embeddableDefinition.getPlacementHints(serializedState)),
      };
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(
      `Unable to get placement hints; embeddableType: ${embeddableType}, serializedState: ${serializedState}, error: ${e}`
    );
  }

  return hints;
}
