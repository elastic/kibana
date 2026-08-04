import React from 'react';
import type { Color } from './color_row';
import { DefaultFormatEditor } from '../default/default';
import type { FormatEditorProps } from '../types';
export interface ColorFormatEditorFormatParams {
    colors: Color[];
}
export declare class ColorFormatEditor extends DefaultFormatEditor<ColorFormatEditorFormatParams> {
    static formatId: string;
    constructor(props: FormatEditorProps<ColorFormatEditorFormatParams>);
    onColorChange: (newColorParams: Partial<Color>, index: number) => void;
    addColor: () => void;
    removeColor: (index: number) => void;
    render(): React.JSX.Element;
}
