import React from 'react';
import type { PaletteRegistry, DataBounds } from '../../../palettes';
interface ColorRangesContextType {
    dataBounds: DataBounds;
    palettes: PaletteRegistry;
    disableSwitchingContinuity?: boolean;
}
export declare const ColorRangesContext: React.Context<ColorRangesContextType>;
export {};
