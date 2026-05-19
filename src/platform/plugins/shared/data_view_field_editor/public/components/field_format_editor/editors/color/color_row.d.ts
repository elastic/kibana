import React from 'react';
export interface Color {
    range?: string;
    regex?: string;
    boolean?: string;
    text: string;
    background: string;
}
interface ColorRowProps {
    color: Color;
    index: number;
    fieldType: string;
    showDeleteButton: boolean;
    onColorChange: (newColorParams: Partial<Color>, index: number) => void;
    onRemoveColor: (index: number) => void;
}
export declare const ColorRow: ({ color, index, fieldType, showDeleteButton, onColorChange, onRemoveColor, }: ColorRowProps) => React.JSX.Element;
export {};
