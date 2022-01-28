/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ColorSchemas, LabelRotation } from './static';

export type PaletteContinuity = 'above' | 'below' | 'none' | 'all';

export interface ColorSchemaParams {
  colorSchema: ColorSchemas;
  invertColors: boolean;
}

export interface Labels {
  color?: string;
  filter?: boolean;
  overwriteColor?: boolean;
  rotate?: LabelRotation;
  show?: boolean;
  truncate?: number | null;
}

export interface Style {
  bgFill: string;
  bgColor: boolean;
  labelColor: boolean;
  subText: string;
  fontSize: number;
}
