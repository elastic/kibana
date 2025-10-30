/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ColorMapping, PaletteOutput } from '@kbn/coloring';
import type { $Values } from '@kbn/utility-types';
import type { TAGCLOUD_ORIENTATION } from './constants';

export interface LensTagCloudState {
  layerId: string;
  tagAccessor?: string;
  valueAccessor?: string;
  maxFontSize: number;
  minFontSize: number;
  orientation: $Values<typeof TAGCLOUD_ORIENTATION>;
  /**
   * @deprecated use `colorMapping` config
   */
  palette?: PaletteOutput;
  showLabel: boolean;
  colorMapping?: ColorMapping.Config;
}

export interface LensTagCloudConfig extends LensTagCloudState {
  title: string;
  description: string;
}
