import React from 'react';
import { DefaultFormatEditor } from '../default/default';
export interface HistogramFormatEditorParams {
    id: 'bytes' | 'percent' | 'number';
    params: {
        pattern?: string;
    } & Record<string, unknown>;
}
export declare class HistogramFormatEditor extends DefaultFormatEditor<HistogramFormatEditorParams> {
    static formatId: string;
    state: {
        sampleInputs: (number | {
            values: number[];
            counts: number[];
        })[];
        error: undefined;
        samples: import("../..").Sample[];
        sampleInputsByType: {};
    };
    render(): React.JSX.Element;
}
