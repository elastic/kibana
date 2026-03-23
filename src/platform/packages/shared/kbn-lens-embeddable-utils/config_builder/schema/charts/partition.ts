/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { MosaicState, MosaicStateESQL, MosaicStateNoESQL } from './mosaic';
import { mosaicStateSchema } from './mosaic';
import type { PieState, PieStateESQL, PieStateNoESQL } from './pie';
import { pieStateSchema } from './pie';
import type { TreemapState, TreemapStateESQL, TreemapStateNoESQL } from './treemap';
import { treemapStateSchema } from './treemap';
import type { WaffleState, WaffleStateESQL, WaffleStateNoESQL } from './waffle';
import { waffleStateSchema } from './waffle';

export const partitionStateSchema = schema.oneOf([
  mosaicStateSchema,
  pieStateSchema,
  treemapStateSchema,
  waffleStateSchema,
]);

export type PartitionState = PieState | MosaicState | TreemapState | WaffleState;
export type PartitionStateNoESQL =
  | PieStateNoESQL
  | MosaicStateNoESQL
  | TreemapStateNoESQL
  | WaffleStateNoESQL;
export type PartitionStateESQL =
  | PieStateESQL
  | MosaicStateESQL
  | TreemapStateESQL
  | WaffleStateESQL;
