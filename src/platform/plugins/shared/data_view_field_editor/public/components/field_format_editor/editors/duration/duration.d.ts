import React from 'react';
import type { FormatEditorState } from '../default/default';
import { DefaultFormatEditor } from '../default/default';
import type { FormatEditorProps } from '../types';
interface DurationFormatEditorState {
    hasDecimalError: boolean;
}
export interface DurationFormatEditorFormatParams {
    outputPrecision: number | null;
    inputFormat: string;
    outputFormat: string;
    showSuffix?: boolean;
    useShortSuffix?: boolean;
    includeSpaceWithSuffix?: boolean;
}
export declare class DurationFormatEditor extends DefaultFormatEditor<DurationFormatEditorFormatParams, DurationFormatEditorState> {
    static formatId: string;
    state: {
        sampleInputs: number[];
        hasDecimalError: boolean;
        error: undefined;
        samples: import("../..").Sample[];
        sampleInputsByType: {};
    };
    static getDerivedStateFromProps(nextProps: FormatEditorProps<DurationFormatEditorFormatParams>, state: FormatEditorState & DurationFormatEditorState): {
        hasDecimalError: boolean;
        error: string | undefined;
        samples: import("../..").Sample[];
    };
    render(): React.JSX.Element;
}
export {};
