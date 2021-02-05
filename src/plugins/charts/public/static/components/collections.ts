/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { $Values } from '@kbn/utility-types';

export const ColorModes = Object.freeze({
  BACKGROUND: 'Background' as 'Background',
  LABELS: 'Labels' as 'Labels',
  NONE: 'None' as 'None',
});
export type ColorModes = $Values<typeof ColorModes>;

export const Rotates = Object.freeze({
  HORIZONTAL: 0,
  VERTICAL: 90,
  ANGLED: 75,
});
export type Rotates = $Values<typeof Rotates>;
