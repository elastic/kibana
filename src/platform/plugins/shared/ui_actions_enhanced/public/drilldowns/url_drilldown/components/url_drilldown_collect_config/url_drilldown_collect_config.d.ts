import React from 'react';
import type { UrlTemplateEditorVariable } from '@kbn/kibana-react-plugin/public';
import type { UrlDrilldownConfig } from '../../types';
export interface UrlDrilldownCollectConfigProps {
    config: UrlDrilldownConfig;
    variables: UrlTemplateEditorVariable[];
    exampleUrl: string;
    onConfig: (newConfig: UrlDrilldownConfig) => void;
    syntaxHelpDocsLink?: string;
    variablesHelpDocsLink?: string;
}
export declare const UrlDrilldownCollectConfig: React.FC<UrlDrilldownCollectConfigProps>;
