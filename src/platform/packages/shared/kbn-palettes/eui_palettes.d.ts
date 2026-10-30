/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// `@elastic/eui` does not ship `.d.ts` files for its deep `lib/**` modules. The palette
// definitions import `lib/services/color/eui_palettes` directly so loading them on the
// server does not pull in the whole EUI barrel (React, components, etc.). This ambient
// declaration re-exports the types EUI declares for the same symbols on its main entry.
declare module '@elastic/eui/lib/services/color/eui_palettes' {
  export {
    euiPaletteColorBlind,
    euiPaletteComplementary,
    euiPaletteCool,
    euiPaletteForStatus,
    euiPaletteForTemperature,
    euiPaletteGray,
    euiPaletteGreen,
    euiPaletteRed,
    euiPaletteWarm,
  } from '@elastic/eui';
}
