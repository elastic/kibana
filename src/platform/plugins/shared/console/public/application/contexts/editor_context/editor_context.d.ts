import type { Dispatch } from 'react';
import React from 'react';
import type * as editor from '../../stores/editor';
import type { DevToolsSettings } from '../../../services';
export interface EditorContextArgs {
    children: JSX.Element;
    settings: DevToolsSettings;
    customParsedRequestsProvider?: (model: any) => any;
}
export declare function EditorContextProvider({ children, settings, customParsedRequestsProvider, }: EditorContextArgs): React.JSX.Element;
export declare const useEditorReadContext: () => editor.Store;
export declare const useEditorActionContext: () => Dispatch<editor.Action>;
