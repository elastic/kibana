import type { Reducer } from 'react';
import type { DevToolsSettings } from '../../services';
import type { TextObject } from '../../../common/text_object';
import type { MonacoEditorActionsProvider } from '../containers/editor/monaco_editor_actions_provider';
import type { RequestToRestore } from '../../types';
export interface Store {
    ready: boolean;
    settings: DevToolsSettings;
    currentTextObject: TextObject | null;
    currentView: string;
    restoreRequestFromHistory: RequestToRestore | null;
    fileToImport: string | null;
    customParsedRequestsProvider?: (model: any) => any;
}
export declare const initialValue: Store;
export type Action = {
    type: 'setInputEditor';
    payload: MonacoEditorActionsProvider;
} | {
    type: 'setCurrentTextObject';
    payload: TextObject;
} | {
    type: 'updateSettings';
    payload: DevToolsSettings;
} | {
    type: 'setCurrentView';
    payload: string;
} | {
    type: 'setRequestToRestore';
    payload: RequestToRestore;
} | {
    type: 'clearRequestToRestore';
} | {
    type: 'setFileToImport';
    payload: string | null;
};
export declare const reducer: Reducer<Store, Action>;
