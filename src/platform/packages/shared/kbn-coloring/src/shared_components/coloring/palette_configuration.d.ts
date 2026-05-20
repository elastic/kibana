import React from 'react';
import type { PaletteOutput, PaletteRegistry, DataBounds, CustomPaletteParams } from '../../palettes';
export interface CustomizablePaletteProps {
    palettes: PaletteRegistry;
    activePalette: PaletteOutput<CustomPaletteParams>;
    setPalette: (palette: PaletteOutput<CustomPaletteParams>) => void;
    dataBounds?: DataBounds;
    showRangeTypeSelector?: boolean;
    disableSwitchingContinuity?: boolean;
    showExtraActions?: boolean;
}
export declare const CustomizablePalette: ({ palettes, activePalette, setPalette, dataBounds, showExtraActions, showRangeTypeSelector, disableSwitchingContinuity, }: CustomizablePaletteProps) => React.JSX.Element;
