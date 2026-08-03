import type { BaseSyntheticEvent } from 'react';
import React from 'react';
export declare const legacyColors: string[];
export interface ColorPickerProps {
    /**
     * Label that characterizes the color that is going to change
     */
    label: string | number | null;
    /**
     * Callback on the color change
     */
    onChange: (color: string | null, event: BaseSyntheticEvent) => void;
    /**
     * Initial color.
     */
    color: string;
    /**
     * Defines if the compatibility (legacy) or eui palette is going to be used. Defauls to true.
     */
    useLegacyColors?: boolean;
    /**
     * Defines if the default color is overwritten. Defaults to true.
     */
    colorIsOverwritten?: boolean;
    /**
     * Callback for onKeyPress event
     */
    onKeyDown?: (e: React.KeyboardEvent<HTMLElement>) => void;
    /**
     * Optional define the series maxDepth
     */
    maxDepth?: number;
    /**
     * Optional define the layer index
     */
    layerIndex?: number;
}
export declare const ColorPicker: ({ onChange, color: selectedColor, label, useLegacyColors, colorIsOverwritten, onKeyDown, maxDepth, layerIndex, }: ColorPickerProps) => React.JSX.Element;
