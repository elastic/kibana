/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Range } from '@kbn/expressions-plugin/common';
import { ColorSchemas } from '@kbn/charts-plugin/common';

export interface PaletteParams {
  colorSchema: ColorSchemas;
  colorsRange: Range[];
  invertColors: boolean;
}

export interface ExtendedPaletteParams extends PaletteParams {
  percentageMode: boolean;
}
