import React from 'react';
import type { OnJsonEditorUpdateHandler } from './use_json';
interface Props<T extends object = {
    [key: string]: any;
}> {
    onUpdate: OnJsonEditorUpdateHandler<T>;
    label?: string;
    helpText?: React.ReactNode;
    value?: string;
    defaultValue?: T;
    codeEditorProps?: {
        [key: string]: any;
    };
    error?: string | null;
}
declare function JsonEditorComp<T extends object = {
    [key: string]: any;
}>({ label, helpText, onUpdate, value, defaultValue, codeEditorProps, error: propsError, ...rest }: Props<T>): React.JSX.Element;
export declare const JsonEditor: typeof JsonEditorComp;
export {};
