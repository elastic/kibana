import React from 'react';
import type { PaletteOutput, PaletteRegistry, CustomPaletteParams } from '../../palettes';
export declare function PalettePicker({ palettes, activePalette, setPalette, showCustomPalette, showDynamicColorOnly, ...rest }: {
    palettes: PaletteRegistry;
    activePalette?: PaletteOutput<CustomPaletteParams>;
    setPalette: (palette: PaletteOutput) => void;
    showCustomPalette?: boolean;
    showDynamicColorOnly?: boolean;
}): React.JSX.Element;
