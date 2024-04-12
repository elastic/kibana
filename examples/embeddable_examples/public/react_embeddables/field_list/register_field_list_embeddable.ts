/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart } from '@kbn/core/public';
import {
  registerEmbeddablePlacementStrategy,
  registerReactEmbeddableFactory,
} from '@kbn/embeddable-plugin/public';
import { FIELD_LIST_ID } from './constants';
import { FieldListSerializedStateState, Services } from './types';

const getFieldListPlacementSettings = (serializedState: FieldListSerializedStateState) => {
  // Consider using the serialized state to determine the width, height, and strategy
  return {
    width: 12,
    height: 36,
    strategy: 'placeAtTop',
  };
};

export function registerFieldListEmbeddable(core: CoreStart, services: Services) {
  registerEmbeddablePlacementStrategy(FIELD_LIST_ID, getFieldListPlacementSettings);
  registerReactEmbeddableFactory(FIELD_LIST_ID, async () => {
    const { getFieldListFactory } = await import('./field_list_react_embeddable');
    return getFieldListFactory(core, services);
  });
}
