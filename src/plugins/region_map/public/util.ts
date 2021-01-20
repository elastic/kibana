/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FileLayer, VectorLayer } from '../../maps_legacy/public';
import { ORIGIN } from '../../maps_legacy/public';

export const mapToLayerWithId = (prefix: string, layer: FileLayer): VectorLayer => ({
  ...layer,
  layerId: `${prefix}.${layer.name}`,
  isEMS: ORIGIN.EMS === prefix,
});
