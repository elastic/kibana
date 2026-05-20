import React from 'react';
import { context as contextType } from '@kbn/kibana-react-plugin/public';
import { DefaultFormatEditor } from '../default/default';
export interface NumberFormatEditorParams {
    pattern: string;
}
export declare class NumberFormatEditor extends DefaultFormatEditor<NumberFormatEditorParams> {
    static contextType: React.Context<import("@kbn/kibana-react-plugin/public").KibanaReactContextValue<Partial<import("@kbn/core/packages/lifecycle/browser").CoreStart>>>;
    static formatId: string;
    context: React.ContextType<typeof contextType>;
    state: {
        sampleInputs: number[];
        error: undefined;
        samples: import("../..").Sample[];
        sampleInputsByType: {};
    };
    render(): React.JSX.Element;
}
