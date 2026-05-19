import type { ESQLCallbacks } from '@kbn/esql-types';
import { monaco, type MonacoMessage } from '@kbn/code-editor';
import type { MapCache } from 'lodash';
import type { DataErrorsControl } from '../types';
interface ValidationLatencyTracking {
    trackValidationLatencyStart: (code: string) => void;
    trackValidationLatencyEnd: (active: boolean, callbacksDuration: number) => void;
    resetValidationTracking: () => void;
}
interface UseQueryValidationParams {
    code: string;
    codeWhenSubmitted: string;
    editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
    editorModel: React.MutableRefObject<monaco.editor.ITextModel | undefined>;
    esqlCallbacks: ESQLCallbacks;
    serverErrors: Error[] | undefined;
    serverWarning: string | undefined;
    mergeExternalMessages: boolean | undefined;
    dataErrorsControl: DataErrorsControl | undefined;
    isLoading: boolean | undefined;
    isQueryLoading: boolean;
    dataSourcesCache: MapCache;
    esqlFieldsCache: MapCache;
    getJoinIndicesCallback: Required<ESQLCallbacks>['getJoinIndices'];
    onQueryUpdate: (value: string) => void;
    pickerProjectRouting: string | undefined;
    latencyTracking: ValidationLatencyTracking;
}
export declare const useQueryValidation: ({ code, codeWhenSubmitted, editorRef, editorModel, esqlCallbacks, serverErrors, serverWarning, mergeExternalMessages, dataErrorsControl, isLoading, isQueryLoading, dataSourcesCache, esqlFieldsCache, getJoinIndicesCallback, onQueryUpdate, pickerProjectRouting, latencyTracking, }: UseQueryValidationParams) => {
    editorMessages: {
        errors: MonacoMessage[];
        warnings: MonacoMessage[];
    };
    editorMessagesRef: import("react").MutableRefObject<{
        errors: MonacoMessage[];
        warnings: MonacoMessage[];
    }>;
    queryValidation: ({ active, invalidateColumnsCache, }: {
        active: boolean;
        invalidateColumnsCache?: boolean;
    }) => Promise<void>;
    onLookupIndexCreate: (resultQuery: string) => Promise<void>;
    onNewFieldsAddedToLookupIndex: () => Promise<void>;
};
export {};
