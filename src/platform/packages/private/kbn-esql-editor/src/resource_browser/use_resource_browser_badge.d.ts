import { monaco } from '@kbn/monaco';
import type { MutableRefObject } from 'react';
import { IndicesBrowserOpenMode } from './types';
interface UseSourcesBadgeParams {
    editorRef: MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
    editorModel: MutableRefObject<monaco.editor.ITextModel | undefined>;
    openIndicesBrowser: (options?: {
        openedFrom?: IndicesBrowserOpenMode;
    }) => void;
    suppressSuggestionsRef: MutableRefObject<boolean>;
}
export declare const useSourcesBadge: ({ editorRef, editorModel, openIndicesBrowser, suppressSuggestionsRef, }: UseSourcesBadgeParams) => {
    addSourcesDecorator: () => void;
    sourcesBadgeStyle: import("@emotion/utils").SerializedStyles;
    sourcesLabelClickHandler: (e: monaco.editor.IEditorMouseEvent) => void;
};
export {};
