/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_FALLBACK_PALETTE } from '../constants';
import { complementaryPalette } from '../palettes/gradient';

const remappedIds: Record<string, string> = {
  // Swap misspelled complementary palette
  // https://github.com/elastic/kibana/issues/161194
  complimentary: complementaryPalette.id,
};

/**
 * Returns the corrected palette id from given palettes
 */
export function resolvePaletteId(id: string = DEFAULT_FALLBACK_PALETTE): string {
  return remappedIds[id] || id || DEFAULT_FALLBACK_PALETTE;
}
