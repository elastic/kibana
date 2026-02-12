import React from 'react';
import type { UrlTemplateEditorVariable } from '@kbn/kibana-react-plugin/public';
export interface Props {
    variables: UrlTemplateEditorVariable[];
    onSelect: (variable: string) => void;
    variablesHelpLink?: string;
}
export declare const VariablePopover: React.FC<Props>;
