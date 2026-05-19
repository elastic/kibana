import type { KibanaReactContextValue } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import React from 'react';
import { DefaultFormatEditor } from '../default/default';
import type { FormatEditorProps } from '../types';
export interface UrlFormatEditorFormatParams {
    openLinkInCurrentTab: boolean;
    urlTemplate: string;
    labelTemplate: string;
    width: string;
    height: string;
    type?: string;
}
interface UrlFormatEditorFormatState {
    showLabelTemplateHelp: boolean;
    showUrlTemplateHelp: boolean;
}
export declare class UrlFormatEditor extends DefaultFormatEditor<UrlFormatEditorFormatParams, UrlFormatEditorFormatState> {
    static contextType: React.Context<KibanaReactContextValue<Partial<CoreStart>>>;
    static formatId: string;
    context: KibanaReactContextValue<Partial<CoreStart>>;
    private get sampleIconPath();
    constructor(props: FormatEditorProps<UrlFormatEditorFormatParams>);
    sanitizeNumericValue: (val: string) => number | "";
    onTypeChange: (newType: string) => void;
    renderWidthHeightParameters: () => React.JSX.Element;
    render(): React.JSX.Element;
}
export {};
