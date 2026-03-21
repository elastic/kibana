import React from 'react';
import { DefaultFormatEditor } from '../default/default';
export interface StringFormatEditorFormatParams {
    transform: string;
}
export declare class StringFormatEditor extends DefaultFormatEditor<StringFormatEditorFormatParams> {
    static formatId: string;
    state: {
        sampleInputs: string[];
        sampleConverterType: import("@kbn/field-formats-plugin/common").FieldFormatsContentType;
        error: undefined;
        samples: import("../..").Sample[];
        sampleInputsByType: {};
    };
    render(): React.JSX.Element;
}
