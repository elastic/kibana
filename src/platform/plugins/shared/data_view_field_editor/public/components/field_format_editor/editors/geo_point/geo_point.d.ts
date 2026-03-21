import React from 'react';
import { DefaultFormatEditor } from '../default/default';
export interface GeoPointFormatEditorFormatParams {
    transform: string;
}
export declare class GeoPointFormatEditor extends DefaultFormatEditor<GeoPointFormatEditorFormatParams> {
    static formatId: string;
    state: {
        sampleInputs: {
            coordinates: number[];
            type: string;
        }[];
        sampleConverterType: import("@kbn/field-formats-plugin/common").FieldFormatsContentType;
        error: undefined;
        samples: import("../..").Sample[];
        sampleInputsByType: {};
    };
    render(): React.JSX.Element;
}
