/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { $Values } from '@kbn/utility-types';

export const ColorMode = Object.freeze({
  Background: 'Background' as 'Background',
  Labels: 'Labels' as 'Labels',
  None: 'None' as 'None',
});

export enum ColorSchemas {
  Blues = 'Blues',
  Greens = 'Greens',
  Greys = 'Greys',
  Reds = 'Reds',
  YellowToRed = 'Yellow to Red',
  GreenToRed = 'Green to Red',
}

export type ColorMode = $Values<typeof ColorMode>;
