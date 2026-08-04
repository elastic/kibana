import React from 'react';
import { DefaultFormatEditor } from '../default/default';
export interface TruncateFormatEditorFormatParams {
    fieldLength: number | null;
}
export declare class TruncateFormatEditor extends DefaultFormatEditor<TruncateFormatEditorFormatParams> {
    static formatId: string;
    state: {
        sampleInputs: string[];
        error: undefined;
        samples: import("../..").Sample[];
        sampleInputsByType: {};
    };
    render(): React.JSX.Element;
}
