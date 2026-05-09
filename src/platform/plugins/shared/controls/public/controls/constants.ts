/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PlacementStrategy } from '@kbn/embeddable-plugin/public';

export const MIN_POPOVER_WIDTH = 300;

export const CONTROL_DISPLAY_SETTINGS = {
  placementSettings: { width: 12, height: 2, strategy: PlacementStrategy.placeAtTop },
  resizeConstraints: { maxHeight: 2, minHeight: 2 },
};
