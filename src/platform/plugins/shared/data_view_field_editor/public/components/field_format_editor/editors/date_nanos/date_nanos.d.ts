import React from 'react';
import { DefaultFormatEditor } from '../default/default';
export interface DateNanosFormatEditorFormatParams {
    pattern: string;
}
export declare class DateNanosFormatEditor extends DefaultFormatEditor<DateNanosFormatEditorFormatParams> {
    static formatId: string;
    state: {
        sampleInputs: string[];
        error: undefined;
        samples: import("../..").Sample[];
        sampleInputsByType: {};
    };
    render(): React.JSX.Element;
}
