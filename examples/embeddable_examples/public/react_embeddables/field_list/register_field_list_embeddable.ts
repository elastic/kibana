/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type PresentationUtilPluginStart,
  PanelPlacementStrategy,
} from '@kbn/presentation-util-plugin/public';
import { FIELD_LIST_ID } from './constants';

const getPanelSettings = () => ({
  // Consider using the serialized state to determine the width, height, and strategy
  placementSettings: {
    width: 12,
    height: 36,
    strategy: PanelPlacementStrategy.placeAtTop,
  },
  resizeSettings: {
    minWidth: 12,
    minHeight: 4,
  },
});

export function registerFieldListPanelPlacementSetting(
  presentationUtil: PresentationUtilPluginStart
) {
  presentationUtil.registerPanelPlacementSettings(FIELD_LIST_ID, getPanelSettings);
}
