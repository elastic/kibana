import React from 'react';
import { DefaultFormatEditor } from '../default/default';
export interface DateFormatEditorFormatParams {
    pattern: string;
}
export declare class DateFormatEditor extends DefaultFormatEditor<DateFormatEditorFormatParams> {
    static formatId: string;
    state: {
        sampleInputs: number[];
        error: undefined;
        samples: import("../..").Sample[];
        sampleInputsByType: {};
    };
    render(): React.JSX.Element;
}
