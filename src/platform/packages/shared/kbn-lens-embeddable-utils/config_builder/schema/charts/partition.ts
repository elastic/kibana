/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { MosaicConfig, MosaicConfigESQL, MosaicConfigNoESQL } from './mosaic';
import { mosaicConfigSchema } from './mosaic';
import type { PieConfig, PieConfigESQL, PieConfigNoESQL } from './pie';
import { pieConfigSchema } from './pie';
import type { TreemapConfig, TreemapConfigESQL, TreemapConfigNoESQL } from './treemap';
import { treemapConfigSchema } from './treemap';
import type { WaffleConfig, WaffleConfigESQL, WaffleConfigNoESQL } from './waffle';
import { waffleConfigSchema } from './waffle';

export const partitionConfigSchema = schema.oneOf([
  mosaicConfigSchema,
  pieConfigSchema,
  treemapConfigSchema,
  waffleConfigSchema,
]);

export type PartitionConfig = PieConfig | MosaicConfig | TreemapConfig | WaffleConfig;
export type PartitionConfigNoESQL =
  | PieConfigNoESQL
  | MosaicConfigNoESQL
  | TreemapConfigNoESQL
  | WaffleConfigNoESQL;
export type PartitionConfigESQL =
  | PieConfigESQL
  | MosaicConfigESQL
  | TreemapConfigESQL
  | WaffleConfigESQL;
