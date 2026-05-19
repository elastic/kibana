import type { ESQLCallbacks } from '@kbn/esql-types';
import type { monaco } from '../../../../monaco_imports';
export declare function esqlValidate(model: monaco.editor.ITextModel, code?: string, callbacks?: ESQLCallbacks, options?: {
    invalidateColumnsCache?: boolean;
}): Promise<{
    errors: import("@kbn/code-editor").MonacoEditorError[];
    warnings: import("@kbn/code-editor").MonacoEditorError[];
}>;
