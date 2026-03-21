import React from 'react';
export interface ColorPickerProps {
    overwriteColor?: string | null;
    defaultColor?: string | null;
    isClearable?: boolean;
    setConfig: (config: {
        color?: string;
    }) => void;
    label?: string;
    disableHelpTooltip?: boolean;
    disabledMessage?: string;
    showAlpha?: boolean;
    swatches: string[];
}
export declare const ColorPicker: ({ overwriteColor, defaultColor, isClearable, setConfig, label, disableHelpTooltip, disabledMessage, showAlpha, swatches, }: ColorPickerProps) => React.JSX.Element;
