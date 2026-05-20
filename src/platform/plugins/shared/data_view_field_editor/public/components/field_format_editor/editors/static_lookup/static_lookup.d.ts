import React from 'react';
import { DefaultFormatEditor } from '../default/default';
export interface StaticLookupFormatEditorFormatParams {
    lookupEntries: Array<{
        key: string;
        value: string;
    }>;
    unknownKeyValue: string;
}
export declare class StaticLookupFormatEditor extends DefaultFormatEditor<StaticLookupFormatEditorFormatParams> {
    static formatId: string;
    onLookupChange: (newLookupParams: {
        value?: string;
        key?: string;
    }, index: number) => void;
    addLookup: () => void;
    removeLookup: (index: number) => void;
    render(): React.JSX.Element;
}
