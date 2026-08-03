import React from 'react';
interface TextDecorationConfig {
    textVisibility?: boolean;
    textField?: string;
}
export declare function TextDecorationSetting({ idPrefix, currentConfig, setConfig, isQueryBased, children, }: {
    idPrefix: string;
    currentConfig?: TextDecorationConfig;
    setConfig: (config: TextDecorationConfig) => void;
    isQueryBased?: boolean;
    /** A children render function for custom sub fields on textDecoration change */
    children?: (textDecoration: 'none' | 'name' | 'field') => JSX.Element | null;
}): React.JSX.Element;
export {};
