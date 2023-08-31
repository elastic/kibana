/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ColorMapping } from '../config';
import {
  EUIPalette,
  IKEAPalette,
  NeutralPalette,
  PastelPalette,
  TableauPalette,
} from './default_palettes';

export const AVAILABLE_PALETTES = new Map<string, ColorMapping.CategoricalPalette>([
  [EUIPalette.id, EUIPalette],
  [TableauPalette.id, TableauPalette],
  [IKEAPalette.id, IKEAPalette],
  [PastelPalette.id, PastelPalette],
  [NeutralPalette.id, NeutralPalette],
]);
