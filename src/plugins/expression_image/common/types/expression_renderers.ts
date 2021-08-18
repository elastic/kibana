/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ImageMode } from './expression_functions';

export type OriginString = 'bottom' | 'left' | 'top' | 'right';

export interface ImageRendererConfig {
  dataurl: string | null;
  mode: ImageMode | null;
}

export interface NodeDimensions {
  width: number;
  height: number;
}
